# Native C Build Fix: Resolution of Implicit Function Declaration & Unused Variable Warnings for `pb_type_mdrobotbase.c`
**Timestamp:** 2026-07-23T08:18:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. GCC Compiler Error Breakdown

During `make primehub_f4`, GCC failed with two specific errors:

1. **Implicit Function Declaration (`-Werror=implicit-function-declaration`)**:
   ```text
   ../../pybricks/robotics/pb_type_mdrobotbase.c:1070:12: error: implicit declaration of function 'pb_type_mdrobotbase_wait_or_await' [-Werror=implicit-function-declaration]
   ../../pybricks/robotics/pb_type_mdrobotbase.c:1070:12: error: returning 'int' from a function with return type 'mp_obj_t' {aka 'void *'} makes pointer from integer without a cast [-Werror=int-conversion]
   ```
   *Root Cause:* `pb_type_mdrobotbase_wait_or_await` was invoked in `navigate_to_goal` (L1070) before its implementation was encountered in translation order. GCC assumed an implicit return type of `int`, causing `int` to `mp_obj_t` conversion errors.

2. **Unused Variable (`-Werror=unused-variable`)**:
   ```text
   ../../pybricks/robotics/pb_type_mdrobotbase.c:1885:11: error: unused variable 'diam_right_mm' [-Werror=unused-variable]
   ../../pybricks/robotics/pb_type_mdrobotbase.c:1958:11: error: unused variable 'diam_right_mm' [-Werror=unused-variable]
   ```
   *Root Cause:* `diam_right_mm` was declared in single-wheel pivot turn routines where only `diam_left_mm` was used.

---

## 2. Technical Solution Implemented

1. **Placed Forward Prototype & Implementation near Top of `pb_type_mdrobotbase.c`** (right after `pb_type_mdrobotbase_motion_iterate_once` at L90):

```c
static mp_obj_t pb_type_mdrobotbase_wait_or_await(pb_type_MDRobotBase_obj_t *self) {
  pb_type_async_t config = {
      .parent_obj = MP_OBJ_FROM_PTR(self),
      .iter_once = pb_type_mdrobotbase_motion_iterate_once,
      .close = pb_type_MDRobotBase_stop,
      .return_map = NULL,
  };
  return pb_type_async_wait_or_await(&config, &self->last_awaitable, true);
}
```

2. **Removed Unused `diam_right_mm` Declarations** from `pivot_turn_to_angle` and `pivot_turn_angle`.

---

## 3. Verification

Ran test suite:
```bash
PYTHONPATH=code python3 -m pytest code/test_sample_color_navigation.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```
Output:
```text
============================== 15 passed in 1.00s ==============================
```
`make primehub_f4` now compiles cleanly without GCC warnings or errors!
