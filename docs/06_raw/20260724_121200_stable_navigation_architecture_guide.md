# Engineering Guide: Coding Robots for Ultra-Stable, Repeatable & Drift-Free Navigation

**Timestamp**: 2026-07-24T12:12:00Z  
**Target Architecture**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Core C Implementation**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Header Definitions**: [`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h)  

---

## 1. Executive Summary & Pillars of Stable Navigation

In competitive robotics (WRO / FIRST LEGO League), **"stable navigation"** means a robot executes identical 2D trajectories with sub-millimeter precision regardless of battery discharge, floor friction variations, gear slack, or sudden disturbances.

Achieving stable navigation requires a multi-layered control and state-estimation stack:

```
+-------------------------------------------------------------------+
|               Layer 5: Application Mission Logic                  |
|          (Non-blocking coroutine multitask via async/await)       |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|              Layer 4: Trajectory Profiling & Ramping              |
|        (Dynamic S-Curve Acceleration / Deceleration Blending)    |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|         Layer 3: LQR State-Feedback + Stanley Controller          |
|    (u = -K*e optimal control + cross-track lateral correction)    |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|       Layer 2: Multi-Sensor Odometry Fusion & Backlash Filter     |
|   (alpha-weighted Gyro+Encoder fusion + deadband take-up limit)   |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|           Layer 1: Battery Voltage & Thermal Compensation          |
|         (f_comp = V_nominal / V_actual scaling on motor DPS)      |
+-------------------------------------------------------------------+
```

---

## 2. Deep Dive: 7 Architectural Principles for Stable Navigation

### 1. Optimal LQR State-Feedback Control (`set_controller(1)`)
Traditional PID controllers operate on single SISO error channels (heading error $\theta$). In differential drive navigation, coupling exists between lateral cross-track error ($e_y$), along-track error ($e_x$), and orientation error ($e_\theta$).

#### The LQR Optimal Control Law:
$$\mathbf{u} = -\mathbf{K} \mathbf{e} = -\begin{bmatrix} k_x & 0 & 0 \\ 0 & k_y & k_\theta \end{bmatrix} \begin{bmatrix} e_x \\ e_y \\ e_\theta \end{bmatrix}$$

- **Longitudinal Control**: $u_v = -k_x \cdot e_x$ (adjusts linear speed to keep target pace).
- **Lateral & Heading Coupling**: $u_\omega = -(k_y \cdot e_y + k_\theta \cdot e_\theta)$ (simultaneously eliminates cross-track drift and heading misalignment).

#### Dynamic LQR Gain Scheduling:
As linear velocity $v$ increases, lateral sensitivity changes. The C engine dynamically scales lateral gains:

$$S_{\text{sched}} = \sqrt{\frac{|v|}{300.0}}, \quad \text{clamped to } [0.2, 2.0]$$
$$k_y(v) = k_y \cdot S_{\text{sched}}, \quad k_\theta(v) = k_\theta \cdot S_{\text{sched}}$$

*Python Configuration*:
```python
robot.set_controller(1) # Select LQR mode
robot.set_lqr_gains(k_x=1.25, k_y=2.0, k_theta=5.0, lqr_schedule_enabled=True)
```

---

### 2. Battery Voltage Scaling Compensation
As a robot runs, battery voltage drops from $8.4\text{V}$ (100% full charge) down to $7.2\text{V}$ (low charge). Without compensation, motor torque drops by over $15\%$, breaking trajectory repeatability.

The C engine measures battery voltage $V_{\text{actual}}$ on every tick and computes scale factor $f_{\text{comp}}$:

$$f_{\text{comp}} = \frac{V_{\text{nominal}}}{V_{\text{actual}}} = \frac{7400\text{mV}}{V_{\text{measured}}}$$

All PID/LQR gains and feedback corrections are multiplied by $f_{\text{comp}}$, guaranteeing identical physical motor response across all battery levels.

---

### 3. Active Gear Backlash Deadband Elimination
Lego Technic spur gear trains contain $1.0^\circ - 2.5^\circ$ of mechanical gear backlash. When a robot transitions from forward driving to turning, the motors rotate through this deadband without moving the wheels, causing cumulative heading drift.

The `MDRobotBase` backlash filter tracks direction reversals and offsets encoder readings by the exact deadband angle ($\theta_{\text{backlash}}$):

*Python Configuration*:
```python
robot.set_backlash_filter(True)
robot.set_backlash_limits(left_limit=1.2, right_limit=1.2) # degrees
```

---

### 4. Complementary IMU Gyro + Encoder Odometry Fusion
Wheel slip on smooth competition mats corrupts encoder odometry. Conversely, IMU gyroscopes exhibit low-frequency drift over long runs.

The C fusion engine blends both sensors on every $10\text{ms}$ tick using weight $\alpha = 0.95$:

$$\theta_{\text{fused}} = \alpha \cdot \theta_{\text{gyro}} + (1 - \alpha) \cdot (\theta_{\text{prev}} + \Delta \theta_{\text{enc}})$$

- **High-frequency turns**: Driven by precise 100Hz gyro rate integration.
- **Low-frequency stability**: Anchored by motor encoder distance accumulation.

---

### 5. Stanley Cross-Track Error Correction
When driving long straight distances over mat seams, lateral drift $e_y$ occurs. The C navigation engine incorporates Stanley steering geometry:

$$\delta_{\text{Stanley}} = \arctan\left( \frac{k_e \cdot e_y}{v_{\text{cmd}}} \right)$$

This applies an aggressive non-linear steering correction when off-path, rapidly snapping the robot back onto the nominal line vector $\mathbf{P}_1 \to \mathbf{P}_2$.

---

### 6. Ramping & Feedback Reactivity Tuning (`use_ramping=False`)
When `use_ramping=True`, the robot's velocity is constrained to a pre-calculated trapezoidal profile. While smooth, this introduces **phase lag** in feedback loops.

Setting `use_ramping=False` (default) gives the LQR/PID state-feedback controller direct control over instant motor torque, allowing it to instantly reject external physical bumps or wall contacts.

---

### 7. Sensor-Fused Stall & Safety Protection
If a robot collides with an obstacle or wall, spinning wheels will corrupt odometry. The `MDRobotBase` engine monitors motor duty cycle versus actual angular rate:

$$\text{If } |w_{\text{cmd}}| > 30^\circ/\text{s} \quad \text{AND} \quad |\omega_{\text{actual}}| < 5^\circ/\text{s} \quad \text{for } t > 200\text{ms} \implies \text{Stall Event}$$

Upon stall detection, motion terminates safely with `Stop.HOLD` to lock position and prevent gear stripping.

---

## 3. Production-Grade Stable Navigation Python Code Template

```python
"""
stable_navigation_template.py
==============================
Production-grade Python template for rock-solid, ultra-repeatable
robot navigation using Pybricks MDRobotBase.
"""

from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop, Axis
from pybricks.tools import run_task, wait
from pybricks.robotics import MDRobotBase

# 1. Initialize Hub and Motors
hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B, Direction.CLOCKWISE)

