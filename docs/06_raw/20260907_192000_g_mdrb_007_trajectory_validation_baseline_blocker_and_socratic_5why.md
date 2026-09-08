# 🏛️ G-MDRB-007 Baseline Blocker & Socratic 5-Why Recursive Dialectic Report

**Timestamp:** `2026-09-07T19:20:00+07:00`  
**Goal:** `G-MDRB-007` (Trajectory and Controller Input Validation)  
**Epic:** `MDRB` (MDRobotBase Production Hardening)  
**Exact-HEAD Provenance:** `0582aefe38928ed3fe7456775dc5784a901bd28b`  
**Active Branch:** `feature/mdrobotbase-enhancement`  
**PR Target:** `epic/MDRB`  
**Constitution Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass), Article III (Structured Explanation Standard)

---

## 1. Executive Summary & Baseline Freeze

Before applying any code mutations for `G-MDRB-007`, the baseline state was frozen and interrogated using the dedicated Socratic Agentic Dialectic Harness [`scripts/harness/socratic-agentic-loop-g-mdrb-007-harness.mjs`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/scripts/harness/socratic-agentic-loop-g-mdrb-007-harness.mjs).

The baseline interrogation revealed **11 failing causal nodes out of 25** across 5 dialectic branches (**14 Passed, 11 Failed**). This report establishes the empirical baseline, records the primary replication blockers, and traces each defect through Level 5 recursive 5-Why analysis.

```
================================================================================
📊 Baseline Socratic Summary: 14 Passed, 11 Failed (Total: 25)
================================================================================
Branch 1 (Capacity Limits):         3 Passed, 2 Failed  [L2, L5 failed]
Branch 2 (Tuple Dimensionality):    1 Passed, 4 Failed  [L2, L3, L4, L5 failed]
Branch 3 (Coordinates & Dynamics):  2 Passed, 3 Failed  [L2, L3, L5 failed]
Branch 4 (Controller Enums):        5 Passed, 0 Failed  [Passed contract checks, needs enum guard]
Branch 5 (Negative Test Suite):     3 Passed, 2 Failed  [L4, L5 failed]
```

---

## 2. Replication Blockers & Root Cause Analysis

### Blocker 1: Silent Trajectory Truncation at Maximum Capacity
- **Location:** `pybricks/robotics/pb_type_mdrobotbase.c:1811-1813`
- **Observed Behavior:**
  ```c
  if (num_points > 64) {
      num_points = 64;
  }
  ```
- **Consequence:** If an autonomous robot path planner sends 65 or 100 points, points beyond index 63 are discarded silently without error. The robot stops short of its destination or fails to complete its mission without throwing an exception.
- **Fail-Closed Remedy:** Replace clamping with an immediate Python exception:
  ```c
  if (num_points > 64) {
      mp_raise_ValueError("trajectory exceeds maximum capacity of 64 points");
  }
  ```

### Blocker 2: Memory Fault on Malformed Waypoint Tuples (`p_len < 2`)
- **Location:** `pybricks/robotics/pb_type_mdrobotbase.c:1844-1850`
- **Observed Behavior:**
  ```c
  for (size_t i = 0; i < num_points; i++) {
      size_t p_len;
      mp_obj_t *p_coords;
      mp_obj_get_array(points[i], &p_len, &p_coords);
      self->rb->trajectory_points_x[i] = mp_obj_get_float(p_coords[0]);
      self->rb->trajectory_points_y[i] = mp_obj_get_float(p_coords[1]);
  }
  ```
- **Consequence:** If a user passes a 1-element tuple `[(100,)]` or an empty tuple `[()]`, `p_coords[1]` indexes beyond allocated memory bounds, inducing undefined behavior or a hard memory crash on embedded microcontrollers.
- **Fail-Closed Remedy:** Guard `p_len < 2` prior to indexing:
  ```c
  if (p_len < 2) {
      mp_raise_ValueError("trajectory point must have at least (x, y) coordinates");
  }
  ```

