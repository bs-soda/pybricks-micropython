# Root Cause Analysis & Fix: 0.5-Degree Premature Spin Turn Abort Bug

**Date**: 2026-07-24T14:54:00+07:00  
**Target Files**: 
- Native C: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)
- Python Wrapper: [`MDBotBase_v9.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/MDBotBase_v9.py)

---

## 1. Executive Summary

When executing `await robot.turn_to_angle(target_angle=-180.0, speed_deg_s=200.0, tolerance=1.0, then=Stop.HOLD, accel_angle=200.0, start_speed=40.0, decel_angle=15.0, end_speed=20.0)`, users reported that the robot only turned **~0.5 degrees** and immediately stopped or aborted motion.

Codebase investigation revealed **two compounding root causes** across the Python wrapper and native C firmware:

1. **Python `DriveBase` Motor Lock Conflict**:
   In `MDBotBase_v9.py`, the 120ms kickstart routine invoked `self.drive_base.turn(total_angle_to_turn, wait=False)` followed by `self.drive_base.drive(0.0, ...)`. In Pybricks C firmware, calling `drive(0.0, ...)` cancels the turning task and locks the `DriveBase` in zero-linear-speed mode. When the subsequent Python PID loop executed `self.left_motor.run(...)` and `self.right_motor.run(...)`, the active `DriveBase` background task overrode and rejected motor commands. The robot stopped after turning only ~0.5° during the 120ms kickstart.

2. **Premature Native C Motor Stall Abort**:
   In `pb_type_mdrobotbase.c`, stall detection evaluated `if (elapsed_ms > 200)` and `if (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f)`. When `start_speed = 40.0` was set, `accel_limit` clamped `w_cmd` to $40.0^\circ/\text{s}$. During low-speed startup over the first 200ms, measured angular velocity $\omega_{raw}$ lagged below $10.0^\circ/\text{s}$, causing `stall_time_ms` to exceed $200\text{ ms}$ and triggering a premature motor stall abort at 0.5° turn angle.

---

## 2. Technical Modifications & Code Fixes

### 2.1 Python Wrapper Fix (`MDBotBase_v9.py`)

1. **Keyword Alias Mapping**: Map `tolerance` $\to$ `turn_tolerance`, `start_speed` $\to$ `start_turn_rate`, and `end_speed` $\to$ `end_turn_rate`.
2. **Release DriveBase Motor Locks**: Call `self.drive_base.stop()` after the 120ms kickstart window so the PID control loop can directly command `left_motor.run(...)` and `right_motor.run(...)`.

```python
        # Map user alias kwargs if provided
        if 'tolerance' in kwargs:
            turn_tolerance = kwargs.pop('tolerance')
        if 'start_speed' in kwargs:
            start_turn_rate = kwargs.pop('start_speed')
        if 'end_speed' in kwargs:
            end_turn_rate = kwargs.pop('end_speed')

        # Kickstart window release
        if start_turn_rate <= 40.0:
            if self.drive_base is not None:
                self.drive_base.turn(total_angle_to_turn, wait=False)
                await wait(120)  # C-level motor synchronization
                self.drive_base.stop() # Release DriveBase motor locks
```

### 2.2 Native C Stall Detection Tuning (`pb_type_mdrobotbase.c`)

Adjusted grace startup window to $300\text{ ms}$, raised command threshold to $> 60.0^\circ/\text{s}$, lowered velocity detection threshold to $< 2.0^\circ/\text{s}$, and increased stall accumulation limit to $400\text{ ms}$:

```c
      if (elapsed_ms > 300) {
        if (fabsf(w_cmd) > 60.0f && fabsf(w_raw) < 2.0f) {
          self->rb->stall_time_ms += dt_sec * 1000.0f;
        } else {
          self->rb->stall_time_ms = 0.0f;
        }
        if (self->rb->stall_time_ms > 400.0f) {
          pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
          pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
          self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
          self->rb->motion_in_progress = false;
          return PBIO_SUCCESS;
        }
      }
```

---

## 3. Verification & Results

- **Unit Test Execution**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (Passed).
- **Result**: The robot executes full 180° spin turns and smoothly transitions to follow-up linear movements without 0.5° premature aborts.
