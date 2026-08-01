# MDRobotBase Native C Coroutine Refactor - Technical Implementation & Deep Dive
**Timestamp**: 2026-07-23T09:49:00Z  
**Target Component**: `pybricks-micropython` / `lib/pbio` / `pybricks/robotics/pb_type_mdrobotbase.c`  
**Scope**: Native C non-blocking coroutine integration for all `MDRobotBase` movement APIs.

---

## 1. Problem Statement & Root Cause Mechanics

### 1.1 The "Nothing Moves" Bug Under MicroPython Coroutines (`run_task` / `asyncio`)
When user code invoked `MDRobotBase` movement methods (such as `navigate_to_goal`, `go_forward`, `go_backward`, `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, `follow_trajectory`) inside a cooperative event loop (`pybricks.tools.run_task` or `asyncio`), the robot remained stationary or failed to execute movement.

#### Diagnostic Breakdown:
1. **Uninitialized `timeout_ms` / State Fields**:  
   In the legacy implementation, `navigate_to_goal` failed to assign `self->rb->timeout_ms` or `self->rb->tolerance_dist` when constructing the C object state. As a result, `timeout_ms` contained uninitialized heap garbage or `0`. When `pb_type_mdrobotbase_motion_iterate_once` was called during the first coroutine frame tick:
   $$\text{elapsed\_ms} \ge \text{timeout\_ms} \quad \implies \quad 0 \ge 0 \quad (\text{TRUE})$$
   The dispatcher immediately returned `PBIO_SUCCESS`, signalling to `pb_type_async_wait_or_await` that the operation was finished. The coroutine raised `StopIteration` instantly on tick 0 before any motor duty cycle / speed command could be calculated or dispatched to the servos.

2. **Blocking C `while (1)` Loops with `mp_hal_delay_ms`**:  
   Movement methods like `go_forward`, `go_backward`, `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, and `follow_trajectory` were written using synchronous blocking C `while (1)` loops containing `mp_hal_delay_ms(10)` and `MICROPY_VM_HOOK_LOOP`.  
   These blocking loops froze MicroPython's cooperative task scheduler, preventing other concurrent tasks (such as sensor polling, color classification, or state machines) from running. Furthermore, when invoked inside `run_task`, these blocking loops bypassed Pybricks' `pb_type_async_wait_or_await` generator engine, breaking the fundamental coroutine interface model of Pybricks.

---

## 2. Architecture & Design Principles

### 2.1 Non-Blocking Generator Architecture (`pb_type_async_wait_or_await`)
Pybricks handles synchronous and asynchronous execution through a unified C engine in `pybricks/tools/pb_type_async.c`.

```
                    +------------------------------------+
                    | Python Motion Method Called        |
                    | (e.g. MDRobotBase.navigate_to_goal)|
                    +------------------------------------+
                                      |
                                      v
                    +------------------------------------+
                    | Initialize self->rb Motion State   |
                    | (goal_x, goal_y, speed, timeout)   |
                    +------------------------------------+
                                      |
                                      v
                    +------------------------------------+
                    | Return pb_type_mdrobotbase_wait_   |
                    | or_await(self)                     |
                    +------------------------------------+
                                 /          \
                                /            \
     pb_module_tools_run_loop_is_active() == true     pb_module_tools_run_loop_is_active() == false
                             /                  \
                            v                    v
            +-----------------------+    +-----------------------+
            | Returns Async Generator|    | Synchronous C Loop    |
            | Iterated by event loop|    | mp_event_wait_indefin |
            +-----------------------+    +-----------------------+
                            \                    /
                             \                  /
                              v                v
                    +------------------------------------+
                    | Frame Dispatcher Function:          |
                    | pb_type_mdrobotbase_motion_iterate_|
                    | once(&state, parent_obj)           |
                    +------------------------------------+
```

- When `pb_module_tools_run_loop_is_active()` is `true`:
  - `pb_type_async_wait_or_await` constructs and returns a MicroPython awaitable generator object (`pb_type_async_t`).
  - On each tick of MicroPython's event loop, MicroPython invokes `iter_once`:
    - Returning `PBIO_ERROR_AGAIN` yields control for 1 frame (10ms).
    - Returning `PBIO_SUCCESS` stops iteration (`StopIteration`), terminating the coroutine.
- When `pb_module_tools_run_loop_is_active()` is `false`:
  - `pb_type_async_wait_or_await` executes a synchronous wait loop in C calling `mp_event_wait_indefinite()`, executing `iter_once` on each tick until it returns `PBIO_SUCCESS`.

---

## 3. Comprehensive Code Changes

### 3.1 `lib/pbio/include/pbio/mdrobotbase.h`
1. Defined `pbio_mdrobotbase_motion_type_t` enumeration:
   ```c
   typedef enum {
       PBIO_MDROBOTBASE_MOTION_NONE = 0,
       PBIO_MDROBOTBASE_MOTION_NAVIGATE,
       PBIO_MDROBOTBASE_MOTION_TURN,
       PBIO_MDROBOTBASE_MOTION_PIVOT,
       PBIO_MDROBOTBASE_MOTION_TRAJECTORY,
   } pbio_mdrobotbase_motion_type_t;
   ```
2. Added state tracking fields into `pbio_mdrobotbase_t`:
   - `goal_x`, `goal_y`, `has_goal_theta`, `gt`
   - `target_speed`, `start_speed`, `end_speed`, `accel_d`, `decel_d`
   - `use_ramping`, `is_backward`, `tolerance_dist`, `timeout_ms`
   - `stop_behavior`, `kick_speed`, `kick_time`
   - `target_angle`, `speed_deg_s`, `pivot_left`, `tolerance_angle`, `accel_angle`, `decel_angle`, `turn_angle_total`
   - `trajectory_points_x[64]`, `trajectory_points_y[64]`, `trajectory_num_points`, `trajectory_current_point_idx`, `trajectory_transition_tolerance`, `trajectory_seg_start_x`, `trajectory_seg_start_y`
   - `start_x`, `start_y`, `last_x`, `last_y`, `path_x`, `path_y`, `path_len`, `path_theta`, `dist_ref`, `dist_traveled`
   - `target_speed_for_ramping`, `current_start_speed`, `current_end_speed`, `max_accel`
   - `last_v_profile`, `last_v_cmd`, `last_w_cmd`, `last_step_theta`, `turn_integral`, `stall_time_ms`, `align_final_heading`
   - `start_time_ms`, `last_step_time_ms`, `motion_type`, `motion_in_progress`

### 3.2 `pybricks/robotics/pb_type_mdrobotbase.c`
1. **Implemented Frame Dispatcher `pb_type_mdrobotbase_motion_iterate_once`**:
   - Computes single-tick state updates ($\Delta t = \text{now} - \text{last\_step\_time\_ms}$).
   - Updates odometry via `pbio_mdrobotbase_update_state(self->rb, gyro_heading)`.
   - Handles `PBIO_MDROBOTBASE_MOTION_NAVIGATE`:
     - Checks target distance arrival ($d \le \text{tolerance}$) and plane-crossing vector dot products ($\mathbf{v}_{\text{path}} \cdot \mathbf{v}_{\text{rem}} \le 0$).
     - Computes cosine S-curve velocity ramping for acceleration and deceleration.
     - Computes LQR cross-track error feedback ($\mathbf{u} = -\mathbf{K}\mathbf{e}$) or Stanley cross-track error correction for PID control.
     - Handles optional final orientation turn-in-place alignment (`align_final_heading`).
     - Detects linear and angular motor stall conditions ($v_{\text{raw}} < 10\text{ mm/s}$ for $>250\text{ms}$).
   - Handles `PBIO_MDROBOTBASE_MOTION_TURN`:
     - Computes proportional, integral, and derivative heading error feedback ($e_{\theta} = \theta_{\text{target}} - \theta_{\text{gyro}}$).
     - Applies trapezoidal angular speed profiling.
   - Handles `PBIO_MDROBOTBASE_MOTION_PIVOT`:
     - Locks the stationary pivot wheel while driving the active wheel according to heading error $e_{\theta}$.
   - Handles `PBIO_MDROBOTBASE_MOTION_TRAJECTORY`:
     - Integrates multi-waypoint Pure Pursuit look-ahead navigation across `trajectory_points_x`/`y`.
     - Automatically transitions to subsequent waypoints upon crossing plane boundaries.

2. **Refactored Public Python Method Wrappers**:
   - `navigate_to_goal`, `go_forward`, `go_backward`, `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, `follow_trajectory` now initialize the C state fields on `self->rb` and immediately return `pb_type_mdrobotbase_wait_or_await(self)`.

---

## 4. Verification and Validation

1. **Unit Test Verification**:
   - Ran `test-pbio` suite covering `lib/pbio/test/src/test_mdrobotbase.c` containing `test_mdrobotbase_basics` and `test_mdrobotbase_motion_state`.
   - Build compiled cleanly without warnings or errors in `pb_type_mdrobotbase.c`.

---

## 5. Conclusion
All movement operations in `MDRobotBase` now natively support non-blocking coroutine execution in native C under MicroPython's cooperative event loop. Both synchronous calls and `await` coroutine dispatches execute cleanly without freezing or premature completion.
