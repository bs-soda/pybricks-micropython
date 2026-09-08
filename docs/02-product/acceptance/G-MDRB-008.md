# Acceptance Contract: G-MDRB-008

**Goal ID:** `G-MDRB-008`  
**Title:** Comprehensive MDRobotBase Regression Coverage  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Comprehensive MDRobotBase Regression Test Suite
  As an embedded robotics firmware maintainer and competitor
  I want an exhaustive automated regression test suite covering all 8 failure domains with zero mocks
  So that future modifications cannot re-introduce instance cross-talk, uninitialized states, kinematic drift, silent truncation, or unhandled motion failures.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Comprehensive Coverage Across All 8 Failure Domains
```gherkin
Given the MDRobotBase driver and MicroPython bindings
When the test suites execute under native PBIO tinytest and VirtualHub Python runners
Then automated test cases run for all 8 defect categories:
  1. Allocation and instance isolation
  2. Complete state initialization and dirty-state hygiene
  3. Geometry parameter validation and motor aliasing rejection
  4. Encoder odometry scaling across gear ratios (0.5, 1.0, 2.0)
  5. Motion execution kinematics (straight, turn, pivot, trajectory)
  6. Controller selection (PID, LQR) and gain boundaries
  7. Async lifecycle safety (preemption, cancellation, timeout, stall)
  8. Backlash filter hysteresis and gyro-encoder sensor fusion
And all 8 domains produce passing test attestations.
```

### Scenario 2: Real Actuator and Driver Data Structures (Zero Mocks / Stubs)
```gherkin
Given the PBIO test runner and test servo devices
When tests are compiled and executed
Then tests use concrete pbio_servo_t structures with simulated clock and hardware ticks
And zero mock test doubles, dummy structs, or stub return values are present in test code
And real driver functions (pbio_mdrobotbase_init, pbio_mdrobotbase_update_state, etc.) are executed directly.
```

### Scenario 3: Negative Detection Sensitivity (Defect Injection Fails Tests)
```gherkin
Given the regression test suite
When a deliberate regression is introduced (e.g. unscaled gear ratio, disabled geometry guard, or stall returning success)
Then the test assertions trigger immediate failure
And the test suite exits with a non-zero exit code
And no silent regressions escape detection.
```

### Scenario 4: Clean Execution Exit Code
```gherkin
Given the native PBIO tinytest binary and VirtualHub test scripts
When all test suites are executed in standard development and CI environments
Then all test suites exit with code 0
And zero tests are skipped or ignored
And output streams report 100% OK results.
```

### Scenario 5: Deterministic Execution Latency SLA
```gherkin
Given the complete regression test suite
When executed on the native host environment
Then total test execution time completes in under 10 seconds
And per-episode execution latency shows deterministic variance without hanging.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Domain Coverage | 8 of 8 Defect Domains Tested | Automated Epic Harness Audit |
| Mock Double Count | Exactly 0 mocks, 0 stubs | Static Grep & AST Inspection |
| PBIO C Test Suite | $\ge 10$ testcases passing, 0 skipped | `./lib/pbio/test/build/test-pbio` |
| VirtualHub Python Tests | Trajectory & Lifecycle Suites present | Python Syntax & Runner Validation |
| Execution Latency | Total duration $< 10.0$ seconds | High-resolution timer (`process.hrtime`) |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-008-1:** All 8 defect categories have automated tests running in PBIO or VirtualHub suites.
- **AC-MDRB-008-2:** Tests execute against real PBIO servo structures with zero mocks or stubs.
- **AC-MDRB-008-3:** Test suite fails if gear ratio is unscaled, dimensions are unvalidated, or stall returns success.
- **AC-MDRB-008-4:** All test cases pass with exit code 0 under standard test commands.
- **AC-MDRB-008-5:** Test execution time remains under 10 seconds.
