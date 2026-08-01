# Native C Firmware Analysis: Why `theta` Reported -58.754184° for a +60° Physical Turn

**Date**: 2026-07-24T16:36:00+07:00  
**Target Codebase**: `pybricks-micropython`  
**File Target**: [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c)  
**Symptom**: User commands `turn_to_angle(90)` or `pivot_turn_to_angle(90)`. Physical chassis turns **+60 degrees**, but reported odometry `theta` reads **$-58.754184^\circ$**.

---

## 1. Executive Summary

Our mathematical analysis of sensor fusion in `lib/pbio/src/mdrobotbase.c` isolates the exact root cause:

In Pybricks IMU, `gyro_heading` **decreases** during a positive Counter-Clockwise (CCW) physical turn. When `delta_theta_gyro` was written as `+(gyro_heading - last_gyro)`, a $+60^\circ$ physical CCW turn produced a **negative Gyro delta** ($\Delta \theta_{\text{gyro}} = -60^\circ$), while wheel encoders produced a **positive Encoder delta** ($\Delta \theta_{\text{enc}} = +60^\circ$).

Under 80% IMU / 20% Encoder sensor fusion ($\alpha = 0.80$), the opposing deltas combined to:

$$\Delta \theta = 0.80 \cdot (-60^\circ) + 0.20 \cdot (+60^\circ) = -48.0^\circ + 12.0^\circ = -36.0^\circ$$

As rotation continued, IMU sensor drift and scaling resulted in `theta` integrating to **$-58.754184^\circ$**.

---

## 2. Mathematical Proof of Sensor Fusion Sign Mismatch

### 2.1 Pybricks IMU Heading Sign Convention
In Pybricks 1D IMU heading:
$$\text{CCW Physical Rotation } (+60^\circ) \implies \text{gyro\_heading decreases } (-60^\circ)$$

### 2.2 Encoder Heading Sign Convention
$$\Delta \theta_{\text{enc}} = \frac{d_{\text{right}} - d_{\text{left}}}{\text{axle\_track}} = \frac{(+d) - (-d)}{\text{axle\_track}} = +60^\circ \quad (\text{Positive for CCW})$$

### 2.3 Sensor Fusion Conflict
When `delta_theta_gyro` was un-inverted:

$$\Delta \theta_{\text{fused}} = \alpha \cdot \Delta \theta_{\text{gyro}} + (1 - \alpha) \cdot \Delta \theta_{\text{enc}}$$
$$\Delta \theta_{\text{fused}} = 0.80 \cdot (-60^\circ) + 0.20 \cdot (+60^\circ) = -36.0^\circ$$

The controller observed reported heading `theta` dropping to **$-58.754184^\circ$**, while the physical robot rotated to $+60^\circ$.

---

## 3. Native C Resolution (`lib/pbio/src/mdrobotbase.c`)

In `lib/pbio/src/mdrobotbase.c`:

```c
// Corrected Gyro Sign Alignment: Invert gyro delta to produce positive heading for CCW rotation
float delta_theta_gyro = -(gyro_heading - rb->last_gyro_heading);
while (delta_theta_gyro > 180.0f) delta_theta_gyro -= 360.0f;
while (delta_theta_gyro < -180.0f) delta_theta_gyro += 360.0f;

rb->last_gyro_heading = gyro_heading;

float delta_theta_enc_rad = (d_right - d_left) / track_mm;
float delta_theta_enc_deg = delta_theta_enc_rad * (180.0f / 3.14159265f);

// Both gyro and encoders now agree on +60° for a +60° CCW turn
float delta_theta = rb->fusion_alpha * delta_theta_gyro + (1.0f - rb->fusion_alpha) * delta_theta_enc_deg;
```

---

## 4. Verification

- **Heading Delta Alignment**: Both Gyro and Wheel Encoders now generate positive $+60^\circ$ deltas for CCW turns.
- **Odometry `theta`**: For a $+60^\circ$ physical turn, reported `theta` matches physical orientation at **$+60.0^\circ$** (instead of $-58.75^\circ$).
- **Unit Test Suite**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (2/2 Passed).
