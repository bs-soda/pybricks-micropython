# Acceptance Contract: G-MDRB-017

**Goal ID:** `G-MDRB-017`  
**Title:** Deterministic PBIO and VirtualHub Behavioral Test Suite Hardening  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Deterministic PBIO and VirtualHub Behavioral Test Suite Hardening
  As a quality and robotics software engineer
  I want all test assertions across PBIO C test suites and VirtualHub Python integration suites to verify concrete dynamic behaviors, lifecycle state machine transitions, simulated motor and encoder progress, and explicit numerical tolerances
  So that tautological assertions ("assert x or not x"), static property checks without motion, and silent failure paths are completely eliminated in favor of deterministic, fail-before-fix verified tests.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Elimination of Tautological Assertions
```gherkin
Given the VirtualHub test suite in tests/virtualhub/robotics/
When analyzing assertion statements across test_mdrobotbase_lifecycle.py and test_mdrobotbase_trajectory.py
Then zero boolean tautologies (such as "assert x or not x") exist
And every assertion verifies an exact, falsifiable state or value.
```

### Scenario 2: Dynamic Lifecycle State Machine Verification (done & stalled)
```gherkin
Given an initialized MDRobotBase instance in VirtualHub or PBIO test harness
When a background motion is active and progressing
Then robot.done() returns False and robot.status() equals PBIO_MDROBOTBASE_STATUS_RUNNING
When the motion completes its target distance or angle
Then robot.done() transitions to True and robot.status() equals PBIO_MDROBOTBASE_STATUS_COMPLETED
When an unhindered motion executes
Then robot.stalled() returns False
When a motor stall is simulated (> 200 ms under excessive load)
Then robot.stalled() transitions to True and robot.status() equals PBIO_MDROBOTBASE_STATUS_STALLED.
```

### Scenario 3: Trajectory Waypoint Arrival Coordinates Within Explicit Tolerance
```gherkin
Given an MDRobotBase executing a multi-waypoint trajectory via follow_trajectory
When the trajectory tracking terminates upon reaching the final waypoint
Then the final odometry pose (x, y, theta) matches the target within numerical tolerance:
  And |x_actual - x_target| <= 2.0 mm
  And |y_actual - y_target| <= 2.0 mm
  And |theta_actual - theta_target| <= 1.0 deg.
```

### Scenario 4: Fail-Before-Fix Mutation Sensitivity
```gherkin
Given a hardened behavioral test suite
When a deliberate regression is introduced (e.g. inverted completion flag or corrupted coordinate delta)
Then the test suite deterministically fails (assertion error)
When the code is restored to correct implementation
Then the test suite passes 100% cleanly with zero test doubles or mocks.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Tautological Assertions | Exactly 0 boolean tautologies across `tests/virtualhub/` | AST & static regex audit |
| Motion State Dynamics | `done()` is False during motion, True on arrival | Dynamic state transition test |
| Stall State Dynamics | `stalled()` is False unhindered, True on stall | Simulated load threshold test |
| Waypoint Coordinate Precision | $|x - x^*| \le 2.0\text{ mm}$, $|y - y^*| \le 2.0\text{ mm}$, $|\theta - \theta^*| \le 1.0^\circ$ | Trajectory arrival assertion |
| Mutation Kill Rate | 100% of injected mutations killed by test suite | Fail-before-fix mutation testing |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-017-1:** Zero tautological assertions exist in `tests/virtualhub/robotics/`.
- **AC-MDRB-017-2:** `done()` is asserted `False` while a background motion is active and `True` after target arrival.
- **AC-MDRB-017-3:** `stalled()` is asserted `False` during unhindered motion and `True` when simulated motor load exceeds stall limits for $> 200\text{ ms}$.
- **AC-MDRB-017-4:** Final robot coordinate $(x, y, \theta)$ is asserted within numerical tolerance ($\le 2.0\text{ mm}, \le 1.0^\circ$) across all test paths.
- **AC-MDRB-017-5:** Tests fail reliably when deliberate regressions are introduced.
