# MDRobotBase Full Parameter Reference Document

**Timestamp**: 2026-07-23T21:57:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Source File**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  

---

## 1. `pivot_turn_to_angle` & `pivot_turn_angle` Full Parameters

### 1.1 `pivot_turn_to_angle` (Absolute Pivot Turn)
Pivot turn to an absolute target orientation in the odometry frame ($+90.0^\circ = \text{North}$).

```python
robot.pivot_turn_to_angle(
    target_angle,           # [Required] float (degrees)
    speed_deg_s=200.0,      # [Optional] float (deg/s)
    pivot_side='left',      # [Optional] str ('left' | 'right')
    tolerance=1.5,          # [Optional] float (degrees)
    timeout_ms=None,        # [Optional] int/float (ms)
    then=Stop.HOLD,         # [Optional] Stop enum (HOLD | BRAKE | COAST)
    accel_angle=15.0,       # [Optional] float (degrees)
    start_speed=40.0,       # [Optional] float (deg/s)
    decel_angle=15.0,       # [Optional] float (degrees)
    end_speed=20.0          # [Optional] float (deg/s)
)
```

| Parameter Name | C Type / Py Type | Default | Unit | Description & Internal C Mechanics |
| :--- | :--- | :--- | :--- | :--- |
| `target_angle` | `float` / `float` | **[REQUIRED]** | degrees ($^\circ$) | Absolute target angle in odometry coordinate system (CCW positive). |
| `speed_deg_s` | `float` / `float` | `200.0` | deg/s ($^\circ/\text{s}$) | Maximum angular turn rate of the robot body ($0 < \text{speed} \le \text{max\_pivot\_speed}$). |
| `pivot_side` | `const char*` / `str` | `'left'` | string | Wheel to lock stationary (`Stop.HOLD`). `'left'` locks left motor; `'right'` locks right motor. |
| `tolerance` | `float` / `float` | `1.5` | degrees ($^\circ$) | Heading error threshold $|e_\theta| \le \text{tolerance}$ for motion termination. |
| `timeout_ms` | `uint32_t` / `int` | `None` (Auto) | milliseconds ($\text{ms}$) | Safety timeout limit. If `None`, calculated dynamically: $\text{timeout} = \frac{\theta_{\text{turn}}}{\text{speed}} \times 1.3 + 600\text{ms}$. |
| `then` | `pb_Stop_enum` / `Stop` | `Stop.HOLD` | Enum | Motor hold behavior upon completing motion (`Stop.HOLD`, `Stop.BRAKE`, `Stop.COAST`). |
| `accel_angle` | `float` / `float` | `15.0` | degrees ($^\circ$) | Acceleration distance in body degrees over which speed ramps up from `start_speed`. |
| `start_speed` | `float` / `float` | `40.0` | deg/s ($^\circ/\text{s}$) | Initial turn rate at start of motion to overcome static friction ($f_s$). |
| `decel_angle` | `float` / `float` | `15.0` | degrees ($^\circ$) | Deceleration distance in body degrees over which speed ramps down to `end_speed`. |
| `end_speed` | `float` / `float` | `20.0` | deg/s ($^\circ/\text{s}$) | Final turn rate prior to hitting `tolerance` threshold to prevent overshoot. |

---

### 1.2 `pivot_turn_angle` (Relative Pivot Turn)
Pivot turn relative to current robot heading by a delta angle.

```python
robot.pivot_turn_angle(
    angle,                  # [Required] float (degrees, + = CCW, - = CW)
    speed_deg_s=200.0,      # [Optional] float (deg/s)
    pivot_side='left',      # [Optional] str ('left' | 'right')
    tolerance=1.5,          # [Optional] float (degrees)
    timeout_ms=None,        # [Optional] int/float (ms)
    then=Stop.HOLD,         # [Optional] Stop enum (HOLD | BRAKE | COAST)
    accel_angle=15.0,       # [Optional] float (degrees)
    start_speed=40.0,       # [Optional] float (deg/s)
    decel_angle=15.0,       # [Optional] float (degrees)
    end_speed=20.0          # [Optional] float (deg/s)
)
```

- **Calculates**: $\text{target\_angle} = \text{current\_theta} + \text{angle}$
- Delegates directly to `pivot_turn_to_angle`.

---

## 2. All Other Movement API Parameters

### 2.1 `navigate_to_goal`
Full 2D pose navigation with optional final heading alignment, velocity profiling, and battery compensation.

```python
robot.navigate_to_goal(
    goal_x,                 # [Required] float (mm)
    goal_y,                 # [Required] float (mm)
    goal_theta=None,        # [Optional] float (degrees)
    speed_mm_s=500.0,       # [Optional] float (mm/s)
    start_speed_mm_s=20.0,  # [Optional] float (mm/s)
    end_speed_mm_s=40.0,    # [Optional] float (mm/s)
    accel_dist_mm=None,     # [Optional] float (mm, Auto if None)
    decel_dist_mm=None,     # [Optional] float (mm, Auto if None)
    use_ramping=False,      # [Optional] bool (default False)
    backward=False,         # [Optional] bool (default False)
    tolerance_dist=15.0,    # [Optional] float (mm)
    timeout_ms=None,        # [Optional] int (ms, Auto if None)
    then=Stop.HOLD,         # [Optional] Stop enum
    kick_speed_mm_s=0.0,    # [Optional] float (mm/s)
    kick_time_ms=0.0        # [Optional] float (ms)
)
```

### 2.2 `go_forward` & `go_backward`
Linear straight motion along current odometry orientation vector $\hat{\mathbf{u}} = (\cos\theta, \sin\theta)$.

```python
robot.go_forward(
    distance,               # [Required] float (mm)
    speed_mm_s=500.0,       # [Optional] float (mm/s)
    start_speed_mm_s=20.0,  # [Optional] float (mm/s)
    end_speed_mm_s=40.0,    # [Optional] float (mm/s)
    accel_dist_mm=None,     # [Optional] float (mm)
    decel_dist_mm=None,     # [Optional] float (mm)
    use_ramping=False,      # [Optional] bool
    timeout_ms=None,        # [Optional] int (ms)
    then=Stop.HOLD,         # [Optional] Stop enum
    kick_speed_mm_s=0.0,    # [Optional] float (mm/s)
    kick_time_ms=0.0        # [Optional] float (ms)
)

robot.go_backward(
    distance,               # [Required] float (mm)
    ...                     # Same parameters as go_forward, automatically sets backward=True
)
```

### 2.3 `turn_to_angle` & `turn_angle`
Differential spin turn in-place ($r = \frac{\text{axle\_track}}{2}$).

```python
robot.turn_to_angle(
    target_angle,           # [Required] float (degrees)
    speed_deg_s=300.0,      # [Optional] float (deg/s)
    tolerance=1.5,          # [Optional] float (degrees)
    timeout_ms=None,        # [Optional] int (ms)
    then=Stop.HOLD,         # [Optional] Stop enum
    accel_angle=15.0,       # [Optional] float (degrees)
    start_speed=40.0,       # [Optional] float (deg/s)
    decel_angle=15.0,       # [Optional] float (degrees)
    end_speed=20.0          # [Optional] float (deg/s)
)

robot.turn_angle(
    angle,                  # [Required] float (degrees, + = CCW, - = CW)
    ...                     # Same parameters as turn_to_angle
)
```
