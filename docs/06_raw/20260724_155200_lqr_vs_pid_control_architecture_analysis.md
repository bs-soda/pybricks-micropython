# Control Architecture Analysis: LQR vs PID in `MDRobotBase` Spin Turns and Pivot Turns

**Date**: 2026-07-24T15:52:00+07:00  
**Target Codebase**: `pybricks-micropython`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)

---

## 1. Overview & Core Question

**Question**: *Are Spin Turns (`turn_to_angle` / `turn_angle`) and Pivot Turns (`pivot_turn_to_angle` / `pivot_turn_angle`) using LQR or PID?*

**Answer**: 
- **Linear & Trajectory Motions** (`go_forward`, `navigate_to_goal`, `follow_trajectory`): Use **LQR (Linear Quadratic Regulator)** when enabled (`set_controller(1)`), or **PID** when `set_controller(0)`.
- **Spin Turns & Pivot Turns** (`turn_to_angle`, `pivot_turn_to_angle`): Always use **PID (Proportional-Integral-Derivative)** control with dedicated gains (`set_turn_pid_gains` and `set_pivot_pid_gains`).

---

## 2. Mathematical & Control Theory Rationale

### 2.1 Why LQR is Designed for 2D Trajectory Tracking

LQR in `MDRobotBase` is a 3-State Space Feedback Controller operating on the tracking error vector $\mathbf{e} = [e_x, e_y, e_\theta]^T$:

$$\begin{bmatrix} v_{\text{cmd}} \\ \omega_{\text{cmd}} \end{bmatrix} = \begin{bmatrix} v_{\text{profile}} - K_x \cdot e_x \\ -\left(K_y \cdot e_y + K_\theta \cdot e_\theta\right) \end{bmatrix}$$

1. $e_x$: Along-track positional error (speed correction along motion path).
2. $e_y$: Cross-track error (steering correction perpendicular to motion path).
3. $e_\theta$: Heading orientation error (orientation correction).

LQR requires a non-zero linear forward/backward cruise velocity ($v_{\text{profile}} > 0$) to project 2D cross-track steering adjustments ($e_y$) into motor speed differentials.

### 2.2 Why Spin Turns & Pivot Turns Use PID

During a **Spin Turn** or **Pivot Turn**:
- Linear velocity is explicitly zero ($v_{\text{profile}} = 0$).
- Target position $(X_{\text{target}}, Y_{\text{target}})$ remains fixed at the rotation center point.
- Along-track error $e_x = 0$ and cross-track error $e_y = 0$.

Because $e_x = 0$ and $e_y = 0$, the LQR matrix equation degenerates to:

$$\omega_{\text{cmd}} = -K_\theta \cdot e_\theta$$

This single-state feedback $-K_\theta \cdot e_\theta$ is **mathematically identical to Proportional Angular Feedback ($K_p \cdot e_\theta$) in a PID controller**.

Therefore, `MDRobotBase` uses dedicated PID loops for turning in place:
1. **Spin Turns**: Controlled by `PBIO_MDROBOTBASE_MOTION_TURN` using `kp_turn`, `ki_turn`, `kd_turn` (configured via `robot.set_turn_pid_gains(kp, ki, kd)`).
2. **Pivot Turns**: Controlled by `PBIO_MDROBOTBASE_MOTION_PIVOT` using `kp_pivot`, `ki_pivot`, `kd_pivot` (configured via `robot.set_pivot_pid_gains(kp, ki, kd)`).

---

## 3. Summary of Motion Controller Assignments

| Motion API | C Motion Type | Primary Controller | Configuration Function |
| :--- | :--- | :--- | :--- |
| `go_forward` | `PBIO_MDROBOTBASE_MOTION_FORWARD` | **LQR** or PID | `set_controller(1)`, `set_lqr_gains(k_x, k_y, k_theta)` |
| `navigate_to_goal` | `PBIO_MDROBOTBASE_MOTION_NAVIGATE` | **LQR** or PID | `set_controller(1)`, `set_lqr_gains(k_x, k_y, k_theta)` |
| `follow_trajectory` | `PBIO_MDROBOTBASE_MOTION_TRAJECTORY` | **LQR** or PID | `set_controller(1)`, `set_lqr_gains(k_x, k_y, k_theta)` |
| `turn_to_angle` / `turn_angle` | `PBIO_MDROBOTBASE_MOTION_TURN` | **PID** (Spin) | `set_turn_pid_gains(kp, ki, kd)` |
| `pivot_turn_to_angle` | `PBIO_MDROBOTBASE_MOTION_PIVOT` | **PID** (Pivot) | `set_pivot_pid_gains(kp, ki, kd)` |
