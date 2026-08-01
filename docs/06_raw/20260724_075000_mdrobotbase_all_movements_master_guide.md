# Master Architecture & Exhaustive Technical Reference: All `MDRobotBase` Movements

**Timestamp**: 2026-07-24T07:50:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Core Implementation File**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Header File**: [`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h)  
**Async Engine File**: [`pybricks/tools/pb_type_async.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/tools/pb_type_async.c)  

---

## 1. Core Architectural & Kinematic Foundations

The `MDRobotBase` C engine forms the core navigation, state estimation, and motion control subsystem inside Pybricks MicroPython. It provides high-precision differential drive mobile robot control with dual-controller support (PID and LQR state feedback), S-curve velocity profiling, battery voltage scaling, dynamic backlash filtering, and native non-blocking coroutine execution.

---

### 1.1 Differential Drive Kinematics & Body Frame Conventions

```
              ^ +X_body (Forward)
              |
        +-----+-----+
        |     |     |
 (Left) |  [Wheel]  | (Right)
  +Y    |     |     |  -Y
  <-----+---(Hub)---+----
        |     |     |
        +-----+-----+
              |
```

- **World Frame $(X, Y, \theta)$**:
  - $X$: Global horizontal axis in millimeters ($\text{mm}$).
  - $Y$: Global vertical axis in millimeters ($\text{mm}$).
  - $\theta$: Robot heading angle in degrees ($^\circ$), where $0.0^\circ$ points along $+X$, $+90.0^\circ$ points along $+Y$ (Counter-Clockwise positive convention).
- **Body Kinematics Transformation**:
  Given target linear velocity $v_{\text{cmd}}$ ($\text{mm/s}$) and angular velocity $\omega_{\text{cmd}}$ ($\text{rad/s}$), the left and right wheel velocities ($v_L, v_R$) are derived as:

  $$v_L = v_{\text{cmd}} - \omega_{\text{cmd}} \cdot \frac{W}{2}$$
  $$v_R = v_{\text{cmd}} + \omega_{\text{cmd}} \cdot \frac{W}{2}$$

  where $W$ is the effective axle track width (`axle_track` in $\text{mm}$).

- **Wheel Motor Angular Velocity Conversion ($dps$)**:
  $$\text{dps}_L = \frac{v_L}{\pi \cdot d_L} \times 360^\circ$$
  $$\text{dps}_R = \frac{v_R}{\pi \cdot d_R} \times 360^\circ$$

  where $d_L, d_R$ are the left and right wheel diameters (`wheel_diameter_left`, `wheel_diameter_right` in $\text{mm}$).

---

### 1.2 Multi-Sensor Odometry & IMU Complementary Fusion Filter

At each frame tick ($dt = 10\text{ms}$), wheel encoder delta angles ($\Delta \phi_L, \Delta \phi_R$) are converted to incremental wheel displacements ($\Delta s_L, \Delta s_R$):

$$\Delta s_L = \frac{\Delta \phi_L}{360^\circ} \cdot \pi \cdot d_L$$
$$\Delta s_R = \frac{\Delta \phi_R}{360^\circ} \cdot \pi \cdot d_R$$

The incremental wheel-based linear distance $\Delta s$ and differential heading change $\Delta \theta_{\text{enc}}$ are:

$$\Delta s = \frac{\Delta s_L + \Delta s_R}{2}$$
$$\Delta \theta_{\text{enc}} = \left( \frac{\Delta s_R - \Delta s_L}{W} \right) \times \left( \frac{180^\circ}{\pi} \right)$$

#### Sensor Fusion Weighting ($\alpha$)
The physical IMU gyro heading $\theta_{\text{gyro}}$ is fused with encoder heading $\theta_{\text{enc}}$ using complementary weight $\alpha = \text{fusion\_alpha}$ (default $0.95$):

$$\theta_{\text{fused}} = \alpha \cdot \theta_{\text{gyro}} + (1 - \alpha) \cdot (\theta_{\text{prev}} + \Delta \theta_{\text{enc}})$$

World coordinates $(X, Y)$ are integrated using midpoint RK2 trajectory integration:

$$\theta_{\text{mid}} = \theta_{\text{prev}} + \frac{\Delta \theta_{\text{fused}}}{2}$$
$$X_{k+1} = X_k + \Delta s \cdot \cos\left(\theta_{\text{mid}} \cdot \frac{\pi}{180^\circ}\right)$$
$$Y_{k+1} = Y_k + \Delta s \cdot \sin\left(\theta_{\text{mid}} \cdot \frac{\pi}{180^\circ}\right)$$

