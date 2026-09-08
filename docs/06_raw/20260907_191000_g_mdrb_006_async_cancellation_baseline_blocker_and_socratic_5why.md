# G-MDRB-006: Async Cancellation & Lifecycle Safety Socratic 5-Why Dialectic & Baseline Blocker Report

**Document ID:** `docs/06_raw/20260907_191000_g_mdrb_006_async_cancellation_baseline_blocker_and_socratic_5why.md`  
**Timestamp:** `2026-09-07T19:10:00+07:00`  
**Goal:** [G-MDRB-006: Async Cancellation and Repeated-Motion Lifecycle Safety](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-006.md)  
**Epic:** [MDRB](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/epics/MDRB.md)  
**Base Integration Target:** `epic/MDRB`  
**Working Feature Branch:** `feature/mdrobotbase-enhancement`  
**Git Exact-HEAD SHA:** `0582aefe38928ed3fe7456775dc5784a901bd28b`  
**Status:** Baseline Blocker Frozen (12 Passed, 13 Failed across 25 Causal Dialectic Nodes)  

---

## 1. Executive Summary & Replication Blocker Identification

During the baseline evaluation of Goal **G-MDRB-006**, the automated Socratic Dialectic Harness ([`scripts/harness/socratic-agentic-loop-g-mdrb-006-harness.mjs`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/scripts/harness/socratic-agentic-loop-g-mdrb-006-harness.mjs)) intercepted **13 causal defects** across all 5 architectural branches.

### 🚨 Primary Replication Blocker
In [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c):
1. **Unchecked Dereference in `stop()`:** `pb_type_MDRobotBase_stop()` unconditionally calls `pb_type_async_schedule_stop_iteration(self->last_awaitable)` without checking `if (self->last_awaitable)`. If an idle robot is stopped, `self->last_awaitable` is `NULL`, triggering an immediate invalid memory access or undefined behavior.
2. **Missing Preemption Protocol:** When a new motion command (e.g. `turn_angle`) is invoked while a motion (e.g. `go_straight`) is in progress, the code overwrites `self->rb->motion_type` without canceling the previous motion or stopping its actuators. The previous awaitable remains registered in `self->last_awaitable` and continues to be polled by the MicroPython cooperative event loop, interleaving motor setpoints and corrupting odometry.
3. **No Inactive Motion Guard in Iterator:** `pb_type_mdrobotbase_motion_iterate_once()` lacks an early-exit check for `!self->rb->motion_in_progress`. Consequently, cancelled or completed generators continue to execute odometry math and dispatch motor PWM commands upon subsequent polling ticks.

---

## 2. Recursive 5-Why Socratic Dialectic Analysis (5 Branches $\times$ 5 Levels)

### 🌿 Branch 1: Active Motion Preemption Mechanics & Command Overwrite Safety
- **Level 1 (Direct Symptom):** Why does launching motion B while motion A is active risk collisions and motor pulse interleaving?  
  *Finding:* Overwriting `self->rb->motion_type` without preemption leaves old awaitables polling in parallel, competing for motor control.
- **Level 2 (First-Order Mechanism):** Why did legacy dispatchers fail to terminate running motions?  
  *Finding:* No centralized preemption helper (`pb_type_mdrobotbase_cancel_active_motion`) was invoked prior to configuring and launching new motion setpoints.
- **Level 3 (Second-Order Coupling):** Why must the preemption helper schedule stop iteration on `self->last_awaitable`?  
  *Finding:* The MicroPython cooperative poller requires explicit stop iteration signaling via `pb_type_async_schedule_stop_iteration` to cleanly close generator coroutines.
- **Level 4 (Architectural Scope):** Why must preemption be invoked across all motion dispatchers?  
  *Finding:* Any motion command (`straight`, `turn`, `pivot`, `trajectory`) can interrupt an active one during multi-step autonomous sequencing.
- **Level 5 (Root Invariant):** How is active motion preemption fully enforced without mocks or stubs?  
  *Root Resolution:* Implement `pb_type_mdrobotbase_cancel_active_motion(self)` in C and invoke it at the entrypoint of every motion dispatcher, guaranteeing that any active motion is synchronously signaled to terminate, motors are stopped, and flags are cleared.

