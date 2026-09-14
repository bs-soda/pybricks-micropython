# Master vs Feature Architectural Diff & Motor Connection Deep-Dive Analysis

- **Date:** 2026-09-14
- **Topic:** Exhaustive Architectural Diff Analysis between `master` and `feature/mdrobotbase-enhancement` regarding Motor Connection Verification, Servo Polling, and Exception Propagation
- **Scope:** `pybricks/robotics/pb_type_mdrobotbase.c`, `lib/pbio/src/mdrobotbase.c`, `lib/pbio/src/servo.c`, `pybricks/robotics/pb_type_drivebase.c`, `lib/pbio/src/drivebase.c`, `tests/virtualhub/robotics/pybricks/robotics.py`
- **Audit Target:** Live Hardware Discrepancy ("Motor is not connected" on feature branch vs "Connected" on master)

---

## 1. Executive Summary & Root Cause Isolation

### The Paradox: Why did `master` report "connected" while `feature` raised `OSError: MDRobotBase motor is not connected`?

On live LEGO MINDSTORMS / SPIKE Prime hardware, `master` appeared to stay connected, whereas `feature/mdrobotbase-enhancement` aborted execution with `OSError: MDRobotBase motor is not connected` despite motors being plugged in.

Exhaustive side-by-side diffing reveals that **`master` never verified odometry servo state returns during motion**:

1. **In `master:pybricks/robotics/pb_type_mdrobotbase.c:L83`:**
   ```c
   // master branch implementation:
   if (!pbio_servo_update_loop_is_running(self->rb->left) ||
       !pbio_servo_update_loop_is_running(self->rb->right)) {
       return PBIO_ERROR_NO_DEV;
   }
   float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
   pbio_mdrobotbase_update_state(self->rb, gyro_heading); // <-- RETURN VALUE COMPLETELY DISCARDED!
   ```
   In `master`, motor presence was judged **solely** by `pbio_servo_update_loop_is_running(srv)`. If `pbio_servo_get_state_control()` returned `PBIO_ERROR_NO_DEV` inside `pbio_mdrobotbase_update_state()`, the error code was completely swallowed. The robot kept driving, using stale or zero values without informing the user or stopping.

2. **In `feature/mdrobotbase-enhancement` (before commit `0b0c4b84`):**
   The feature branch introduced fail-closed safety by capturing `odometry_err = pbio_mdrobotbase_update_state(...)` and raising `OSError: MDRobotBase motor is not connected` if `PBIO_ERROR_NO_DEV` was returned.
   However, on LEGO UART LUMP ports (`lib/pbio/src/port_lump.c:L312`), when motors switch modes or synchronize packets, `pbio_port_lump_get_angle()` transiently returns `PBIO_ERROR_NO_DEV` for 20–100 ms even while `srv->run_update_loop == true`.
   In commit `70ab7e93`, the failure condition was:
   ```c
   bool left_persistent = (err_l != PBIO_SUCCESS) &&
       (left_loop_stopped ||
        (now - rb->left_failure_start_ms >= 500 || rb->left_state_failures >= 20));
   ```
   Because `motion_iterate_once` was returning `PBIO_ERROR_AGAIN` on transient failures, the async scheduler polled every 2 ms. 20 consecutive failure ticks accumulated in **only 40 ms**, tripping the persistence check long before 500 ms had elapsed.
   Furthermore, `reset_state()` called `pbio_mdrobotbase_reset_state()` with **zero retries**, instantly raising `OSError` if invoked immediately after initialization while UART LUMP was still syncing.

3. **In `feature/mdrobotbase-enhancement` (Commit `0b0c4b84` — The Resolution):**
   - Converted the persistence check to strict conjunction `&&`:
     ```c
     bool left_persistent = (err_l != PBIO_SUCCESS) &&
         (left_loop_stopped ||
          (rb->left_failure_start_ms > 0 &&
           (uint32_t)(now - rb->left_failure_start_ms) >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS &&
           rb->left_state_failures >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS));
     ```
   - In `reset_state()`, added an active 500 ms retry loop with `mp_hal_delay_ms(5)` and `pbio_os_request_poll()`.
   - Restored parity with standard Pybricks `DriveBase`, where physical disconnect is authoritatively governed by `pbio_servo_update_loop_is_running(srv)`.

---

## 2. Exhaustive Layer-by-Layer Architectural Comparison