---

### 1.3 Asynchronous Coroutine Engine (`pb_type_async.c`)

Every movement function returns via `pb_type_mdrobotbase_wait_or_await(self)`:

```c
mp_obj_t pb_type_mdrobotbase_wait_or_await(pb_type_MDRobotBase_obj_t *self) {
    pb_type_async_t config = {
        .parent_obj = MP_OBJ_FROM_PTR(self),
        .iter_once = pb_type_mdrobotbase_motion_iterate_once,
        .return_map = NULL,
        .close = pb_type_mdrobotbase_motion_close,
        .state = 0,
    };
    return pb_type_async_wait_or_await(&config, &self->last_awaitable, true);
}
```

1. **Inside `run_task` / `async def` (`pb_module_tools_run_loop_is_active() == true`)**:
   - Returns a `pb_type_async_t` generator object to the MicroPython event loop.
   - On each tick of the event loop, MicroPython executes `iter_once`.
   - Returning `PBIO_ERROR_AGAIN` yields execution for $10\text{ms}$.
   - Returning `PBIO_SUCCESS` stops iteration and completes the coroutine.
2. **Inside Synchronous Scripts (`pb_module_tools_run_loop_is_active() == false`)**:
   - Executes a blocking C loop: `while (iter_once(...) == PBIO_ERROR_AGAIN) mp_event_wait_indefinite();`.

---

## 2. Exhaustive API Specifications & C Mechanics

---

### 2.1 `navigate_to_goal`

Navigates to 2D coordinates $(X_g, Y_g)$ with optional final orientation alignment $\theta_g$, S-curve velocity profiling, and LQR/PID cross-track feedback.

```python
robot.navigate_to_goal(
    goal_x,                 # [REQUIRED] float (mm)
    goal_y,                 # [REQUIRED] float (mm)
    goal_theta=None,        # [OPTIONAL] float (degrees)
    speed_mm_s=500.0,       # [OPTIONAL] float (mm/s)
    start_speed_mm_s=20.0,  # [OPTIONAL] float (mm/s)
    end_speed_mm_s=40.0,    # [OPTIONAL] float (mm/s)
    accel_dist_mm=None,     # [OPTIONAL] float (mm)
    decel_dist_mm=None,     # [OPTIONAL] float (mm)
    use_ramping=False,      # [OPTIONAL] bool (default False)
    backward=False,         # [OPTIONAL] bool (default False)
    tolerance_dist=15.0,    # [OPTIONAL] float (mm)
    timeout_ms=None,        # [OPTIONAL] int (ms)
    then=Stop.HOLD,         # [OPTIONAL] Stop enum
    kick_speed_mm_s=0.0,    # [OPTIONAL] float (mm/s)
    kick_time_ms=0.0        # [OPTIONAL] float (ms)
)
```

#### Detailed Parameter Breakdown

| Parameter | Type | Default | Units | Description & C Internal Mechanics |
| :--- | :--- | :--- | :--- | :--- |
| `goal_x` | `float` | **`REQUIRED`** | $\text{mm}$ | Target X coordinate in global odometry frame. |
| `goal_y` | `float` | **`REQUIRED`** | $\text{mm}$ | Target Y coordinate in global odometry frame. |
| `goal_theta` | `float`/`None` | `None` | $^\circ$ | Optional target final heading. If set, robot aligns heading after reaching goal distance. |
| `speed_mm_s` | `float` | `500.0` | $\text{mm/s}$ | Cruising linear velocity target ($v_{\text{cruise}}$). |
| `start_speed_mm_s` | `float` | `20.0` | $\text{mm/s}$ | Initial linear starting velocity ($v_{\text{start}}$). |
| `end_speed_mm_s` | `float` | `40.0` | $\text{mm/s}$ | Terminal linear velocity prior to stopping ($v_{\text{end}}$). |
| `accel_dist_mm` | `float`/`None` | Auto | $\text{mm}$ | Acceleration distance $d_{\text{accel}}$. If `None`, calculated: $d = \frac{v_{\text{cruise}}^2 - v_{\text{start}}^2}{2 a_{\text{max}}}$. |
| `decel_dist_mm` | `float`/`None` | Auto | $\text{mm}$ | Deceleration distance $d_{\text{decel}}$. If `None`, calculated: $d = \frac{v_{\text{cruise}}^2 - v_{\text{end}}^2}{2 a_{\text{max}}}$. |
| `use_ramping` | `bool` | `False` | bool | Enables smooth velocity profiling. Set to `False` by default for maximum PID/LQR feedback reactivity. |
| `backward` | `bool` | `False` | bool | Drives in reverse mode towards target coordinates. |
| `tolerance_dist` | `float` | `15.0` | $\text{mm}$ | Distance arrival radius $d_{\text{remaining}} \le \text{tolerance\_dist}$. |
| `timeout_ms` | `int`/`None` | Auto | $\text{ms}$ | Timeout threshold. Auto-calculated based on expected path time if `None`. |
| `then` | `Stop` | `Stop.HOLD` | Enum | Completion motor stop behavior (`Stop.HOLD`, `Stop.BRAKE`, `Stop.COAST`). |
| `kick_speed_mm_s`| `float` | `0.0` | $\text{mm/s}$ | High-voltage initial kick velocity to break static friction on carpet. |
| `kick_time_ms` | `float` | `0.0` | $\text{ms}$ | Duration of initial friction kick burst. |

