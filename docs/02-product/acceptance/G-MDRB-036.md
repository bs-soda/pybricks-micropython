# G-MDRB-036 Acceptance Contract: Discrete Algebraic Riccati Equation (DARE) & Mathematically Derived Optimal LQR Tracking Controller

## Overview
This acceptance specification governs the implementation and validation of the discrete algebraic Riccati equation (DARE) optimal tracking controller for `MDRobotBase`. It replaces heuristic proportional gain scheduling with mathematically derived optimal feedback gain matrices $K(v_r) = (R + B_d^T P B_d)^{-1} B_d^T P A_d$ and verifies discrete closed-loop stability across all operating speeds.

---

### Scenario 1: Discrete Algebraic Riccati Equation Optimal Gain Derivation (AC-MDRB-036-1)
**Given** state weighting matrix $Q = \text{diag}(q_x, q_y, q_\theta) \succeq 0$ and control weighting matrix $R = \text{diag}(r_v, r_\omega) \succ 0$,
**When** the controller computes the discrete infinite-horizon optimal regulator gains across operating velocities $v_r \in [50, 800]\text{ mm/s}$ at sample period $T_s = 5\text{ ms}$,
**Then** the gain matrix $K(v_r)$ must satisfy the discrete algebraic Riccati equation $P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^{-1}(B_d^T P A_d) + Q$,
**And** must eliminate hand-tuned heuristic constants (`sqrt(v / 300)` and `0.35`).

---

### Scenario 2: Discrete Closed-Loop Spectral Radius Unit Circle Invariance (AC-MDRB-036-2)
**Given** the discrete state-space unicycle error system $(A_d(v_r), B_d(v_r))$ and optimal gain matrix $K(v_r)$,
**When** the closed-loop transition matrix $A_{cl}(v_r) = A_d(v_r) - B_d(v_r) K(v_r)$ is evaluated at any nominal velocity $v_r \in [50, 800]\text{ mm/s}$,
**Then** all eigenvalues $\lambda_i(A_{cl})$ must lie strictly within the open complex unit disk,
**And** the spectral radius $\rho(A_{cl}) = \max_i |\lambda_i|$ must satisfy $\rho(A_{cl}) < 1.0$, guaranteeing discrete asymptotic stability.

---

### Scenario 3: Velocity-Scheduled Look-Up Table Interpolation & Singularity Avoidance (AC-MDRB-036-3)
**Given** precomputed optimal gain bins parameterized across 16 discrete velocity setpoints,
**When** the reference velocity varies continuously between bins or decelerates toward zero ($v_r \to 0$),
**Then** the controller must interpolate gains via continuous $C^0$ linear interpolation in $O(1)$ computation time,
**And** must clamp nominal velocity to $v_{min} = 10\text{ mm/s}$ to prevent uncontrollable matrix singularities.

---

### Scenario 4: Disturbance Rejection & Asymptotic Error Convergence (AC-MDRB-036-4)
**Given** an initial lateral cross-track error $e_y = 50\text{ mm}$ and heading error $e_\theta = 30^\circ$,
**When** the robot tracks a straight trajectory segment at $300\text{ mm/s}$ under closed-loop optimal control,
**Then** lateral and heading errors must decay asymptotically, achieving $\ge 95\%$ error reduction within $1.5\text{ seconds}$,
**And** terminal cross-track error must satisfy $|e_y| < 1.5\text{ mm}$ without overshoot oscillations exceeding $10\%$.

---

### Scenario 5: Wheel Velocity Saturation & Symmetrical Anti-Windup (AC-MDRB-036-5)
**Given** actuator physical velocity limit $v_{max} = 1000\text{ deg/s}$,
**When** optimal control commands $(u_v, u_\omega)$ demand wheel speeds exceeding $v_{max}$,
**Then** the controller must apply symmetrical proportional velocity scaling $S = v_{max} / \max(|v_{left}|, |v_{right}|)$,
**And** must preserve the desired curvature $\kappa = \omega / v$ without unbalancing the differential drive kinematics.

