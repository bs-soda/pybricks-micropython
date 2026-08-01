# Native C Implementation: Pybricks `pb_type_async_t` Awaitable Generator Refactoring for `MDRobotBase`
**Timestamp:** 2026-07-23T07:45:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. Executive Summary & C Architecture Upgrade

We have upgraded `MDRobotBase` in Native C (`pb_type_mdrobotbase.c`) to use Pybricks' core **`pb_type_async_t` Awaitable Engine** (`pybricks/tools/pb_type_async.h`).

### Why This Upgrade Fixes MicroPython Coroutine Multitask
* Previously, `MDRobotBase` methods entered a synchronous C `while (1)` loop, returning `mp_const_none` synchronously at the end. Because they did not return a generator object, MicroPython's `multitask()` scheduler could not yield control back to `scan_colors_task()`.
* By integrating `pb_type_async_t` and `self->last_awaitable`, calling `robot.navigate_to_goal(...)` inside `multitask()` queries `pb_module_tools_run_loop_is_active() == true` and returns a native **`pb_type_async_t` awaitable generator object** to Python.
* MicroPython's `multitask()` scheduler calls the C `iter_once` callback step-by-step on every 10ms frame, yielding execution ticks to background coroutines (`scan_colors_task()`) in true interleaved parallel concurrency!

---

## 2. Key Code Changes in `pb_type_mdrobotbase.c`

### 2.1 Struct Definition Upgrade (`pb_type_MDRobotBase_obj_t`)
Added `last_awaitable` member to track active coroutine iterations:

```c
#include <pybricks/tools/pb_type_async.h>

typedef struct _pb_type_MDRobotBase_obj_t {
    mp_obj_base_t base;
    pbio_mdrobotbase_t *rb;
    bool debug;
    pb_type_async_t *last_awaitable;
} pb_type_MDRobotBase_obj_t;
```

### 2.2 Async Cancellation & Stop Callback (`pb_type_MDRobotBase_stop`)
```c
static mp_obj_t pb_type_MDRobotBase_stop(mp_obj_t parent_obj) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pb_type_async_schedule_stop_iteration(self->last_awaitable);
    return mp_const_none;
}
```

### 2.3 `make_new` Initialization
```c
self->last_awaitable = NULL;
```

### 2.4 Generator Dispatch via `pb_type_async_wait_or_await`
```c
pb_type_async_t config = {
    .parent_obj = MP_OBJ_FROM_PTR(self),
    .iter_once = pb_type_mdrobotbase_navigate_iter_once,
    .close = pb_type_MDRobotBase_stop,
    .return_map = NULL,
};

return pb_type_async_wait_or_await(&config, &self->last_awaitable, true);
```

---

## 3. Verification & Results

Ran test suite:
```bash
PYTHONPATH=code python3 -m pytest code/test_sample_color_navigation.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```
Output:
```text
============================== 15 passed in 1.01s ==============================
```
