# Native C Implementation & Source Code Mapping: `use_ramping` in `pb_type_mdrobotbase.c`

**Date & Time**: 2026-07-22 22:40:00 UTC+7  
**Workspace**: `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**File Path**: [pb_type_mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  

---

## 1. Native C Source Locations Summary

| Section | Line Range | Description |
| :--- | :--- | :--- |
| **Parameter Table** | [pb_type_mdrobotbase.c:L857](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L857) | Keyword argument definition `{ MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = true} }` |
| **Argument Parsing** | [pb_type_mdrobotbase.c:L896](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L896) | Extracts `bool ramping = parsed_args[8].u_bool;` |
| **Short Move Scaling** | [pb_type_mdrobotbase.c:L417](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L417) | Calculates $v_{\text{peak}}$ for short distance triangular profiles |
| **S-Curve Ramping Loop** | [pb_type_mdrobotbase.c:L499-518](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L499-L518) | Evaluates Cosine $v_{\text{acc}}$ and $v_{\text{dec}}$ S-curve speed calculations |
| **`go_forward` Binding** | [pb_type_mdrobotbase.c:L922](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L922) | Passes `use_ramping` in `go_forward` |
| **`go_backward` Binding** | [pb_type_mdrobotbase.c:L990](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L990) | Passes `use_ramping` in `go_backward` |

---

## 2. Detailed Native C Source Code Snippets

### 2.1 Keyword Parameter Definition & Extraction ([L857](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L857), [L896](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L896))

```c
static const mp_arg_t allowed_args[] = {
    ...
    { MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = true} }, // Line 857
    { MP_QSTR_backward, MP_ARG_BOOL, {.u_bool = false} },
    ...
};

bool ramping = parsed_args[8].u_bool; // Line 896
```

### 2.2 Triangular Profile Short-Move Peak Speed ([L417](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L417))

```c
float target_speed_for_ramping = target_speed;
if (ramping && (accel_d + decel_d > 0.0f) && (total_dist_actual < accel_d + decel_d)) {
    float abs_peak = sqrtf((abs_start_speed * abs_start_speed * decel_d + abs_end_speed * abs_end_speed * accel_d + 1200.0f * accel_d * decel_d * total_dist_actual) / (accel_d + decel_d));
    target_speed_for_ramping = (target_speed >= 0.0f) ? abs_peak : -abs_peak;
}
```

### 2.3 Cosine S-Curve Speed Profile Evaluation ([L499-L518](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L499-L518))

```c
float v_profile = target_speed_for_ramping;
if (ramping) {
    // 1. Cosine Acceleration Phase
    float v_acc = target_speed_for_ramping;
    if (accel_d > 0.0f && dist_traveled < accel_d) {
        float ratio = dist_traveled / accel_d;
        float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
        v_acc = current_start_speed + (target_speed_for_ramping - current_start_speed) * smooth_ratio;
    }

    // 2. Cosine Deceleration Phase
    float v_dec = target_speed_for_ramping;
    if (decel_d > 0.0f && dist_remaining_decel < (decel_d + tolerance)) {
        float ratio = (dist_remaining_decel - tolerance) / decel_d;
        if (ratio < 0.0f) ratio = 0.0f;
        if (ratio > 1.0f) ratio = 1.0f;
        float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
        v_dec = current_end_speed + (target_speed_for_ramping - current_end_speed) * smooth_ratio;
    }

    // 3. Select Bottleneck Velocity
    if (fabsf(v_acc) < fabsf(v_dec)) {
        v_profile = v_acc;
    } else {
        v_profile = v_dec;
    }
}
```
