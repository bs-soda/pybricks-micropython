# Baseline Blocker & Socratic 5-Why Recursive Dialectic Report: G-MDRB-012

**Timestamp:** `2026-09-08T14:10:00+07:00`
**Goal:** `G-MDRB-012` (Closed-Object Guarding & Idempotent Destructor Safety)
**Epic:** `MDRB`
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariant:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Executive Summary & Baseline Replication Blocker

In `pybricks/robotics/pb_type_mdrobotbase.c`:
1. `pb_type_MDRobotBase_close()` at lines 2201-2207 releases native resources via `pbio_mdrobotbase_put_robotbase()` and sets `self->rb = NULL`.
2. However, public methods (e.g. `get_state`, `navigate_to_goal`, `turn_angle`, `set_pid_gains`, `set_gear_ratio`, `set_wheel_diameters`, etc.) do not verify `self->rb != NULL` before dereferencing `self->rb->...`.
3. Meanwhile, query methods `stalled()`, `done()`, and `status()` silently return fallback values (`false`, `true`, `NONE`) when `self->rb == NULL` via ternary operators, hiding use-after-close bugs rather than raising exceptions.

### Replication Blocker Demonstration
1. Instantiate robot: `robot = MDRobotBase(left, right, 56.0, 112.0)`
2. Explicitly close device: `robot.close()`
3. Call `robot.get_state()` -> **Segmentation fault / NULL pointer dereference crash (`EXC_BAD_ACCESS`)**.
4. Alternatively, calling `robot.stalled()` or `robot.done()` returns `False` / `True` instead of raising expected `RuntimeError("MDRobotBase is closed")`.

---

## 2. Five-Why Recursive Dialectic (5 Distinct Branches x 5 Levels)

### 🌿 Branch 1: Centralized Guard Architecture (`require_open`)
- **Level 1 (Direct Symptom):** Why does calling `get_state()` on a closed instance crash?
  *Finding:* Line 945 accesses `self->rb->x` unconditionally when `self->rb` is `NULL`.
- **Level 2 (Omission Cause):** Why was null checking missing across methods?
  *Finding:* The original authors wrote methods assuming `self->rb` is perpetually valid while the Python object exists.
- **Level 3 (Architecture Flaw):** Why are ad-hoc null checks insufficient?
  *Finding:* Ad-hoc checks lead to inconsistency in error messaging and missed method paths; a centralized helper is required.
- **Level 4 (Centralized Design):** How does `require_open` resolve this?
  *Finding:* Defining `pb_type_mdrobotbase_require_open(self)` that checks `self->rb` and immediately calls `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("MDRobotBase is closed"))`.
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified without mocks?
  *Root Resolution:* Implement `require_open` and call it at the preamble of every public method, verified by static AST and runtime tests.

### 🌿 Branch 2: Status & Inspection Queries on Closed Objects
- **Level 1 (Direct Symptom):** Why do `stalled()`, `done()`, and `status()` return values when closed?
  *Finding:* Lines 2215, 2223, and 2231 contain ternary checks `self->rb ? ... : fallback`.
- **Level 2 (Silent Failure Danger):** Why is returning fallback values dangerous?
  *Finding:* Returning `done() == True` or `stalled() == False` tricks autonomous state machines into believing the robot is healthy and ready.
- **Level 3 (Contract Invariant):** What is the required behavior for closed handles?
  *Finding:* All interactions with a closed handle except `close()` must raise `RuntimeError`.
- **Level 4 (Refactoring Plan):** How should queries be refactored?
  *Finding:* Replace ternary fallback logic with `require_open(self)` followed by direct struct field access.
- **Level 5 (Root Resolution & Concrete Verification):** How is this tested without test doubles?
  *Root Resolution:* Invoke `stalled()`, `done()`, and `status()` on closed instances in tests and assert `RuntimeError`.

### 🌿 Branch 3: Destructor & Close Idempotence Invariant
- **Level 1 (Direct Symptom):** Why must `close()` be idempotent?
  *Finding:* Python resource cleanup occurs via explicit `.close()`, context managers, and finalizer `__del__`.
- **Level 2 (Re-entrant Risk):** What happens if `close()` is called twice?
  *Finding:* If `self->rb` is already `NULL`, calling `pbio_mdrobotbase_put_robotbase(NULL)` would cause an assertion failure or crash in the driver.
