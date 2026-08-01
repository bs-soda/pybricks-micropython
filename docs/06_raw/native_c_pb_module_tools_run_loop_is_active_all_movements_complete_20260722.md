# Native C Implementation: `pb_module_tools_run_loop_is_active()` Integration across 100% of `MDRobotBase` Movement APIs
**Timestamp:** 2026-07-23T08:15:00+07:00  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target File:** `pybricks/robotics/pb_type_mdrobotbase.c`  

---

## 1. Executive Summary: 100% Full Movement API Async Engine Coverage

Following audit feedback, we verified and updated **all 8 public movement methods** in `pb_type_mdrobotbase.c` to explicitly include `pb_module_tools_run_loop_is_active()`.

When invoked inside MicroPython's cooperative async runloop (`run_task` or `multitask`), `pb_module_tools_run_loop_is_active()` returns `true`. Each function initiates hardware servo velocities (`pbio_servo_run_forever`) and immediately returns a native **`pb_type_async_t` awaitable generator object** (`pb_type_mdrobotbase_wait_or_await(self)`).

---

## 2. 100% Complete Native C Function Dispatch Table

| # | Public C Movement API | Line in C File | `pb_module_tools_run_loop_is_active()` Check | Non-Blocking Hardware Action | Return Type in `multitask()` |
|---|---|---|---|---|---|
| 1 | **`navigate_to_goal`** | L1059 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 2 | **`go_forward`** | L1161 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 3 | **`go_backward`** | L1262 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 4 | **`turn_to_angle`** | L1516 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 5 | **`turn_angle`** | L1589 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 6 | **`pivot_turn_to_angle`** | L1883 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 7 | **`pivot_turn_angle`** | L1956 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |
| 8 | **`follow_trajectory`** | L2067 | `if (pb_module_tools_run_loop_is_active())` | `pbio_servo_run_forever` | `pb_type_async_t` Generator |

---

## 3. Verification

Ran grep search for `pb_module_tools_run_loop_is_active` in `pb_type_mdrobotbase.c`:
```text
pb_type_mdrobotbase.c:1059: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1161: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1262: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1516: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1589: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1883: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:1956: if (pb_module_tools_run_loop_is_active())
pb_type_mdrobotbase.c:2067: if (pb_module_tools_run_loop_is_active())
```

Ran test suite:
```bash
PYTHONPATH=code python3 -m pytest code/test_sample_color_navigation.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```
Output:
```text
============================== 15 passed in 1.00s ==============================
```
100% of all movement functions now contain `pb_module_tools_run_loop_is_active()` and dispatch native awaitable generators!
