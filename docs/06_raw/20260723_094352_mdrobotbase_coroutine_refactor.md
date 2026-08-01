# Deep Technical Specification: Native C MDRobotBase Coroutine Architecture & Non-Movement Fix

**Date & Time**: 2026-07-23T09:43:52+07:00  
**Workspace**: `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target Module**: `pybricks.robotics.MDRobotBase` (`pybricks/robotics/pb_type_mdrobotbase.c` & `lib/pbio/src/mdrobotbase.c`)

---

## Executive Summary & Root Cause Analysis

### 1. The Non-Movement Bug ("Nothing Moves")
Following a recent firmware update, invoking `MDRobotBase` movement methods within Pybricks tasks or coroutines resulted in zero physical robot movement. 

Through code inspection of `pybricks/robotics/pb_type_mdrobotbase.c`:
- `navigate_to_goal` checked `pb_module_tools_run_loop_is_active()` to select between `pb_type_mdrobotbase_wait_or_await(self)` and `pb_type_MDRobotBase_navigate_to_goal_internal`.
- When called within an active MicroPython run loop (`run_task` / `asyncio`), `pb_module_tools_run_loop_is_active()` returns `true`.
- The initialization path failed to set `self->rb->timeout_ms` (leaving it as uninitialized memory or `0`).
- The iteration callback `pb_type_mdrobotbase_motion_iterate_once` contained the following exit check:
  ```c
  if (dist_to_goal <= self->rb->tolerance_dist || (self->rb->timeout_ms > 0 && elapsed_ms >= self->rb->timeout_ms))
  ```
- Uninitialized memory caused `timeout_ms` check or distance tolerance check to evaluate to true on frame 0, immediately returning `PBIO_SUCCESS`. MicroPython interpreted this as `StopIteration`, terminating the awaitable instantly before motor duty cycles could be applied.
- Furthermore, `pb_type_mdrobotbase_motion_iterate_once` was a crude stub that lacked LQR/PID state updates, path projection, velocity ramping, or heading integration.

### 2. Blocking Synchronous Loops Breaking Coroutines
Methods `go_forward`, `go_backward`, `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, and `follow_trajectory` were written with internal C `while (1)` loops containing `mp_hal_delay_ms(...)`. 
When executed inside MicroPython tasks:
- C-level `while (1)` loops bypass MicroPython's cooperative event loop dispatch mechanism (`pb_type_async_wait_or_await`).
- The main event loop freezes, background tasks stall, and concurrent coroutine execution fails.

---

## Architectural Mechanics of Pybricks Awaitables

Pybricks implements async coroutine support using `pb_type_async_wait_or_await`:

```
                 +-----------------------------------+
                 | Python API Motion Call            |
                 | e.g. robot.go_forward(200)       |
                 +-----------------+-----------------+
                                   |
                pb_module_tools_run_loop_is_active()?
                                  / \
                                 /   \
                         YES    /     \   NO
                               /       \
                              v         v
            +-------------------+     +-------------------------+
            | Async Runloop Mode|     | Sync Blocking Mode      |
            | Return Async Obj  |     | Run while(iter_once ==  |
            | (Yields ticks)    |     | AGAIN) mp_event_wait    |
            +-------------------+     +-------------------------+
```

When an operation provides an `iter_once` callback returning `pbio_error_t`:
1. Returning `PBIO_ERROR_AGAIN` indicates the operation is still active. In async mode, MicroPython yields control to other tasks for 1 tick. In sync mode, C processes background events (`mp_event_wait_indefinite()`) and re-invokes `iter_once`.
2. Returning `PBIO_SUCCESS` indicates motion completion. The awaitable raises `StopIteration` in async mode or completes in sync mode.
3. Returning an error code (e.g. `PBIO_ERROR_NO_DEV`) triggers a Python exception.

---

## Non-Blocking State Machine Design for MDRobotBase

### 1. Shared Motion Structure (`pbio_mdrobotbase_t`)
`pbio_mdrobotbase_t` is extended with state parameters representing active non-blocking motion:

