# Kinematic & Control Analysis: Why `gear_ratio` Alone Does Not Guarantee Exact Turning Angles

**Date**: 2026-07-24T18:12:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Executive Summary & Core Question

**Question**: *So using `gear_ratio` alone does NOT guarantee turning an exact physical angle?*

**Answer**: **CORRECT**. `gear_ratio` is a **necessary open-loop feedforward parameter**, but it is **not sufficient by itself** to guarantee exact physical turning angles ($90.00^\circ$).

Configuring `gear_ratio` ensures motor speed profiles ($\text{Motor DPS}$) match motor gearbox reduction. However, **5 physical real-world disturbances** still cause physical turning errors unless closed-loop sensor fusion and IMU calibration are enabled:

1. **Effective Tire Radius Compression**: Robot weight compresses rubber tires ($62.4\text{mm} \to 60.8\text{mm}$), altering rolling radius by $2\%$.
2. **Tire Scrubbing Friction**: Non-zero tire contact patches ($15\text{mm}$ width) experience differential slip across inner/outer edges during rotation.
3. **Surface Friction Coefficients ($\mu_s, \mu_k$)**: Smooth vinyl mats vs. textured foam mats change slip during acceleration ramps.
4. **IMU Sensor Fusion Alpha Weighting (`fusion_alpha`)**: Uncalibrated IMU Gyro scale factors diverge from motor encoder counts if $\alpha \neq 1.0$.
5. **Momentum Coasting at Exit**: High-speed turn completion without active velocity settlement causes mechanical coasting overshoots.

---

## 2. Technical Breakdown of Physical Disturbances

### 2.1 Effective Rolling Radius Equation

Physical chassis turn angle $\theta_{\text{physical}}$ as a function of motor rotation $\phi_{\text{motor}}$, gear ratio $G$, wheel radius $R$, and track width $W$:

$$\theta_{\text{physical}} = \phi_{\text{motor}} \cdot G \cdot \left(\frac{R_{\text{effective}}}{W/2}\right)$$

If tire deformation under robot payload decreases $R_{\text{effective}}$ by $2.5\%$:

$$\theta_{\text{physical, actual}} = 90.0^\circ \times (1 - 0.025) = \mathbf{87.75^\circ}$$

A $2.5\%$ tire compression creates a $2.25^\circ$ error—even with an exact theoretical $G = 12/36$ gear ratio!

---

## 3. The Precision Triad: How to Guarantee 100% Exact Turning

To guarantee 100% exact physical turns under all competition conditions, combine all 3 layers:

```
                  ┌──────────────────────────────────────────────┐
                  │ 1. Open-Loop Kinematic Base                  │
                  │    (axle_track, wheel_diameter, gear_ratio)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 2. IMU Sensor Fusion                         │
                  │    (fusion_alpha = 1.0 / Gyro Calibration)   │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 3. Closed-Loop Pose Regulation               │
                  │    (Active Settlement & LQR Navigation)      │
                  └──────────────────────────────────────────────┘
```

1. **Layer 1: Open-Loop Kinematics (`gear_ratio`, `axle_track`)**: Provides the correct feedforward speed envelope so motor DPS matches expected chassis angular velocity.
2. **Layer 2: IMU Sensor Fusion (`fusion_alpha = 1.0`)**: Measures true physical chassis orientation from IMU Gyro, bypassing wheel slip and tire deformation.
3. **Layer 3: Active Settlement Check (`fabsf(w_raw) < 15.0f`)**: Prevents kinetic coasting overshoots on loop exit.

---

## 4. Summary Table

| Control Layer | What It Solves | What It Cannot Solve Alone |
| :--- | :--- | :--- |
| **`gear_ratio` & Kinematics** | Matches motor DPS to gearbox reduction; shapes smooth acceleration ramps | Tire compression, surface slip, IMU drift |
| **IMU Gyro Fusion (`fusion_alpha = 1.0`)** | Measures true physical chassis heading; immune to tire slip & compression | Open-loop speed profile limits |
| **Active Settlement Exit** | Eliminates kinetic coasting overshoots on motion arrival | Incorrect target heading commands |
