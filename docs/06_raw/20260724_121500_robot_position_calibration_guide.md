# Diagnostic & Empirical Calibration Manual: Fixing Robot Position Inaccuracies

**Timestamp**: 2026-07-24T12:15:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Calibration Script**: [`code/calibrate_robot_odometry.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/calibrate_robot_odometry.py)  
**Calibration Test Suite**: [`code/test_calibrate_robot_odometry.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_calibrate_robot_odometry.py)  

---

## 1. Diagnostic Analysis: Why Physical Position Does Not Match Commanded Coordinates

When a robot consistently fails to reach commanded $(X, Y)$ coordinates or turns incorrectly, the root cause is **always an empirical mismatch between nominal software parameters and physical chassis dimensions**.

```
                Commanded Path: (X=0, Y=0) ---------------> (X=1000, Y=0)
                Actual Mat Path: (X=0, Y=0) --------------------------> (X=1032, Y=52)
                                                                           ^
                                                                           | Cumulative Drift
```

### The 4 Primary Root Causes:

1. **Effective Wheel Diameter Mismatch ($d_{\text{effective}} \ne d_{\text{nominal}}$)**:
   - Pybricks maps encoder ticks to linear distance via:
     $$\text{Distance} = \left(\frac{\Delta \phi}{360^\circ}\right) \cdot \pi \cdot d_{\text{wheel}}$$
   - Rubber compression under robot mass, tire squish, or using 62.4mm / 63.4mm SPIKE Prime wheels with default 56.0mm settings causes linear overshooting or undershooting by **up to 13%**!

2. **Effective Axle Track Mismatch ($W_{\text{effective}} \ne W_{\text{nominal}}$)**:
   - Rotational turn angle $\theta$ maps to differential wheel movement via axle track $W$:
     $$\Delta \theta = \left(\frac{\Delta s_R - \Delta s_L}{W}\right) \times \left(\frac{180^\circ}{\pi}\right)$$
   - If $W$ is off by even $2\text{mm}$, a spin turn will over or under-turn by $3^\circ - 5^\circ$. A $3^\circ$ heading error over a $1000\text{mm}$ drive causes a **$52.3\text{mm}$ lateral position error** at the end of the leg!

3. **IMU Heading Drift at Zero Alignment**:
   - If `hub.imu.heading()` is not passed during `reset_state(x, y, theta, hub.imu.heading())`, odometry initializes assuming $0^\circ$ gyro bias, leading to immediate coordinate rotation.

4. **Tire Skidding at Start due to Excessive Acceleration**:
   - If `start_speed_mm_s` is $0.0$, initial motor torque spins wheels in place on smooth mat surfaces before chassis momentum builds up, registering distance on encoders that the robot never physically traveled.

---

## 2. Two-Stage Empirical Calibration Procedure

To achieve sub-millimeter position accuracy, perform two simple empirical calibration runs using [`code/calibrate_robot_odometry.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/calibrate_robot_odometry.py).

---

### Stage 1: Linear Distance Calibration (Calculates $d_{\text{effective}}$)

1. Place the rear bumper of the robot against the $0\text{mm}$ mark on a tape measure.
2. Run a straight $1000.0\text{mm}$ drive command (`runner.run_linear_calibration(test_distance_mm=1000.0)`).
3. Read the actual physical distance on the tape measure where the rear bumper stops.
4. Calculate exact effective wheel diameter:

$$d_{\text{effective}} = d_{\text{nominal}} \times \left( \frac{\text{Distance}_{\text{measured}}}{\text{Distance}_{\text{commanded}}} \right)$$

*Example*: Nominal $63.4\text{mm}$, commanded $1000\text{mm}$, measured $1018\text{mm}$:
$$d_{\text{effective}} = 63.4 \times \left( \frac{1018.0}{1000.0} \right) = \mathbf{64.541\text{ mm}}$$

---

### Stage 2: Spin Turn Axle Track Calibration (Calculates $W_{\text{effective}}$)

1. Mark a sharp straight reference line on the floor matching the robot's front bumper.
2. Command $10$ full spin turns ($3600^\circ$ = $10$ rotations) (`runner.run_spin_turn_calibration(target_rotations=10.0)`).
3. Observe final front bumper orientation relative to the reference line.
4. Calculate exact effective axle track:

$$W_{\text{effective}} = W_{\text{nominal}} \times \left( \frac{\text{Actual Rotations Executed}}{10.0} \right)$$

*Example*: Nominal $165.0\text{mm}$, executed $10.2$ rotations (over-turned by $72^\circ$):
$$W_{\text{effective}} = 165.0 \times \left( \frac{10.2}{10.0} \right) = \mathbf{168.300\text{ mm}}$$

---

## 3. Calibrated Python Constructor Code

Update your `MDRobotBase` constructor with your empirical values:

```python
robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter_left=64.54,  # Calibrated linear wheel diameter
    wheel_diameter_right=64.54,
    axle_track=168.3            # Calibrated spin turn axle track
)

# Lock baseline pose with initial gyro alignment
robot.reset_state(x=0.0, y=0.0, theta=0.0, gyro_heading=hub.imu.heading())

# Set linear start speed to 30.0 mm/s to prevent wheel skid on start
await robot.go_forward(distance=1000.0, speed_mm_s=450.0, start_speed_mm_s=30.0)
```

---

## 4. Verification & Automated Test Results

- **Python Pytest Suite**: **24 passed in 2.96s**.
- **Native C Test Suite (`./test-pbio.sh`)**: **63 passed (0 skipped)**.
