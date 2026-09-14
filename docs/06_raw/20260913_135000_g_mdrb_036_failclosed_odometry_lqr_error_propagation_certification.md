# G-MDRB-036 Fail-Closed LQR and Odometry Error Propagation Certification

**Timestamp:** 2026-09-13T13:50:00+07:00  
**Author:** AI Agentic Systems Engineer (Pair Programming with User)  
**Corpus/Repo:** `pybricks-micropython`  
**Branch:** `feature/mdrobotbase-enhancement`  
**Status:** COMPLETED & CERTIFIED (Zero Mocks, Zero Stubs, Fully Implemented)

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Runtime Defect: "Unknown Error" and Runaway Fallback Commands
When `MDRobotBase` was configured to use LQR tracking during autonomous navigation (`navigate_to_goal` or `follow_trajectory`), the navigation motion loop exhibited a critical failure mode:
1. **Ignored LQR Step Errors:** In `mdrobotbase_step_navigate()`, the return code of `pbio_mdrobotbase_lqr_step()` was completely discarded. If `pbio_mdrobotbase_lqr_step()` failed (due to workspace busy lock contention, non-finite pose coordinates, or matrix calculation limits), execution continued silently using the fallback commands `v_cmd = v_profile; w_cmd = 0.0f;`. This caused the robot to run open-loop straight without active heading control.
2. **Ignored Odometry Integration Errors:** In `pb_type_mdrobotbase_motion_iterate_once()`, the return code of `pbio_mdrobotbase_update_state(self->rb, gyro_heading)` was ignored. When sensor or motor read failures occurred, or when coordinates drifted into non-finite numbers, the error was ignored.
3. **Generic "Unknown Error" Exception Mapping:** In Pybricks MicroPython runtime (`pybricks/tools/pb_type_async.c`), unhandled errors returned from asynchronous protothreads fall through to `pb_assert(err)`. In `pybricks/util_pb/pb_error.c`, `PBIO_ERROR_FAILED` maps to `pbio_error_str(PBIO_ERROR_FAILED)` which yields the string `"Unknown error"`. Similarly, `PBIO_ERROR_BUSY` was mapped to generic POSIX `EBUSY` (`OSError: [Errno 16] EBUSY`).

---

## 2. Exhaustive Call Site Audit (G-MDRB-036 Invariants)

A codebase-wide audit was conducted across all C and Python source files for every G-MDRB-036 function:

| Function Name | Total Call Sites | Ignored Return Values Found | Remediation Applied |
| :--- | :---: | :---: | :--- |
| `pbio_mdrobotbase_lqr_step()` | 5 | **1** (`pb_type_mdrobotbase.c:372`) | Captured `lqr_err`, immediate `mdrobotbase_motion_stop(self, true)`, mapped to explicit Python exception |
| `pbio_mdrobotbase_update_state()` | 29 | **1** (`pb_type_mdrobotbase.c:659`) | Captured `odometry_err`, immediate `mdrobotbase_motion_stop(self, true)`, mapped to explicit Python exception |
| `pbio_mdrobotbase_set_lqr_weights()` | 16 | **0** | All return codes checked against `PBIO_SUCCESS` / validated |
| `pbio_mdrobotbase_set_lqr_preset()` | 12 | **0** | All return codes checked against `PBIO_SUCCESS` / validated |
| `pbio_mdrobotbase_lqr_solve_dare()` | 4 | **0** | All return codes checked against `PBIO_SUCCESS` / validated |
| `pbio_mdrobotbase_lqr_compute_riccati_residual()` | 3 | **0** | All return codes checked against `PBIO_SUCCESS` / validated |

---

## 3. Structural Changes & Architectural Invariants

### 3.1 C Kernel: `lib/pbio/src/mdrobotbase.c` & `lib/pbio/include/pbio/mdrobotbase.h`
- **Unconditional Workspace Query:** `bool pbio_mdrobotbase_lqr_is_busy(void)` was moved outside `#if PBIO_TEST_BUILD` so bare-metal ARM firmware (`primehub_f4`) can query workspace lock status unconditionally.
- **Fail-Closed LQR Step:**
  - Validates `!isfinite(rb->x) || !isfinite(rb->y) || !isfinite(rb->theta)` $\to$ returns `PBIO_ERROR_INVALID_ARG`.
  - Checks `if (pbio_mdrobotbase_lqr_is_busy()) return PBIO_ERROR_BUSY;`.
  - Verifies `isfinite(v_cmd_raw) && isfinite(w_cmd_raw)` $\to$ returns `PBIO_ERROR_FAILED` if divergent.