# 2. Instantiate MDRobotBase with precise calibrated dimensions
robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter_left=63.4,
    wheel_diameter_right=63.4,
    axle_track=165.0
)

def setup_stable_robot_parameters(robot, hub):
    """Configures all stability, control, and backlash parameters."""

    # Lock starting pose to world frame (X=0, Y=0, Heading=0)
    robot.reset_state(x=0.0, y=0.0, theta=0.0, gyro_heading=hub.imu.heading())

    # Set maximum angular speed threshold
    robot.set_max_angular_speed(1000.0)

    # 1. Enable LQR Optimal Control (Controller Type 1)
    robot.set_controller(1)

    # 2. Tune LQR Optimal Gains for high stiffness & cross-track rejection
    robot.set_lqr_gains(
        k_x=1.25,                 # Longitudinal pace gain
        k_y=2.0,                  # Cross-track lateral correction gain
        k_theta=5.0,              # Heading error correction gain
        lqr_schedule_enabled=True # Dynamic speed-based gain scheduling
    )

    # 3. Tune PID turning gains for spin/pivot turns
    robot.set_pid_gains(kp=10.0, ki=0.0, kd=0.1)
    robot.set_pid_min_turn(min_turn=1.25, threshold=0.25)

    # 4. Enable Backlash Deadband Compensation
    robot.set_backlash_filter(True)
    robot.set_backlash_limits(left_limit=1.2, right_limit=1.2)

    # 5. Calibration check
    robot.set_wheel_diameters(wheel_diameter_left=63.4, wheel_diameter_right=63.4)

    hub.speaker.beep()
    print("Stability stack successfully initialized!")


async def stable_mission_routine():
    setup_stable_robot_parameters(robot, hub)

    # Example 1: Precision straight sprint with LQR cross-track correction
    await robot.go_forward(
        distance=500.0,
        speed_mm_s=450.0,
        start_speed_mm_s=30.0,
        end_speed_mm_s=40.0,
        use_ramping=False, # Instant feedback reactivity
        then=Stop.HOLD
    )

    # Example 2: In-place spin turn to precise heading
    await robot.turn_to_angle(
        target_angle=90.0,
        speed_deg_s=250.0,
        tolerance=1.0,
        then=Stop.HOLD
    )

    # Example 3: Pivot turn around left wheel to align against wall
    await robot.pivot_turn_to_angle(
        target_angle=180.0,
        speed_deg_s=200.0,
        pivot_side='left',
        then=Stop.HOLD
    )

    # Example 4: Navigate to 2D target waypoint
    await robot.navigate_to_goal(
        goal_x=1500.0,
        goal_y=800.0,
        goal_theta=180.0,
        speed_mm_s=400.0,
        tolerance_dist=10.0,
        then=Stop.HOLD
    )

run_task(stable_mission_routine())
```
