# G-MDRB-036 Per-Motor Consecutive Failure Tracking & Persistence Window Certification Report

**Document ID:** `20260914_124500_g_mdrb_036_per_motor_failure_tracking_and_persistence_window_certification`  
**Date:** 2026-09-14T12:45:00+07:00  
**Status:** Certified (Software & Simulation Gates Green — Physical Hardware Retest Pending)  
**Target Goal:** [G-MDRB-036](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-036.md)  
**Branch:** `feature/mdrobotbase-enhancement`  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Regression vs Stable `master`
On the stable `master` branch, physical LEGO Technic / Spike Prime smart motors connected to PrimeHub ports initialized and navigated reliably because transient servo-state read failures (`PBIO_ERROR_NO_DEV` or `PBIO_ERROR_IO`) during startup or control loop execution were not treated as fatal single-tick disconnections.

On `feature/mdrobotbase-enhancement`, strict odometry and servo-state validation was introduced to ensure fail-closed safety. However, the initial feature implementation treated a single `PBIO_ERROR_NO_DEV` returned by `pbio_servo_get_state_control()` as immediate proof that the physical motor was disconnected:
```text
pbio_servo_get_state_control(rb->left, &state_l)
  → returns PBIO_ERROR_NO_DEV / PBIO_ERROR_IO (transient bus/control-loop unready)
  → immediately stops motors
  → raises OSError: "MDRobotBase motor is not connected"
```

### 1.2 Why the Previous Startup Retry Was Insufficient
1. **Startup-Only Filter (`!self->motion_started`):** The previous retry mechanism was restricted exclusively to the pre-motion initialization phase. Any transient state-read glitch occurring after the first successful control iteration immediately aborted motion and faulted the robot.
2. **Timing Coupling:** Motor readiness retry was evaluated in tandem with IMU calibration readiness, creating race conditions where UART bus auto-baud delays triggered motor disconnection faults before the persistence policy could activate.
3. **Control-Loop Readiness Conflation:** `pbio_servo_update_loop_is_running()` was erroneously conflated with physical device connectivity, halting valid connected motors whose control loop had not yet scheduled its first tick.

---

## 2. Architectural Solution: Per-Motor Failure Tracking & Persistence Window

### 2.1 Consecutive Failure Policy
A transient single-read failure on the UART smart motor bus must never abort motion. Instead, a robust consecutive failure policy is enforced per motor:
- **Single `PBIO_ERROR_NO_DEV` / `PBIO_ERROR_IO` / `PBIO_ERROR_AGAIN` / `PBIO_ERROR_BUSY`:** Treated as transient; returns `PBIO_ERROR_AGAIN` to yield back to the async scheduler for an immediate retry next tick.
- **Consecutive Failures:** Counter increments on each successive failed read; the failure start timestamp is latched on the first failing tick.
- **Successful Read:** Immediately resets the failure counter to 0 and clears the failure start timestamp.
- **Confirmed Persistent Disconnection:** Only reported when failures persist continuously for at least **20 consecutive control ticks** or **500 milliseconds**.

### 2.2 Core Struct Extensions ([`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h))
```c
#define PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS (500)
#define PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS (20)

struct _pbio_mdrobotbase_t {
    ...
    uint32_t left_state_failures;
    uint32_t right_state_failures;
    uint32_t left_failure_start_ms;
    uint32_t right_failure_start_ms;
};

void pbio_mdrobotbase_get_failure_counters(pbio_mdrobotbase_t *rb, uint32_t *left, uint32_t *right);
```

### 2.3 Kernel Odometry Implementation ([`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c))
```c
pbio_error_t pbio_mdrobotbase_update_state(pbio_mdrobotbase_t *rb, float gyro_heading) {
    ...
    pbio_control_state_t state_l, state_r;
    pbio_error_t err_l = pbio_servo_get_state_control(rb->left, &state_l);
    pbio_error_t err_r = pbio_servo_get_state_control(rb->right, &state_r);

    uint32_t now = pbdrv_clock_get_ms();

    // Per-motor failure tracking & timestamp latching
    if (err_l == PBIO_SUCCESS) {
        rb->left_state_failures = 0;
        rb->left_failure_start_ms = 0;
    } else {
        rb->left_state_failures++;
        if (rb->left_failure_start_ms == 0) {
            rb->left_failure_start_ms = now;
        }
    }

    if (err_r == PBIO_SUCCESS) {
        rb->right_state_failures = 0;
        rb->right_failure_start_ms = 0;
    } else {
        rb->right_state_failures++;
        if (rb->right_failure_start_ms == 0) {
            rb->right_failure_start_ms = now;
        }
    }

    // Evaluate persistent failure window (>= 20 ticks or >= 500 ms)
    bool left_persistent = (err_l != PBIO_SUCCESS) &&
        ((rb->left_state_failures >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS) ||
         (rb->left_failure_start_ms > 0 && (uint32_t)(now - rb->left_failure_start_ms) >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS));

    bool right_persistent = (err_r != PBIO_SUCCESS) &&
        ((rb->right_state_failures >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_TICKS) ||
         (rb->right_failure_start_ms > 0 && (uint32_t)(now - rb->right_failure_start_ms) >= PBIO_MDROBOTBASE_STATE_FAIL_PERSIST_MS));

    if (left_persistent || right_persistent) {
        pbio_error_t p_err_l = left_persistent ? err_l : PBIO_SUCCESS;
        pbio_error_t p_err_r = right_persistent ? err_r : PBIO_SUCCESS;

        if (p_err_l == PBIO_ERROR_NO_DEV || p_err_r == PBIO_ERROR_NO_DEV) {
            return PBIO_ERROR_NO_DEV;
        }
        if (p_err_l == PBIO_ERROR_IO || p_err_r == PBIO_ERROR_IO) {
            return PBIO_ERROR_IO;
        }
        return p_err_l != PBIO_SUCCESS ? p_err_l : p_err_r;
    }

    // Transient failure: preserve odometry baseline, request retry
    if (err_l != PBIO_SUCCESS || err_r != PBIO_SUCCESS) {
        return PBIO_ERROR_AGAIN;
    }
    ...
}
```