### Blocker 3: Acceptance of Degenerate 0-point or 1-point Trajectories
- **Location:** `pybricks/robotics/pb_type_mdrobotbase.c:1807-1809`
- **Observed Behavior:**
  ```c
  if (num_points == 0) {
      return mp_const_none;
  }
  ```
- **Consequence:** A 0-point trajectory silently returns `None` without queuing motion. A 1-point trajectory is accepted, but kinematics cannot compute direction/segment vectors without at least two points (origin and target).
- **Fail-Closed Remedy:**
  ```c
  if (num_points < 2) {
      mp_raise_ValueError("trajectory requires at least 2 points");
  }
  ```

### Blocker 4: Unchecked Float Finiteness and Positivity
- **Location:** `pybricks/robotics/pb_type_mdrobotbase.c:1815-1850`
- **Observed Behavior:** `speed`, `tolerance`, `transition_tolerance`, and coordinates `px, py` are cast to float without finiteness (`isfinite`) or positive range assertions.
- **Consequence:** Passing `float('nan')` or `float('inf')` or negative tolerances causes runaway motor loops, division by zero, or negative distance thresholds.
- **Fail-Closed Remedy:** Verify `isfinite()` for all coordinates and ensure `speed > 0.0f`, `tolerance > 0.0f`, `transition_tolerance > 0.0f`.

### Blocker 5: Unvalidated Controller Enum Values
- **Location:** `lib/pbio/src/mdrobotbase.c:228-234`
- **Observed Behavior:**
  ```c
  pbio_error_t pbio_mdrobotbase_set_controller(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_controller_t type) {
      if (!rb) {
          return PBIO_ERROR_INVALID_ARG;
      }
      rb->controller_type = type;
      return PBIO_SUCCESS;
  }
  ```
- **Consequence:** Passing invalid integer values like `99` or `-1` sets `rb->controller_type` to an unknown value, causing default or unhandled branches in trajectory controller execution.
- **Fail-Closed Remedy:** Reject unknown types with `PBIO_ERROR_INVALID_ARG`:
  ```c
  if (type != PBIO_MDROBOTBASE_CONTROLLER_PID && type != PBIO_MDROBOTBASE_CONTROLLER_LQR) {
      return PBIO_ERROR_INVALID_ARG;
  }
  ```

---

## 3. Five-Why Recursive Dialectic by Branch

### 🌿 Branch 1: Trajectory Capacity Limits & Fail-Closed Array Sizing
- **Why 1:** Why does passing > 64 points cause silent path corruption?  
  *Finding:* Clamping `num_points = 64` discards all user points from index 64 onwards without error.
- **Why 2:** Why did legacy code clamp rather than reject?  
  *Finding:* Permissive embedded programming assumed executing a prefix was better than crashing.
- **Why 3:** Why is partial execution hazardous for robotics?  
  *Finding:* An autonomous robot executing only the first half of a path will stop in an obstacle zone or miss the target completely without raising an alarm.
- **Why 4:** Why is 64 points the hard limit in PBIO?  
  *Finding:* Static arrays of size 64 prevent dynamic heap allocation and deterministic memory usage on Cortex-M microcontrollers.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* The API boundary MUST fail-closed at runtime with `mp_raise_ValueError("trajectory exceeds maximum capacity of 64 points")`.

### 🌿 Branch 2: Waypoint Tuple Dimensionality & Out-of-Bounds Memory Safety
- **Why 1:** Why does passing `[(100,)]` cause memory faults?  
  *Finding:* The coordinate unpacking assumes `p_coords[1]` always exists without checking `p_len`.
- **Why 2:** Why did legacy code omit `p_len` checking?  
  *Finding:* Expected idiomatic Python usage without verifying input types defensively.
- **Why 3:** Why can malformed tuples enter the C binding?  
  *Finding:* Dynamic Python scripts in WRO competitions may generate variable-length tuple outputs from sensor filters.
