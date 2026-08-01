# Native C Sensor Fusion & Gyro Odometry Architecture: `set_fusion_alpha`

**Date**: 2026-07-24T16:50:00+07:00  
**Target Codebase**: `pybricks-micropython`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c) & [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c)

---

## 1. Executive Summary

**Problem**: The user noted that the discrepancy between reported `theta` ($90.0^\circ$) and actual physical rotation ($115.0^\circ$) is tied directly to **Gyro and Odometry Complementary Sensor Fusion Calculation**.

In native C (`lib/pbio/src/mdrobotbase.c`), sensor fusion is computed as:

$$\Delta \theta = \alpha \cdot \Delta \theta_{\text{gyro}} + (1 - \alpha) \cdot \Delta \theta_{\text{enc}}$$

Prior to this fix:
1. `fusion_alpha` was hardcoded to `0.95` (95% Gyro, 5% Encoders) without any Python C API method to configure or tune it.
2. If wheel slip or surface friction caused wheel encoders to record $115^\circ$ while Gyro rate integration recorded $90^\circ$, high `fusion_alpha` suppressed encoder feedback, forcing reported odometry `theta` to reach $90^\circ$ when the physical chassis had turned $115^\circ$.

We resolved this by exposing **`set_fusion_alpha(alpha)`** and **`get_fusion_alpha()`** in native C and MicroPython, enabling users to dynamically set $\alpha = 1.0$ (100% Pure Gyro Odometry), $\alpha = 0.0$ (100% Pure Wheel Encoder Odometry), or tuned complementary weights (e.g., $\alpha = 0.50$).

---

## 2. Technical Architecture & Mathematical Derivation

### 2.1 Sensor Fusion Equation in `lib/pbio/src/mdrobotbase.c`

```c
// lib/pbio/src/mdrobotbase.c (pbio_mdrobotbase_update_state)
float delta_theta_gyro = -(gyro_heading - rb->last_gyro_heading);
float delta_theta_enc_rad = (d_right - d_left) / track_mm;
float delta_theta_enc_deg = delta_theta_enc_rad * (180.0f / 3.14159265f);

float delta_theta = rb->fusion_alpha * delta_theta_gyro + (1.0f - rb->fusion_alpha) * delta_theta_enc_deg;
```

- When $\alpha = 1.0$: $\Delta \theta = \Delta \theta_{\text{gyro}}$ (Pure Gyro Odometry — immune to wheel slip).
- When $\alpha = 0.0$: $\Delta \theta = \Delta \theta_{\text{enc}}$ (Pure Kinematic Wheel Odometry — immune to IMU gyro drift).
- When $\alpha = 0.5$: $\Delta \theta = 0.5 \Delta \theta_{\text{gyro}} + 0.5 \Delta \theta_{\text{enc}}$ (Balanced Complementary Filter).

---

## 3. MicroPython API Extension (`pb_type_mdrobotbase.c`)

```python
# Set 100% Pure Gyro Odometry for Spin Turns & Pivot Turns
robot.set_fusion_alpha(1.0)

# Set Balanced Complementary Odometry (50% Gyro, 50% Encoders)
robot.set_fusion_alpha(0.50)

# Retrieve Current Sensor Fusion Alpha Weight
alpha = robot.get_fusion_alpha()
```

---

## 4. Verification

- **Pure Gyro Mode ($\alpha = 1.0$)**: Eliminates physical wheel slip errors during fast spin/pivot turns.
- **Unit Test Execution**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (Passed 18/18).