---

### 🌿 Branch 2: Safe Stop & NULL Awaitable Guards
- **Level 1 (Direct Symptom):** Why does calling `stop()` on an idle robot base risk memory faults?  
  *Finding:* Dereferencing `self->last_awaitable` when no motion is active passes `NULL` into `pb_type_async_schedule_stop_iteration`.
- **Level 2 (First-Order Mechanism):** Why was `self->last_awaitable` not guarded in `pb_type_MDRobotBase_stop()`?  
  *Finding:* The legacy code assumed `stop()` is only invoked by user code when a motion is actively running.
- **Level 3 (Second-Order Coupling):** Why must `self->last_awaitable` be reset to `NULL` upon stop?  
  *Finding:* Failing to zero `self->last_awaitable` creates dangling pointer reuse on subsequent `stop()` invocations or garbage collection passes.
- **Level 4 (Architectural Scope):** Why must calling `stop()` be idempotent?  
  *Finding:* Defensive programming in user scripts frequently calls `robot.stop()` in `finally:` blocks or setup loops; invoking `stop()` on an already stopped robot must be a safe no-op.
- **Level 5 (Root Invariant):** How is safe stop idempotence guaranteed?  
  *Root Resolution:* Strictly guard `if (self->last_awaitable)` before scheduling stop iteration, reset `self->last_awaitable = NULL`, and command motors using configured `stop_behavior`.

---

### 🌿 Branch 3: Cooperative Task Polling & Post-Abort Iteration Suppression
- **Level 1 (Direct Symptom):** Why do canceled or completed awaitables continue to execute if polled again by the MicroPython scheduler?  
  *Finding:* Cooperative event loop turns can invoke queued generators before processing asynchronous stop signals.
- **Level 2 (First-Order Mechanism):** Why did `pb_type_mdrobotbase_motion_iterate_once()` lack an inactive motion guard?  
  *Finding:* The iterator function assumed that if called, `motion_in_progress` is implicitly true.
- **Level 3 (Second-Order Coupling):** Why must an inactive motion immediately return `PBIO_SUCCESS`?  
  *Finding:* Returning `PBIO_SUCCESS` signals the MicroPython awaitable harness to raise `StopIteration` immediately and purge the generator from the task queue.
- **Level 4 (Architectural Scope):** Why must this immediate exit bypass all odometry and motor setpoint logic?  
  *Finding:* If odometry state updates or motor PWM calculations run after abort, stale coordinates and spurious wheel pulses pollute robot localization.
- **Level 5 (Root Invariant):** How is post-abort iteration cleanly suppressed?  
  *Root Resolution:* Insert `if (!self->rb->motion_in_progress) { self->last_awaitable = NULL; return PBIO_SUCCESS; }` at the very top of `pb_type_mdrobotbase_motion_iterate_once()`.

---

### 🌿 Branch 4: Stop Behavior Decoupling Across All Termination Paths
- **Level 1 (Direct Symptom):** Why was `stop()` hardcoded to `HOLD` instead of configured `stop_behavior`?  
  *Finding:* Legacy implementation called `pbio_servo_stop(..., PBIO_CONTROL_ON_COMPLETION_HOLD)`, ignoring user-specified `COAST` or `BRAKE` settings.
- **Level 2 (First-Order Mechanism):** Why must `stop_behavior` be respected across normal completion, cancellation, stop(), timeout, and stall?  
  *Finding:* Physical competition attachments require specific deceleration curves (e.g. coasting to prevent gear stripping vs holding position for accurate game-piece placement).
- **Level 3 (Second-Order Coupling):** Why must motor angles be reset when not coasting?  
  *Finding:* Leaving motor angles unreset causes the low-level `pbio_servo` PID position controller to accumulate angular errors and produce sudden kickbacks when resumed.
- **Level 4 (Architectural Scope):** Why must motion flags be cleared atomically on stop?  
  *Finding:* Setting `motion_type = NONE` and `motion_in_progress = false` prevents race conditions between timer interrupts and background threads.
- **Level 5 (Root Invariant):** How is stop behavior decoupled and unified across all termination paths?  
  *Root Resolution:* Implement unified motor stopping using `pbio_servo_stop(..., self->rb->stop_behavior)` and conditional angle resetting across all abort paths.

