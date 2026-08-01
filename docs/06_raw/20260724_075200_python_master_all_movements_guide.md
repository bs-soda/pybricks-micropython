# Complete Technical & Operational Guide: Python Master `MDRobotBase` Movements

**Timestamp**: 2026-07-24T07:52:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Master Script**: [`code/sample_master_mdrobotbase_movements.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample_master_mdrobotbase_movements.py)  
**Test Suite**: [`code/test_sample_master_mdrobotbase_movements.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_sample_master_mdrobotbase_movements.py)  

---

## 1. Architectural Foundations of `MDRobotBase` in Python

The Pybricks `MDRobotBase` binding links MicroPython high-level user code with low-level C motor control protothreads. Understanding its asynchronous coroutine mechanics, odometry coordinate frame, scale factor conversions, and dual-controller options is vital for writing bulletproof WRO competition software.

---

### 1.1 Asynchronous Coroutine Execution (`run_task` / `async def`)

When executing inside a cooperative event loop (`pybricks.tools.run_task` or `asyncio`), calling any `MDRobotBase` movement method returns a `pb_type_async` generator object:

```python
# ASYNCHRONOUS COROUTINE PATTERN (REQUIRED INSIDE run_task):
async def main():
    # MUST USE await on every movement call!
    await robot.go_forward(300.0)
    await robot.turn_to_angle(180.0)
    await robot.pivot_turn_to_angle(90.0, pivot_side='left')
    await robot.navigate_to_goal(1629.0, 1059.0, goal_theta=180.0)
```

- **Why `await` is Mandatory**: If `await` is omitted (e.g. `robot.go_forward(300.0)`), MicroPython instantiates the generator object on the heap but **never ticks it**. The generator receives 0 frame ticks, resulting in zero motor movement ("robot does not move").
- **Synchronous Fallback**: In linear scripts executed without `run_task`, calling `robot.go_forward(300.0)` executes an internal C blocking loop that polls motor state until completion.

---

### 1.2 Coordinate System & Kinematic Scale Conversions

- **World Frame**:
  - $X$: Horizontal axis ($\text{mm}$).
  - $Y$: Vertical axis ($\text{mm}$).
  - $\theta$: Robot heading angle ($^\circ$). Counter-Clockwise (CCW) is positive ($0.0^\circ = +X$, $90.0^\circ = +Y$).
- **Constructor Dimensions**:
  - `wheel_diameter_left`, `wheel_diameter_right`: Calibrated wheel diameters in millimeters ($\text{mm}$).
  - `axle_track`: Distance between wheel contact centers in millimeters ($\text{mm}$).

---

## 2. Exhaustive API Breakdown with Code Snippets

---

### 2.1 Configuration & Setup APIs

#### `reset_state(x, y, theta, gyro_heading=0.0)`
Resets the robot's odometry coordinates $(X, Y)$ and orientation $\theta$ while locking current IMU heading without drift.

```python
robot.reset_state(x=2195.0, y=524.0, theta=90.0, gyro_heading=hub.imu.heading())
```

#### `set_controller(controller_type)`
Selects the closed-loop tracking algorithm:
- `0`: **PID Controller** (Proportional-Integral-Derivative feedback).
- `1`: **LQR Controller** (Linear Quadratic Regulator state feedback $\mathbf{u} = -\mathbf{K}\mathbf{e}$).

```python
robot.set_controller(1) # LQR State Feedback
```

#### `set_lqr_gains(k_x, k_y, k_theta, lqr_schedule_enabled=True)`
Configures LQR gain matrix $\mathbf{K} = \begin{bmatrix} k_x & 0 & 0 \\ 0 & k_y & k_\theta \end{bmatrix}$. Dynamic gain scheduling scales gains relative to linear speed ($S = \sqrt{v / 300}$).

```python
robot.set_lqr_gains(k_x=1.25, k_y=2.0, k_theta=5.00, lqr_schedule_enabled=True)
```

#### `set_pid_gains(kp, ki, kd)`
Configures heading PID feedback parameters for spin and pivot turns.

```python
robot.set_pid_gains(kp=10.0, ki=0.0, kd=0.1)
```

#### `set_backlash_filter(enabled)` & `set_backlash_limits(left_limit, right_limit)`
Configures active gear slack deadband filter to eliminate physical backlash during direction changes.

```python
robot.set_backlash_filter(True)
robot.set_backlash_limits(left_limit=1.2, right_limit=1.2) # degrees
```

---

### 2.2 Straight Line Movement APIs (`go_forward` & `go_backward`)

Drives straight along the robot's orientation unit vector $\hat{\mathbf{u}} = (\cos\theta, \sin\theta)$.

