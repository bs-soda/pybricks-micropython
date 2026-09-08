# Baseline Blocker & Socratic 5-Why Recursive Dialectic Report: G-MDRB-011

**Timestamp:** `2026-09-08T14:00:00+07:00`  
**Goal:** `G-MDRB-011` (Validate-Before-Cancel Motion Lifecycle & Preemption Safety)  
**Epic:** `MDRB`  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariant:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Executive Summary & Baseline Replication Blocker

In `pybricks/robotics/pb_type_mdrobotbase.c` at lines 1008-1009 (`navigate_to_goal`), 1402-1403 (`turn_to_angle`), 1556-1557 (`pivot_turn_to_angle`), and 1734-1735 (`follow_trajectory`), the motion dispatch C functions invoke:
```c
pb_type_mdrobotbase_cancel_active_motion(self);
pbio_mdrobotbase_motion_reset(self->rb);
```
at the preamble of the function, before `mp_arg_parse_all` or argument conversion and parameter bounds validation are performed.

### Replication Blocker Demonstration
1. A background straight motion is started: `task = run_task(robot.straight(1000, speed_mm_s=200))`
2. An invalid preemption attempt is dispatched: `robot.navigate_to_goal("invalid_coord", 0)` or `robot.turn_angle(float('nan'))`.
3. User code catches the expected `TypeError` or `ValueError`.
4. **Failure observed:** The robot stops prematurely in the middle of motion A because `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)` were executed prior to argument validation failing.

This violates transactional integrity and the Two-Phase Commit state transition invariant:
$$\text{Transition}(S_1 \to S_2) \iff \text{Valid}(P_{\text{new}})$$

---

## 2. Five-Why Recursive Dialectic (5 Distinct Branches x 5 Levels)

### 🌿 Branch 1: Transactional Parse-and-Validate Precedence Over Cancellation
- **Level 1 (Direct Symptom):** Why does calling `navigate_to_goal` with invalid arguments abort the running robot?  
  *Finding:* Lines 1008-1009 call `cancel_active_motion` and `motion_reset` before `mp_arg_parse_all` (line 1030).
- **Level 2 (Preamble Bias):** Why was cancellation placed at the preamble of the C function?  
  *Finding:* The legacy author assumed that any invocation of a motion method implied intention to preempt, neglecting that arguments could be syntactically or semantically malformed.
- **Level 3 (Transaction Failure):** Why does preamble cancellation violate transaction safety?  
  *Finding:* MicroPython argument parsing errors trigger a longjmp exception (`nlr_jump`). Once cancellation has occurred, the active motion state cannot be rolled back.
- **Level 4 (Two-Phase Commit Design):** How does deferring cancellation guarantee isolation?  
  *Finding:* In Phase 1 (Prepare), arguments are parsed into local variables and validated. In Phase 2 (Commit), old motion is cancelled and new motion initialized.
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified without mocks?  
  *Root Resolution:* Reorder `pb_type_mdrobotbase_cancel_active_motion` and `pbio_mdrobotbase_motion_reset` to execute strictly after all arguments and parameters have been validated.

### 🌿 Branch 2: Angular & Velocity Bounds Validation in Turn Operations
- **Level 1 (Direct Symptom):** Why must `turn_to_angle` and `turn_angle` validate `isfinite(target_angle)` and `speed_deg_s` before cancelling?  
  *Finding:* Non-finite numbers (`NaN`, `Inf`) corrupt trigonometric calculations and motion profile planning, leaving motor controllers in an undefined state.
- **Level 2 (IEEE 754 Floating-Point Pitfall):** Why do non-finite numbers pass basic MicroPython type checks?  
  *Finding:* `mp_obj_get_float` succeeds on `nan` and `inf` because they are valid IEEE 754 floating-point representations; explicit `isfinite()` guards are mandatory.
- **Level 3 (Motor Controller Requirement):** Why must `ValueError` be raised rather than proceeding?  
  *Finding:* PBIO motor trajectory planners require real numbers to calculate acceleration and deceleration angles.
- **Level 4 (Ordering Invariant):** How does validation sequencing prevent motor stoppage?  
  *Finding:* `isfinite(target_angle)` and `speed_deg_s > 0` checks are performed before `cancel_active_motion`.
- **Level 5 (Root Resolution & Concrete Verification):** How is non-cancelling rejection verified?  
  *Root Resolution:* Insert `isfinite` checks after argument parsing and defer cancellation until all numerical parameters pass.

### 🌿 Branch 3: Pivot Turn Parameter Validation & Side Specification
- **Level 1 (Direct Symptom):** Why must `pivot_turn_to_angle` and `pivot_turn_angle` validate arguments before cancellation?  
  *Finding:* A malformed `pivot_side` or non-finite angle aborts the active drivebase motion while failing to start the pivot.
- **Level 2 (Asymmetric Motor Kinematics):** Why is preamble cancellation particularly problematic for pivot turns?  
  *Finding:* Pivot turns command one wheel to stop while driving the opposite wheel; resetting motion prematurely results in abrupt motor deceleration before discovering the command is invalid.
