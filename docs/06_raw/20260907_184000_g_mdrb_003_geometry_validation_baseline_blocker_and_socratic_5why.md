# G-MDRB-003 Baseline Blocker & Socratic 5-Why Dialectic Report

**Timestamp:** 2026-09-07T18:40:00+07:00
**Goal:** G-MDRB-003 — Constructor and Parameter Geometry Validation
**Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
**Git Exact HEAD:** `0582aefe38928ed3fe7456775dc5784a901bd28b`
**Git Branch:** `feature/mdrobotbase-enhancement`
**Author:** Antigravity AI (Pair Programming)
**Status:** BASELINE FROZEN (0/25 Checks Passed - 25 Failures)

---

## 1. Executive Summary & Problem Formulation

In the baseline firmware state of `lib/pbio/src/mdrobotbase.c` and `pybricks/robotics/pb_type_mdrobotbase.c`:
1. The constructors `pbio_mdrobotbase_init()`, `pbio_mdrobotbase_get_robotbase()`, and `pb_type_MDRobotBase_make_new()` accept zero or negative wheel diameters and axle tracks without error checking.
2. In differential kinematics (`pbio_mdrobotbase_update_state()`), `delta_theta_enc_rad = (d_right - d_left) / track_mm` executes an unmitigated IEEE 754 division-by-zero whenever `track_mm == 0`, contaminating robot heading $\theta$ with $\pm\infty$ or `NaN`.
3. In motion commands (`pb_type_mdrobotbase.c`), linear speed divided by non-positive wheel diameters causes arithmetic overflow and uncontrolled max-speed motor runaway.
4. Motor aliasing (`left == right`) is unchecked, causing conflicting differential commands to be dispatched simultaneously to a single physical actuator.
5. Floating-point inputs containing `NaN` or `Inf` are not sanitized before casting to integer types, triggering undefined behavior.

---

## 2. Frozen Baseline Dialectic Failure Execution Output

