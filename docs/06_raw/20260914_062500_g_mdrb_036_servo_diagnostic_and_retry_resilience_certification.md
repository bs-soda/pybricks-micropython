# Technical Audit & Architecture Certification: MDRobotBase Servo Diagnostics, Error Differentiation & Transient Retry Resilience (G-MDRB-036)

**Document Identifier**: `DOC-RAW-20260914-062500-SERVO-DIAGNOSTICS`  
**ISO Timestamp**: `2026-09-14T06:25:00+07:00`  
**Repository**: `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Branch**: `feature/mdrobotbase-enhancement`  
**Topic**: Remediation of Over-Aggressive Error Propagation, Separation of `PBIO_ERROR_NO_DEV` vs `PBIO_ERROR_IO`, Multi-Servo Diagnostic Reporting, and Transient `PBIO_ERROR_BUSY`/`PBIO_ERROR_AGAIN` Retry Resilience  

---

## 1. Executive Problem & Deep Architectural Analysis

### 1.1 The Finding
During hardware deployment of `MDRobotBase` on `feature/mdrobotbase-enhancement`, the robot halted with:
```text
OSError: MDRobotBase motor or sensor is unavailable
```
On `master`, the same robot hardware ran without raising this exception.

### 1.2 The Root Cause & Behavioral Divergence
1. **Master's Masked Failures**:
   On `master`, `pb_type_mdrobotbase_motion_iterate_once` invoked:
   ```c
   pbio_mdrobotbase_update_state(self->rb, gyro_heading);
   ```
   and completely discarded its return value. If `pbio_servo_get_state_control` returned `PBIO_ERROR_NO_DEV`, `PBIO_ERROR_IO`, `PBIO_ERROR_BUSY`, or `PBIO_ERROR_AGAIN` on iteration 0 (due to UART lump protocol baud negotiation, mode-switch settle time, or observer sync delay), `master` silently ignored the failure and proceeded to the next tick 5 ms later.
2. **Feature Branch Over-Aggression**:
   The feature branch introduced fail-closed error checking:
   ```c
   pbio_error_t odometry_err = pbio_mdrobotbase_update_state(self->rb, gyro_heading);
   if (odometry_err != PBIO_SUCCESS) {
       mdrobotbase_motion_stop(self, true);
       return pb_type_mdrobotbase_raise_motion_error(self, odometry_err);
   }
   ```
   While architecturally safer than ignoring errors, this was **too aggressive**:
   - `PBIO_ERROR_BUSY` was treated as an unrecoverable failure instead of yielding for retry.
   - `PBIO_ERROR_IO` (communication packet error) was grouped together with `PBIO_ERROR_NO_DEV` (physical disconnection) under the ambiguous banner `"MDRobotBase motor or sensor is unavailable"`.
   - Sequential servo evaluation masked the status of the second servo when the first failed.

---

## 2. Structured Code Explanation (WHERE, WHY, FOR WHOM, HOW)

### WHERE: Code Modification Registry
- [`lib/pbio/src/mdrobotbase.c:L1130-L1195`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L1130-L1195): Evaluates both `left` and `right` servos independently with strict error precedence: `NO_DEV` > `IO` > `AGAIN` > `BUSY`.
- [`pybricks/robotics/pb_type_mdrobotbase.c:L75-L95`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L75-L95): Added detailed diagnostic logging for odometry errors when `debug=True`.
- [`pybricks/robotics/pb_type_mdrobotbase.c:L221-L245`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L221-L245): Separated `PBIO_ERROR_NO_DEV` ("MDRobotBase motor is not connected") from `PBIO_ERROR_IO` ("MDRobotBase motor communication failed") and refined `PBIO_ERROR_INVALID_ARG` ("MDRobotBase odometry state is invalid").
- [`pybricks/robotics/pb_type_mdrobotbase.c:L725-L728`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L725-L728): Added `PBIO_ERROR_BUSY` to the retry check alongside `PBIO_ERROR_AGAIN`.
- [`pybricks/robotics/pb_type_mdrobotbase.c:L1180-L1210`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1180-L1210): Implemented public MicroPython API `get_diagnostics()` returning comprehensive hardware and control-loop diagnostics.
- [`tests/virtualhub/robotics/pybricks/robotics.py:L486-L530, L644-L675`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L486-L530): Mirrored parity in VirtualHub Python simulator with `get_diagnostics()`.
- [`tests/virtualhub/robotics/test_mdrobotbase_lqr.py:L1430-L1675`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_lqr.py#L1430-L1675): Added comprehensive unit tests for `get_diagnostics()` and separate IO communication error verification.

### WHY: Architectural Rationale & Invariants
- **Independent Evaluation Prevents Priority Inversions**:
  In a differential drive robot, both left and right wheels must be functional. If `left` is transiently busy while `right` is physically unplugged, returning immediately on `left` would cause a transient retry loop that eventually fails mysteriously. By querying both servos upfront, the system prioritizes true physical disconnection (`NO_DEV`) and communication failure (`IO`) over transient readiness (`AGAIN`/`BUSY`).
- **Transient Yielding via `PBIO_ERROR_AGAIN`**:
  MicroPython async protothreads yield on `PBIO_ERROR_AGAIN`, giving the underlying RTOS/event loop a chance to service UART LUMP interrupts, clear DMA buffers, and update sensor data before the next motor loop iteration runs.

### FOR WHOM: Target Consumers
- **Embedded Firmware Runtime**: Robust bare-metal execution on STM32F4 without false stops during motor/sensor bus arbitration.
- **WRO Robotics Competitors & Engineers**: Clear, descriptive error messages explaining whether a motor is disconnected vs suffering communication line noise vs transiently calibrating.
- **Diagnostic & Testing Frameworks**: Structured inspection of motor states via `robot.get_diagnostics()`.

### HOW: Diagnostic Payload Schema
The `get_diagnostics()` method returns:
```python
{
    "left_state_error": int,     # 0 = PBIO_SUCCESS, 19 = NO_DEV, 5 = IO, etc.
    "right_state_error": int,    # 0 = PBIO_SUCCESS, 19 = NO_DEV, 5 = IO, etc.
    "control_loop_left": bool,   # True if servo update loop is actively registered
    "control_loop_right": bool,  # True if servo update loop is actively registered
    "motion_type": int,          # PBIO_MDROBOTBASE_MOTION_* enum
    "controller_type": int,      # 0 = PID, 1 = LQR
}
```

---

## 3. Empirical Verification Results

| Suite / Check | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **VirtualHub LQR & Diagnostics** | `python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr` | **61/61 PASSED** | 100% green, 0 errors, 0 skips in 13.85s |
| **Native PBIO Harness** | `./lib/pbio/test/build/test-pbio src/mdrobotbase/..` | **34/34 PASSED** | 100% green, 0 skips, all memory bounds verified |
| **Bare-Metal Firmware Build** | `make primehub_f4` | **CLEAN BUILD** | `.text`: 353,832 B, `.data`: 736 B, `.bss`: 43,600 B |
| **Whitespace & Formatting** | `git diff --check` | **CLEAN** | 0 formatting or whitespace violations |
| **CI Governance Guard** | `bash scripts/ci/governance-check.sh` | **PASSED** | Secret scan OK, 50 commits OK, submodules verified |
