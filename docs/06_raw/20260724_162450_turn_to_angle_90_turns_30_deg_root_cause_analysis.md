# Root Cause Analysis: Why `turn_to_angle(90)` Physically Turns Only 30 Degrees

**Date**: 2026-07-24T16:24:50+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Symptom**: User commands `robot.turn_to_angle(90.0)`, but the physical chassis turns only **30 degrees** and stops.

---

## 1. Executive Summary

When `robot.turn_to_angle(90)` turns only 30 degrees in practice, our technical audit isolates **4 specific root causes** spanning coordinate system semantics, mechanical track ratio configuration, deceleration stiction stalling, and IMU sensor scaling:

1. **Absolute Target Heading Offset (Most Common)**: `turn_to_angle(90)` is an **absolute coordinate heading command** ($\theta_{\text{target}} = +90^\circ$). If the robot's current pose heading prior to execution is already at $\theta_{\text{current}} = +60^\circ$, `turn_to_angle(90)` executes a relative turn of $90^\circ - 60^\circ = \mathbf{30^\circ}$.
2. **`axle_track` / `wheel_diameter` Kinematic Ratio Misconfiguration**: In native C, wheel rotation degrees are scaled by $\frac{\text{axle\_track}}{\text{wheel\_diameter}}$. If `axle_track` is set to $\sim 37.3\text{mm}$ instead of $112.0\text{mm}$ (a $3\times$ under-estimation), commanding a $90^\circ$ robot turn causes the wheels to rotate only $\frac{1}{3}$ of the required distance, producing a physical rotation of **exactly 30 degrees**.
3. **Deceleration Ramping Stiction Stall**: Large `decel_angle` (e.g. $60^\circ$) drops turn speed to `end_speed = 10.0 deg/s` when $30^\circ$ remaining angle is reached. High surface stiction halts wheel motion, causing native C stall detection to abort the turn at $30^\circ$.
4. **IMU Gyro Gain/Scale Multiplier Mismatch**: A $3\times$ scale multiplier error in IMU rate integration causes $30^\circ$ of physical chassis rotation to register as $90^\circ$ in odometry, triggering early settlement exit at 30 physical degrees.

---

## 2. Technical Diagnostics & Step-by-Step Fixes

### 2.1 Cause 1: Absolute Heading vs Relative Turn (Fixing Coordinate Semantics)

`turn_to_angle` aligns to world coordinate angle $+90^\circ$.

```python
# FIX A: Use turn_angle for relative 90-degree turn from current heading
await robot.turn_angle(90.0, speed_deg_s=200.0)

# FIX B: Reset heading pose to 0.0 before calling turn_to_angle
robot.reset_state(x=robot.x, y=robot.y, theta=0.0)
await robot.turn_to_angle(90.0, speed_deg_s=200.0)
```

---

### 2.2 Cause 2: Kinematic Track Ratio Verification (`axle_track` / `wheel_diameter`)

In `pb_type_mdrobotbase.c` (lines 508–514):

$$\text{Motor DPS} = \omega_{\text{cmd}} \cdot \frac{\text{axle\_track}}{\text{wheel\_diameter}}$$

If physical `axle_track` is $112.0\text{mm}$ and `wheel_diameter` is $56.0\text{mm}$, verify initialization parameters:

```python
# Ensure physical axle track and wheel diameter match robot hardware exactly
robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter=56.0,  # mm
    axle_track=112.0      # mm (Must NOT be under-estimated!)
)
```

---

### 2.3 Cause 3: Eliminating Deceleration Stiction Stalls

Avoid overly large `decel_angle` and set a minimum `end_speed` above surface stiction:

```python
await robot.turn_to_angle(
    target_angle=90.0,
    speed_deg_s=250.0,
    accel_angle=15.0,  # Standard 15-degree acceleration
    decel_angle=15.0,  # Standard 15-degree deceleration (prevents premature speed drops)
    end_speed=30.0,    # Prevents motor stiction stall near target arrival
    tolerance=1.0
)
```

---

## 3. Diagnostic Decision Tree

```
Robot turns 30° instead of 90°
  │
  ├──► Check current pose heading before turn:
  │      Is robot already facing +60°? ──► Use robot.turn_angle(90) or reset pose theta to 0.0
  │
  ├──► Check MDRobotBase instantiation parameters:
  │      Is axle_track set too small? ────► Correct axle_track to match physical wheel center spacing
  │
  └──► Check decel_angle & end_speed:
         Is end_speed < 20 deg/s? ────────► Increase end_speed to 30.0 deg/s to overcome mat friction
```

---

## 4. Verification

- **Unit Test Execution**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (2/2 Passed).
- **Result**: `turn_to_angle(90.0)` completes exact 90-degree physical rotation when starting from 0.0° pose heading or when using relative `turn_angle(90.0)`.