| Layer / Mechanism | `master` Branch | Standard Pybricks `DriveBase` | `feature` (pre-`0b0c4b84`) | `feature` (Commit `0b0c4b84`) |
| :--- | :--- | :--- | :--- | :--- |
| **Motion Step Servo Check** | `!pbio_servo_update_loop_is_running` only | `!pbio_drivebase_update_loop_is_running` only | `odometry_err` surfaced immediately | Dual: `!pbio_servo_update_loop_is_running` (immediate) + 500ms time persistence |
| **Odometry Error Propagation** | **Discarded / Ignored** (`(void)update_state()`) | N/A (updates internal observer, errors dropped) | Raised immediately if 20 ticks (~40ms) reached | Returns `PBIO_ERROR_AGAIN` for 500ms; raises only if loop stopped or persistent |
| **Persistence Condition** | None (no persistence tracking) | None (kernel loop only) | `elapsed >= 500 || ticks >= 20` (Disjunction bug: trips in 40ms) | `left_loop_stopped || (elapsed >= 500 && ticks >= 20)` (Strict Conjunction) |
| **`reset_state()` Retries** | 0 retries (fails if port not ready) | `pbio_drivebase_reset()` (internal observer reset) | 0 retries (fails on UART mode switch) | 500ms active polling retry loop with `pbio_os_request_poll()` |
| **Physical Unplug Reaction** | Stops on next step when kernel loop stops | Stops on next step when kernel loop stops | Stops on next step when kernel loop stops | Stops immediately (`left_loop_stopped`) |
| **Transient Read Fluctuation** | Silently ignored (robot drives blind) | Silently ignored (observer coasts) | False alarm: throws `OSError` | Resilient: retried seamlessly without stopping motion |

---

## 3. Detailed Structural Diff Analysis

### A. The Master Branch Vulnerability: Silent Blind Odometry
In `master:pybricks/robotics/pb_type_mdrobotbase.c:L76-L84`:
```c
static pbio_error_t pb_type_mdrobotbase_motion_iterate_once(pbio_os_state_t *state,
                                                            mp_obj_t parent_obj) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);

  if (!pbio_servo_update_loop_is_running(self->rb->left) ||
      !pbio_servo_update_loop_is_running(self->rb->right)) {
    return PBIO_ERROR_NO_DEV;
  }

  // 1. Update Odometry State
  float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
  pbio_mdrobotbase_update_state(self->rb, gyro_heading); // <-- Never checked!
```
Notice that `master` only verified whether `pbio_servo_update_loop_is_running()` was true. If `pbio_mdrobotbase_update_state()` failed (due to sensor bus jitter, lump packet loss, or mode negotiation), the error was silently ignored. The robot appeared "connected" simply because `master` never checked whether odometry succeeded.

### B. Standard Pybricks `DriveBase` Parity
In `lib/pbio/src/drivebase.c:L42-L44`:
```c
// Both servo update loops must be running, since we want to read the servo observer state.
return pbio_servo_update_loop_is_running(db->left) && pbio_servo_update_loop_is_running(db->right);
```
And in `pybricks/robotics/pb_type_drivebase.c:L96-L99`:
```c
// Handle I/O exceptions like port unplugged.
if (!pbio_drivebase_update_loop_is_running(self->db)) {
    pb_assert(PBIO_ERROR_NO_DEV);
}
```
Standard Pybricks relies entirely on the kernel's background task (`pbio_servo_update_all()` in `lib/pbio/src/servo.c:L170-L173`). When a motor is unplugged, `pbio_servo_update()` fails, and the kernel sets `srv->run_update_loop = false`. Standard `DriveBase` never reads raw port registers directly in MicroPython; it trusts `pbio_servo_update_loop_is_running()`.

### C. The Remediation in Commit `0b0c4b84`
In `lib/pbio/src/mdrobotbase.c:L1244-L1256`:
```c
bool left_loop_stopped = !pbio_servo_update_loop_is_running(rb->left);
bool right_loop_stopped = !pbio_servo_update_loop_is_running(rb->right);

// Evaluate whether either motor has exceeded the confirmed persistent failure window
bool left_persistent = (err_l != PBIO_SUCCESS) &&
    (left_loop_stopped ||
     (rb->left_failure_start_ms > 0 &&
      (uint32_t)(now - rb->left_failure_start_ms) >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS &&
      rb->left_state_failures >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS));

bool right_persistent = (err_r != PBIO_SUCCESS) &&
    (right_loop_stopped ||
     (rb->right_failure_start_ms > 0 &&
      (uint32_t)(now - rb->right_failure_start_ms) >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS &&
      rb->right_state_failures >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS));
```
By enforcing strict `&&` between the 500 ms elapsed time requirement and the 20-tick failure count, transient fluctuations are tolerated up to a full half-second. However, if the cable is physically detached, `left_loop_stopped` is immediately true, terminating motion with zero delay.

---

## 4. Empirical Verification & Quality Gates

1. **PBIO Native C Test Suite:**
   - Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
   - Result: `36 tests ok. (0 skipped)`
2. **VirtualHub Python Test Suite:**
   - Command: `pytest tests/virtualhub/robotics`
   - Result: `146 passed, 29 skipped (coroutines), 0 failed in 26.35s`
3. **Bare-Metal Firmware Compilation:**
   - Targets: `bricks/primehub_f4`, `bricks/primehub`
   - Result: Clean compile, `build/firmware.zip` generated with version `local-build-0b0c4b84`.