```c
typedef enum {
    PB_MDROBOTBASE_MOTION_NONE = 0,
    PB_MDROBOTBASE_MOTION_NAVIGATE,
    PB_MDROBOTBASE_MOTION_TURN,
    PB_MDROBOTBASE_MOTION_PIVOT,
    PB_MDROBOTBASE_MOTION_TRAJECTORY
} pbio_mdrobotbase_motion_type_t;
```

State fields stored in `pbio_mdrobotbase_t`:
- `motion_type`: Active motion mode.
- `start_time_ms`, `last_step_time_ms`: Timing counters.
- **Navigate & Drive**: `goal_x`, `goal_y`, `target_speed`, `start_speed`, `end_speed`, `accel_d`, `decel_d`, `tolerance_dist`, `timeout_ms`, `is_backward`, `use_ramping`, `stop_behavior`, `start_x`, `start_y`, `path_len`, `path_x`, `path_y`.
- **Turn**: `target_angle`, `speed_deg_s`, `tolerance_deg`, `timeout_ms`, `accel_angle`, `start_speed`, `decel_angle`, `end_speed`, `stop_behavior`, `integral`, `stall_time_ms`, `last_theta`, `turn_angle_total`.
- **Pivot**: Same as Turn, plus `pivot_left` (bool).
- **Trajectory**: `points` array pointer, `num_points`, `current_point_idx`, `transition_tolerance`, `seg_start_x`, `seg_start_y`.

### 2. Dispatcher Architecture (`pb_type_mdrobotbase_motion_iterate_once`)
On every tick of `pb_type_mdrobotbase_motion_iterate_once`:
1. Check motor update loop state (`pbio_servo_update_loop_is_running`).
2. Fetch current IMU heading (`pbio_imu_get_heading`) and update odometry (`pbio_mdrobotbase_update_state`).
3. Switch on `self->rb->motion_type`:
   - `PB_MDROBOTBASE_MOTION_NAVIGATE`: Execute 1 frame of LQR / PID linear tracking, compute velocity ramping, calculate differential DPS, command servos via `pbio_servo_run_forever`. Check distance to goal, path plane crossing, stall, and timeout.
   - `PB_MDROBOTBASE_MOTION_TURN`: Execute 1 frame of PID turn control, update heading error integral, apply derivative damping and angular speed limits. Check target angle arrival, stall, and timeout.
   - `PB_MDROBOTBASE_MOTION_PIVOT`: Hold stationary wheel, execute 1 frame of PID speed control on active wheel. Check angle arrival, stall, and timeout.
   - `PB_MDROBOTBASE_MOTION_TRAJECTORY`: Track current segment, check waypoint transition boundary, advance waypoint index, run LQR steering frame. Check final waypoint arrival.
4. If completed:
   - Command `pbio_servo_stop` with specified stop behavior (`HOLD`, `BRAKE`, `COAST`).
   - Reset encoder references if holding/braking.
   - Reset `motion_type = PB_MDROBOTBASE_MOTION_NONE`.
   - Return `PBIO_SUCCESS`.
5. If in progress:
   - Return `PBIO_ERROR_AGAIN`.

### 3. Unified Method Wrappers
Each API method (`navigate_to_goal`, `go_forward`, `go_backward`, `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, `follow_trajectory`):
1. Parses positional and keyword arguments.
2. Formulates motion parameters into `self->rb`.
3. Sets `self->rb->motion_type` appropriately.
4. Invokes `pb_type_async_wait_or_await(&config, &self->last_awaitable, true)`.

---

## Verification & Quality Assurance Strategy

1. **Compilation**: Clean build using `make -C bricks/virtualhub` and `./test-virtualhub.sh`.
2. **C Protocol Testing**: Execute `test-pbio.sh`.
3. **Coroutine & Dual Mode Validation**: Run `spike-prime-mdrobotkids/code/sample.py` and `autotune_suite.py` under Pybricks MicroPython runtime to confirm:
   - Smooth movement execution without freezing.
   - Correct handling of `await` in coroutines (`run_task`).
   - Correct behavior when called synchronously.
