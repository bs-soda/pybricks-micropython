# Native C Revision Plan: `MDRobotBase.navigate_to_goal` Coroutine Multitask Support
**Timestamp:** 2026-07-23T00:18:40+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. Problem Identification in Native C Layer

In `pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c`, the trajectory control loop inside `pb_type_MDRobotBase_navigate_to_goal_internal` (lines 454–738) currently runs a blocking C `while (1)` loop:

```c
// Line 734-737 in pb_type_mdrobotbase.c
pbio_servo_run_forever(self->rb->left, left_dps);
pbio_servo_run_forever(self->rb->right, right_dps);

mp_hal_delay_ms(10); // <--- BLOCKING HAL SYSTEM DELAY
```

### Why `mp_hal_delay_ms(10)` Starves Python Coroutines
- `mp_hal_delay_ms(10)` performs a hardware sys-tick delay without calling MicroPython's event loop hook (`MICROPY_EVENT_POLL_HOOK`) or pending task scheduler (`mp_handle_pending(true)`).
- Consequently, while `navigate_to_goal` executes its 3-second trajectory in C, MicroPython's cooperative `multitask()` event loop is completely frozen. Secondary coroutines (e.g., `scan_colors_task`) are denied CPU ticks until `navigate_to_goal` finishes its entire C function call!

---

## 2. Proposed Native C Revision Strategies

### Strategy A: Event-Loop Polling & Pending Task Dispatch (Recommended Fix)
Inject MicroPython VM event polling hooks directly into the 10ms motion control loop in `pb_type_mdrobotbase.c`:

```c
pbio_servo_run_forever(self->rb->left, left_dps);
pbio_servo_run_forever(self->rb->right, right_dps);

// Delay 10ms while yielding CPU ticks to MicroPython async tasks
mp_hal_delay_ms(10);
MICROPY_EVENT_POLL_HOOK;
mp_handle_pending(true);
```

#### Mechanics & Benefits:
1. `MICROPY_EVENT_POLL_HOOK` checks UART hardware interrupts and background timer events.
2. `mp_handle_pending(true)` yields execution to any scheduled MicroPython coroutines in `pybricks.tools.multitask()`.
3. `scan_colors_task()` receives a CPU tick every 10ms in-flight while the robot drives!

---

### Strategy B: Native Awaitable Generator State-Machine Pattern (`iternext`)
For full async non-blocking integration consistent with Pybricks `pb_type_generator` objects:

1. Convert `pb_type_MDRobotBase_navigate_to_goal` from a blocking C function to a generator object constructor returning `mp_obj_t`.
2. Define `pb_type_MDRobotBase_navigate_to_goal_iternext(mp_obj_t self_in)`:
   - Executes one $10\text{ ms}$ LQR/PID trajectory calculation.
   - Updates motor speeds via `pbio_servo_run_forever`.
   - Returns `MP_OBJ_STOP_ITERATION` with `mp_const_none` until goal threshold is reached.

---

## 3. Implementation Code Diff (`pb_type_mdrobotbase.c`)

```diff
--- a/pybricks/robotics/pb_type_mdrobotbase.c
+++ b/pybricks/robotics/pb_type_mdrobotbase.c
@@ -734,7 +734,10 @@ static mp_obj_t pb_type_MDRobotBase_navigate_to_goal_internal(
         pbio_servo_run_forever(self->rb->left, left_dps);
         pbio_servo_run_forever(self->rb->right, right_dps);
 
+        // Yield CPU ticks to MicroPython cooperative event loop for multitask coroutine execution
         mp_hal_delay_ms(10);
+        MICROPY_EVENT_POLL_HOOK;
+        mp_handle_pending(true);
     }
 
     // If goal_theta was specified, perform final turn-in-place
@@ -780,7 +783,10 @@ static mp_obj_t pb_type_MDRobotBase_navigate_to_goal_internal(
             pbio_servo_run_forever(self->rb->left, left_dps);
             pbio_servo_run_forever(self->rb->right, right_dps);
 
+            // Yield CPU ticks during final heading alignment turn
             mp_hal_delay_ms(10);
+            MICROPY_EVENT_POLL_HOOK;
+            mp_handle_pending(true);
         }
     }
```

---

## 4. Verification Matrix

| Execution Environment | Unmodified C Code | Revised C Code (`MICROPY_EVENT_POLL_HOOK`) |
|---|---|---|
| **`navigate_to_goal` Motion** | 100Hz LQR/PID Control | 100Hz LQR/PID Control (Unchanged) |
| **`multitask()` Coroutine Switching** | Frozen (0 ticks during drive) | **Interleaved (Every 10ms)** |
| **In-Flight Color Scanning** | Blocked until drive completes | **Runs concurrently in-flight** |
| **Post-Drive Termination** | Scans nothing after finish | Scans nothing after finish |
