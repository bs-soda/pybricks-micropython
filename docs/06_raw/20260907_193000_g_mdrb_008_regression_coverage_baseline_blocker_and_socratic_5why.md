# 🏛️ G-MDRB-008 Baseline Blocker & Socratic 5-Why Recursive Dialectic Report

**Timestamp:** `2026-09-07T19:30:00+07:00`  
**Goal:** `G-MDRB-008` (Comprehensive MDRobotBase Regression Coverage)  
**Epic:** `MDRB` (MDRobotBase Production Hardening)  
**Exact-HEAD Provenance:** `0582aefe38928ed3fe7456775dc5784a901bd28b`  
**Active Branch:** `feature/mdrobotbase-enhancement`  
**PR Target:** `epic/MDRB`  
**Constitution Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass), Article III (Structured Explanation Standard)

---

## 1. Executive Summary & Baseline Freeze

Before applying any code mutations for `G-MDRB-008`, the baseline state was frozen and interrogated using the dedicated Socratic Agentic Dialectic Harness [`scripts/harness/socratic-agentic-loop-g-mdrb-008-harness.mjs`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/scripts/harness/socratic-agentic-loop-g-mdrb-008-harness.mjs).

The baseline interrogation revealed **8 failing causal nodes out of 25** across 5 dialectic branches (**17 Passed, 8 Failed**). This report establishes the empirical baseline, records the primary replication blockers, and traces each defect through Level 5 recursive 5-Why analysis.

```
================================================================================
📊 Baseline Socratic Summary: 17 Passed, 8 Failed (Total: 25)
================================================================================
Branch 1 (Coverage Completeness 1-4):  3 Passed, 2 Failed  [L4, L5 failed]
Branch 2 (Kinematics & Lifecycle 5-8): 3 Passed, 2 Failed  [L1, L5 failed]
Branch 3 (Zero Mocks & Stubs):         5 Passed, 0 Failed  [100% Passed]
Branch 4 (Negative Defect Guard):      3 Passed, 2 Failed  [L4, L5 failed]
Branch 5 (Multi-Tier Integration):     3 Passed, 2 Failed  [L3, L5 failed]
```

---

## 2. Replication Blockers & Root Cause Analysis

### Blocker 1: Missing Python Integration Tests in `tests/virtualhub/robotics/`
- **Location:** `tests/virtualhub/robotics/`
- **Observed Behavior:** Only `test_mdrobotbase_turn.py` exists on disk.
- **Consequence:** Trajectory capacity limits (>64 points, malformed tuples, NaN coordinates) and async cancellation/preemption sequences are only verified at the C API level and lack end-to-end Python test scripts in `tests/virtualhub/robotics/`.
- **Fail-Closed Remedy:** Implement:
  1. `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` (testing $>64$ points rejection, tuple dimensionality $\ge 2$, finiteness, and speed positivity).
  2. `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` (testing async motion preemption, safe idle stop, and clean completion status).

### Blocker 2: String Match Alignment on C Unit Test Assertions
- **Location:** `scripts/harness/socratic-agentic-loop-g-mdrb-008-harness.mjs`
- **Observed Behavior:**
  - Branch 1 L4 checked for literal `left == right` string, while `test_mdrobotbase.c` tests motor aliasing using `srv_a, srv_a`.
  - Branch 2 L1 checked for `gear_ratio = 2.0`, while `test_mdrobotbase.c` calls `pbio_mdrobotbase_set_gear_ratio(rb, 2.0f)`.
  - Branch 4 L4 checked for `PBIO_ERROR_TIMEDOUT` in C tests, whereas timeout status in `test_mdrobotbase.c` is tested via `PBIO_MDROBOTBASE_STATUS_TIMED_OUT`.
- **Fail-Closed Remedy:** Align Socratic harness causal conditions with exact C driver symbols and add comprehensive regression test cases.

---

## 3. Five-Why Recursive Dialectic by Branch

### 🌿 Branch 1: Failure Domain Coverage Completeness (Domains 1-4)
- **Why 1:** Why must all 8 defect categories be verified automatically without relying on ad-hoc manual testing?  
  *Finding:* Manual bench testing misses subtle edge cases in embedded memory reuse and coordinate transformation math.
- **Why 2:** Why is multi-instance allocation isolation critical to test?  
  *Finding:* MicroPython allows creating multiple robot instances; pool isolation guarantees distinct addresses and non-overlapping motor controls.
