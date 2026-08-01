# C Code Revision & Feature Implementation Report: `use_ramping` in `follow_trajectory`

**Timestamp**: 2026-07-22T23:16:00+07:00  
**Target Repositories**: `pybricks-micropython`, `pybricks-upy`, `mat-metric`  
**Modified Files**:
- [`pybricks-micropython: pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1578-L1612)
- [`pybricks-upy: pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-upy/pybricks/robotics/pb_type_mdrobotbase.c#L1578-L1612)
- [`mat-metric: src/utils/mdRobotBaseAutocompletes.ts`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/src/utils/mdRobotBaseAutocompletes.ts#L135-L140)

---

## 1. Executive Summary

As requested, the `use_ramping` parameter has been added to `MDRobotBase.follow_trajectory(...)` in the C core engine of Pybricks MicroPython (`pb_type_mdrobotbase.c`), with its default value revised to **`False`**.

- **Default Behavior (`use_ramping=False`)**: Acceleration and deceleration distance S-curves are bypassed (`seg_accel_d = 0.0f`, `seg_decel_d = 0.0f`). The robot targets command velocity immediately across trajectory segments.
- **Explicit Opt-in (`use_ramping=True`)**: Distance S-curve velocity ramping across `accel_d` and `decel_d` (default 50.0mm) is enabled.

---

## 2. Detailed C Code Modification Analysis

### 2.1 Parameter Parser Registration (`allowed_args[]`)
In `pb_type_mdrobotbase.c`, `{ MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false} }` was registered at index 8 in `allowed_args[]`:

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
    { MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false} }, // <-- NEW! Default: False
    { MP_QSTR_back, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
    { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
};
```

### 2.2 MicroPython Argument Unpacking & Index Offset Adjustment
The argument values were extracted with shifted index positions:
```c
bool ramping = parsed_args[8].u_bool;
bool back = parsed_args[9].u_obj == mp_const_none ? false : mp_obj_is_true(parsed_args[9].u_obj);
pbio_control_on_completion_t stop_behavior = pb_type_enum_get_value(parsed_args[10].u_obj, &pb_enum_type_Stop);
mp_obj_t timeout_ms_obj = parsed_args[11].u_obj;
```

### 2.3 Segment Velocity Ramping Logic
Inside the main execution loop, `seg_accel_d` and `seg_decel_d` are conditionally set based on `ramping`:

```c
float seg_accel_d = ramping ? accel_d : 0.0f;
float seg_decel_d = ramping ? decel_d : 0.0f;
```

Additionally, `max_accel` calculation is guarded:
```c
if (ramping) {
    if (accel_d > 0.0f) {
        float a_calc = (target_speed_unsigned * target_speed_unsigned - fabsf(current_start_speed) * fabsf(current_start_speed)) / accel_d;
        if (a_calc > max_accel) max_accel = a_calc;
    }
    if (decel_d > 0.0f) {
        float d_calc = (target_speed_unsigned * target_speed_unsigned - fabsf(current_end_speed) * fabsf(current_end_speed)) / decel_d;
        if (d_calc > max_accel) max_accel = d_calc;
    }
}
```

---

## 3. IDE Autocomplete Synchronization (`mat-metric`)

The IDE autocomplete metadata definition in [`mdRobotBaseAutocompletes.ts`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/src/utils/mdRobotBaseAutocompletes.ts#L135-L140) was updated to match the C function signature:

```typescript
  {
    label: 'follow_trajectory',
    detail: 'db.follow_trajectory(points, speed=300.0, start_speed=0.0, end_speed=0.0, accel_d=50.0, decel_d=50.0, tolerance=10.0, transition_tolerance=45.0, use_ramping=False, back=False, then=Stop.HOLD)',
    documentation: 'Follows a list of waypoints using intermediate path-transition tolerances and dynamic transition velocity adjustments.',
    insertText: 'follow_trajectory(points=${1:points}, speed=${2:300.0}, start_speed=${3:0.0}, end_speed=${4:0.0}, accel_d=${5:50.0}, decel_d=${6:50.0}, tolerance=${7:10.0}, transition_tolerance=${8:45.0}, use_ramping=${9:False}, back=${10:False}, then=${11:Stop.HOLD})'
  },
```

---

## 4. Verification & Testing

Ran vitest suite in `mat-metric`:
```bash
npm --prefix /Users/batrarethsudprasert/projects/wro/mat-metric test
```

### Result:
```text
 ✓ src/tests/trajectory.test.ts (13 tests)
 ✓ src/tests/autocompletes.test.ts (25 tests)

 Test Files  2 passed (2)
      Tests  38 passed (38)
```
