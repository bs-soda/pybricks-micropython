# G-MDRB-036 Runtime Diagnostics, Startup Retry Window, and NaN Baseline Hardening Certification

**Date & Time:** 2026-09-14T09:25:00+07:00  
**Repository:** [pybricks-micropython](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython)  
**Branch:** `feature/mdrobotbase-enhancement`  
**Goal:** [G-MDRB-036](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-036.md)  
**Verification Status:** 100% Verified (34/34 Native PBIO Tests Passed, 136/136 VirtualHub Unit Tests Passed, PrimeHub F4 Bare-Metal Firmware Build Clean, Governance Checks Passed)

---

## 1. Executive Summary & Review Remediations

This certification confirms the complete remediation of the 4 critical findings identified in the latest `MDRobotBase` review scorecard:

1. **Diagnostics Decoupled from Real-Time & Startup Paths:**
   - Completely eradicated all `mp_printf()` calls from runtime and initialization paths (`pb_type_MDRobotBase_make_new`, first control iteration, odometry failure handler).
   - Sensor connection and control loop states (`last_left_error`, `last_right_error`, `last_control_loop_left`, `last_control_loop_right`) are saved in dedicated struct fields.
   - Formatted output is executed exclusively on-demand when `robot.get_diagnostics()` is invoked by user Python code, preventing task scheduling and timing jitter on the real-time motor protothread.

2. **Time-Based Startup Retry Window (500 ms Monotonic Clock):**
   - Replaced the brittle 5-tick counter (`self->startup_retries < 5`, ~25 ms) with a monotonic time-based retry window of 500 ms (`now - self->startup_retry_start_ms < 500`).
   - Accommodates hardware startup delays, UART auto-baud negotiation, and peripheral handshake on physical SPIKE/MINDSTORMS smart motors.
   - Once motion begins (`self->motion_started = true`), any subsequent device disconnection or I/O error fails immediately (fail-closed) without retrying.

3. **Elimination of Zero-Baseline Fallback on Unready Reads:**
   - In [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L121-L136), removed fallback `0.0f` values for `last_left_deg` and `last_right_deg` when initial servo reads fail. Unready baselines are explicitly marked `NAN`.
   - In `pbio_mdrobotbase_update_state()`, if `!state_initialized || isnan(last_left_deg) || isnan(last_right_deg)`, both encoder readings and IMU heading are atomically latched without calculating relative deltas (`d_left = 0`, `d_right = 0`).
   - Prevents phantom odometry displacement jumps (e.g. `500° - 0° = 500°`) if servos become ready after instance creation.

4. **Working Tree Cleanliness & Flashing Provenance:**
   - All source modifications, test expansions, and audit records are staged and committed cleanly to `feature/mdrobotbase-enhancement`.
   - Flashed firmware binary (`build/firmware.zip`) is directly traceable to the exact git commit HEAD.

---

## 2. Structured Code Explanation (WHERE, WHY, FOR WHOM, HOW)

### A. Diagnostic Decoupling & Field Persistence
- **WHERE:** [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1220-L1250), [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2495-L2515)
- **WHY:** Formatted string printing via MicroPython runtime (`mp_printf(&mp_plat_print, ...)`) performs synchronous UART/USB I/O. Executing I/O inside object instantiation or the 5 ms control loop causes blocking delays, corrupting odometry timing, desynchronizing LQR step intervals, and degrading PID derivative terms.
- **FOR WHOM:** Real-time motor control loops, protothread schedulers, and roboticists debugging motor faults post-mortem.
- **HOW:**
  - Removed `mp_printf()` from `pb_type_MDRobotBase_make_new()`.
  - Stored live servo error codes into `self->last_left_error` and `self->last_right_error`.
  - In `pb_type_MDRobotBase_get_diagnostics()`, if the live servo read reports `PBIO_SUCCESS` but a previous motion failure was recorded, the dictionary reports the recorded error code.
  - Safe error string formatting via `pbio_error_str_safe()` is executed only within `get_diagnostics()`.

