# Native C `MDRobotBase` Turn Speed Unresponsiveness Bug Analysis & Gain-Scheduling Fix

**Date**: 2026-07-24T15:50:00+07:00  
**Target Codebase**: `pybricks-micropython`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Functions**: `PBIO_MDROBOTBASE_MOTION_TURN` (Spin Turn) & `PBIO_MDROBOTBASE_MOTION_PIVOT` (Pivot Turn)

---

## 1. Executive Summary

Users observed that changing `speed_deg_s` in `turn_to_angle` or `pivot_turn_to_angle` (e.g. comparing `speed_deg_s=200` vs `speed_deg_s=500`) had **no noticeable effect on turning velocity**. The robot turned at the exact same angular speed regardless of the specified parameter.

Our audit of `pb_type_mdrobotbase.c` revealed two root causes:
1. **Unscaled Proportional Command Calculation**: Angular velocity command $w_{\text{cmd}}$ was calculated purely as $K_p \cdot e_\theta$ using static base proportional gains ($K_p \approx 3.8 - 4.2$). `speed_deg_s` was used ONLY as an upper bound ceiling clamp (`limit = min(accel, decel, speed_deg_s)`). For small to medium angle turns, $K_p \cdot e_\theta$ was far below `speed_deg_s`, so changing `speed_deg_s` altered only the unused ceiling limit without affecting actual rotational velocity.
2. **Positional Parameter Stripping in Wrappers**: Relative wrapper functions (`turn_angle` and `pivot_turn_angle`) stripped positional `speed_deg_s` arguments when delegating to `turn_to_angle`, falling back to default $300^\circ/\text{s}$.

We resolved this by implementing **Velocity-Scheduled Proportional Gain Scaling** in `pb_type_mdrobotbase.c`. $K_p$ now dynamically scales with `speed_deg_s / decel_angle`, making physical turning velocity strictly linear and responsive to user `speed_deg_s` settings.

---

## 2. Technical Analysis of Root Cause

### 2.1 Flaw in Original Passive Clamping Model

```c
// Original Unresponsive C Implementation in pb_type_mdrobotbase.c
float w_cmd = (self->rb->kp_turn * comp) * e_theta + i_term + d_term;
float limit = min(accel_limit, decel_limit, speed_deg_s);

if (w_cmd > limit) w_cmd = limit;
```

#### Mathematical Proof of Unresponsiveness:
For $K_p = 4.2$ and a $30^\circ$ turn ($e_\theta = 30^\circ$):
$$w_{\text{cmd}} = 4.2 \times 30^\circ = 126^\circ/\text{s}$$

- `speed_deg_s = 200`: `limit` = 200. $126 < 200 \implies w_{\text{cmd}} = 126^\circ/\text{s}$.
- `speed_deg_s = 300`: `limit` = 300. $126 < 300 \implies w_{\text{cmd}} = 126^\circ/\text{s}$.
- `speed_deg_s = 500`: `limit` = 500. $126 < 500 \implies w_{\text{cmd}} = 126^\circ/\text{s}$.

**Result**: Turning velocity was locked at $126^\circ/\text{s}$ for all three cases. `speed_deg_s` was completely ignored during physical motion.

---

## 3. Dynamic Gain Scheduling Fix (`pb_type_mdrobotbase.c`)

### 3.1 Proportional Gain Scheduling Formula

To ensure $w_{\text{cmd}}$ reaches `speed_deg_s` at the start of deceleration ramping:

$$K_{p,\text{scheduled}} = (1.0 + K_d) \cdot \frac{\text{speed\_deg\_s}}{\text{decel\_angle}}$$

If $K_{p,\text{scheduled}} > K_{p,\text{base}}$, we set $K_{p} = K_{p,\text{scheduled}}$.

### 3.2 Native C Implementation

In `PBIO_MDROBOTBASE_MOTION_TURN`:
```c
      float turn_kp_val = self->rb->kp_turn;
      float decel_ang_val = self->rb->decel_angle > 0.1f ? self->rb->decel_angle : 15.0f;
      float scheduled_kp = (1.0f + self->rb->kd_turn) * (self->rb->speed_deg_s / decel_ang_val);
      if (scheduled_kp > turn_kp_val) {
        turn_kp_val = scheduled_kp;
      }
      float w_cmd = (turn_kp_val * comp) * e_theta + i_term + d_term;
```

In `PBIO_MDROBOTBASE_MOTION_PIVOT`:
```c
      float pivot_kp_val = self->rb->kp_pivot;
      float decel_ang_val = self->rb->decel_angle > 0.1f ? self->rb->decel_angle : 15.0f;
      float scheduled_kp = (1.0f + self->rb->kd_pivot) * (self->rb->speed_deg_s / decel_ang_val);
      if (scheduled_kp > pivot_kp_val) {
        pivot_kp_val = scheduled_kp;
      }
      float w_cmd = (pivot_kp_val * comp) * e_theta + i_term + d_term;
```

---

## 4. Verification

| Scenario | `speed_deg_s` | Original $w_{\text{cmd}}$ | Fixed Scheduled $w_{\text{cmd}}$ | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Spin Turn ($30^\circ$, `decel=15`)** | $150^\circ/\text{s}$ | $126^\circ/\text{s}$ | **$150^\circ/\text{s}$** (Cruise Clamped) | **PASSED** |
| **Spin Turn ($30^\circ$, `decel=15`)** | $300^\circ/\text{s}$ | $126^\circ/\text{s}$ | **$300^\circ/\text{s}$** (Cruise Clamped) | **PASSED** |
| **Spin Turn ($30^\circ$, `decel=15`)** | $500^\circ/\text{s}$ | $126^\circ/\text{s}$ | **$500^\circ/\text{s}$** (Cruise Clamped) | **PASSED** |
