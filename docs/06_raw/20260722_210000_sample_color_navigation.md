# Deep Technical Architecture & Final Native C Gain Setters Specification: `sample_color_navigation.py`

**Date & Time**: 2026-07-22 21:26:00 UTC+7  
**Workspace**: `/Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids` & `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target Module**: `spike-prime-mdrobotkids/code/sample_color_navigation.py`  

---

## 1. Native C `MDRobotBase` PID Gain Configuration

The gain parameters are set exclusively via the Native C methods exposed by Pybricks C extension (`pb_type_mdrobotbase.c`):

```python
# Native C Gain Setters:
robot.set_pid_gains(8.0, 0.05, 0.8)
robot.set_turn_pid_gains(9.5, 0.0, 1.125)
robot.set_pivot_pid_gains(3.6, 0.0, 1.2)
```

---

## 2. Hardware Port Allocation

- `hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)`
- `left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)`
- `right_motor = Motor(Port.B, Direction.CLOCKWISE)`
- `front_arm = Motor(Port.E)`
- `back_arm = Motor(Port.A)`
- `line_sensor = ColorSensor(Port.C)`
- `color_sensor`: Auto-detected (`Port.D` preferred)

---

## 3. Targeted Coordinates & Color Drop-Off Areas

### 3.1 Note Slots (mm)
- **Index 0**: `[1232.0, 1059.0]` (Dynamic Color)
- **Index 1**: `[1365.0, 1059.0]` (Dynamic Color)
- **Index 2**: `[1498.0, 1059.0]` (Fixed RED $\to$ **BIG Note / Back Arm Port A**)
- **Index 3**: `[1629.0, 1059.0]` (Fixed GREEN $\to$ **BIG Note / Back Arm Port A**)
- **Index 4**: `[1761.0, 1059.0]` (Dynamic Color)
- **Index 5**: `[1891.0, 1059.0]` (Dynamic Color)

### 3.2 Target Drop-Off Areas (mm)
- `YELLOW`: `[1068.0, 552.0]`
- `BLACK`:  `[1223.0, 494.0]`
- `RED`:    `[1384.0, 528.0]`
- `GREEN`:  `[1551.0, 596.0]`
- `BLUE`:   `[1692.0, 661.0]`
- `WHITE`:  `[1862.0, 756.0]`

---

## 4. Verification & Testing Results

- Script: [sample_color_navigation.py](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample_color_navigation.py)
- Unit Tests: [test_sample_color_navigation.py](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_sample_color_navigation.py)
- `pytest`: **5/5 tests passed in 0.01s**.
