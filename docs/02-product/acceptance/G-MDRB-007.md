# Acceptance Contract: G-MDRB-007

**Goal ID:** `G-MDRB-007`
**Title:** Trajectory and Controller Input Validation
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Trajectory and Controller Input Validation
  As an autonomous robotics path executor
  I want fail-closed input validation on waypoint counts, coordinate tuples, dynamic tolerances, and controller configurations
  So that malformed trajectories or invalid controller modes reject immediately with explicit exceptions rather than causing memory corruptions, silent path truncations, or unhandled control switches.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Trajectory Capacity Exceeded (> 64 Points) Raises ValueError
```gherkin
Given an initialized MDRobotBase
When follow_trajectory() is invoked with a points list containing > 64 coordinates (e.g. 65 points)
Then the function detects num_points > 64
And raises ValueError("trajectory exceeds maximum capacity of 64 points")
And no internal waypoint buffers are modified
And zero motor commands are dispatched.
```

### Scenario 2: Minimum Points & Coordinate Tuple Length Validation
```gherkin
Given an initialized MDRobotBase
When follow_trajectory() is invoked with fewer than 2 points (e.g. empty [] or [(0, 0)])
Or when any point tuple contains fewer than 2 coordinates (e.g. [(100,)])
Then the function validates point counts and tuple dimensions before memory indexing
And raises ValueError("trajectory requires at least 2 points") or ValueError("trajectory point must have at least (x, y) coordinates")
And no out-of-bounds array access or segmentation fault occurs.
```

### Scenario 3: Non-Finite (NaN / Inf) and Non-Positive Dynamics Rejection
```gherkin
Given an initialized MDRobotBase
When follow_trajectory() is invoked with non-finite coordinates (NaN or +/-Inf)
Or when speed <= 0, tolerance <= 0, or transition_tolerance <= 0
Then the function validates isfinite() and positivity of all dynamic parameters
And raises ValueError
And no trajectory execution begins.
```

### Scenario 4: Controller Enum Range Guard
```gherkin
Given an initialized MDRobotBase
When set_controller() is invoked with an enum value not in {PBIO_MDROBOTBASE_CONTROLLER_PID (0), PBIO_MDROBOTBASE_CONTROLLER_LQR (1)} (e.g. 99 or -1)
Then pbio_mdrobotbase_set_controller() rejects the value and returns PBIO_ERROR_INVALID_ARG
And the MicroPython binding raises ValueError("invalid controller type")
And the existing active controller configuration remains unchanged.
```

### Scenario 5: Negative Testing Zero Side-Effect Guarantee
```gherkin
Given an MDRobotBase with an established pose (x, y, theta) and stopped actuators
When any invalid trajectory or controller configuration is rejected
Then no motor PWM signals or servo target setpoints are transmitted
And odometry state remains unchanged
And rb->motion_in_progress remains false.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Maximum Point Limit | Exactly 64 waypoints ($N \le 64$) | Python & Native C Test Assertion |
| Minimum Point Limit | Minimum 2 waypoints ($N \ge 2$) | Python & Native C Test Assertion |
| Tuple Dimensionality | $\ge 2$ coordinates per tuple | MicroPython Array Parser Check |
| Coordinate Finiteness | `isfinite(x) && isfinite(y)` | IEEE 754 Float Sanitization |
| Controller Enum Space | `type == PID (0) || type == LQR (1)` | C Enum Range Guard in PBIO |
| Side Effect Immunity | 0 motor commands on error | Actuator Command Monitor Trace |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-007-1:** Passing 65 points to `follow_trajectory()` raises `ValueError` immediately.
- **AC-MDRB-007-2:** Passing a point with fewer than 2 coordinates raises `ValueError` without crashing.
- **AC-MDRB-007-3:** Passing NaN or Inf in coordinates, speeds, or tolerances raises `ValueError`.
- **AC-MDRB-007-4:** Calling `set_controller()` with integer other than 0 or 1 returns `PBIO_ERROR_INVALID_ARG`.
- **AC-MDRB-007-5:** Invalid inputs produce zero motor commands and do not modify internal pose.
