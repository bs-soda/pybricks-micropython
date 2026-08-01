# Control & Kinematic Analysis: Why PID with Gyro + Accelerometer Alone Is Not Enough

**Date**: 2026-07-24T18:11:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Executive Summary & Core Question

**Question**: *Is PID combined with a Gyroscope + Accelerometer (6-DOF IMU Sensor Fusion) still NOT enough on its own without Open-Loop Kinematic Ramping?*

**Answer**: **NO, IT IS NOT ENOUGH**. Relying solely on PID + IMU (Gyro + Accelerometer) fails because of **3 fundamental physical and mathematical limitations**:

1. **Causality & Phase Lag (Feedback vs. Feedforward)**: Feedback controllers (PID + IMU) react ONLY AFTER an error or physical movement has already occurred. Sensor filtering (Kalman / Complementary) introduces $10\text{ms}$–$50\text{ms}$ of phase lag. Wheel slip occurs in the first $2\text{ms}$—long before IMU feedback can react.
2. **Accelerometer Plane Invariance (Zero Horizontal Heading Information)**: During 2D horizontal turns, gravity points down the $Z$ axis. Accelerometers measure $[a_x, a_y, a_z]^T$ and gravity vector $\mathbf{g}$, providing **zero heading angle ($\theta$) information** in the horizontal plane.
3. **Feasible Trajectory Generation**: Open-loop kinematic ramping acts as a **Feedforward Trajectory Generator** ($u_{\text{FF}}$) that respects physical friction limits ($\tau < \mu_s N$). PID feedback ($u_{\text{FB}}$) rejects micro-disturbances around that feasible path.

---

## 2. Deep Control Theory Breakdown

### 2.1 The Causality Gap & Sensor Filter Phase Lag

$$\text{Control Output } u(t) = K_p \cdot e(t - \tau_{\text{sensor}}) + K_i \int e(t - \tau_{\text{sensor}}) dt + K_d \frac{d}{dt} e(t - \tau_{\text{sensor}})$$

Where $\tau_{\text{sensor}} \approx 10\text{ms}$–$50\text{ms}$ is IMU sensor filter delay.

- At $t = 0\text{ms}$, target angle error $e_\theta = 90^\circ$.
- Pure PID commands maximum torque $\tau_{\text{max}}$ at $t = 0\text{ms}$.
- Tire breakdown and static friction slip ($\mu_s \to \mu_k$) occurs in $t < 2\text{ms}$.
- The IMU sensor filter receives the acceleration/gyro spike at $t = 15\text{ms}$—**13ms after wheel slip has already corrupted odometry**.

---

### 2.2 Accelerometer Limitations in 2D Horizontal Turning

An Accelerometer measures specific force $\mathbf{f} = \mathbf{a} - \mathbf{g}$.

During an in-place Spin Turn or Pivot Turn in the 2D horizontal $(X, Y)$ plane:
- Roll angle $\phi = 0$, Pitch angle $\theta_{\text{pitch}} = 0$.
- Gravity vector $\mathbf{g} = [0, 0, -9.81\text{ m/s}^2]^T$.
- Heading angle $\psi$ (yaw) rotates around the vertical $Z$ axis.
- **The Accelerometer Formula**: $\frac{\partial \mathbf{g}}{\partial \psi} = \mathbf{0}$.
- **Physical Result**: Horizontal heading change $\psi$ produces **zero change in accelerometer readings**. Accelerometers provide zero heading assistance during flat 2D turns.

---

## 3. Mathematical Synthesis: Feedforward + Feedback Architecture

Modern precision robotics combines Feedforward Ramping ($u_{\text{FF}}$) and Feedback PID ($u_{\text{FB}}$):

$$u_{\text{total}}(t) = \underbrace{u_{\text{feedforward}}(t)}_{\text{Kinematic Profile Ramping}} + \underbrace{u_{\text{feedback}}(t)}_{\text{PID + IMU Gyro Feedback}}$$

```
Desired Goal Angle ──► [ Trajectory Profile Generator ] ──► Reference Command (θ_ref, ω_ref)
                                │                                   │
                                ▼                                   ▼
                      (Feedforward Limits:              [ PID Controller + IMU ]
                      Prevents Wheel Slip)               (Rejects Micro-Disturbances)
                                │                                   │
                                └─────────────────┬─────────────────┘
                                                  ▼
                                          [ Motor Output ]
```

- **Feedforward Ramping**: Guarantees wheel acceleration stays within physical static friction bounds ($a \le \mu_s g$).
- **PID + Gyro Feedback**: Corrects small external bumps, battery voltage drop, and floor friction variations.
