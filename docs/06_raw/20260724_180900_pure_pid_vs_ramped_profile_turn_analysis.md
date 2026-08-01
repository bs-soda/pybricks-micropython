# Deep Control Theory Analysis: Pure PID vs. Hybrid Profile-Ramped PID for Robot Turning

**Date**: 2026-07-24T18:09:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Executive Summary & Core Question

**Question**: *What if we completely remove Open-Loop Acceleration/Deceleration Ramping (`accel_limit`, `decel_limit`, `speed_limit`) and use ONLY pure PID feedback ($w_{\text{cmd}} = K_p e_\theta + K_i \int e_\theta + K_d \frac{de}{dt}$)? What physical and mathematical problems occur?*

**Answer**: 
Removing profile ramping and relying solely on pure PID introduces **5 severe physical and kinematic failure modes**:

1. **Instantaneous Wheel Slip & Odometry Corruption**: Step 0 torque jump ($\tau_{\text{motor}} > \mu_s N$) causes wheels to spin in place before chassis moves, corrupting odometry on tick 1.
2. **Kinetic Gearlash Shock & Mechanical Damage**: Instantaneous 10ms voltage jumps cause LEGO gear teeth to slam at high impact forces, whipping attachments dynamically.
3. **Uncapped Top-Speed Gyro Saturation**: Large turns ($180^\circ$) generate $P = K_p \cdot 180^\circ \implies w_{\text{cmd}} > 750^\circ/\text{s}$, exceeding IMU gyro measuring limits ($\pm 2000^\circ/\text{s}$) or tipping top-heavy robots over.
4. **Stiction Deadband Lockout vs. Integral Windup Hunting**: Near target arrival ($e_\theta \to 1.5^\circ$), low PID voltage cannot overcome motor gearbox Coulomb stiction ($\tau_{\text{PID}} < \tau_{\text{stiction}}$). Adding $K_i$ produces explosive limit-cycle oscillations.
5. **Under-Damped Momentum Overshoot**: Arriving at target angle $e_\theta = 0^\circ$ with maximum rotational kinetic energy ($E_k = \frac{1}{2}I\omega^2$) forces the robot to overshoot and oscillate back and forth before settling.

---

## 2. Mathematical Breakdown of Failure Modes

### 2.1 Failure Mode 1: Step 0 Wheel Slip ($\tau_{\text{motor}} > \mu_s N$)

At $t = 0\text{ms}$, target angle error $e_\theta = 90^\circ$.

$$P = K_p \cdot e_\theta = 4.2 \cdot 90^\circ = 378^\circ/\text{s}$$

Without acceleration ramping, native C commands $378^\circ/\text{s}$ on step 0:
- Motor acceleration $\alpha_{\text{motor}} \to \infty$.
- Required friction force $F_{\text{friction}} = m \cdot a > \mu_s \cdot N$.
- **Result**: Wheels slip against the rubber mat. Wheel encoders count $30^\circ$ of motor rotation while the robot chassis remains stationary, creating **unrecoverable odometry error**.

---

### 2.2 Failure Mode 4: Stiction Deadband Lockout vs Integral Hunting

Near target completion ($e_\theta = 1.5^\circ$):

$$P = K_p \cdot e_\theta = 4.2 \cdot 1.5^\circ = 6.3^\circ/\text{s}$$

- At $w_{\text{cmd}} = 6.3^\circ/\text{s}$, motor back-EMF and gearbox stiction prevent movement.
- If $K_i$ is disabled: Robot halts short at $1.5^\circ$ error forever.
- If $K_i$ is enabled: Integral term grows linearly ($I = K_i \int e_\theta dt$) until torque breaks stiction. The accumulated integral then launches the robot past target $e_\theta = 0^\circ$ into **explosive limit-cycle oscillations (hunting)**.

---

## 3. Comparison Matrix

| Problem / Behavior | Pure Unramped PID | Hybrid Profile-Ramped PID |
| :--- | :--- | :--- |
| **Startup Acceleration** | Violent torque jump (Wheel slip on mat) | Controlled linear ramp-up ($v_{\text{start}} \to v_{\text{cruise}}$) |
| **Odometry Integrity** | Corrupted by step 0 wheel slip | 100% Preserved (Zero wheel slip) |
| **Maximum Cruise Velocity** | Uncapped ($> 750^\circ/\text{s}$ for large turns) | Clamped to user `speed_deg_s` ceiling |
| **Target Arrival Deceleration** | High-velocity impact $\to$ Overshoot & oscillation | Smooth deceleration ramp-down ($v_{\text{cruise}} \to v_{\text{end}}$) |
| **Stiction Handling** | Deadband stall or $K_i$ limit-cycle hunting | Overcome by minimum `end_speed` floor |

---

## 4. Conclusion

Hybrid Profile-Ramped PID is the gold standard for precision robotics:
- **Trapezoidal Profile Ramping** enforces physical limits (acceleration, cruise speed, deceleration distance) to prevent wheel slip and mechanical shock.
- **PID Controller** regulates small real-time error deviations inside that velocity envelope.