---

### 2.2 `go_forward` & `go_backward`

Drives straight forward or backward along current orientation heading vector $\hat{\mathbf{u}} = (\cos\theta, \sin\theta)$.

```python
robot.go_forward(
    distance,               # [REQUIRED] float (mm)
    speed_mm_s=500.0,       # [OPTIONAL] float (mm/s)
    start_speed_mm_s=20.0,  # [OPTIONAL] float (mm/s)
    end_speed_mm_s=40.0,    # [OPTIONAL] float (mm/s)
    accel_dist_mm=None,     # [OPTIONAL] float (mm)
    decel_dist_mm=None,     # [OPTIONAL] float (mm)
    use_ramping=False,      # [OPTIONAL] bool
    timeout_ms=None,        # [OPTIONAL] int (ms)
    then=Stop.HOLD,         # [OPTIONAL] Stop enum
    kick_speed_mm_s=0.0,    # [OPTIONAL] float (mm/s)
    kick_time_ms=0.0        # [OPTIONAL] float (ms)
)

robot.go_backward(distance, ...) # Sets backward=True internally
```

#### C Kinematic Target Derivation
```c
float gx = cur_x + distance * cosf(rad);
float gy = cur_y + distance * sinf(rad);
// Delegates directly to navigate_to_goal C engine
```

---

### 2.3 `turn_to_angle` & `turn_angle`

Differential spin turn in-place ($r = \frac{W}{2}$) around center of axle track.

```python
robot.turn_to_angle(
    target_angle,           # [REQUIRED] float (degrees)
    speed_deg_s=300.0,      # [OPTIONAL] float (deg/s)
    tolerance=1.5,          # [OPTIONAL] float (degrees)
    timeout_ms=None,        # [OPTIONAL] int (ms)
    then=Stop.HOLD,         # [OPTIONAL] Stop enum
    accel_angle=15.0,       # [OPTIONAL] float (degrees)
    start_speed=40.0,       # [OPTIONAL] float (deg/s)
    decel_angle=15.0,       # [OPTIONAL] float (degrees)
    end_speed=20.0          # [OPTIONAL] float (deg/s)
)

robot.turn_angle(angle, ...) # Target = current_theta + angle
```

#### C Spin Kinematic Equations
$$\omega_{\text{cmd}} = K_p \cdot e_\theta + K_i \int e_\theta dt - K_d \cdot \omega_{\text{raw}}$$
$$v_L = -\omega_{\text{cmd}} \cdot \frac{W}{2}, \quad v_R = \omega_{\text{cmd}} \cdot \frac{W}{2}$$

---

### 2.4 `pivot_turn_to_angle` & `pivot_turn_angle`

Single-wheel pivot turn around locked left or right wheel ($r = W$).

```python
robot.pivot_turn_to_angle(
    target_angle,           # [REQUIRED] float (degrees)
    speed_deg_s=200.0,      # [OPTIONAL] float (deg/s)
    pivot_side='left',      # [OPTIONAL] str ('left' | 'right')
    tolerance=1.5,          # [OPTIONAL] float (degrees)
    timeout_ms=None,        # [OPTIONAL] int (ms)
    then=Stop.HOLD,         # [OPTIONAL] Stop enum
    accel_angle=15.0,       # [OPTIONAL] float (degrees)
    start_speed=40.0,       # [OPTIONAL] float (deg/s)
    decel_angle=15.0,       # [OPTIONAL] float (degrees)
    end_speed=20.0          # [OPTIONAL] float (deg/s)
)

robot.pivot_turn_angle(angle, ...)
```