### 2.4 MicroPython Motion Loop Parity ([`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c))
In `pb_type_mdrobotbase_motion_iterate_once`:
- Removed the restrictive `!self->motion_started` filter so transient retries (`PBIO_ERROR_AGAIN`) apply transparently across both startup and mid-motion phases.
- Transient errors return `PBIO_ERROR_AGAIN` directly to the Pybricks cooperative task scheduler.
- Only confirmed persistent failures trigger `mdrobotbase_motion_stop(self, true)` and raise `OSError("MDRobotBase motor is not connected")` or `OSError("MDRobotBase motor communication failed")`.
- Decoupled `pbio_servo_update_loop_is_running()` from physical presence detection.

---

## 3. Comprehensive Verification Matrix

### 3.1 Five Hardware-Style Regression Tests
In [`tests/virtualhub/robotics/test_mdrobotbase_lqr.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_lqr.py) and [`lib/pbio/test/src/test_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/test/src/test_mdrobotbase.c):

1. **Connected Motor with Delayed Control-Loop Readiness:** Simulates a 5-tick transient unreadiness during startup. Robot retries cleanly, executes motion to destination, and clears failure counters to `(0, 0)`.
2. **One Transient State-Read Failure:** Injects a 1-tick mid-motion read glitch. Motion continues seamlessly without aborting.
3. **Repeated State-Read Failures:** Generates continuous read failures exceeding 20 ticks / 500 ms. Verifies the robot halts fail-closed and raises descriptive `OSError`.
4. **Actual Disconnected Motor:** Disconnects motor (`connected = False` / `PBIO_ERROR_NO_DEV`). Confirms `OSError("MDRobotBase motor is not connected")` is raised after the persistence window.
5. **Recovery After Successful Read:** Injects intermittent errors followed by a valid read. Confirms failure counter resets to 0.

### 3.2 Automated Test Execution Results

| Test Suite | Command | Result | Details |
|---|---|---|---|
| **PBIO Native C Suite** | `./lib/pbio/test/build/test-pbio` | **96/96 OK (0 skipped)** | Passed new `test_mdrobotbase_per_motor_failure_tracking_and_persistence_window` |
| **VirtualHub LQR Suite** | `pytest tests/virtualhub/robotics/test_mdrobotbase_lqr.py` | **75/75 Passed** | All 5 regression tests + all LQR DARE tests green |
| **VirtualHub Full Suite** | `pytest tests/virtualhub/robotics` | **146/146 Passed** | Zero regressions across navigation, turns, color, and lifecycle |
| **Bare-Metal ARM Firmware** | `make -C bricks/primehub_f4` | **Exit code 0** | Flash: 354,904 B (.text), 736 B (.data), 43,632 B (.bss) |
| **Whitespace Cleanliness** | `git diff --check` | **Clean** | 0 whitespace or formatting errors |
| **CI Governance** | `bash scripts/ci/governance-check.sh` | **Passed** | Clean submodule state, commit format validated |

---

## 4. Hardware Retest Gate & Next Steps

> [!IMPORTANT]
> In accordance with the acceptance criteria: **Do not mark G-MDRB-036 done until hardware retest passes on live PrimeHub robot.**

1. Flash the generated `bricks/primehub/build/firmware.zip` onto the physical PrimeHub robot.
2. Confirm that the exact connected robot that worked on `master` initializes and navigates smoothly on `feature/mdrobotbase-enhancement`.
3. Verify that physical disconnection of a motor cable during motion triggers `OSError: MDRobotBase motor is not connected` after ~500 ms without crashing the MicroPython VM.
4. Mark G-MDRB-036 `approved` → `done` following human review and sign-off.