- **Level 3 (Two-Phase Verification):** What parameters must be verified prior to cancellation?  
  *Finding:* `target_angle` (finite), `speed_deg_s` (finite, positive), `accel_angle`, `decel_angle`, and `pivot_side` string.
- **Level 4 (Zero Side-Effects Guard):** How is zero motor command emission guaranteed?  
  *Finding:* The motor controller `left` and `right` handles are not touched if any parameter check fails.
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified without mocks?  
  *Root Resolution:* Structure pivot turn functions with Phase 1 parameter parsing/validation and Phase 2 cancellation and state commit.

### 🌿 Branch 4: Trajectory Buffer Atomicity & Multi-Point Coordinate Pre-validation
- **Level 1 (Direct Symptom):** Why is preamble cancellation dangerous in `follow_trajectory`?  
  *Finding:* Trajectories consist of complex arrays of coordinate tuples. Cancelling active motion before checking all points causes the robot to abort if even the last point is malformed.
- **Level 2 (Buffer Corruption Risk):** Why did the original code write directly to `self->rb->trajectory_points_x` during validation?  
  *Finding:* Lines 1820-1834 wrote coordinates to `self->rb` inside the loop that checked for `isfinite`. A failure on point $k$ left corrupted data in the first $k-1$ slots of `self->rb`.
- **Level 3 (Two-Phase Trajectory Buffering):** How must trajectory validation be structured?  
  *Finding:* Validate array length ($2 \le n \le 64$), each point tuple length ($\ge 2$), and coordinates (`isfinite(px) && isfinite(py)`) into a local stack buffer `float temp_x[64]`, `float temp_y[64]`.
- **Level 4 (Atomic Commit):** When should cancellation and copy happen?  
  *Finding:* Only after all points, speeds, accelerations, and tolerances pass validation, invoke `cancel_active_motion`, `motion_reset`, and copy points to `self->rb`.
- **Level 5 (Root Resolution & Concrete Verification):** How is this verified without mocks?  
  *Root Resolution:* Implement local array validation in `follow_trajectory`, moving cancellation below the loop and ensuring zero buffer mutation on error.

### 🌿 Branch 5: Non-Interference Regression Coverage & Exact-HEAD Provenance
- **Level 1 (Direct Symptom):** Why must automated tests enforce non-cancellation?  
  *Finding:* Static code analysis alone cannot detect runtime side effects or ensure that background MicroPython coroutines continue iterating.
- **Level 2 (Test Realism Contract):** Why are mocks and stubs forbidden by Article I?  
  *Finding:* Mocks fail to replicate MicroPython's `nlr_jump` exception handling, C stack unwinding, and PBIO servo state transitions.
- **Level 3 (Lifecycle State Verification):** How do tests verify the robot continues moving?  
  *Finding:* Tests start a background motion, dispatch an invalid motion catching the exception, and assert that the original motion finishes with `robot.done() == True`.
- **Level 4 (Regression Gate Construction):** What constitutes complete test coverage?  
  *Finding:* C unit tests in `lib/pbio/test/src/test_mdrobotbase.c` and Python regression tests in `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`.
- **Level 5 (Root Resolution & Concrete Verification):** What is the empirical convergence proof?  
  *Root Resolution:* Execute the Socratic agentic loop harness and master replication harness with 25/25 dialectic passes and 100% gate attestation.

---

## 3. Implementation Plan & Mutation Map

1. **`pb_type_MDRobotBase_navigate_to_goal`**:
   - Parse `allowed_args` with `mp_arg_parse_all`.
   - Validate `gx`, `gy`, `speed`, and `goal_theta_obj` (finite checks).
   - Only after validation passes, invoke `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)`.
2. **`pb_type_MDRobotBase_turn_to_angle`**:
   - Parse `allowed_args` with `mp_arg_parse_all`.
   - Validate `isfinite(target_angle)`, `isfinite(speed_deg_s)` (positive).
   - Only after validation passes, invoke `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)`.
3. **`pb_type_MDRobotBase_pivot_turn_to_angle`**:
   - Parse `allowed_args` with `mp_arg_parse_all`.
   - Validate `isfinite(target_angle)`, `isfinite(speed_deg_s)` (positive).
   - Only after validation passes, invoke `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)`.
4. **`pb_type_MDRobotBase_follow_trajectory`**:
   - Parse `allowed_args` with `mp_arg_parse_all`.
   - Validate `num_points >= 2 && num_points <= 64`.
   - Validate speeds, accelerations, tolerances (finite, positive).
   - Parse points into local stack buffer `float temp_x[64]`, `float temp_y[64]`.
   - Only after all points are verified finite, invoke `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)`.
   - Copy `temp_x`, `temp_y` into `self->rb->trajectory_points_x` and `y`.
5. **`tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`**:
   - Add test cases verifying invalid argument dispatch does not interrupt active motions.