---

### Scenario 6: Comparative Benchmark vs. Standard PID (AC-MDRB-036-6)
**Given** an identical S-curve trajectory profile executed under identical simulated unicycle dynamics and 800 mm/s wheel saturation limits,
**When** tracking performance is evaluated across 20 deterministic trials with parameterized variations in speed ($v \in [250, 325]\text{ mm/s}$), amplitude ($A \in [25, 35]\text{ mm}$), period ($T \in [2.0, 2.5]\text{ s}$), and initial perturbations ($y_0 \in [-10, 10]\text{ mm}, \theta_0 \in [-3, 3]^\circ$) under seed 42,
**Then** optimal DARE LQR must demonstrate $\ge 20\%$ reduction in root-mean-square (RMS) cross-track error with Student's t 95% confidence interval lower bound $\ge 20.0\%$,
**And** must demonstrate $\ge 15\%$ reduction in control-effort variance $\text{Var}(\omega) = \frac{1}{N}\sum (\omega_k - \bar{\omega})^2$.

---

### Scenario 7: Backward Driving & Negative Reference Velocity Invariance (AC-MDRB-036-7)
**Given** a reverse motion path segment with negative reference velocity $v_r < 0$,
**When** the discrete optimal tracking controller computes control output $(u_v, u_\omega)$,
**Then** steering feedback cross-track gain must invert sign while heading damping remains strictly positive: $u_\omega = -(k_y e_y \cdot \text{sgn}(v_r) + k_\theta e_\theta)$,
**And** discrete closed-loop spectral radius must satisfy $\rho(A_d(v_r) - B_d(v_r) K(v_r)) < 1.0$ for all reverse velocities $v_r \in [-800, -50]\text{ mm/s}$.

---

### Scenario 8: Zero-Error Equilibrium Invariance (AC-MDRB-036-8)
**Given** an exact alignment state between robot pose and trajectory waypoint ($e_x = 0, e_y = 0, e_\theta = 0$),
**When** the optimal LQR control step is evaluated at reference velocity $v_r$,
**Then** control corrections must be zero ($u_v = 0, u_\omega = 0$), producing unperturbed cruise commands ($v_{cmd} = v_r, \omega_{cmd} = 0$).

---

### Scenario 9: Full 3x3 DARE vs. Decoupled Decomposition Equivalence & Block-Diagonal Separation Theorem (AC-MDRB-036-9)
**Given** the full 3-state, 2-input unicycle state-space model at sample period $T_s = 5\text{ ms}$:
$$A_d(v_r) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & v_r T_s \\ 0 & 0 & 1 \end{bmatrix}, \quad B_d(v_r) = \begin{bmatrix} -T_s & 0 \\ 0 & -\frac{1}{2} v_r T_s^2 \\ 0 & -T_s \end{bmatrix}$$
with diagonal cost matrices $Q = \text{diag}(q_x, q_y, q_\theta) \succeq 0$ and $R = \text{diag}(r_v, r_\omega) \succ 0$,
**When** solving the full $3\times 3$ matrix DARE $P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^{-1}(B_d^T P A_d) + Q$ and optimal gain matrix $K = (R + B_d^T P B_d)^{-1} B_d^T P A_d$,
**Then** by the Block-Diagonal Separation Theorem, off-diagonal coupling blocks $P_{12}, P_{21}, K_{12}, K_{21}$ are identically zero,
**And** the full $3\times 3$ optimal feedback gains match the decoupled $1\times 1$ longitudinal and $2\times 2$ lateral/heading solutions within numerical convergence tolerance ($\|K_{full} - K_{dec}\| < 10^{-2}, \|P_{full} - P_{dec}\| < 10^{-2}$),
**And** the discrete closed-loop spectral radius satisfies $\rho_{full} = \max(|1 - T_s k_{11}|, \rho_{lat}) < 1.0$ across all operating velocities $v_r \in [50, 800]\text{ mm/s}$.
