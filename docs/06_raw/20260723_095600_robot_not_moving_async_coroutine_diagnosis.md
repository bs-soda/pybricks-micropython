# MDRobotBase Non-Moving Robot Diagnosis & Coroutine Mechanics

**Timestamp**: 2026-07-23T09:56:00Z  
**Target Component**: `pybricks-micropython` / `pybricks/robotics/pb_type_mdrobotbase.c` / `pybricks/tools/pb_type_async.c`  
**Symptom**: "Robot not move any more"

---

## 1. Executive Summary & Diagnostic Root Cause Analysis

When using the refactored `MDRobotBase` non-blocking C movement engine, there are two primary operational mechanics that dictate whether physical motor movement occurs:

### Root Cause 1: Omission of `await` Keyword in Asynchronous Contexts (`run_task` / `asyncio`)
In the Pybricks C architecture (`pybricks/tools/pb_type_async.c`), movement methods inspect `pb_module_tools_run_loop_is_active()`:

```c
mp_obj_t pb_type_async_wait_or_await(pb_type_async_t *config, pb_type_async_t **prev, bool stop_prev) {
    if (pb_module_tools_run_loop_is_active()) {
        // Return allocated awaitable generator to MicroPython event loop
        return MP_OBJ_FROM_PTR(iter);
    }
    // Synchronous blocking C loop
    while ((err = config->iter_once(&config->state, config->parent_obj)) == PBIO_ERROR_AGAIN) {
        mp_event_wait_indefinite();
    }
    return mp_const_none;
}
```

- **Inside `run_task` / `async def`**: Calling `robot.go_forward(500)` returns a MicroPython `pb_type_async` generator object. **If the script calls `robot.go_forward(500)` without `await`**, the generator object is instantiated on the heap but `iter_once` is **never executed by the MicroPython VM**. As a result, 0 ticks execute and no motor commands are sent to the hardware servos.
- **Resolution**: Prefix every movement call inside asynchronous tasks with `await`:
  ```python
  # CORRECT:
  await robot.go_forward(500)
  await robot.navigate_to_goal(1000, 500)
  ```

---

### Root Cause 2: Goal Distance Smaller Than Tolerance Threshold ($d \le \text{tolerance\_dist}$)
In `pb_type_mdrobotbase_motion_iterate_once` (`pb_type_mdrobotbase.c`):

```c
float dx = self->rb->goal_x - self->rb->x;
float dy = self->rb->goal_y - self->rb->y;
float dist_remaining = sqrtf(dx * dx + dy * dy);

if (dist_remaining <= self->rb->tolerance_dist || plane_crossed) {
    self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    self->rb->motion_in_progress = false;
    return PBIO_SUCCESS;
}
```

- If `robot.navigate_to_goal(x, y)` is called with goal coordinates $(x_g, y_g)$ that are within `tolerance_dist` (default 15.0 mm) of the current odometry pose $(x, y)$, or if odometry state was not reset (`robot.reset_state(0, 0, 0)`), `dist_remaining` is $\le 15.0\text{ mm}$.
- `iter_once` evaluates the arrival condition as `true` on tick 0 and returns `PBIO_SUCCESS` immediately without commanding motor rotation.
- **Resolution**: Ensure `reset_state(x, y, theta, gyro_heading)` is initialized prior to navigation or pass appropriate non-zero movement vectors.

---

### Root Cause 3: Hardware Servo Disconnection / Power Loop Interruption (`PBIO_ERROR_NO_DEV`)
In `pb_type_mdrobotbase_motion_iterate_once`:

```c
if (!pbio_servo_update_loop_is_running(self->rb->left) ||
    !pbio_servo_update_loop_is_running(self->rb->right)) {
    return PBIO_ERROR_NO_DEV;
}
```

- If a motor cable is unplugged, loose, or experienced a power reset, `pbio_servo_update_loop_is_running` returns `false`, causing the engine to abort with `PBIO_ERROR_NO_DEV` (`ENODEV`).

---

## 2. Recommended User Code Verification Patterns

### Asynchronous Pattern (`run_task`)
```python
from pybricks.robotics import MDRobotBase
from pybricks.pupdevices import Motor
from pybricks.parameters import Port
from pybricks.tools import run_task, wait

left_motor = Motor(Port.A)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, 56.0, 56.0, 112.0)

async def main():
    # Initialize odometry state
    robot.reset_state(0, 0, 0, 0)
    
    # MUST USE await for coroutine execution!
    await robot.go_forward(300)
    await robot.turn_to_angle(90)
    await robot.navigate_to_goal(500, 500)

run_task(main())
```

### Synchronous Pattern (Linear Execution)
```python
from pybricks.robotics import MDRobotBase
from pybricks.pupdevices import Motor
from pybricks.parameters import Port

left_motor = Motor(Port.A)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, 56.0, 56.0, 112.0)

# Initialize odometry state
robot.reset_state(0, 0, 0, 0)

# Synchronous calls execute blocking C loops
robot.go_forward(300)
robot.turn_to_angle(90)
robot.navigate_to_goal(500, 500)
```