```python
# Forward straight drive
await robot.go_forward(
    distance=300.0,         # Distance in mm
    speed_mm_s=450.0,       # Cruising linear speed (mm/s)
    start_speed_mm_s=30.0,  # Starting speed (mm/s)
    end_speed_mm_s=50.0,    # Terminal end speed (mm/s)
    accel_dist_mm=50.0,     # Acceleration distance (mm)
    decel_dist_mm=50.0,     # Deceleration distance (mm)
    use_ramping=False,      # S-curve velocity profiling toggle
    timeout_ms=3000,        # Maximum safety timeout (ms)
    then=Stop.HOLD          # Post-motion stop behavior
)

# Reverse straight drive
await robot.go_backward(
    distance=120.0,         # Distance in mm
    speed_mm_s=300.0,       # Reverse speed (mm/s)
    then=Stop.HOLD
)
```

---

### 2.3 Spin Turn APIs (`turn_to_angle` & `turn_angle`)

Differential in-place turn around axle track center ($r = \frac{\text{axle\_track}}{2}$).

```python
# Absolute heading spin turn to 180.0 degrees
await robot.turn_to_angle(
    target_angle=180.0,     # Target angle in degrees
    speed_deg_s=300.0,      # Peak turning speed (deg/s)
    tolerance=1.0,          # Error tolerance margin (degrees)
    timeout_ms=3000,        # Timeout in ms
    then=Stop.HOLD,         # Completion stop behavior
    accel_angle=15.0,       # Acceleration distance in degrees
    start_speed=40.0,       # Initial turn rate (deg/s)
    decel_angle=15.0,       # Deceleration distance in degrees
    end_speed=20.0          # Final turn rate (deg/s)
)

# Relative spin turn: -45.0 degrees Clockwise
await robot.turn_angle(
    angle=-45.0,
    speed_deg_s=250.0,
    then=Stop.HOLD
)
```

---

### 2.4 Pivot Turn APIs (`pivot_turn_to_angle` & `pivot_turn_angle`)

Single-wheel pivot turn where one wheel is locked in `Stop.HOLD` mode while the opposite wheel drives around it ($r = \text{axle\_track}$).

```python
# Absolute pivot turn around LEFT wheel
await robot.pivot_turn_to_angle(
    target_angle=90.0,      # Target angle in degrees
    speed_deg_s=200.0,      # Peak turning speed (deg/s)
    pivot_side='left',      # Locks left wheel, drives right wheel
    tolerance=1.5,          # Error tolerance margin (degrees)
    then=Stop.HOLD
)

# Relative pivot turn around RIGHT wheel (-45.0 degrees CW)
await robot.pivot_turn_angle(
    angle=-45.0,
    speed_deg_s=180.0,      # Peak turning speed (deg/s)
    pivot_side='right',     # Locks right wheel, drives left wheel
    then=Stop.HOLD
)
```

---

### 2.5 2D Navigation API (`navigate_to_goal`)

Precise 2D position navigation with optional final heading alignment ($\theta_g$) and LQR/Stanley cross-track feedback.

```python
await robot.navigate_to_goal(
    goal_x=1629.0,           # Target X coordinate (mm)
    goal_y=1059.0,           # Target Y coordinate (mm)
    goal_theta=180.0,        # Target final heading (degrees)
    speed_mm_s=400.0,        # Cruising speed (mm/s)
    start_speed_mm_s=30.0,   # Start speed (mm/s)
    end_speed_mm_s=30.0,     # End speed (mm/s)
    accel_dist_mm=50.0,      # Acceleration distance (mm)
    decel_dist_mm=100.0,     # Deceleration distance (mm)
    use_ramping=False,       # Velocity profiling toggle
    backward=False,          # Reverse drive toggle
    tolerance_dist=10.0,     # Arrival tolerance (mm)
    timeout_ms=5000,         # Execution timeout (ms)
    then=Stop.HOLD           # Stop behavior
)
```

---

### 2.6 Trajectory Tracking API (`follow_trajectory`)

Pure Pursuit multi-waypoint curve tracking along smooth paths.

```python
curve_waypoints = [
    (1629.0, 1059.0, 400.0, 180.0),
    (1590.0, 850.0,  350.0, 210.0),
    (1551.0, 596.0,  250.0, 270.0)
]

await robot.follow_trajectory(
    waypoints=curve_waypoints,
    lookahead_dist=120.0,   # Pure pursuit lookahead vector length L_d (mm)
    speed_mm_s=350.0,       # Cruising speed (mm/s)
    tolerance_dist=15.0,    # Target arrival tolerance (mm)
    then=Stop.HOLD
)
```

---

## 3. Automated Test Verification

All 21 Python unit tests passed with 100% success rate:

```bash
python3 -m pytest code/test_sample_master_mdrobotbase_movements.py code/test_sample_color_navigation.py code/test_color_sensor_rgb.py code/test_sample_spike_prime_color_sensor.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```

```text
============================== 21 passed in 2.97s ==============================
```
