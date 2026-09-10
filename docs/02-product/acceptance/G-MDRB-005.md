# Acceptance Contract: G-MDRB-005

**Goal ID:** `G-MDRB-005`
**Title:** Distinct Timeout and Stall Failure Reporting
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Distinct Timeout and Stall Failure Reporting
  As an autonomous robotics control system
  I want motor stall and motion timeout conditions to be reported as distinct errors rather than silent successes
  So that caller routines and mission planners immediately detect physical mechanical jams or deadline expirations and take corrective action.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Motion Timeout Returns PBIO_ERROR_TIMEDOUT and Raises OSError(ETIMEDOUT)
```gherkin
Given an initialized MDRobotBase with a positive timeout_ms limit
When a motion is dispatched and elapsed time reaches or exceeds timeout_ms before reaching the target pose
Then the motion execution loop aborts immediately
And the actuators are stopped according to the configured stop_behavior
And rb->motion_status is set to PBIO_MDROBOTBASE_STATUS_TIMED_OUT
And the motion loop returns PBIO_ERROR_TIMEDOUT
And the MicroPython awaitable dispatcher raises OSError with errno ETIMEDOUT (110) rather than returning None or success.
```

### Scenario 2: Motor Stall in Linear Navigation Returns PBIO_ERROR_FAILED and Raises RuntimeError
```gherkin
Given an initialized MDRobotBase executing linear motion
When commanded linear velocity |v_cmd| > 30 mm/s and measured velocity |v_raw| < 10 mm/s persists for > 250 ms
Then the motion loop aborts immediately
And the actuators are stopped according to the configured stop_behavior
And rb->motion_status is set to PBIO_MDROBOTBASE_STATUS_STALLED
And the motion loop returns PBIO_ERROR_FAILED
And the MicroPython awaitable dispatcher raises RuntimeError("motion stalled").
```

### Scenario 3: Motor Stall in Heading Alignment and In-Place Turns Returns PBIO_ERROR_FAILED
```gherkin
Given an initialized MDRobotBase executing an in-place turn or final heading alignment
When commanded angular velocity |w_cmd| > 40 deg/s and measured angular rate |w_raw| < 2 deg/s persists for > 200 ms (alignment) or > 400 ms (turn)
Then the motion loop aborts immediately
And the actuators are stopped according to the configured stop_behavior
And rb->motion_status is set to PBIO_MDROBOTBASE_STATUS_STALLED
And the motion loop returns PBIO_ERROR_FAILED.
```

### Scenario 4: Configured Stop Behavior Adherence on Abort
```gherkin
Given an MDRobotBase configured with stop_behavior in {HOLD, BRAKE, COAST}
When a stall or timeout abort occurs
Then pbio_servo_stop() is called on both left and right servos with the exact configured stop_behavior
And if stop_behavior is not COAST, angles are reset
And motion_in_progress is cleared to false
And motion_type is reset to PBIO_MDROBOTBASE_MOTION_NONE.
```

### Scenario 5: Normal Arrival Within Tolerance Continues to Return PBIO_SUCCESS
```gherkin
Given an MDRobotBase executing a valid motion command
When the target distance or heading reaches within tolerance before timeout or stall
Then the actuators are stopped according to stop_behavior
And rb->motion_status is set to PBIO_MDROBOTBASE_STATUS_COMPLETED
And the motion loop returns PBIO_SUCCESS
And no exception is raised in MicroPython.
```

### Scenario 6: Clean State Reset on Subsequent Motion Command
```gherkin
Given an MDRobotBase that previously suffered a timeout or stall abort
When a new motion command is invoked
Then pbio_mdrobotbase_motion_reset() zeroes stall_time_ms and turn_integral
And rb->motion_status transitions to PBIO_MDROBOTBASE_STATUS_RUNNING
And the robot base executes the new trajectory without carryover error.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Timeout Error Code | `PBIO_ERROR_TIMEDOUT` | Native C Assertion in `test_mdrobotbase.c` |
| Stall Error Code | `PBIO_ERROR_FAILED` | Native C Assertion in `test_mdrobotbase.c` |
| Success Error Code | `PBIO_SUCCESS` | Native C Assertion in `test_mdrobotbase.c` |
| Python Timeout Exception | `OSError(ETIMEDOUT)` | `pb_assert()` translation audit |
| Python Stall Exception | `RuntimeError` | `pb_assert()` translation audit |
| Actuator Stop Action | `pbio_servo_stop(srv, stop_behavior)` | C AST & Functional Execution Trace |
| Motion State Invariant | `motion_in_progress == false` on exit | Struct State Inspection |
