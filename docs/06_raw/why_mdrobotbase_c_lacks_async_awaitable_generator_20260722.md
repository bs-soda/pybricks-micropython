# Architecture Analysis: Why `MDRobotBase` C Functions Block MicroPython Coroutines & How to Refactor to `pb_type_async_t`
**Timestamp:** 2026-07-23T07:42:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target Files:** `pybricks/robotics/pb_type_mdrobotbase.c`, `pybricks/tools/pb_type_async.h`  

---

## 1. Deep Technical Explanation: Why `MDRobotBase` Still Does Not Support Coroutines Natively

### 1.1 Standard Pybricks Async Paradigm (`pb_type_async_t`)
In native Pybricks C objects (such as `Motor.run_target()` or `ColorSensor.hsv()`), functions check whether MicroPython's async runloop is active via `pb_module_tools_run_loop_is_active()`:

* **When `run_loop_is_active == false` (Sync Mode)**: The C function runs a blocking C `while (1)` loop until completion.
* **When `run_loop_is_active == true` (`multitask` / `run_task` Async Mode)**: The C function **does NOT run a `while (1)` loop**. Instead, it allocates and returns an awaitable generator object (`pb_type_async_t`). MicroPython's event loop then calls the underlying `iter_once` C callback function on every $10\text{ ms}$ tick.

```
[Python multitask()]
        │
        ├────────► Calls Motor.run_target()
        │             │
        │             └──► Returns pb_type_async_t (Generator Object)
        │
        ├────────► Context switches to scan_colors_task() (Executes scan tick)
        │
        └────────► Context switches back to Motor.run_target() (Executes iter_once tick)
```

---

### 1.2 The Bug in Current `pb_type_mdrobotbase.c`
Currently, `pb_type_MDRobotBase_navigate_to_goal_internal` does **NOT** return a `pb_type_async_t` generator object.

Regardless of whether `run_loop_is_active` is `true` or `false`, `navigate_to_goal_internal` immediately enters a synchronous C `while (1)` loop:

```c
// Current pb_type_mdrobotbase.c implementation
static mp_obj_t pb_type_MDRobotBase_navigate_to_goal_internal(...) {
    // ... Initialization ...
    while (1) { // <--- ALWAYS BLOCKS C STACK UNTIL TARGET REACHED
        // ... LQR/PID Calculations ...
        mp_hal_delay_ms(10);
        MICROPY_VM_HOOK_LOOP
        mp_handle_pending(true);
    }
    return mp_const_none;
}
```

Even though `mp_handle_pending(true)` handles system interrupts, `navigate_to_goal_internal` **never yields control back to MicroPython's `multitask()` scheduler** because it does not return an awaitable generator object yielding `MP_OBJ_STOP_ITERATION`. It holds the C execution stack captive for the entire drive duration!

---

## 2. Refactoring Plan: Converting `MDRobotBase` to `pb_type_async_t`

To give `MDRobotBase` full native coroutine multitask support equivalent to standard Pybricks `Motor` methods:

### Step 1: Define `pbio_os_state_t` Iteration Callback (`pb_type_mdrobotbase_navigate_iter_once`)
Extract one 10ms control step out of the `while (1)` loop into a non-blocking `iter_once` callback function:

```c
static pbio_error_t pb_type_mdrobotbase_navigate_iter_once(pbio_os_state_t *state, mp_obj_t parent_obj) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);
    
    // 1. Calculate 1 step of odometry + LQR/PID trajectory steering
    // 2. Output motor velocities via pbio_servo_run_forever
    
    if (dist_remaining <= tolerance) {
        return PBIO_SUCCESS; // Completed! Stop iteration.
    }
    
    return PBIO_ERROR_AGAIN; // Ongoing! Yield control to multitask event loop.
}
```

### Step 2: Use `pb_type_async_wait_or_await` in `navigate_to_goal`
```c
static mp_obj_t pb_type_MDRobotBase_navigate_to_goal(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    // ... Parse Arguments & Initialize State ...

    pb_type_async_t config = {
        .parent_obj = MP_OBJ_FROM_PTR(self),
        .iter_once = pb_type_mdrobotbase_navigate_iter_once,
        .close = pb_type_MDRobotBase_stop,
        .return_map = NULL,
    };

    return pb_type_async_wait_or_await(&config, &self->last_awaitable, true);
}
```

---

## 3. Comparison Matrix

| Mechanism | Current Implementation | `pb_type_async_t` Refactored |
|---|---|---|
| **Return Type in `multitask()`** | `None` (Synchronous C call) | `pb_type_async_t` (Awaitable Generator) |
| **MicroPython Stack Lock** | Locked in C stack for full drive | Yields back to event loop on every tick |
| **`scan_colors_task` Interleaving** | Blocked | **100% Concurrent In-Flight Execution** |