#### C Wheel Assignment Logic
```c
if (self->rb->pivot_left) {
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
    float right_vel = w_rad * track_mm;
    int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_right_mm)) * 360.0f);
    pbio_servo_run_forever(self->rb->right, right_dps);
} else {
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
    float left_vel = -w_rad * track_mm;
    int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_left_mm)) * 360.0f);
    pbio_servo_run_forever(self->rb->left, left_dps);
}
```

---

### 2.5 `follow_trajectory`

Pure Pursuit trajectory tracking across multi-waypoint curves.

```python
robot.follow_trajectory(
    waypoints,              # [REQUIRED] list of (x, y, speed, heading) tuples
    lookahead_dist=150.0,   # [OPTIONAL] float (mm)
    speed_mm_s=400.0,       # [OPTIONAL] float (mm/s)
    tolerance_dist=20.0,    # [OPTIONAL] float (mm)
    then=Stop.HOLD          # [OPTIONAL] Stop enum
)
```

#### Pure Pursuit Curvature Equation
$$\gamma = \frac{2 \Delta y_L}{L_d^2}$$
$$\omega_{\text{cmd}} = v_{\text{cmd}} \cdot \gamma$$

---

### 2.6 State & Gain Configuration APIs

```python
# 1. Reset pose coordinates
robot.reset_state(x=0.0, y=0.0, theta=0.0, gyro_heading=0.0)

# 2. Select controller (0 = PID, 1 = LQR)
robot.set_controller(controller_type=1)

# 3. Configure PID Gains
robot.set_pid_gains(kp=10.0, ki=0.0, kd=0.1)

# 4. Configure LQR Gains & Gain Scheduling
robot.set_lqr_gains(k_x=1.25, k_y=2.0, k_theta=5.0, lqr_schedule_enabled=True)

# 5. PID Minimum Turn Speed Threshold
robot.set_pid_min_turn(min_turn=1.25, threshold=0.25)

# 6. Backlash Filter Toggle & Limits
robot.set_backlash_filter(enabled=True)
robot.set_backlash_limits(left_limit=1.2, right_limit=1.2) # degrees

# 7. Asymmetric Wheel Diameters
robot.set_wheel_diameters(wheel_diameter_left=63.4, wheel_diameter_right=63.4)
```

---

## 3. Comprehensive Master WRO Mission Script

The script below demonstrates **every single movement and configuration API** in a realistic WRO competition mission flow.

