# Technical Analysis: Why Gyro Theta Correction Depends on `fusion_alpha = 1.0`

**Date**: 2026-07-24T18:14:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c) & [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Executive Summary & Core Question

**Question**: *Why doesn't `turn_to_angle` automatically correct the turn using Gyro theta ($\theta_{\text{gyro}}$) so that it always turns the exact angle regardless of `gear_ratio` or `axle_track`?*

**Answer**: **IT CAN AND DOES—WHEN `fusion_alpha = 1.0` (100% Pure Gyro Mode) IS ENABLED**.

The reason `turn_to_angle` did not automatically correct physical turns with Gyro theta originally comes down to **Sensor Fusion Pollution in Odometry**:

1. **Odometry Pollution ($\alpha < 1.0$)**: In native C (`lib/pbio/src/mdrobotbase.c`), state variable `rb->theta` was updated by fusing Gyro deltas with Wheel Encoder deltas:
   $$\Delta \theta = \alpha \cdot \Delta \theta_{\text{gyro}} + (1 - \alpha) \cdot \Delta \theta_{\text{enc}}$$
   When $\alpha = 0.70$–$0.95$, `rb->theta` contained $5\%$–$30\%$ wheel encoder data. If `gear_ratio` or `axle_track` was incorrect, the corrupted wheel encoder term pulled `rb->theta` away from physical Gyro heading!
2. **PID Feedback Against Corrupted `rb->theta`**: The PID loop calculates $e_\theta = \text{target\_angle} - \mathbf{rb->theta}$. Because $\mathbf{rb->theta}$ was polluted by incorrect wheel encoder kinematics, PID drove the motors to zero error against a **corrupted heading estimate**, causing physical overshoot/undershoot.
3. **Pure Gyro Correction ($\alpha = 1.0$)**: When `robot.set_fusion_alpha(1.0)` is set, $\mathbf{rb->theta} \equiv \theta_{\text{gyro}}$. PID feedback calculates $e_\theta = \text{target\_angle} - \theta_{\text{gyro}}$, driving the motors until physical IMU Gyro reading equals the target angle, **bypassing gear ratios and track errors completely**!

---

## 2. Mathematical Proof of Gyro Theta Correction

### 2.1 Case 1: Polluted Fusion ($\alpha = 0.70$, Incorrect Track / Gear Ratio)

Suppose physical turn is $+90.0^\circ$, Gyro reads $+90.0^\circ$, but un-geared encoders read $+115.0^\circ$:

$$\Delta \theta_{\text{fused}} = 0.70 \times (90.0^\circ) + 0.30 \times (115.0^\circ) = 63.0^\circ + 34.5^\circ = \mathbf{97.5^\circ}$$

- Native C sees $\mathbf{rb->theta} = 97.5^\circ$, which exceeds target $90.0^\circ$.
- PID loop halts early because reported heading reached $90.0^\circ$ when physical Gyro was only at $\frac{90}{1.08} \approx 83^\circ$.
- **Result**: Kinematic error corrupts the Gyro correction loop!

---

### 2.2 Case 2: Pure Gyro Feedback ($\alpha = 1.0$)

When `robot.set_fusion_alpha(1.0)` is set:

$$\Delta \theta_{\text{fused}} = 1.0 \times \Delta \theta_{\text{gyro}} + 0.0 \times \Delta \theta_{\text{enc}} = \mathbf{\Delta \theta_{\text{gyro}}}$$

$$\text{Error } e_\theta = \text{target\_angle} - \theta_{\text{gyro}}$$

- PID feedback loop drives the motors until $e_\theta = 0 \implies \mathbf{\theta_{\text{gyro}} = \text{target\_angle}}$.
- **Result**: Bypasses `gear_ratio`, `axle_track`, and tire slip entirely! Physical turn is **100% corrected by Gyro theta**.

---

## 3. Recommended Code Configuration for 100% Gyro-Corrected Turning

To force `turn_to_angle` and `pivot_turn_to_angle` to always correct 100% using Gyro theta:

```python
# Enable 100% Pure Gyro Odometry in Python
robot.set_fusion_alpha(1.0)

# Now turn_to_angle(90) will correct 100% against IMU Gyro theta
await robot.turn_to_angle(90.0, speed_deg_s=250.0)
```

---

## 4. Summary Matrix

| Sensor Fusion Setting | Heading State $\theta$ Source | Sensitivity to `gear_ratio` / `axle_track` | Turn Angle Accuracy |
| :--- | :--- | :--- | :--- |
| **`fusion_alpha < 1.0` (Default)** | Fused Gyro + Wheel Encoders | **High**: Incorrect track/gearing pollutes $\theta$, degrading PID correction. | Dependent on accurate kinematic track & gear ratio. |
| **`fusion_alpha = 1.0` (Pure Gyro)** | 100% IMU Gyro Heading ($\theta_{\text{gyro}}$) | **Zero (Immune)**: PID corrects directly against IMU Gyro heading. | **100% Exact Gyro-Corrected Angle**. |