- **Level 3 (Guard Check):** How does `close()` handle an already-closed instance?
  *Finding:* Guarding with `if (self->rb)` ensures subsequent calls exit cleanly and return `mp_const_none`.
- **Level 4 (Return Value):** Why does `close()` return `None`?
  *Finding:* Python standards dictate that `.close()` is idempotent and returns `None`.
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified?
  *Root Resolution:* Add double `close()` test asserting exit code 0 and `None` return.

### 🌿 Branch 4: Active Motion Cancellation upon Close
- **Level 1 (Direct Symptom):** What happens if `close()` is called while a motion is running?
  *Finding:* Without motion cancellation, physical motors remain driving after driver slot release.
- **Level 2 (Driver Separation):** Why is slot release without motor stop hazardous?
  *Finding:* The motor slot in `mdrobotbase_pool` is marked free, allowing another drivebase to claim it while motors are still moving.
- **Level 3 (Lifecycle Sequencing):** What is the correct teardown order in `close()`?
  *Finding:* First call `cancel_active_motion(self)` (which halts motors and cancels awaitable), then `pbio_mdrobotbase_put_robotbase(self->rb)`, then set `self->rb = NULL`.
- **Level 4 (Stop Behavior Contract):** What stop behavior is applied?
  *Finding:* `cancel_active_motion` honors `self->rb->stop_behavior` (`HOLD`/`BRAKE`/`COAST`).
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified?
  *Root Resolution:* Call `close()` during active straight motion and assert motor controllers stop cleanly.

### 🌿 Branch 5: Regression Coverage & Exact-HEAD Provenance
- **Level 1 (Direct Symptom):** Why must automated regression tests verify closed handle safety?
  *Finding:* Static analysis alone does not exercise MicroPython exception dispatch or virtualhub motor state.
- **Level 2 (Article I Invariant):** Why are mocks forbidden?
  *Finding:* Mocks cannot catch C segmentation faults or verify real pointer nullability.
- **Level 3 (Test Realism):** How do tests verify the full lifecycle?
  *Finding:* Tests instantiate a real `MDRobotBase`, close it, and exercise all method categories.
- **Level 4 (Harness Construction):** What harnesses gate the release?
  *Finding:* Socratic agentic loop harness (25 nodes) and master replication harness (24 gates).
- **Level 5 (Root Resolution & Concrete Verification):** What is the convergence proof?
  *Root Resolution:* 100% dialectic resolution and 100% release gate attestation.

---

## 3. Implementation Plan & Mutation Map

1. **`pybricks/robotics/pb_type_mdrobotbase.c`**:
   - Define `static inline pbio_mdrobotbase_t *pb_type_mdrobotbase_require_open(pb_type_MDRobotBase_obj_t *self)`.
   - Update `pb_type_MDRobotBase_close`: ensure `cancel_active_motion` is called when `self->rb != NULL`.
   - Refactor `stalled`, `done`, `status` to use `require_open`.
   - Add `require_open` to all public methods: `get_state`, `set_pid_gains`, `get_pid_gains`, `set_lqr_gains`, `get_lqr_gains`, `set_controller`, `get_controller`, `set_turn_pid_gains`, `get_turn_pid_gains`, `set_pivot_pid_gains`, `get_pivot_pid_gains`, `reset_state`, `update_state`, `set_fusion_alpha`, `get_fusion_alpha`, `set_gear_ratio`, `get_gear_ratio`, `navigate_to_goal`, `turn_to_angle`, `pivot_turn_to_angle`, `follow_trajectory`, `set_backlash_filter`, `get_backlash_filter`, `set_backlash_limits`, `get_backlash_limits`, `set_max_angular_speed`, `get_max_angular_speed`, `set_max_turn_speed`, `get_max_turn_speed`, `set_max_pivot_speed`, `get_max_pivot_speed`, `set_pid_min_turn`, `get_pid_min_turn`, `set_wheel_diameters`, `get_wheel_diameters`, `reset_color_calibration`, `set_color_baseline`, `set_color_threshold`, `add_color_prototype`, `classify_color`.
2. **`tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`**:
   - Add `test_closed_handle_guarding()` verifying `RuntimeError` on closed calls and idempotent double `close()`.