---

### 🌿 Branch 5: Multi-Motion Lifecycle Sequence Verification & Native Testing Pass
- **Level 1 (Direct Symptom):** Why are mock test doubles prohibited when testing asynchronous motion lifecycles?  
  *Finding:* Mocks replace the real cooperative scheduler and C state machine with trivial return values, concealing race conditions.
- **Level 2 (First-Order Mechanism):** Why must all 6 canonical lifecycle transitions be verified?  
  *Finding:* Real autonomous programs chain motions through start, stop, cancel, timeout, stall, and rapid preemption.
- **Level 3 (Second-Order Coupling):** How does `test_mdrobotbase_lifecycle_safety()` test preemption and idle stopping in C?  
  *Finding:* By exercising `pbio_mdrobotbase_motion_reset()`, state transitions, and flag validation under sequential and preemptive conditions.
- **Level 4 (Architectural Scope):** Why must the native PBIO test binary compile and pass all tests with zero skipped?  
  *Finding:* Article II mandatory verification pass requires concrete execution evidence.
- **Level 5 (Root Invariant):** How is the lifecycle suite fully certified?  
  *Root Resolution:* Write and execute `test_mdrobotbase_lifecycle_safety()` in `lib/pbio/test/src/test_mdrobotbase.c`, verifying that all 9 native tests pass with 0 skipped.

---

## 3. Baseline Socratic Verification Matrix

| Branch ID | Architectural Topic | Passed Checks | Failed Checks | Baseline Convergence Status |
|:---:|---|:---:|:---:|:---:|
| **Branch 1** | Active Motion Preemption Mechanics | 2 | 3 | ⚠️ Blocking (No preemption helper) |
| **Branch 2** | Safe Stop & NULL Awaitable Guards | 2 | 3 | ⚠️ Blocking (Unguarded last_awaitable) |
| **Branch 3** | Cooperative Task Polling & Post-Abort Suppression | 1 | 4 | ⚠️ Blocking (No inactive motion check) |
| **Branch 4** | Stop Behavior Decoupling Across Termination Paths | 4 | 1 | ⚠️ Blocking (Preemption stop behavior) |
| **Branch 5** | Multi-Motion Lifecycle Sequence Verification | 3 | 2 | ⚠️ Blocking (Missing native test) |
| **TOTAL** | **Comprehensive Baseline Dialectic** | **12** | **13** | ❌ **13 Defects Blocking Baseline** |

---

## 4. Remediation Plan

1. **Step 1 (MicroPython Binding Preemption):**
   - In `pybricks/robotics/pb_type_mdrobotbase.c`:
     - Implement `pb_type_mdrobotbase_cancel_active_motion(pb_type_MDRobotBase_obj_t *self)`.
     - Call `pb_type_mdrobotbase_cancel_active_motion(self)` at the top of `straight`, `turn`, `pivot`, and `trajectory`.
2. **Step 2 (Safe Stop & Inactive Iteration Guard):**
   - In `pb_type_MDRobotBase_stop()`:
     - Guard `if (self->last_awaitable) { pb_type_async_schedule_stop_iteration(self->last_awaitable); self->last_awaitable = NULL; }`.
     - Stop motors using `self->rb->stop_behavior` and reset angles if not coasting.
   - In `pb_type_mdrobotbase_motion_iterate_once()`:
     - Guard `if (!self->rb->motion_in_progress) { self->last_awaitable = NULL; return PBIO_SUCCESS; }` at entry before odometry.
3. **Step 3 (Native PBIO C Lifecycle Test):**
   - In `lib/pbio/test/src/test_mdrobotbase.c`:
     - Implement `test_mdrobotbase_lifecycle_safety()` testing idle stop, preemption, and all 6 lifecycle transitions.
     - Compile and run `./lib/pbio/test/build/test-pbio src/mdrobotbase/..` (9/9 tests ok, 0 skipped).
4. **Step 4 (Master Replication Runner):**
   - Construct `scripts/harness/master-replication-g-mdrb-006.mjs` verifying exact-HEAD provenance, 5 isolated mutation tests, 10 kernel episodes, and full acceptance traceability.
