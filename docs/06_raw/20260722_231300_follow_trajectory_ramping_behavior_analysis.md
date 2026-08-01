# Deep Analysis: Is Ramping Always `False` in Pybricks MicroPython `follow_trajectory`?

**Timestamp**: 2026-07-22T23:13:00+07:00  
**Target Repository**: `pybricks-micropython`  
**Source File**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1929-L1950)

---

## 1. Executive Summary & Clarification

> **Answer**: **NO**, ramping is **NOT** always `False`. On the contrary, **Speed Ramping (Velocity Profiling) is ALWAYS ACTIVE (TRUE) by default in C**.

While there is no boolean parameter named `use_ramping` exposed to MicroPython callers in `follow_trajectory(...)`, the C execution loop implements continuous smooth S-curve S-sinusoidal / S-cosine velocity ramping by default using `accel_d` and `decel_d` (default `50.0` mm).

---

## 2. Underlying C-Code Mechanics: S-Curve Velocity Ramping

In [`pb_type_mdrobotbase.c:L1929-L1949`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1929-L1949), `follow_trajectory` calculates the velocity profile $v_{\text{profile}}$ on every 1ms control loop iteration:

```c
// Speed Profiling Calculation (S-Curve Cosine Ramping)
float v_profile = seg_target_speed;
float v_acc = seg_target_speed;

// 1. Acceleration Ramp Up
if (seg_accel_d > 0.0f && dist_from_start < seg_accel_d) {
    float ratio = dist_from_start / seg_accel_d;
    float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
    v_acc = seg_start_speed + (seg_target_speed - seg_start_speed) * smooth_ratio;
}

// 2. Deceleration Ramp Down
float v_dec = seg_target_speed;
if (seg_decel_d > 0.0f && seg_dist_remaining < (seg_decel_d + current_tolerance)) {
    float ratio = (seg_dist_remaining - current_tolerance) / seg_decel_d;
    if (ratio < 0.0f) ratio = 0.0f;
    if (ratio > 1.0f) ratio = 1.0f;
    float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
    v_dec = seg_end_speed + (seg_target_speed - seg_end_speed) * smooth_ratio;
}

// 3. Profile Selection (Take the limiting ramp)
if (fabsf(v_acc) < fabsf(v_dec)) {
    v_profile = v_acc;
} else {
    v_profile = v_dec;
}
```

---

## 3. Mathematical Formula for Cosine S-Curve Ramping

The smoothing ratio $\sigma(\tau)$ for normalized travel progress $\tau \in [0, 1]$ is calculated using a half-cosine blend:

$$\sigma(\tau) = \frac{1 - \cos(\pi \tau)}{2}$$

1. **Acceleration Phase** ($\tau = \frac{d_{\text{start}}}{d_{\text{accel}}}$):
   $$v_{\text{acc}}(d) = v_{\text{start}} + (v_{\text{target}} - v_{\text{start}}) \times \frac{1 - \cos\left(\pi \frac{d_{\text{start}}}{d_{\text{accel}}}\right)}{2}$$

2. **Deceleration Phase** ($\tau = \frac{d_{\text{remaining}} - d_{\text{tolerance}}}{d_{\text{decel}}}$):
   $$v_{\text{dec}}(d) = v_{\text{end}} + (v_{\text{target}} - v_{\text{end}}) \times \frac{1 - \cos\left(\pi \frac{d_{\text{remaining}} - d_{\text{tolerance}}}{d_{\text{decel}}}\right)}{2}$$

3. **Combined Speed Command**:
   $$v_{\text{profile}} = \text{sign}(v_{\text{target}}) \times \min\left(|v_{\text{acc}}|, |v_{\text{dec}}|\right)$$

---

## 4. How to Control or Disable Ramping in `follow_trajectory`

Although there is no `use_ramping=False` argument flag, ramping behavior is directly configured via `accel_d` and `decel_d`:

| Desired Behavior | Code Parameter Configuration | Resulting C Ramping State |
|---|---|---|
| **Default Smooth Ramping (ON)** | `accel_d=50.0, decel_d=50.0` (Defaults) | **Active S-curve ramping ON**. Smooth acceleration and deceleration. |
| **Instant Speed (Ramping OFF)** | `accel_d=0.0, decel_d=0.0` | **Ramping OFF**. Robot jumps instantly to target velocity without distance ramping. |
| **Custom Acceleration Distance** | `accel_d=150.0, decel_d=150.0` | Extended S-curve ramping over 150mm distance. |

---

## 5. Summary Table

| Feature | Single-Goal Navigation (`navigate_to_goal`, `go_forward`) | Trajectory Navigation (`follow_trajectory`) |
|---|---|---|
| **Boolean Flag (`use_ramping`)** | Exposed as parameter (Default: `True`). | **Not exposed** (No `use_ramping` kwarg). |
| **Ramping Active by Default?** | **YES** | **YES** (ALWAYS ACTIVE in C loop). |
| **Ramping Curve Profile** | Linear distance ramping. | **Smooth Cosine S-Curve profile**. |
| **Disable Ramping Mechanism** | `use_ramping=False` | `accel_d=0.0, decel_d=0.0`. |