- **Fail-Closed Odometry Update:**
  - Validates `!isfinite(rb->x) || !isfinite(rb->y) || !isfinite(rb->theta)` both before and after integration $\to$ returns `PBIO_ERROR_INVALID_ARG`.
  - Propagates servo control state read failures (`pbio_servo_get_state_control`) directly.

### 3.2 MicroPython Bridge: `pybricks/robotics/pb_type_mdrobotbase.c`
- **Explicit Motion Error Mapper (`pb_type_mdrobotbase_raise_motion_error`):**
  - Intercepts errors before generic `pb_assert()` can produce `"Unknown error"`.
  - Clears `self->last_awaitable = NULL; self->rb->motion_in_progress = false; self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;`.
  - Exception mapping:
    - `PBIO_ERROR_BUSY` $\to$ `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("LQR solver workspace busy"))`
    - `PBIO_ERROR_INVALID_ARG` $\to$ `mp_raise_ValueError(MP_ERROR_TEXT("invalid LQR or odometry state"))`
    - `PBIO_ERROR_FAILED` $\to$ `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("LQR controller failed"))`
    - `PBIO_ERROR_NO_DEV` $\to$ `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("motor or sensor not connected"))`
    - `PBIO_ERROR_TIMEDOUT` $\to$ preserved existing timeout handling
    - `PBIO_ERROR_CANCELED` $\to$ preserved existing cancellation handling
- **Zero-Fallback Navigation:** If `lqr_err != PBIO_SUCCESS` or `odometry_err != PBIO_SUCCESS`, motors are stopped immediately via `mdrobotbase_motion_stop(self, true)`, and motion ceases immediately.

### 3.3 VirtualHub Python Simulator: `tests/virtualhub/robotics/pybricks/robotics.py`
- Implemented full parity with C kernel for LQR workspace busy detection, non-finite pose rejections, motor disconnection detection, and active fail-closed stops across `navigate_to_goal` and `follow_trajectory`.

---

## 4. Empirical Test Verification Matrix

All 5 verification suites mandated by the specification were executed and passed cleanly:

### 4.1 Check 1: VirtualHub LQR Test Suite
```bash
python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr
```
- **Result:** Ran 49 tests in 13.9s. **OK (0 failures, 0 errors)**.
- **Coverage Added:**
  - `test_navigation_lqr_workspace_busy_stops_robot_and_raises_runtime_error`
  - `test_navigation_odometry_failure_stops_robot_and_raises_value_error`
  - `test_invalid_pose_in_step_lqr_and_update_state`
  - `test_invalid_lqr_configuration`
  - `test_sensor_motor_disconnection_stops_robot_and_raises_error`
  - `test_trajectory_lqr_workspace_busy_stops_robot`

### 4.2 Check 2: Native PBIO C Test Suite
```bash
./lib/pbio/test/build/test-pbio src/mdrobotbase/..
```
- **Result:** Ran 33 tests in 0.1s. **33 tests ok. (0 skipped, 0 failures)**.
- **Coverage Added:**
  - `test_mdrobotbase_failclosed_odometry_lqr_propagation`

### 4.3 Check 3: Bare-Metal ARM Cortex-M Firmware Build
```bash
make primehub_f4
```
- **Result:** **Exit code 0**. Binary package created (`352,100 bytes`). Zero compilation warnings, zero linker errors.

### 4.4 Check 4: Whitespace and Syntax Linting
```bash
git diff --check
```
- **Result:** **Clean (0 errors)**.

### 4.5 Check 5: Soda Agent OS Governance Gate
```bash
bash scripts/ci/governance-check.sh
```
- **Result:** **All governance checks passed**.
  - Secret path scan: OK
  - Commit message format: OK
  - Submodule integrity: OK

---

## 5. Summary of Files Changed

- [`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h)
- [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c)
- [`lib/pbio/test/src/test_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/test/src/test_mdrobotbase.c)
- [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)
- [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py)
- [`tests/virtualhub/robotics/test_mdrobotbase_lqr.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_lqr.py)
