# Native C Implementation: Full Pybricks `pb_type_async_t` Protothread Integration for `MDRobotBase`
**Timestamp:** 2026-07-23T07:48:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. Executive Summary

We have fully implemented Pybricks' native `pb_type_async_t` awaitable generator engine across `MDRobotBase` in Native C (`pb_type_mdrobotbase.c`).

When running in asynchronous mode (`run_task` or `multitask`), calling any `MDRobotBase` motion method returns a native `pb_type_async_t` **awaitable generator object** to Python. MicroPython's cooperative event loop repeatedly calls `pb_type_mdrobotbase_motion_iterate_once` frame-by-frame, enabling true parallel coroutine execution with background tasks such as `scan_colors_task()`.

---

## 2. Core Implementation Architecture

### 2.1 Struct Upgrade (`pb_type_MDRobotBase_obj_t`)
Added `last_awaitable` tracking pointer:

```c
typedef struct _pb_type_MDRobotBase_obj_t {
    mp_obj_base_t base;
    pbio_mdrobotbase_t *rb;
    bool debug;
    pb_type_async_t *last_awaitable;
} pb_type_MDRobotBase_obj_t;
```

### 2.2 Motor Stop & Async Cancellation Callback (`pb_type_MDRobotBase_stop`)
```c
static mp_obj_t pb_type_MDRobotBase_stop(mp_obj_t parent_obj) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pb_type_async_schedule_stop_iteration(self->last_awaitable);
    return mp_const_none;
}
```

### 2.3 Non-Blocking Protothread Iteration (`pb_type_mdrobotbase_motion_iterate_once`)
```c
static pbio_error_t pb_type_mdrobotbase_motion_iterate_once(pbio_os_state_t *state, mp_obj_t parent_obj) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);

    if (!pbio_servo_update_loop_is_running(self->rb->left) || !pbio_servo_update_loop_is_running(self->rb->right)) {
        return PBIO_ERROR_NO_DEV;
    }

    bool done = pbio_control_is_done(&self->rb->left->control) && pbio_control_is_done(&self->rb->right->control);
    return done ? PBIO_SUCCESS : PBIO_ERROR_AGAIN;
}
```

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
