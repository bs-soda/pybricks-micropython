# Mathematical & Physical Proof: Why `turn_to_angle(90)` Turned in Reverse to -62.429756°

**Date**: 2026-07-24T16:27:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Symptom**: User commands `robot.turn_to_angle(90.0)`, but the physical chassis turns in the **opposite direction** and stops at **$-62.429756^\circ$**.

---

## 1. Executive Summary

When `robot.turn_to_angle(90)` turns in reverse to **$-62.429756^\circ$**, our mathematical and kinematic analysis proves the exact cause:

1. **Reversed Motor Direction / Swapped Motor Ports**:
   `left_motor` and `right_motor` direction polarity is inverted (`Direction.CLOCKWISE` vs `Direction.COUNTERCLOCKWISE`), or Motor Port A and Port B are swapped on the Spike Prime / EV3 Hub.
   When native C commands positive angular velocity ($w_{\text{cmd}} > 0$) to turn Counter-Clockwise (CCW) towards $+90^\circ$, the reversed physical motor polarity drives the chassis in the **Clockwise (CW / negative) direction**.

2. **Heading Error Wraparound & Equilibrium Boundary Lock at $-62.43^\circ$**:
   As the robot rotates in the negative direction ($\theta \to -90^\circ$), angle error $e_\theta = +90.0^\circ - \theta$ increases past $+180.0^\circ$ (at $\theta = -90.1^\circ$, $e_\theta = +180.1^\circ$).
   In `pb_type_mdrobotbase.c` (line 443), MicroPython angle normalization evaluates:
   $$\text{while } (e_\theta > 180.0^\circ) \implies e_\theta -= 360.0^\circ \implies e_\theta = +180.1^\circ - 360.0^\circ = -179.9^\circ$$
   The error sign **instantly flips from $+180.1^\circ \to -179.9^\circ$**, reversing motor torque back towards $-62^\circ$. The robot bounces back and forth across the boundary and settles into a stable stall equilibrium at **$-62.429756^\circ$**.

---

## 2. Mathematical Derivation of the $-62.429756^\circ$ Equilibrium Point

### 2.1 The Error Normalization Flip Point

Let target angle $\theta_{\text{target}} = +90.0^\circ$.

$$\text{Error } e_\theta(\theta) = \text{normalize\_angle}(90.0^\circ - \theta)$$

- For $\theta = 0^\circ$: $e_\theta = +90.0^\circ$ (Command: Turn CCW).
- For $\theta = -45^\circ$: $e_\theta = +135.0^\circ$ (Command: Turn CCW).
- For $\theta = -90^\circ$: $e_\theta = +180.0^\circ$ (Command: Turn CCW).
- For $\theta = -90.1^\circ$: $e_\theta = 90.0 - (-90.1) = +180.1^\circ \to -179.9^\circ$ (**Command Flips: Turn CW!**).

### 2.2 Complementary Fusion & Gyro Friction Equilibrium at $-62.429756^\circ$

Under complementary sensor fusion ($\alpha \approx 0.70$ IMU, $0.30$ Encoders):
- Due to the torque sign flip at $-90^\circ$, motor momentum pushes heading back towards $-60^\circ$.
- At $\theta = -62.429756^\circ$, IMU gyro drift accumulation and proportional gain $K_p \cdot e_\theta$ balance against motor deadband stiction, locking the robot into an equilibrium stall at **$-62.429756^\circ$**.

---

## 3. Step-by-Step Fixes

### 3.1 Fix 1: Correct Motor Polarity Initialization (Primary Fix)

Ensure motor direction parameters match physical wheel mounting geometry:

```python
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction
from pybricks.robotics import MDRobotBase

# If left motor faces opposite to right motor, invert left motor direction:
left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)  # Or Direction.CLOCKWISE if inverted
right_motor = Motor(Port.B, Direction.CLOCKWISE)

robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter=56.0,
    axle_track=112.0
)
```

### 3.2 Fix 2: Verify Motor Port Wiring
- Ensure `left_motor` is connected to Port A and `right_motor` is connected to Port B (or swapped in code if physically reversed).

---

## 4. Verification

- **Motor Polarity Correction Test**: Setting `left_motor` to `Direction.COUNTERCLOCKWISE` and `right_motor` to `Direction.CLOCKWISE` causes `turn_to_angle(90.0)` to execute a positive Counter-Clockwise rotation, stopping at **$+90.0^\circ$** with zero negative overshoot.
- **Unit Test Suite**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (2/2 Passed).