```python
"""
master_wro_mission.py
======================
Comprehensive Pybricks MDRobotBase Master Mission Script demonstrating
all movement APIs (navigate_to_goal, go_forward, go_backward, turn_to_angle,
turn_angle, pivot_turn_to_angle, pivot_turn_angle, follow_trajectory)
and state setup methods.
"""

from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Direction, Stop, Color, Axis
from pybricks.tools import run_task, wait

try:
    from pybricks.robotics import MDRobotBase
except ImportError:
    from MDRobotBase import MDRobotBase

# Initialize PrimeHub and Motors
hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B, Direction.CLOCKWISE)
front_arm = Motor(Port.E)
back_arm = Motor(Port.A)

# Instantiate MDRobotBase
robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter_left=63.4,
    wheel_diameter_right=63.4,
    axle_track=165.0
)

async def run_master_wro_routine():
    print("=== Starting Master WRO MDRobotBase Mission Routine ===")

    # -----------------------------------------------------------------
    # Step 1: Configuration & State Initialization
    # -----------------------------------------------------------------
    # Reset odometry state to starting zone coordinates (X=2195, Y=524, Heading=90.0)
    robot.reset_state(2195.0, 524.0, 90.0, hub.imu.heading())
    robot.set_max_angular_speed(1000.0)

    # Select LQR state-feedback controller
    robot.set_controller(1) # 1 = LQR, 0 = PID
    robot.set_lqr_gains(k_x=1.25, k_y=2.0, k_theta=5.0, lqr_schedule_enabled=True)
    robot.set_pid_gains(kp=10.0, ki=0.0, kd=0.1)
    robot.set_pid_min_turn(min_turn=1.25, threshold=0.25)

    # Configure backlash filter to prevent gear slack error
    robot.set_backlash_filter(True)
    robot.set_backlash_limits(left_limit=1.2, right_limit=1.2)
    robot.set_wheel_diameters(wheel_diameter_left=63.4, wheel_diameter_right=63.4)

    hub.speaker.beep()
    print("Robot state and gains initialized successfully.")

    # -----------------------------------------------------------------
    # Step 2: Linear Drive (`go_forward` & `go_backward`)
    # -----------------------------------------------------------------
    print("\n--- Phase 1: Straight Linear Sprint ---")
    # Drive 350mm forward out of start zone
    await robot.go_forward(
        distance=350.0,
        speed_mm_s=450.0,
        start_speed_mm_s=30.0,
        end_speed_mm_s=50.0,
        use_ramping=False,
        then=Stop.HOLD
    )

    # Back up 100mm to clear starting alignment wall
    await robot.go_backward(
        distance=100.0,
        speed_mm_s=300.0,
        then=Stop.HOLD
    )

    # -----------------------------------------------------------------
    # Step 3: Spin Turns (`turn_to_angle` & `turn_angle`)
    # -----------------------------------------------------------------
    print("\n--- Phase 2: In-Place Spin Turns ---")
    # Spin turn in-place to face West (180.0 degrees)
    await robot.turn_to_angle(
        target_angle=180.0,
        speed_deg_s=250.0,
        tolerance=1.0,
        then=Stop.HOLD
    )

    # Relative spin turn: turn -45.0 degrees Clockwise
    await robot.turn_angle(
        angle=-45.0,
        speed_deg_s=200.0,
        then=Stop.HOLD
    )

    # -----------------------------------------------------------------
    # Step 4: Pivot Turns (`pivot_turn_to_angle` & `pivot_turn_angle`)
    # -----------------------------------------------------------------
    print("\n--- Phase 3: Single-Wheel Pivot Turns around Obstacle ---")
    # Pivot turn around LEFT wheel to face North (90.0 degrees)
    await robot.pivot_turn_to_angle(
        target_angle=90.0,
        speed_deg_s=200.0,
        pivot_side='left',
        then=Stop.HOLD
    )

    # Relative pivot turn around RIGHT wheel (-45 degrees)
    await robot.pivot_turn_angle(
        angle=-45.0,
        speed_deg_s=180.0,
        pivot_side='right',
        then=Stop.HOLD
    )

    # -----------------------------------------------------------------
    # Step 5: 2D Navigation (`navigate_to_goal`)
    # -----------------------------------------------------------------
    print("\n--- Phase 4: Precision 2D Waypoint Navigation ---")
    # Navigate to Note Slot 3 area with final heading alignment to 180 deg
    await robot.navigate_to_goal(
        goal_x=1629.0,
        goal_y=1059.0,
        goal_theta=180.0,
        speed_mm_s=400.0,
        tolerance_dist=10.0,
        then=Stop.HOLD
    )

    # Actuate back arm to grab Big Green Note
    back_arm.run_angle(speed=400, rotation_angle=120, then=Stop.HOLD)
    wait(200)

    # -----------------------------------------------------------------
    # Step 6: Pure Pursuit Trajectory Tracking (`follow_trajectory`)
    # -----------------------------------------------------------------
    print("\n--- Phase 5: Pure Pursuit Trajectory Curve Tracking ---")
    # Smooth multi-waypoint S-curve path to Green Deposit Area
    curve_waypoints = [
        (1629.0, 1059.0, 400.0, 180.0),
        (1590.0, 850.0,  350.0, 210.0),
        (1551.0, 596.0,  250.0, 270.0)
    ]

    await robot.follow_trajectory(
        waypoints=curve_waypoints,
        lookahead_dist=120.0,
        speed_mm_s=350.0,
        tolerance_dist=15.0,
        then=Stop.HOLD
    )

    # Deposit Big Green Note in Green Area
    back_arm.run_angle(speed=400, rotation_angle=-120, then=Stop.HOLD)
    wait(200)

    # -----------------------------------------------------------------
    # Step 7: Final Return to Finish Zone
    # -----------------------------------------------------------------
    print("\n--- Phase 6: Fast Return to Finish Zone ---")
    await robot.navigate_to_goal(
        goal_x=2195.0,
        goal_y=524.0,
        goal_theta=90.0,
        speed_mm_s=500.0,
        then=Stop.COAST
    )

    hub.speaker.beep()
    print("=== Master WRO Mission Completed Successfully! ===")

# Entry point for Pybricks task runner
run_task(run_master_wro_routine())
```

---

## 4. Verification & C Unit Test Suite Results

The native C test suite was executed via `./test-pbio.sh`:

```text
src/mdrobotbase/test_mdrobotbase_basics: [forking] OK
src/mdrobotbase/test_mdrobotbase_motion_state: [forking] OK
src/mdrobotbase/test_mdrobotbase_pivot_turn_state: [forking] OK
63 tests ok. (0 skipped)
```

All 63 unit tests passed with 100% success.
