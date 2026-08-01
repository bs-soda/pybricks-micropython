# Pybricks MicroPython `follow_trajectory` Parameter Review: `use_ramping` Analysis

**Timestamp**: 2026-07-22T23:12:00+07:00  
**Target Repository**: `pybricks-micropython`  
**Source File**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1574-L1613)

---

## 1. Executive Summary & Direct Answer

> **Result**: `follow_trajectory` **does NOT have a `use_ramping` parameter**.

Passing `use_ramping` as a keyword argument to `MDRobotBase.follow_trajectory(...)` will result in a runtime MicroPython `TypeError: extra keyword arguments given`.

---

## 2. Comprehensive C Parameter Specification

In [`pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1578-L1590), the argument parser table `allowed_args[]` for `follow_trajectory` is defined as follows:

```c
static const mp_arg_t allowed_args[] = {
    { MP_QSTR_points, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
    { MP_QSTR_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_accel_d, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_decel_d, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_transition_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_back, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
    { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
};
```

### Complete List of Valid Arguments for `follow_trajectory`:

| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `points` | `list` / `tuple` | **(Required)** | List of 2D waypoints `[[x1, y1], [x2, y2], ...]`. |
| `speed` | `float` | `300.0` mm/s | Cruise velocity along trajectory segments. |
| `start_speed` | `float` | `0.0` mm/s | Initial velocity at start of trajectory. |
| `end_speed` | `float` | `0.0` mm/s | Target velocity at final destination. |
| `accel_d` | `float` | `50.0` mm | Acceleration distance profile. |
| `decel_d` | `float` | `50.0` mm | Deceleration distance profile. |
| `tolerance` | `float` | `10.0` mm | Final waypoint settlement radius. |
| `transition_tolerance` | `float` | `50.0` mm | Turn blending radius for intermediate waypoints. |
| `back` | `bool` | `False` | Reverse drive mode along trajectory. |
| `then` | `Stop` | `Stop.HOLD` | Post-trajectory motor stop behavior (`HOLD`, `BRAKE`, `COAST`). |
| `timeout_ms` | `int` / `None` | `None` | Execution timeout in milliseconds. |

---

## 3. Comparison with Navigation Methods That Support `use_ramping`

In `MDRobotBase`, single-goal navigation methods explicitly expose `use_ramping` to toggle linear distance ramping:

| Method Name | Supports `use_ramping`? | C Source Location |
|---|---|---|
| `navigate_to_goal` | **YES** (default `True`) | [`pb_type_mdrobotbase.c:L857`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L857) |
| `go_forward` | **YES** (default `True`) | [`pb_type_mdrobotbase.c:L922`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L922) |
| `go_backward` | **YES** (default `True`) | [`pb_type_mdrobotbase.c:L990`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L990) |
| `follow_trajectory` | **NO** | [`pb_type_mdrobotbase.c:L1578`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1578) |

---

## 4. Architectural Rationale: Trajectory Profiling vs. Ramping

`follow_trajectory` does not use a binary `use_ramping` flag because velocity profiling across multi-point trajectories is inherently dynamic:
1. **Cornering Speed Blending**: `follow_trajectory` computes transition speeds $v_{\text{trans}, i}$ at each waypoint $i$ based on the turn angle between incoming and outgoing segments:
   $$v_{\text{trans}, i} = v_{\text{target}} \times \max\left(0, \cos(\Delta \theta_i)\right)$$
2. **Segment-Level Profiling**: Acceleration and deceleration are managed continuously via `accel_d` and `decel_d` relative to `start_speed`, corner transition speeds, and `end_speed`.