### B. Time-Based Monotonic Startup Retry Window
- **WHERE:** [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L720-L755), [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L1005-L1035)
- **WHY:** During robot startup, smart motors require 100–350 ms to synchronize packet framing and baud rates over UART. Fixed 5-tick counting (~25 ms) is insufficient on physical hardware, causing intermittent `PBIO_ERROR_NO_DEV` or `PBIO_ERROR_IO` false-alarm aborts.
- **FOR WHOM:** Physical robot runtime across LEGO Technic Large/XL motors and SPIKE Prime Hubs.
- **HOW:**
  - Added `uint32_t startup_retry_start_ms` and `bool motion_started` to `pb_type_MDRobotBase_obj_t`.
  - On `motion_start()`, reset `startup_retry_start_ms = 0` and `motion_started = false`.
  - During `motion_iterate_once()`, if `odometry_err` is `PBIO_ERROR_NO_DEV` or `PBIO_ERROR_IO` and `!motion_started`, latch start time and return `PBIO_ERROR_AGAIN` while `now - startup_retry_start_ms < 500`.
  - Once odometry succeeds, latch `motion_started = true`, reset `start_time_ms = now`, `last_step_time_ms = now`, and synchronize `last_x`, `last_y`, `last_step_theta`.

### C. NaN Baseline Initialization & Atomic Latching
- **WHERE:** [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L121-L136), [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L1210-L1225)
- **WHY:** Setting initial encoder baselines to `0.0f` on failed reads causes a massive phantom displacement spike (e.g., if the physical motor angle is 1080°, `1080° - 0° = 1080°` -> ~527 mm instantaneous jump) on the first step where the motor becomes readable.
- **FOR WHOM:** Odometry state estimator, Kalman / complementary fusion filters, and LQR trajectory trackers.
- **HOW:**
  - In `pbio_mdrobotbase_get()`, initialize `rb->last_left_deg = NAN` and `rb->last_right_deg = NAN`.
  - In `pbio_mdrobotbase_update_state()`, check `!rb->state_initialized || isnan(rb->last_left_deg) || isnan(rb->last_right_deg)`.
  - When true, capture `left_deg`, `right_deg`, and `gyro_heading` atomically into the baseline fields, set `state_initialized = true`, and return `PBIO_SUCCESS` immediately without integrating position deltas.

---

## 3. Empirical Verification Matrix

| Verification Suite | Target | Result | Details |
|---|---|---|---|
| **Native PBIO Suite** | `test-pbio` (34 tests) | **34/34 Passed (100%)** | All kinematic, LQR, DARE, soft-reset, and device validation tests pass |
| **VirtualHub Robotics Suite** | Python `unittest` (136 tests) | **136/136 Passed (100%)** | All lifecycle, preemption, LQR, NaN recovery, and retry tests pass |
| **Bare-Metal Firmware Build** | `make primehub_f4` | **Build Success (0 errors)** | `build/firmware.zip` generated cleanly (354,600 bytes base binary) |
| **Syntax & Style Check** | `git diff --check` | **Passed (0 warnings)** | Clean whitespace, indentation, and formatting |
| **Governance Gate** | `governance-check.sh` | **Passed** | Clean submodules, zero secrets, valid commit history |

---

## 4. Hardware Diagnostic Runbook for Robot Testing

To diagnose motor hardware status on physical PrimeHub runs:

```python
from pybricks.parameters import Port
from pybricks.pupdevices import Motor
from pybricks.robotics import MDRobotBase

left_motor = Motor(Port.A)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, 56.0, 112.0)

# Pre-motion diagnostic check
print("Pre-motion diagnostics:", robot.get_diagnostics())

try:
    robot.straight(200.0)
except Exception as e:
    print("Motion exception:", e)
finally:
    # Post-failure diagnostic inspection
    print("Post-motion diagnostics:", robot.get_diagnostics())
```

**Interpretation Matrix:**
- `left_state_error == 0` and `right_state_error == 0`, but `control_loop == 0`: Lifecycle or motor allocation issue.
- `left_state_error == 19` (`PBIO_ERROR_NO_DEV`): Physical cable disconnection or port unassigned.
- `left_state_error == 5` (`PBIO_ERROR_IO`): Motor bus communication corruption, parity error, or UART cable noise.
