# Technical Analysis: Why `navigate_to_goal` Rejects Kinematic Errors While `turn_to_angle` Requires `gear_ratio`

**Date**: 2026-07-24T18:06:00+07:00  
**Target Codebase**: `pybricks-micropython`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Executive Summary & Core Question

**Question**: *Why is the resulting target angle ($\theta$) in `navigate_to_goal` always correct without needing `gear_ratio` or manual track scaling, whereas pure `turn_to_angle` / `pivot_turn_to_angle` required explicit `gear_ratio` configuration?*

**Answer**: 

1. **`navigate_to_goal` is a Sensor-Closed-Loop Regulator**: `navigate_to_goal` uses **LQR 3-State Feedback** ($u_w = -K_y e_y - K_\theta e_\theta$) continuously driven by real-time IMU Gyro heading feedback (`self->rb->theta`). If motor gearing or wheel diameter is off, the LQR feedback loop automatically increases or decreases motor voltage dynamically until the physical IMU reading reaches the target angle.

2. **`turn_to_angle` Uses Kinematic Feedforward Ramping**: Pure `turn_to_angle` calculates motor DPS using open-loop kinematic feedforward transformations ($\text{Motor DPS} = \omega_{\text{cmd}} \cdot \frac{\text{axle\_track}}{\text{wheel\_diameter}} \cdot \text{gear\_ratio}$). If `gear_ratio` is missing, the feedforward speed profile clamps motor velocities to incorrect limits, degrading deceleration profile accuracy unless `gear_ratio` is explicitly specified.

---

## 2. Deep Control Theory Comparison

### 2.1 Closed-Loop Disturbance Rejection in `navigate_to_goal`

In `PBIO_MDROBOTBASE_MOTION_NAVIGATE` (lines 310–360):

$$\omega_{\text{cmd}} = -u_w = K_y \cdot e_y + K_\theta \cdot (e_\theta)$$

Where $e_\theta = \theta_{\text{ref}} - \theta_{\text{IMU}}$.

- If physical gear ratio is $1:3$ (motors turn $3\times$ more for $1^\circ$ wheel turn), on step 0 the robot turns slower than planned.
- $e_\theta$ remains large.
- The LQR error product $K_\theta \cdot e_\theta$ instantly increases $\omega_{\text{cmd}}$, driving the motors harder until $\theta_{\text{IMU}} = \theta_{\text{goal}}$.
- **Result**: The closed-loop controller inherently **absorbs, rejects, and neutralizes kinematic parameters** like `gear_ratio` or `axle_track` inaccuracies.

---

### 2.2 Feedforward Profile Clamping in `turn_to_angle`

In `PBIO_MDROBOTBASE_MOTION_TURN` (lines 475–520):

$$\text{Motor DPS} = \text{clamp}\left(K_p \cdot e_\theta, \text{speed\_limit}\right) \cdot \left(\frac{\text{axle\_track}}{\text{wheel\_diameter}}\right) \cdot \text{gear\_ratio}$$

- `turn_to_angle` relies on open-loop trapezoidal velocity ramping to accelerate and decelerate cleanly.
- If `gear_ratio` is missing from the motor velocity conversion, the feedforward limit clamps motor speed to the wrong physical DPS.
- While PID feedback attempts to close the loop, the ceiling clamp restricts the correction rate, causing profile distortion unless `gear_ratio` is provided.

---

## 3. Summary Comparison Matrix

| Control Characteristic | `navigate_to_goal` (LQR) | `turn_to_angle` (Spin Turn) |
| :--- | :--- | :--- |
| **Control Paradigm** | 3-State Closed-Loop Feedback Regulator | Ramped Feedforward Velocity Profile + PID |
| **Primary Feedback Vector** | Real-Time IMU Gyro Pose $[X, Y, \theta]$ | Ramped Velocity Ceiling Limit + Heading Error |
| **Kinematic Error Sensitivity** | **Immune** (Closed-loop feedback rejects gear & track errors) | **Sensitive** (Kinematic feedforward requires accurate `gear_ratio` for speed limits) |
| **Target Settlement Criteria** | Physical IMU Sensor Reading = Goal Coordinate | Angle Error $\le \text{tolerance}$ AND Angular Rate $< 15^\circ/\text{s}$ |
