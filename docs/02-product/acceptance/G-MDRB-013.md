# Acceptance Contract: G-MDRB-013

**Goal ID:** `G-MDRB-013`  
**Title:** Motion-Status Enum Boundary Validation & Failure State Contract  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Motion-Status Enum Boundary Validation & Failure State Contract
  As an embedded robotics control engineer
  I want pbio_mdrobotbase_set_motion_status to strictly validate input against the pbio_mdrobotbase_motion_status_t enumeration whitelist
  So that out-of-range integer values or corrupted status codes are rejected with PBIO_ERROR_INVALID_ARG and existing motion state is preserved without register corruption.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Valid Motion Status Transitions
```gherkin
Given an initialized pbio_mdrobotbase_t instance with an existing motion status
When pbio_mdrobotbase_set_motion_status is called with any valid enum {NONE: 0, RUNNING: 1, COMPLETED: 2, STALLED: 3, TIMED_OUT: 4}
Then the function returns PBIO_SUCCESS
And rb->motion_status is updated to match the requested status value.
```

### Scenario 2: Rejection of Out-of-Bounds Positive Status Integers
```gherkin
Given an initialized pbio_mdrobotbase_t instance with initial status PBIO_MDROBOTBASE_STATUS_RUNNING
When pbio_mdrobotbase_set_motion_status is called with an out-of-range positive status (such as 5, 10, 100, 999)
Then the function returns PBIO_ERROR_INVALID_ARG
And rb->motion_status remains strictly unchanged at PBIO_MDROBOTBASE_STATUS_RUNNING.
```

### Scenario 3: Rejection of Negative Status Integers
```gherkin
Given an initialized pbio_mdrobotbase_t instance with initial status PBIO_MDROBOTBASE_STATUS_COMPLETED
When pbio_mdrobotbase_set_motion_status is called with a negative integer value (such as -1, -100, or INT32_MIN)
Then the function returns PBIO_ERROR_INVALID_ARG
And rb->motion_status remains strictly unchanged at PBIO_MDROBOTBASE_STATUS_COMPLETED.
```

### Scenario 4: Rejection on Null Handle
```gherkin
Given a null pbio_mdrobotbase_t pointer (rb == NULL)
When pbio_mdrobotbase_set_motion_status is called with any status value
Then the function returns PBIO_ERROR_INVALID_ARG
And no memory fault or null-pointer dereference occurs.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Whitelist Enforcement | 100% of non-whitelisted integers rejected | C unit test parameter boundary scan |
| Return Error Code | Exact `PBIO_ERROR_INVALID_ARG` on rejection | C assertion on return value |
| State Immutability on Failure | $\text{status}_{\text{post}} = \text{status}_{\text{pre}}$ on rejected write | C assertion on `rb->motion_status` |
| Valid Enum Acceptance | 100% of 5 valid status enums return `PBIO_SUCCESS` | C unit test iteration across 0..4 |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-013-1:** Passing any integer not in `{NONE: 0, RUNNING: 1, COMPLETED: 2, STALLED: 3, TIMED_OUT: 4}` returns `PBIO_ERROR_INVALID_ARG`.
- **AC-MDRB-013-2:** Upon rejection of an invalid status, `rb->motion_status` remains strictly unchanged.
- **AC-MDRB-013-3:** Passing each of the 5 valid status enums returns `PBIO_SUCCESS` and updates the register.
- **AC-MDRB-013-4:** Calling `pbio_mdrobotbase_set_motion_status` with `rb == NULL` safely returns `PBIO_ERROR_INVALID_ARG`.
