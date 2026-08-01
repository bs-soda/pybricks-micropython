# MDRobotBase Mechanics: Ramping Control Defaults & Phase Lag Analysis

**Timestamp**: 2026-07-23T09:50:00Z  
**Target Repository**: `pybricks-micropython` / `lib/pbio` / `pybricks/robotics/pb_type_mdrobotbase.c`  
**Query**: Is `use_ramping` set to `False` by default across `MDRobotBase` movement APIs?

---

## 1. Direct Answer & Summary Table

**Yes, `use_ramping` is `False` by default across all movement methods in `MDRobotBase`.**

Specifically, for `navigate_to_goal`, `go_forward`, `go_backward`, and `follow_trajectory`, the C MicroPython keyword argument parser default is explicitly defined as `false`:

```c
{MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}}
```

### Movement Method Parameter Matrix

| Method | Parameter | Default Value in C | Underlying Control Mode Behavior |
| :--- | :--- | :--- | :--- |
| `navigate_to_goal` | `use_ramping` | `false` (`False`) | Full velocity $v_{\text{target}}$ applied directly to feedback controller without distance S-curve throttling. |
| `go_forward` | `use_ramping` | `false` (`False`) | Delegated to `navigate_to_goal` with `use_ramping=False`. |
| `go_backward` | `use_ramping` | `false` (`False`) | Delegated to `navigate_to_goal` with `use_ramping=False` and `backward=True`. |
| `follow_trajectory` | `use_ramping` | `false` (`False`) | Multi-segment Pure Pursuit look-ahead navigation operates at unthrottled segment speeds. |
| `turn_to_angle` | `accel_angle` / `decel_angle` | $15.0^\circ$ | Angular trapezoidal velocity profiling controlled via explicit angle thresholds rather than a boolean distance ramping flag. |
| `pivot_turn_to_angle`| `accel_angle` / `decel_angle` | $15.0^\circ$ | Single-wheel angular profiling controlled via explicit angle thresholds. |

---

## 2. Deep Dive: Underlying Control Theory & Mechanics

### 2.1 The Phase Lag & Controller Conflict Problem (Why Ramping Defaults to `False`)

In `MDRobotBase`, closed-loop trajectory execution is driven by real-time odometry and state feedback controllers:
1. **LQR State-Space Controller** (Controller Mode 1):
   $$\mathbf{u}(t) = -\mathbf{K} \cdot \mathbf{e}(t) = -\begin{bmatrix} K_x & 0 & 0 \\ 0 & K_y & K_\theta \end{bmatrix} \begin{bmatrix} e_x^{\text{local}} \\ e_y^{\text{local}} \\ e_\theta \end{bmatrix}$$
2. **PID Feedback Controller with Stanley Cross-Track Steering** (Controller Mode 0):
   $$w_{\text{cmd}}(t) = K_p \cdot e_\theta(t) + K_i \int e_\theta(t) \, dt - K_d \cdot \dot{\theta}_{\text{gyro}}(t)$$

#### Mechanism of Failure When `use_ramping=True` Was Default:
When distance S-curve velocity attenuation ($v_{\text{profile}}(d) = v_{\text{target}} \cdot \frac{1 - \cos(\pi \cdot \tau)}{2}$) is active:
1. **Velocity Profile Throttling**: Near the start and end of a move, the ramping calculation forcibly scales down reference velocity $v_{\text{profile}}$.
2. **Reference Point Lag**: The mathematical reference point $(x_{\text{ref}}, y_{\text{ref}})$ integrated along the path travels significantly slower than the ideal constant-speed or model-predicted path.
3. **Control Output Conflict**:
   - The feedback controller calculates position errors $e_x$ and $e_y$ against the geometric goal $(x_g, y_g)$.
   - While LQR or PID attempts to apply torque to accelerate the robot toward the goal, the distance ramping filter simultaneously restricts the linear velocity reference $v_{\text{cmd}}$.
   - This creates a **phase lag** between commanded velocity and physical position error, leading to motor chatter, angular oscillation, and position overshoot near target coordinates.

#### Operational Advantage of `use_ramping=False` Default:
When `use_ramping=False`, the controller receives an unattenuated, smooth velocity reference $v_{\text{target}}$:
- Acceleration slew-rate limits ($\text{max\_accel}$) prevent current spikes and wheel slippage at the low-level motor driver layer without introducing artificial reference position lag into the state feedback loop.
- Deceleration to a stop is handled cleanly when the robot reaches the position tolerance circle ($d_{\text{remaining}} \le \text{tolerance\_dist}$) or crosses the perpendicular goal target plane.

---

## 3. C Implementation Details in `pb_type_mdrobotbase.c`

### 3.1 Parameter Parsing
In `pybricks/robotics/pb_type_mdrobotbase.c`, argument parsing uses `MP_ARG_BOOL` initialized with `.u_bool = false`:

```c
static const mp_arg_t allowed_args[] = {
    {MP_QSTR_goal_x, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
    {MP_QSTR_goal_y, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
    {MP_QSTR_goal_theta, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_start_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_end_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_accel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_decel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}}, // EXPLICIT DEFAULT FALSE
    {MP_QSTR_backward, MP_ARG_BOOL, {.u_bool = false}},
    {MP_QSTR_tolerance_dist, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
    {MP_QSTR_kick_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
    {MP_QSTR_kick_time_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
};
```

### 3.2 Non-Blocking Execution Evaluation
Inside `pb_type_mdrobotbase_motion_iterate_once`:
```c
float v_profile = self->rb->target_speed_for_ramping;
if (self->rb->use_ramping) {
    // S-curve velocity attenuation calculation
    float v_acc = self->rb->target_speed_for_ramping;
    if (self->rb->accel_d > 0.0f && self->rb->dist_traveled < self->rb->accel_d) {
        float ratio = self->rb->dist_traveled / self->rb->accel_d;
        float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
        v_acc = self->rb->current_start_speed +
                (self->rb->target_speed_for_ramping - self->rb->current_start_speed) * smooth_ratio;
    }
    // ... Deceleration attenuation ...
    v_profile = (fabsf(v_acc) < fabsf(v_dec)) ? v_acc : v_dec;
}
```
When `use_ramping` is `false`, the code bypasses the distance attenuation trigonometric functions and assigns `v_profile = target_speed` directly, yielding maximum responsiveness and precision for PID and LQR control.
