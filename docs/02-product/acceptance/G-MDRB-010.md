# Acceptance Contract: G-MDRB-010

**Goal ID:** `G-MDRB-010`
**Title:** Safe Robot-Base Instance Ownership & Duplicate Motor-Pair Rejection
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Safe Robot-Base Instance Ownership & Duplicate Motor-Pair Rejection
  As an embedded robotics firmware engineer
  I want pbio_mdrobotbase_get_robotbase to strictly reject duplicate or overlapping motor allocations with PBIO_ERROR_BUSY
  So that independent high-level drivebase objects cannot alias native driver memory slots or trigger use-after-free faults upon disposal.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Exact Motor-Pair Duplicate Allocation Rejection
```gherkin
Given active drivebase instance A configured with servos (Port A, Port B)
When attempting to allocate drivebase instance B with identical servos (Port A, Port B)
Then pbio_mdrobotbase_get_robotbase returns PBIO_ERROR_BUSY
And target pointer *rb_address remains NULL
And zero memory or configuration state in instance A is modified.
```

### Scenario 2: Partial Motor Overlap Allocation Rejection
```gherkin
Given active drivebase instance A configured with servos (Port A, Port B)
When attempting to allocate drivebase instance B with partially overlapping servos (Port A, Port C) or (Port C, Port B)
Then pbio_mdrobotbase_get_robotbase returns PBIO_ERROR_BUSY
And target pointer *rb_address remains NULL
And active instance A continues operating without interruption.
```

### Scenario 3: Slot Re-acquisition After Explicit Put
```gherkin
Given active drivebase instance A configured with servos (Port A, Port B)
When pbio_mdrobotbase_put_robotbase is executed on instance A
Then instance A slot is marked inactive and its servo motor claims are released
And subsequent call to pbio_mdrobotbase_get_robotbase with servos (Port A, Port B) succeeds with PBIO_SUCCESS
And a valid, fully-initialized pbio_mdrobotbase_t pointer is returned.
```

### Scenario 4: Multi-Instance Non-Overlapping Concurrency
```gherkin
Given 4 distinct physical servo motors (Port A, Port B, Port C, Port D)
When allocating instance 1 with (Port A, Port B) and instance 2 with (Port C, Port D)
Then both allocations succeed with PBIO_SUCCESS returning distinct memory pointers
And neither instance interferes with the other instance's kinematic calculations or controller state.
```

### Scenario 5: MicroPython EBUSY Exception Mapping
```gherkin
Given a running MicroPython environment on virtual hub or physical hardware
When user code instantiates robot_a = MDRobotBase(Motor(Port.A), Motor(Port.B))
And subsequently executes robot_b = MDRobotBase(Motor(Port.A), Motor(Port.B))
Then instantiation of robot_b raises OSError with errno EBUSY (16)
And robot_a remains fully functional and accessible.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Duplicate Motor Pair Rejection | 100% returns `PBIO_ERROR_BUSY` | Native C test assertions (`tt_uint_op`) |
| Partial Overlap Rejection | 100% returns `PBIO_ERROR_BUSY` | Cross-port combination test |
| Released Slot Reclaim | 100% returns `PBIO_SUCCESS` | Interleaved get/put test |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test execution | High-resolution Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-010-1:** `pbio_mdrobotbase_get_robotbase()` returns `PBIO_ERROR_BUSY` when invoked with servos already owned by an active instance.
- **AC-MDRB-010-2:** Calling `pbio_mdrobotbase_put_robotbase()` releases the motor claim, allowing subsequent allocation with the same servos.
- **AC-MDRB-010-3:** Attempting to construct two MicroPython `MDRobotBase` instances on the same ports raises `OSError(EBUSY)`.
- **AC-MDRB-010-4:** Zero memory leaks or dangling pointers occur when closing one instance while another instance is operating on different motors.
