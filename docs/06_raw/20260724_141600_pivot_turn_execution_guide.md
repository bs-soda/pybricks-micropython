# Master Technical Guide: Running Pivot Turns in `MDRobotBase`

**Timestamp**: 2026-07-24T14:16:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**C Engine Reference**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1439-L1535)  
**Sample Python Code**: [`code/sample_pivot_turn_usage.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample_pivot_turn_usage.py)  
**Test Suite**: [`code/test_sample_pivot_turn_usage.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_sample_pivot_turn_usage.py)  

---

## 1. What is a Pivot Turn vs. Spin Turn?

In differential drive mobile robotics, two distinct rotational motions exist:

```
      A. Spin Turn (turn_to_angle)               B. Pivot Turn (pivot_turn_to_angle)
        Both wheels rotate opposite               Left wheel locked (HOLD), right wheel drives
        Center of rotation = Midpoint             Center of rotation = Left wheel contact
                 +-----+                                     +-----+
       (<- Left) |  *  | (Right ->)               [LOCKED] * |     | (Right ->)
                 +-----+                                     +-----+
```

- **Spin Turn (`turn_to_angle` / `turn_angle`)**: Both wheels rotate in **opposite directions** simultaneously. The center of rotation is the midpoint between wheels ($r = \frac{\text{axle\_track}}{2}$). Position $(X, Y)$ remains unchanged.
- **Pivot Turn (`pivot_turn_to_angle` / `pivot_turn_angle`)**: **One wheel is locked stationary** in `Stop.HOLD` mode while the **opposite wheel drives**. The center of rotation is the stationary wheel contact point ($r = \text{axle\_track}$).

---

## 2. API Method Signatures & Parameter Definitions

### 2.1 `pivot_turn_to_angle` (Absolute Pivot Turn)
Pivot turn to an absolute heading target in the odometry frame ($+90.0^\circ = \text{North}$).

```python
await robot.pivot_turn_to_angle(
    target_angle,           # [REQUIRED] float (degrees) - Absolute target heading
    speed_deg_s=200.0,      # [OPTIONAL] float (deg/s) - Maximum turning speed
    pivot_side='left',      # [OPTIONAL] str ('left' | 'right') - Locked wheel selector
    tolerance=1.5,          # [OPTIONAL] float (degrees) - Target angle error margin
    timeout_ms=None,        # [OPTIONAL] int/float (ms) - Safety execution timeout
    then=Stop.HOLD,         # [OPTIONAL] Stop enum - Completion stop mode
    accel_angle=15.0,       # [OPTIONAL] float (degrees) - Acceleration ramp distance
    start_speed=40.0,       # [OPTIONAL] float (deg/s) - Breakaway start turn speed
    decel_angle=15.0,       # [OPTIONAL] float (degrees) - Deceleration ramp distance
    end_speed=20.0          # [OPTIONAL] float (deg/s) - Final terminal turn speed
)
```

### 2.2 `pivot_turn_angle` (Relative Pivot Turn)
Pivot turn relative to current heading by a delta angle ($+ = \text{CCW}, - = \text{CW}$).

```python
await robot.pivot_turn_angle(
    angle,                  # [REQUIRED] float (degrees) - Relative delta angle
    speed_deg_s=200.0,      # [OPTIONAL] float (deg/s) - Maximum turning speed
    pivot_side='left',      # [OPTIONAL] str ('left' | 'right') - Locked wheel selector
    tolerance=1.5,          # [OPTIONAL] float (degrees) - Target angle error margin
    then=Stop.HOLD          # [OPTIONAL] Stop enum - Completion stop mode
)
```

---

## 3. How `pivot_side` Parameter Works

| `pivot_side` Setting | Stationary Wheel | Driving Wheel | Turning Radius ($r$) | Physical Motion Effect |
| :--- | :--- | :--- | :--- | :--- |
| **`pivot_side='left'`** | **Left Wheel** (`Stop.HOLD`) | **Right Wheel** | $\text{axle\_track}$ | Robot body swings around left contact patch. |
| **`pivot_side='right'`** | **Right Wheel** (`Stop.HOLD`) | **Left Wheel** | $\text{axle\_track}$ | Robot body swings around right contact patch. |

---

## 4. Native C Firmware Implementation Mechanics

In [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1439-L1535):

```c
if (self->rb->pivot_left) {
    // 1. Lock Left Motor actively in Stop.HOLD mode
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
    
    // 2. Calculate Right Motor velocity: v = w * axle_track
    float right_vel = w_rad * track_mm;
    int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_right_mm)) * 360.0f);
    pbio_servo_run_forever(self->rb->right, right_dps);
} else {
    // 1. Lock Right Motor actively in Stop.HOLD mode
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
    
    // 2. Calculate Left Motor velocity: v = -w * axle_track
    float left_vel = -w_rad * track_mm;
    int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_left_mm)) * 360.0f);
    pbio_servo_run_forever(self->rb->left, left_dps);
}
```

---

## 5. Complete Python Execution Code Example

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop, Axis
from pybricks.tools import run_task, wait
from pybricks.robotics import MDRobotBase

hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
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
    robot.reset_state(0.0, 0.0, 0.0, hub.imu.heading())

    # 1. Absolute Pivot Turn to +90 deg around LEFT wheel
    await robot.pivot_turn_to_angle(
        target_angle=90.0,
        speed_deg_s=200.0,
        pivot_side='left',
        then=Stop.HOLD
    )

    # 2. Absolute Pivot Turn back to 0 deg around RIGHT wheel
    await robot.pivot_turn_to_angle(
        target_angle=0.0,
        speed_deg_s=200.0,
        pivot_side='right',
        then=Stop.HOLD
    )

    # 3. Relative Pivot Turn -45 deg (CW) around LEFT wheel
    await robot.pivot_turn_angle(
        angle=-45.0,
        speed_deg_s=180.0,
        pivot_side='left',
        then=Stop.HOLD
    )

run_task(main())
```

---

## 6. Verification Results

- **Python Pytest Suite**: **26 passed in 2.96s**.
- **Native C Test Suite**: `./test-pbio.sh` (**63 passed**).
