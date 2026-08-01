# Complete Guide: `pivot_turn_to_angle` & `pivot_turn_angle` Mechanics, Usage & Kinematics

**Timestamp**: 2026-07-23T21:56:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Source Code Reference**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1439-L1535)  
**Header File**: [`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h)  

---

## 1. Overview: Pivot Turn vs. Spin Turn

In differential drive mobile robotics, two distinct rotational maneuvers are available:

| Feature | Spin Turn (`turn_to_angle` / `turn_angle`) | Pivot Turn (`pivot_turn_to_angle` / `pivot_turn_angle`) |
| :--- | :--- | :--- |
| **Center of Rotation** | Midpoint of axle track ($r = \frac{\text{track}}{2}$) | Contact point of the locked wheel ($r = \text{track}$) |
| **Wheel Motion** | Both wheels turn in **opposite directions** | One wheel is **locked in place** (`Stop.HOLD`); the other wheel drives |
| **Odometry Path** | Robot heading rotates in place; $(x, y)$ stays constant | Robot heading rotates while $(x, y)$ sweeps along an arc of radius equal to `axle_track` |
| **Primary Use Case** | Reorienting orientation in open space | Turning tightly around a wall corner or aligning against a field border |

---

## 2. API Signature & Parameter Specification

### 2.1 Python API Signatures

```python
# Absolute heading pivot turn
robot.pivot_turn_to_angle(
    target_angle,           # Required: Absolute target heading in degrees
    speed_deg_s=200.0,      # Maximum rotational speed (deg/s)
    pivot_side='left',      # Wheel to lock: 'left' or 'right'
    tolerance=1.5,          # Acceptable error margin (degrees)
    timeout_ms=None,        # Maximum execution timeout (ms)
    then=Stop.HOLD,         # Completion behavior (HOLD, BRAKE, COAST)
    accel_angle=15.0,       # Acceleration ramp distance (degrees)
    start_speed=40.0,       # Initial turn rate (deg/s)
    decel_angle=15.0,       # Deceleration ramp distance (degrees)
    end_speed=20.0          # Final turn rate (deg/s)
)

# Relative angle pivot turn
robot.pivot_turn_angle(
    angle,                  # Required: Relative angle change (+ = CCW, - = CW)
    speed_deg_s=200.0,      # Maximum rotational speed (deg/s)
    pivot_side='left',      # Wheel to lock: 'left' or 'right'
    ...                     # Same keyword arguments as pivot_turn_to_angle
)
```

---

### 2.2 Parameter Definitions & Units

1. **`target_angle`** (`float`, degrees):
   - Absolute target angle in the robot's odometry/IMU coordinate system.
   - Counter-Clockwise (CCW) is positive ($+90.0^\circ$ points North/Up).
2. **`angle`** (`float`, degrees):
   - Relative turn angle. Positive values turn CCW; negative values turn CW.
3. **`speed_deg_s`** (`float`, deg/s, default `200.0`):
   - Peak angular turn speed of the robot body.
4. **`pivot_side`** (`str`, `'left'` or `'right'`, default `'left'`):
   - `'left'`: Locks the **Left Wheel** in position with `Stop.HOLD`. The **Right Wheel** drives to rotate the robot around the left wheel contact point.
   - `'right'`: Locks the **Right Wheel** in position with `Stop.HOLD`. The **Left Wheel** drives to rotate the robot around the right wheel contact point.
5. **`tolerance`** (`float`, degrees, default `1.5`):
   - Heading error threshold $|e_\theta| \le \text{tolerance}$ for motion termination.
6. **`then`** (`pb_Stop_enum`, default `Stop.HOLD`):
   - Action applied to motors when target angle is achieved (`Stop.HOLD`, `Stop.BRAKE`, `Stop.COAST`).
7. **`accel_angle` / `decel_angle`** (`float`, degrees, default `15.0`):
   - Angle over which speed ramps up from `start_speed` or ramps down to `end_speed`.

---

## 3. Underlying C Kinematics & Closed-Loop Control Mechanics

In `pb_type_mdrobotbase.c` (`PBIO_MDROBOTBASE_MOTION_PIVOT` state dispatcher):

### 3.1 Kinematic Velocity Derivation
When pivoting around one wheel, the arc radius is equal to the full axle track ($W = \text{axle\_track}$).

- If `pivot_side == 'left'` (Left Wheel locked):
  $$\omega_{\text{left}} = 0 \quad (\text{Stop.HOLD})$$
  $$v_{\text{right}} = \omega_{\text{cmd}} \cdot W$$
  $$\text{dps}_{\text{right}} = \frac{v_{\text{right}}}{\pi \cdot d_{\text{right}}} \times 360^\circ$$

- If `pivot_side == 'right'` (Right Wheel locked):
  $$\omega_{\text{right}} = 0 \quad (\text{Stop.HOLD})$$
  $$v_{\text{left}} = -\omega_{\text{cmd}} \cdot W$$
  $$\text{dps}_{\text{left}} = \frac{v_{\text{left}}}{\pi \cdot d_{\text{left}}} \times 360^\circ$$

### 3.2 Dynamic Acceleration/Deceleration S-Curve Profiling
The turn rate is constrained dynamically on every frame tick ($dt = 10\text{ms}$):

$$\text{accel\_limit} = \text{start\_speed} + (\text{speed\_deg\_s} - \text{start\_speed}) \cdot \frac{\theta_{\text{turned}}}{\theta_{\text{accel}}}$$
$$\text{decel\_limit} = \text{end\_speed} + (\text{speed\_deg\_s} - \text{end\_speed}) \cdot \frac{\theta_{\text{remaining}}}{\theta_{\text{decel}}}$$
$$\text{limit} = \min(\text{accel\_limit}, \text{decel\_limit}, \text{max\_pivot\_speed})$$

### 3.3 Closed-Loop PID Heading Feedback
$$\omega_{\text{cmd}} = (K_{p,\text{pivot}} \cdot \text{comp}) \cdot e_\theta + K_{i,\text{pivot}} \int e_\theta \, dt - (K_{d,\text{pivot}} \cdot \text{comp}) \cdot \omega_{\text{raw}}$$
$$\text{where } e_\theta = \theta_{\text{target}} - \theta_{\text{current}}$$

---

## 4. Code Examples

### 4.1 Asynchronous Coroutine Mode (`run_task`)

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.tools import run_task
from pybricks.robotics import MDRobotBase

hub = PrimeHub()
left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B, Direction.CLOCKWISE)

robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter_left=63.4,
    wheel_diameter_right=63.4,
    axle_track=165.0
)

async def main():
    # Initialize odometry pose (x=0, y=0, theta=0)
    robot.reset_state(0.0, 0.0, 0.0, hub.imu.heading())

    # 1. Pivot turn around left wheel to 90 degrees (Left wheel locked, right wheel drives)
    await robot.pivot_turn_to_angle(
        target_angle=90.0,
        speed_deg_s=250.0,
        pivot_side='left',
        then=Stop.HOLD
    )

    # 2. Pivot turn around right wheel back to 0 degrees (Right wheel locked, left wheel drives)
    await robot.pivot_turn_to_angle(
        target_angle=0.0,
        speed_deg_s=250.0,
        pivot_side='right',
        then=Stop.HOLD
    )

run_task(main())
```

### 4.2 Synchronous Mode (Linear Script)

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import MDRobotBase

hub = PrimeHub()
left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B, Direction.CLOCKWISE)

robot = MDRobotBase(left_motor, right_motor, 63.4, 63.4, 165.0)
robot.reset_state(0.0, 0.0, 0.0, hub.imu.heading())

# Synchronous execution: blocks until turn completes
robot.pivot_turn_to_angle(90.0, speed_deg_s=200.0, pivot_side='left')
robot.pivot_turn_angle(-45.0, speed_deg_s=150.0, pivot_side='right')
```
