# Acceptance Contract: G-MDRB-020

**Goal ID:** `G-MDRB-020`
**Title:** Finite State Machine Transition Table and Atomic Motion-Status Coupling
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Finite State Machine Transition Table and Atomic Motion-Status Coupling
  As a robotics control systems architect
  I want pbio_mdrobotbase_set_motion_status to enforce an explicit state transition matrix and atomically couple motion_in_progress
  So that status and busy states are mathematically consistent, preventing asynchronous coroutine deadlocks and contradictory status reports.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Valid Start of Motion Transition
```gherkin
Given a robot base in STATUS_NONE or a terminal state (COMPLETED, STALLED, TIMED_OUT)
When pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING) is called
Then the status is updated to PBIO_MDROBOTBASE_STATUS_RUNNING
And rb->motion_in_progress is atomically set to true
And pbio_mdrobotbase_is_busy(rb, &busy) returns busy == true
And pbio_mdrobotbase_is_done(rb, &done) returns done == false
And the function returns PBIO_SUCCESS.
```

### Scenario 2: Valid Completion Transition
```gherkin
Given a robot base in PBIO_MDROBOTBASE_STATUS_RUNNING
When pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED) is called
Then the status is updated to PBIO_MDROBOTBASE_STATUS_COMPLETED
And rb->motion_in_progress is atomically set to false
And pbio_mdrobotbase_is_busy(rb, &busy) returns busy == false
And pbio_mdrobotbase_is_done(rb, &done) returns done == true
And the function returns PBIO_SUCCESS.
```

### Scenario 3: Prohibited Direct Transition from NONE to Terminal States
```gherkin
Given a robot base in PBIO_MDROBOTBASE_STATUS_NONE
When attempting to transition directly to PBIO_MDROBOTBASE_STATUS_COMPLETED or STALLED
Then the transition is rejected with PBIO_ERROR_INVALID_OP
And rb->motion_status remains PBIO_MDROBOTBASE_STATUS_NONE
And rb->motion_in_progress remains false.
```

### Scenario 4: Idempotent Re-Assertion of Current Status
```gherkin
Given a robot base currently in PBIO_MDROBOTBASE_STATUS_RUNNING
When pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING) is called
Then the call succeeds with PBIO_SUCCESS
And state invariants are preserved without disruption.
```

---

## 3. Verification Traceability Matrix

| Acceptance Criteria | Verification Method | Pass Threshold |
|---|---|---|
| AC-MDRB-020-1: `NONE -> RUNNING` sets `motion_in_progress = true` | Native C TinyTest | `PBIO_SUCCESS`, `busy == true` |
| AC-MDRB-020-2: `RUNNING -> COMPLETED` sets `motion_in_progress = false` | Native C TinyTest | `PBIO_SUCCESS`, `done == true` |
| AC-MDRB-020-3: `RUNNING -> STALLED` sets `motion_in_progress = false` | Native C TinyTest | `PBIO_SUCCESS`, `stalled == true` |
| AC-MDRB-020-4: Prohibited transitions return `PBIO_ERROR_INVALID_OP` | Native C TinyTest | Exact error enum |
| AC-MDRB-020-5: `busy` and `done` are never simultaneously true | State space fuzzing | Zero collisions |