```text
================================================================================
🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-003
================================================================================

📌 Exact-HEAD Provenance: 0582aefe38928ed3fe7456775dc5784a901bd28b
🌿 Active Feature Branch: feature/mdrobotbase-enhancement

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Differential Kinematics Division-by-Zero Elimination (branch-1-axle-track-positivity)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why does non-positive axle track cause immediate IEEE 754 division-b... ❌ FAIL
       Details: mdrobotbase.c must guard against axle_track <= 0
  [L2] Why must axle track be strictly positive (W > 0) rather than non-neg... ❌ FAIL
       Details: Axle track positivity must be documented in acceptance contract and enforced in C
  [L3] Why must the check happen before slot acquisition and initialization... ❌ FAIL
       Details: pbio_mdrobotbase_get_robotbase must check axle_track <= 0 before slot commitment
  [L4] Why must upper sanity bounds (W <= 5000000 um = 5m) be enforced?... ❌ FAIL
       Details: mdrobotbase.c must guard axle_track > 5000000
  [L5] Why must PBIO C return PBIO_ERROR_INVALID_ARG directly on invalid ax... ❌ FAIL
       Details: Return PBIO_ERROR_INVALID_ARG on invalid axle track

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Linear Velocity Conversion Singularity & Runaway (branch-2-wheel-diameter-positivity)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why does non-positive wheel diameter cause velocity command singular... ❌ FAIL
       Details: mdrobotbase.c must guard wheel_diameter_left <= 0 and wheel_diameter_right <= 0
  [L2] Why must both left and right diameters be validated independently?... ❌ FAIL
       Details: Both wheel_diameter_left and wheel_diameter_right must be independently validated
  [L3] Why must pbio_mdrobotbase_set_wheel_diameters() enforce identical va... ❌ FAIL
       Details: pbio_mdrobotbase_set_wheel_diameters must enforce upper and lower bounds
  [L4] Why must upper sanity bounds (D <= 1000000 um = 1m) be enforced?... ❌ FAIL
       Details: Enforce wheel_diameter sanity upper bound of 1000000 um
  [L5] Why must PBIO C return PBIO_ERROR_INVALID_ARG on non-positive diamet... ❌ FAIL
       Details: Return PBIO_ERROR_INVALID_ARG on non-positive wheel diameters

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Motor Aliasing Conflict Prevention (branch-3-motor-aliasing-prevention)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why does passing the same physical motor for left and right cause ac... ❌ FAIL
       Details: Must prevent identical servo or motor object for left and right
  [L2] Why must PBIO C enforce left != right in pbio_mdrobotbase_init() and... ❌ FAIL
       Details: mdrobotbase.c must reject left == right with PBIO_ERROR_INVALID_ARG
  [L3] Why must the MicroPython constructor reject left_motor == right_moto... ❌ FAIL
       Details: pb_type_mdrobotbase.c must reject left_motor_in == right_motor_in
  [L4] Why must re-entrant instance lookup never match aliased single motor... ❌ FAIL
       Details: Check left == right before re-entrant loop in get_robotbase
  [L5] Why must motor aliasing return PBIO_ERROR_INVALID_ARG and raise Valu... ❌ FAIL
       Details: Motor aliasing rejection specified in acceptance contract and enforced in codebase

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Floating-Point Non-Finiteness & NaN Sanitization (branch-4-finite-float-sanitization)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why does passing NaN or Infinity to pb_obj_get_scaled_int() cause un... ❌ FAIL
       Details: pb_type_mdrobotbase.c must check isfinite on float dimensions
  [L2] Why must MicroPython explicitly test isfinite() on all float geometr... ❌ FAIL
       Details: Explicit isfinite check on wheel_diameter_left_in, wheel_diameter_right_in, and axle_track_in
  [L3] Why must both constructor and setters enforce isfinite()?... ❌ FAIL
       Details: pb_type_MDRobotBase_set_wheel_diameters must check isfinite
  [L4] Why must non-finite inputs raise ValueError with a clear message?... ❌ FAIL
       Details: Descriptive ValueError message for invalid dimensions
  [L5] Why is IEEE 754 float sanitization non-negotiable in embedded roboti... ❌ FAIL
       Details: Acceptance contract Scenario 4 verified against isfinite sanitization

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Fail-Closed Allocation Rollback & Unit Test Verification (branch-5-fail-closed-allocation)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why must geometry validation precede pool slot commitment?... ❌ FAIL
       Details: pbio_mdrobotbase_get_robotbase validates before slot reservation
  [L2] Why must *rb_address remain NULL or unchanged on validation failure?... ❌ FAIL
       Details: Test suite must verify *rb_address remains NULL on validation failure
  [L3] Why must test_mdrobotbase_geometry_validation verify all edge cases?... ❌ FAIL
       Details: test_mdrobotbase.c must implement test_mdrobotbase_geometry_validation
  [L4] Why must test_mdrobotbase_geometry_validation be registered in testc... ❌ FAIL
       Details: pbio_mdrobotbase_tests array must include test_mdrobotbase_geometry_validation
  [L5] Why must all 25 dialectic nodes converge to 100% pass rate before go... ❌ FAIL
       Details: All 25 nodes must be evaluated across 5 branches

════════════════════════════════════════════════════════════════════════════════
📊 Dialectic Evaluation Summary: 0/25 Checks Passed (0.0%)
❌ Failed Checks: 25
⚠️ Goal G-MDRB-003 has pending dialectic requirements.
```

---

## 3. Five-Why Dialectic Decomposition

### Branch 1: Differential Kinematics Division-by-Zero Elimination
- **L1:** Why does non-positive axle track cause immediate IEEE 754 division-by-zero?
  *Root finding:* In differential odometry, $\Delta\theta = (d_{\text{right}} - d_{\text{left}}) / W_{\text{track}}$. When $W_{\text{track}} = 0$, division by zero produces `NaN` or $\pm\infty$.
- **L2:** Why must axle track be strictly positive ($W > 0$) rather than non-negative?
  *Root finding:* A zero or negative axle track is physically impossible for differential steering; negative track reverses angular kinematics unexpectedly.
- **L3:** Why must validation precede pool slot acquisition?
  *Root finding:* Committing a slot before validation can leak the pool slot if initialization is aborted.
- **L4:** Why must upper sanity bounds ($W \le 5\text{m}$) be enforced?
  *Root finding:* Disproportionately huge numbers trigger integer overflow during unit scaling ($\mu\text{m}$).
