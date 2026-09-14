# G-MDRB-036 Strict Persistence Window & Startup Readiness Retry Certification Report

- **Date & Timestamp:** 2026-09-14T13:07:00+07:00
- **Author:** Antigravity Engineering Agent
- **Target Goal:** G-MDRB-036 (Discrete Algebraic Riccati Equation & Optimal Tracking Controller)
- **Topic:** Elimination of False "MDRobotBase motor is not connected" Alarms via Strict Persistence Conjunction (`&&`), Immediate Kernel Update Loop Guardianship, and Startup Reset State Retry Loop
- **Branch:** `feature/mdrobotbase-enhancement`

---

## 1. Root Cause Analysis (5-Why Decomposition)

### Problem Statement
On live hardware running Pybricks MicroPython (LEGO PrimeHub / SPIKE Prime), initializing or running `MDRobotBase` with physically connected motors incorrectly triggered:
```text
OSError: MDRobotBase motor is not connected
```
while the stable `master` branch operated without error.

### 5-Why Analysis
1. **Why did the robot raise `OSError: MDRobotBase motor is not connected`?**
   Because `pbio_mdrobotbase_update_state()` or `pbio_mdrobotbase_reset_state()` returned `PBIO_ERROR_NO_DEV`.
2. **Why did `update_state` return `PBIO_ERROR_NO_DEV` despite motors being physically connected?**
   Because the persistent failure condition evaluated `left_persistent = (left_failures >= 20 || elapsed >= 500ms)`. When `update_state` returned `PBIO_ERROR_AGAIN`, the tight synchronous async wait loop (`pb_type_async_wait_or_await`) spun in microseconds on the ARM Cortex-M4, executing 20 iterations in less than 2 milliseconds! The `||` (OR) branch tripped instantly, declaring the motor disconnected before the 500 ms window ever elapsed.
3. **Why did `reset_state` fail on startup?**
   Because `pbio_mdrobotbase_reset_state()` made a single, instantaneous call to `pbio_servo_get_state_control()`. If this call occurred during port LUMP mode switching or UART synchronization, it returned `PBIO_ERROR_NO_DEV` with zero retry, immediately causing `pb_type_MDRobotBase_reset_state` to raise `OSError`.
4. **Why did stable `master` not have this issue?**
   In `master`, the motor connection check relied exclusively on `pbio_servo_update_loop_is_running(srv)` (matching official Pybricks `DriveBase`). The return value of `update_state` was ignored during motion steps, and transient UART LUMP reading hiccups never aborted the motion.
5. **What is the definitive, physically sound resolution?**
   - Use `pbio_servo_update_loop_is_running()` as the authoritative signal for immediate physical motor disconnection.
   - If both servo update loops are running, any transient read errors (`PBIO_ERROR_NO_DEV`, `PBIO_ERROR_IO`, `PBIO_ERROR_AGAIN`) must satisfy BOTH elapsed time $\ge 500$ ms AND consecutive failure ticks $\ge 20$ (`&&`, NOT `||`) before reporting disconnection.
   - Provide a 500 ms retry window with `mp_hal_delay_ms(5)` and `pbio_os_request_poll()` during `reset_state()` to allow hardware LUMP handshakes to complete transparently.

---

## 2. Technical Implementation Details (WHERE, WHY, FOR WHOM, HOW)

### A. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c)
- **WHERE:** Lines 1148–1172 (`pbio_mdrobotbase_reset_state`) and Lines 1238–1255 (`pbio_mdrobotbase_update_state`).
- **WHY:** Guard against false disconnection while keeping immediate detection if a cable is actually unplugged.
- **FOR WHOM:** Pybricks embedded runtime, robotics control tasks, and physical PrimeHub hardware.
- **HOW:**
  1. In `pbio_mdrobotbase_reset_state`: If `err_l != PBIO_SUCCESS || err_r != PBIO_SUCCESS`, check `pbio_servo_update_loop_is_running()`. If either loop is stopped, return `PBIO_ERROR_NO_DEV`. If both loops are running, treat read errors as transient and return `PBIO_ERROR_AGAIN`.
  2. In `pbio_mdrobotbase_update_state`:
     ```c
     bool left_loop_stopped = !pbio_servo_update_loop_is_running(rb->left);
     bool right_loop_stopped = !pbio_servo_update_loop_is_running(rb->right);

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

### B. [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)
- **WHERE:** Lines 712–727 (`pb_type_mdrobotbase_motion_iterate_once`) and Lines 1151–1179 (`pb_type_MDRobotBase_reset_state`).
- **WHY:** Restore parity with `DriveBase` and allow background protothreads to service UART buffers during transient retries.
- **FOR WHOM:** MicroPython user scripts executing synchronous or asynchronous robot base motions.
- **HOW:**
  1. Added physical update loop check at top of `motion_iterate_once`:
     ```c
     if (!pbio_servo_update_loop_is_running(self->rb->left) ||
         !pbio_servo_update_loop_is_running(self->rb->right)) {
       mdrobotbase_motion_stop(self, true);
       return pb_type_mdrobotbase_raise_motion_error(self, PBIO_ERROR_NO_DEV);
     }
     ```
  2. Added `pbio_os_request_poll()` when `odometry_err == PBIO_ERROR_AGAIN` to yield CPU time to background UART LUMP protothreads.
  3. Wrapped `pb_type_MDRobotBase_reset_state` in a 500 ms retry loop with `mp_hal_delay_ms(5)` and `pbio_os_request_poll()`.

### C. [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py)
- **WHERE:** Lines 582–589 (`update_state`), Lines 1095–1102 (`navigate_to_goal`), Lines 1250–1257 (`follow_trajectory`).
- **WHY:** Ensure VirtualHub behavioral simulation strictly matches C kernel semantics.
- **FOR WHOM:** Python automated test harness and CI/CD pipelines.
- **HOW:** Changed `or` to `and` between failure tick threshold ($\ge 20$) and monotonic time threshold ($\ge 0.500$s).

---

## 3. Empirical Verification & Test Matrix

### A. VirtualHub Python Test Suite
- **Command:** `pytest tests/virtualhub/robotics`
- **Result:** 146 passed, 29 skipped (async def warnings only), 0 failed in 27.05s.

### B. PBIO Native C Test Suite
- **Command:** `make -C lib/pbio/test && ./lib/pbio/test/build/test-pbio`
- **Result:** 96 tests ok, 0 failed.

### C. ARM Cortex-M4 Firmware Compilation
- **Commands:** `make -C bricks/primehub_f4 && make -C bricks/primehub`
- **Result:** Clean build; `firmware.zip` generated with 0 errors and 0 warnings.
- **Image Size:** 355,092 bytes text (well within 1 MB flash limit).

### D. Governance & Code Formatting
- **Commands:** `git diff --check && bash scripts/ci/governance-check.sh`
- **Result:** Clean whitespace, 0 lint errors, 100% governance check passed.

---

## 4. Hardware Retest Gate Status
- **Simulation & Native Unit Tests:** Fully validated and green.
- **Live Hardware Gate:** Pending physical validation by the human operator on the PrimeHub robot base to confirm that physical motor movement executes without false disconnection errors.
- **Goal Status:** Maintained in `in_progress` / `review` until physical hardware run is confirmed by the operator.
