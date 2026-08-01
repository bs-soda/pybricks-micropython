# Autocomplete Stubs (.pyi) Architecture Update

**Date**: 2026-07-24T18:39:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: 
- [`pybricks-micropython/pybricks/robotics/__init__.pyi`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/__init__.pyi)
- [`spike-prime-mdrobotkids/code/MDRobotBase.pyi`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/MDRobotBase.pyi)

---

## 1. Executive Summary

To provide complete IDE autocomplete, static type checking, and parameter hints across VS Code, PyCharm, and Antigravity IDE, we generated full **`.pyi` Autocomplete Stub Files** for `MDRobotBase`.

These stub files expose:
1. **New C Methods**: `set_fusion_alpha(alpha: float)`, `get_fusion_alpha() -> float`, `set_gear_ratio(ratio: float)`, `get_gear_ratio() -> float`.
2. **Motion APIs**: `turn_to_angle`, `turn_angle`, `pivot_turn_to_angle`, `pivot_turn_angle`, `navigate_to_goal`, `go_forward`, `go_backward`, `follow_trajectory`.
3. **Control Gains**: `set_lqr_gains`, `set_pid_gains`, `set_turn_pid_gains`, `set_pivot_pid_gains`.

---

## 2. Updated Autocomplete Stub Interfaces

```python
class MDRobotBase:
    def set_fusion_alpha(self, alpha: float) -> None:
        """Sets complementary sensor fusion alpha weight (0.0 to 1.0).
        - 1.0: 100% Pure IMU Gyro Odometry.
        - 0.0: 100% Wheel Encoder Odometry.
        """
        ...

    def set_gear_ratio(self, ratio: float) -> None:
        """Sets drivetrain gear reduction ratio (Driver Teeth / Driven Teeth)."""
        ...

    async def turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: Optional[float] = ...,
        start_speed: Optional[float] = ...,
        end_speed: Optional[float] = ...,
        accel_angle: Optional[float] = ...,
        decel_angle: Optional[float] = ...,
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None: ...

    async def pivot_turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: Optional[float] = ...,
        pivot_side: str = "left",
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None: ...
```

---

## 3. Verification

- **IDE Compatibility**: Autocomplete stubs allow IDEs to auto-suggest method names, argument types, and default values.
- **Unit Test Suite**: `pytest` passed 19/19 test cases.