- **L5:** Why return `PBIO_ERROR_INVALID_ARG` directly from C?
  *Root finding:* Establishes deterministic fail-closed signaling translated directly to Python `ValueError`.

### Branch 2: Linear Velocity Conversion Singularity & Runaway
- **L1:** Why does non-positive wheel diameter cause velocity command singularities?
  *Root finding:* Angular velocity is computed as $\omega = v / r$. When $r \le 0$, motor angular target blows up or inverts.
- **L2:** Why must left and right diameters be validated independently?
  *Root finding:* MDRobotBase supports asymmetric differential drive with unequal left/right wheels; either invalid dimension corrupts kinematics.
- **L3:** Why must runtime setters enforce identical bounds?
  *Root finding:* `set_wheel_diameters()` is a mutable runtime entrypoint that must not bypass constructor guards.
- **L4:** Why must upper sanity bounds ($D \le 1\text{m}$) be enforced?
  *Root finding:* Wheel diameters beyond 1m cause severe numerical underflow during displacement ticks.
- **L5:** Why must PBIO C reject non-positive diameters with `PBIO_ERROR_INVALID_ARG`?
  *Root finding:* Enforces embedded runtime safety before any motor control registers are written.

### Branch 3: Motor Aliasing Conflict Prevention
- **L1:** Why does passing the same physical motor for left and right cause actuator conflict?
  *Root finding:* Dual drivebase PID loops write contradictory duty cycles and velocities to the exact same servo handle.
- **L2:** Why must PBIO C enforce `left != right`?
  *Root finding:* Guarantees hardware independence across all platform ports.
- **L3:** Why must MicroPython reject `left_motor == right_motor` before calling PBIO?
  *Root finding:* Gives explicit, user-friendly Python exception diagnostics.
- **L4:** Why must re-entrant instance lookup never match aliased single motors?
  *Root finding:* Re-entrance must only match legitimate dual-motor setups.
- **L5:** Why return `PBIO_ERROR_INVALID_ARG` on aliasing?
  *Root finding:* Guarantees zero conflicting commands dispatched to hardware.

### Branch 4: Floating-Point Non-Finiteness & NaN Sanitization
- **L1:** Why does passing NaN or Infinity to `pb_obj_get_scaled_int()` cause undefined behavior?
  *Root finding:* ISO C99 defines float-to-integer conversion of NaN/Inf as undefined behavior.
- **L2:** Why must MicroPython explicitly test `isfinite()`?
  *Root finding:* MicroPython does not perform float bounds verification during standard argument parsing.
- **L3:** Why must both constructor and setters check `isfinite()`?
  *Root finding:* Comprehensive sanitization across all input surfaces.
- **L4:** Why must non-finite inputs raise `ValueError`?
  *Root finding:* Clear, actionable developer diagnostics.
- **L5:** Why is IEEE 754 sanitization non-negotiable?
  *Root finding:* Prevents silent NaN contamination across Kalman filters and PID accumulators.

### Branch 5: Fail-Closed Allocation Rollback & Unit Test Verification
- **L1:** Why must validation precede pool slot commitment?
  *Root finding:* Resource leak prevention in embedded systems with limited pool capacity.
- **L2:** Why must `*rb_address` remain NULL on failure?
  *Root finding:* Prevents caller from dereferencing uninitialized or garbage memory.
- **L3:** Why must C tests verify all boundary conditions?
  *Root finding:* Guarantees 100% branch coverage with zero mocks and zero stubs.
- **L4:** Why must test be registered in `pbio_mdrobotbase_tests`?
  *Root finding:* Ensures automated execution in CI/CD pipeline.
- **L5:** Why must all 25 nodes converge to 100%?
  *Root finding:* Strict compliance with Article I and Article II.

---

## 4. Next Implementation Actions

1. Implement geometry and aliasing guards in `lib/pbio/src/mdrobotbase.c`.
2. Implement motor aliasing check and `isfinite()` guards in `pybricks/robotics/pb_type_mdrobotbase.c`.
3. Implement `test_mdrobotbase_geometry_validation()` in `lib/pbio/test/src/test_mdrobotbase.c`.
4. Compile and verify PBIO test runner.
5. Re-run Socratic dialectic harness and verify 25/25 nodes green.