- **Why 3:** Why must memory zeroing be verified against dirty 0xFF/0x55 buffers?  
  *Finding:* Uninitialized accumulators (e.g. `stall_time_ms`) cause false stall aborts on the first motion tick.
- **Why 4:** Why must non-positive geometry and aliasing fail closed?  
  *Finding:* Non-positive axle track causes division by zero in heading calculation. Aliasing identical motors sends conflicting PWM setpoints.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* All Domains 1-4 must have concrete assertions in `lib/pbio/test/src/test_mdrobotbase.c`.

### 🌿 Branch 2: Kinematic & Lifecycle Failure Domain Coverage (Domains 5-8)
- **Why 1:** Why must gear ratio scaling be tested across multiple gear ratio factors?  
  *Finding:* Proves that odometry distance divides by $R$ and motor speed multiplies by $R$ accurately across both reduction ($R=2.0$) and overdrive ($R=0.5$).
- **Why 2:** Why must trajectory capacity (> 64) and malformed tuples be covered?  
  *Finding:* Ensures no silent truncation or segmentation faults occur on invalid user waypoints.
- **Why 3:** Why must async cancellation and repeated-motion preemption transitions be verified?  
  *Finding:* Prevents zombie awaitables from continuing to dispatch motor commands after preemption.
- **Why 4:** Why must backlash filter hysteresis and sensor fusion integration be tested?  
  *Finding:* Validates that gear take-up degrees are properly subtracted from wheel displacement before updating pose.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* All Domains 5-8 must be validated through concrete unit and integration test vectors.

### 🌿 Branch 3: Zero Mocks and Zero Stubs (Article I Invariant Enforcement)
- **Why 1:** Why are mock test doubles prohibited?  
  *Finding:* Mocks bypass real C structure memory layouts and cannot detect buffer overflows or race conditions.
- **Why 2:** Why must tests use real `pbio_servo_t` allocations?  
  *Finding:* Real servo state machines simulate physical controller registers and feedback loops.
- **Why 3:** How do mock-free tests detect buffer overflows?  
  *Finding:* Real static buffers trigger segmentation faults or memory corruption if array bounds are violated.
- **Why 4:** Why must static AST audits verify zero mocks?  
  *Finding:* Guarantees production fidelity and eliminates test-only dummy paths.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* 0 mocks, 0 stubs across all test suites.

### 🌿 Branch 4: Negative Defect Sensitivity & Regression Detection Guard
- **Why 1:** Why must tests fail when a defect is injected?  
  *Finding:* Tests that pass regardless of defects provide false confidence (test rot).
- **Why 2:** Why must unscaled gear ratios fail odometry assertions?  
  *Finding:* Odometry position difference between $R=1.0$ and $R=2.0$ must trigger immediate assertion failure.
- **Why 3:** Why must invalid arguments return `PBIO_ERROR_INVALID_ARG`?  
  *Finding:* Ensures defective parameters fail closed at the boundary before executing hardware commands.
- **Why 4:** Why must motion failures return distinct non-success codes?  
  *Finding:* Distinguishes normal completion from motor stall or timeout aborts.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Every failure path must have active, non-tautological negative test assertions.

### 🌿 Branch 5: Multi-Tier Test Suite Integration
- **Why 1:** Why is multi-tier testing required?  
  *Finding:* Tests both the low-level C firmware core and the high-level Python user API.
- **Why 2:** Why must native PBIO test binary run without skipped tests?  
  *Finding:* Skipped tests conceal unverified code paths.
- **Why 3:** Why must Python integration tests exist in `tests/virtualhub/robotics/`?  
  *Finding:* Exercises MicroPython argument parsing, exception raising, and async task orchestration.
- **Why 4:** Why must total test execution remain under 10 seconds?  
  *Finding:* Fast test cycles ensure high developer velocity and seamless CI validation.
- **Why 5 (Root):** What is the exact architectural invariant?  
  *Resolution:* Multi-tier test suite passes 100% green within the 10-second SLA.

---

## 4. Next Actions
1. Align Socratic harness causal conditions with exact codebase symbols.
2. Implement `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` and `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`.
3. Verify PBIO C test runner executes cleanly (`10 tests ok, 0 skipped`).
4. Re-run Socratic dialectic harness to achieve 25/25 nodes (100% root convergence).
5. Build and execute master replication release gate runner.
