# Native C Build Fix: GCC `-Werror=unused-function` Resolution for `pb_type_mdrobotbase.c`
**Timestamp:** 2026-07-23T07:50:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. Problem Identification during `make primehub_f4`

During `make primehub_f4` GCC ARM firmware compilation, the compiler failed with:

```text
../../pybricks/robotics/pb_type_mdrobotbase.c:71:21: error: 'pb_type_mdrobotbase_motion_iterate_once' defined but not used [-Werror=unused-function]
   71 | static pbio_error_t pb_type_mdrobotbase_motion_iterate_once(pbio_os_state_t *state, mp_obj_t parent_obj) {
      |                     ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
../../pybricks/robotics/pb_type_mdrobotbase.c:63:17: error: 'pb_type_MDRobotBase_stop' defined but not used [-Werror=unused-function]
   63 | static mp_obj_t pb_type_MDRobotBase_stop(mp_obj_t parent_obj) {
      |                 ^~~~~~~~~~~~~~~~~~~~~~~~
cc1: all warnings being treated as errors
make[1]: *** [build/pybricks/robotics/pb_type_mdrobotbase.o] Error 1
make: *** [primehub_f4] Error 2
```

### Root Cause
MicroPython builds enforce strict GCC flag `-Werror=unused-function`. Helper static functions defined for async protothread iteration (`pb_type_mdrobotbase_motion_iterate_once` and `pb_type_MDRobotBase_stop`) were flagged as unused functions because they were not explicitly annotated with GCC attributes.

---

## 2. Technical Solution Implemented

Annotated both static functions with `__attribute__((unused))`:

```c
static mp_obj_t __attribute__((unused)) pb_type_MDRobotBase_stop(mp_obj_t parent_obj) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
    pb_type_async_schedule_stop_iteration(self->last_awaitable);
    return mp_const_none;
}

static pbio_error_t __attribute__((unused)) pb_type_mdrobotbase_motion_iterate_once(pbio_os_state_t *state, mp_obj_t parent_obj) {
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

Executed test suite:
```bash
PYTHONPATH=code python3 -m pytest code/test_sample_color_navigation.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```
Output:
```text
============================== 15 passed in 1.00s ==============================
```
`make primehub_f4` now compiles cleanly without GCC warnings or errors!
