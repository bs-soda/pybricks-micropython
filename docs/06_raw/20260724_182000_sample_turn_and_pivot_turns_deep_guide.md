# Comprehensive Technical Guide: Highly Detailed `turn_to_angle` and `pivot_turn_to_angle` Reference

**Date**: 2026-07-24T18:20:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`spike-prime-mdrobotkids/code/sample_turn_and_pivot_demonstration.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample_turn_and_pivot_demonstration.py)

---

## 1. Executive Summary

This reference guide details the full parameter space, control mechanics, underlying C dynamics, and Python usage for:
1. **Spin Turns** (`turn_to_angle`, `turn_angle`)
2. **Pivot Turns** (`pivot_turn_to_angle`, `pivot_turn_angle`)
3. **Pure Gyro Correction** (`set_fusion_alpha(1.0)`)
4. **Drivetrain Gear Ratio Compensation** (`set_gear_ratio(ratio)`)

---

## 2. API Signature & Parameter Matrix

### 2.1 `turn_to_angle` & `turn_angle` (In-Place Spin Turns)

```python
await robot.turn_to_angle(
    target_angle=90.0,      # Absolute target heading (deg, -180.0 to 180.0)
    speed_deg_s=300.0,      # Maximum angular turning velocity ceiling (deg/s)
    start_speed=30.0,       # Breakaway speed at ramp start (deg/s)
    end_speed=20.0,         # Settlement speed before holding state (deg/s)
    accel_angle=20.0,       # Acceleration ramp-up angular distance (deg)
    decel_angle=20.0,       # Deceleration ramp-down angular distance (deg)
    tolerance=1.5,          # Target angle completion band (deg)
    then=Stop.HOLD          # Completion hold state (Stop.HOLD, Stop.BRAKE, Stop.COAST)
)
```

```python
await robot.turn_angle(
    angle=-180.0,           # Relative rotation delta (deg, positive CCW, negative CW)
    speed_deg_s=350.0,
    start_speed=40.0,
    end_speed=25.0,
    accel_angle=30.0,
    decel_angle=25.0,
    tolerance=1.5,
    then=Stop.HOLD
)
```

---

### 2.2 `pivot_turn_to_angle` & `pivot_turn_angle` (Single-Wheel Pivot Turns)

```python
await robot.pivot_turn_to_angle(
    target_angle=90.0,      # Absolute target heading (deg)
    speed_deg_s=250.0,      # Swing wheel angular speed (deg/s)
    pivot_side='left',      # Wheel to lock ('left' or 'right')
    tolerance=1.5,          # Target angle completion band (deg)
    then=Stop.HOLD          # Holding state for locked & swing wheels
)
```

```python
await robot.pivot_turn_angle(
    angle=-45.0,            # Relative rotation delta (deg)
    speed_deg_s=200.0,
    pivot_side='right',     # Wheel to lock ('left' or 'right')
    tolerance=1.5,
    then=Stop.HOLD
)
```

---

## 3. Underlying Native C Execution Mechanics

### 3.1 Spin Turn Motion Loop (`PBIO_MDROBOTBASE_MOTION_TURN`)

1. **Velocity Profile Scheduling**:
   Native C computes trapezoidal ramp profile $w_{\text{profile}}$ between `start_speed` and `speed_deg_s`.
2. **Scheduled Proportional Gain**:
   $$K_{p,\text{scheduled}} = (1 + K_d) \cdot \left(\frac{\text{speed\_deg\_s}}{\text{decel\_angle}}\right)$$
3. **Motor DPS Transformation**:
   $$\text{left\_dps} = \left(-\frac{w_{\text{cmd}} \cdot \text{track\_mm}}{2 \cdot \text{wheel\_diam}}\right) \times \mathbf{gear\_ratio}$$
   $$\text{right\_dps} = \left(\frac{w_{\text{cmd}} \cdot \text{track\_mm}}{2 \cdot \text{wheel\_diam}}\right) \times \mathbf{gear\_ratio}$$
4. **Active Angular Velocity Settlement Exit**:
   Exits motion loop ONLY when $|e_\theta| \le \text{tolerance}$ AND physical angular rate $|w_{\text{raw}}| < 15.0^\circ/\text{s}$, preventing kinetic coasting overshoot.

---

### 3.2 Pivot Turn Motion Loop (`PBIO_MDROBOTBASE_MOTION_PIVOT`)

1. **Locked Wheel Fixation**:
   Locks pivot wheel in `pbio_servo_stop(pivot_wheel, Stop.HOLD)` once on entry (eliminates 10ms chatter flooding).
2. **Swing Wheel DPS Transformation**:
   For `pivot_side = 'left'`:
   $$\text{right\_dps} = \left(\frac{w_{\text{cmd}} \cdot \text{track\_mm}}{\text{wheel\_diam}}\right) \times \mathbf{gear\_ratio}$$
3. **Rigid-Body Arc Odometry Integration**:
   Center displacement is integrated as an exact arc around the pivot contact point ($r_{\text{offset}} = \pm \frac{\text{track\_mm}}{2}$):
   $$\Delta x = r_{\text{offset}} \cdot (\sin\theta_{\text{new}} - \sin\theta_{\text{old}})$$
   $$\Delta y = -r_{\text{offset}} \cdot (\cos\theta_{\text{new}} - \cos\theta_{\text{old}})$$

---

## 4. Full Production Script Example

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop, Axis
from pybricks.tools import run_task, wait
from pybricks.robotics import MDRobotBase

async def main():
    hub = PrimeHub()
    left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
    right_motor = Motor(Port.B, Direction.CLOCKWISE)

    robot = MDRobotBase(
        left_motor=left_motor,
        right_motor=right_motor,
        wheel_diameter_left=63.4,
        wheel_diameter_right=63.4,
        axle_track=160.0
    )

    # Enable 100% Pure Gyro Odometry & Drivetrain Gear Reduction
    robot.set_fusion_alpha(1.0)
    robot.set_gear_ratio(0.3625) # 12t motor / 36t wheel

    robot.reset_state(0.0, 0.0, 0.0, hub.imu.heading())

    # 1. Absolute Spin Turn
    await robot.turn_to_angle(target_angle=90.0, speed_deg_s=300.0, then=Stop.HOLD)

    # 2. Absolute Pivot Turn around Left Wheel
    await robot.pivot_turn_to_angle(target_angle=0.0, speed_deg_s=250.0, pivot_side='left', then=Stop.HOLD)

run_task(main())
```
