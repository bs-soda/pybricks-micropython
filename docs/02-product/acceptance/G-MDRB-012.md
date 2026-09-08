# Acceptance Contract: G-MDRB-012

**Goal ID:** `G-MDRB-012`  
**Title:** Closed-Object Guarding & Idempotent Destructor Safety  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Closed-Object Guarding & Idempotent Destructor Safety
  As an embedded robotics firmware engineer
  I want all public MDRobotBase methods to require an open driver handle via pb_type_mdrobotbase_require_open
  So that calling methods on closed or finalized instances raises a deterministic RuntimeError instead of causing segmentation faults or corrupting native memory.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Inspection & State Queries Rejection on Closed Instance
```gherkin
Given an MDRobotBase instance that has been explicitly closed via robot.close()
When user code calls get_state(), stalled(), done(), or status()
Then MicroPython raises RuntimeError with message "MDRobotBase is closed"
And zero native driver memory or null pointers are dereferenced.
```

### Scenario 2: Motion Dispatch Rejection on Closed Instance
```gherkin
Given an MDRobotBase instance that has been explicitly closed via robot.close()
When user code calls navigate_to_goal(), turn_angle(), turn_to_angle(), pivot_turn_angle(), or follow_trajectory()
Then MicroPython raises RuntimeError with message "MDRobotBase is closed"
And zero motor commands or bus messages are emitted to PBIO servos.
```

### Scenario 3: Configuration & Tuning Method Rejection on Closed Instance
```gherkin
Given an MDRobotBase instance that has been explicitly closed via robot.close()
When user code calls set_pid_gains(), set_lqr_gains(), set_gear_ratio(), or set_wheel_diameters()
Then MicroPython raises RuntimeError with message "MDRobotBase is closed"
And zero hardware registers or calibration parameters are modified.
```

### Scenario 4: Idempotent Double Close Execution
```gherkin
Given an MDRobotBase instance that has already been closed once
When user code calls robot.close() a second or subsequent time
Then the method executes cleanly as a safe no-op returning None
And no error, exception, or memory corruption occurs.
```

### Scenario 5: Active Motion Abort and Resource Release on Close
```gherkin
Given an MDRobotBase instance actively executing a background motion maneuver
When robot.close() is invoked
Then the active motion awaitable is cancelled and motor controllers are stopped cleanly
And the underlying native driver slot is released via pbio_mdrobotbase_put_robotbase
And self->rb is set to NULL, preventing subsequent operation.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Method Guard Coverage | 100% of public methods guard against `self->rb == NULL` | Static AST and C method audit |
| Exception Type Consistency | 100% of closed-method rejections raise `RuntimeError` | Python exception handling |
| Destructor Idempotence | 100% of repeated `close()` calls execute safely | C test and Python regression harness |
| Active Motion Cleanup | Active motion terminated and slot freed on `close()` | Native PBIO motor state inspection |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-012-1:** Invoking `get_state()`, `stalled()`, `done()`, or `status()` on a closed instance raises `RuntimeError`.
- **AC-MDRB-012-2:** Invoking `navigate_to_goal()`, `turn_angle()`, or `pivot_angle()` on a closed instance raises `RuntimeError`.
- **AC-MDRB-012-3:** Calling `close()` repeatedly on the same instance executes as a safe no-op without error or crash.
- **AC-MDRB-012-4:** Calling `close()` while a motion is running safely terminates the active motion and releases the native slot.
