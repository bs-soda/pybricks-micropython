# Acceptance Contract: G-MDRB-021

**Goal ID:** `G-MDRB-021`  
**Title:** Exhaustive Closed-Object Method Audit and Idempotent Lifecycle Attestation  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Exhaustive Closed-Object Method Audit and Idempotent Lifecycle Attestation
  As a software runtime reliability engineer
  I want all 49 public methods in the MDRobotBase locals dictionary to enforce closed-object guards
  So that calling any operational method after close() raises OSError(EBADF) with zero side effects, and calling close() repeatedly is completely idempotent.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Post-Close Color Calibration Guarding
```gherkin
Given an initialized MDRobotBase instance that has been closed via robot.close()
When any color calibration method is called (classify_color, reset_color_calibration, etc.)
Then the method intercepts self->rb == NULL via require_open()
And raises OSError with errno == EBADF
And zero hardware sensor calls are made.
```

### Scenario 2: Post-Close Motion Dispatch Guarding
```gherkin
Given a closed MDRobotBase instance
When any motion dispatch method is called (go_forward, turn_to_angle, follow_trajectory, etc.)
Then require_open() intercepts the call immediately before argument processing
And raises OSError with errno == EBADF
And no motor commands or timer cancellations occur.
```

### Scenario 3: Post-Close Status and Parameter Query Guarding
```gherkin
Given a closed MDRobotBase instance
When any query method is called (get_state, status, done, stalled, get_gear_ratio, etc.)
Then require_open() intercepts the call
And raises OSError with errno == EBADF
And no null-pointer dereferences occur.
```

### Scenario 4: Idempotent Close Execution
```gherkin
Given an MDRobotBase instance that has already been closed
When robot.close() is called repeatedly (e.g. 5 consecutive times)
Then each call executes safely without raising exceptions
And memory and motor claim states remain cleanly released.
```

---

## 3. Verification Traceability Matrix

| Acceptance Criteria | Verification Method | Pass Threshold |
|---|---|---|
| AC-MDRB-021-1: 100% of 49 locals dictionary methods enforce `require_open` | Static code audit + AST | 49/49 verified |
| AC-MDRB-021-2: Color calibration raises `EBADF` on closed object | VirtualHub Python test | `OSError(EBADF)` |
| AC-MDRB-021-3: Motion methods raise `EBADF` on closed object | VirtualHub Python test | `OSError(EBADF)` |
| AC-MDRB-021-4: Query methods raise `EBADF` on closed object | VirtualHub Python test | `OSError(EBADF)` |
| AC-MDRB-021-5: Repeated `close()` calls are idempotent | VirtualHub Python test | Zero exceptions |