- **Why 4:** Why is `num_points < 2` invalid?  
  *Finding:* A path trajectory requires at least a starting waypoint and an ending waypoint. Single points are in-place goals, not trajectories.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Enforce `p_len >= 2` for every point and `num_points >= 2` overall before modifying internal robot buffers.

### 🌿 Branch 3: Coordinate Finiteness & Dynamic Parameter Positivity
- **Why 1:** Why do NaN or Inf coordinates cause runaway motor states?  
  *Finding:* IEEE 754 NaN propagates through trigonometric atan2 and distance math, corrupting motor PWM outputs.
- **Why 2:** Why must coordinates be checked for finiteness?  
  *Finding:* Upstream calculations (such as computer vision or math operations) can produce NaN or Inf.
- **Why 3:** Why must tolerances be strictly positive?  
  *Finding:* A tolerance of 0 or negative causes the trajectory follower to never reach waypoint completion.
- **Why 4:** Why must speed be strictly positive?  
  *Finding:* Zero or negative speed creates divide-by-zero or reverse direction conflicts in trajectory velocity profiling.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Assert `isfinite(px) && isfinite(py)`, `speed > 0.0f && isfinite(speed)`, `tolerance > 0.0f && isfinite(tolerance)`, and `transition_tolerance > 0.0f && isfinite(transition_tolerance)`.

### 🌿 Branch 4: Controller Enum Range Guard & Unhandled Switch Protection
- **Why 1:** Why does `set_controller(99)` produce unhandled behavior?  
  *Finding:* Arbitrary enum values fall through trajectory control dispatchers.
- **Why 2:** Why did `pbio_mdrobotbase_set_controller` omit enum checks?  
  *Finding:* C enum parameters can be assigned any integer value without compiler warnings if cast.
- **Why 3:** Why is PID vs LQR selection critical?  
  *Finding:* Trajectory following requires distinct state error formulations (error-pose PID vs Riccati algebraic matrix).
- **Why 4:** Why must invalid enums return `PBIO_ERROR_INVALID_ARG`?  
  *Finding:* PBIO error conventions dictate invalid argument errors for out-of-range enumerations.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Validate `type == PBIO_MDROBOTBASE_CONTROLLER_PID || type == PBIO_MDROBOTBASE_CONTROLLER_LQR` before mutating `rb->controller_type`.

### 🌿 Branch 5: Negative Input Test Suite & Zero Side-Effect Guarantee
- **Why 1:** Why are mock test doubles prohibited when testing input validation?  
  *Finding:* Article I mandates zero mocks. Mocks hide real struct memory layouts and out-of-bounds reads.
- **Why 2:** Why must negative tests verify zero motor command side effects?  
  *Finding:* Rejected trajectories must not alter motor targets or corrupt odometry state.
- **Why 3:** Why must native PBIO test binary run without skips?  
  *Finding:* Real C unit tests in `test-pbio` verify driver invariants directly on host architecture.
- **Why 4:** Why is `test_mdrobotbase_trajectory_controller_validation` required?  
  *Finding:* Concrete test cases are needed to verify invalid controller enums and gain boundaries.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Implement `test_mdrobotbase_trajectory_controller_validation()` in `lib/pbio/test/src/test_mdrobotbase.c` bringing the total passing suite to 10/10 tests.

---

## 4. Next Actions
1. Implement fail-closed validation in `pybricks/robotics/pb_type_mdrobotbase.c`.
2. Implement enum and gain validation in `lib/pbio/src/mdrobotbase.c`.
3. Add `test_mdrobotbase_trajectory_controller_validation()` in `lib/pbio/test/src/test_mdrobotbase.c`.
4. Run native C test runner and verify 10/10 tests passing.
5. Re-run Socratic dialectic harness to achieve 25/25 nodes (100% root convergence).
6. Build and execute master replication release gate runner.
