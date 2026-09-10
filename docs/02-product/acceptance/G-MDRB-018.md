# Acceptance Contract: G-MDRB-018

**Goal ID:** `G-MDRB-018`
**Title:** Architectural Maintainability & Hardware Abstraction Layer Consolidation
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Architectural Maintainability & Hardware Abstraction Layer Consolidation
  As an embedded firmware and robotics systems architect
  I want shared lifecycle, pose query, and motion status boundaries between the PBIO C driver engine and MicroPython wrapper consolidated behind clean accessor interfaces
  So that direct struct member dereferences ("self->rb->...") are eliminated from language wrapper queries, internal driver state is cleanly encapsulated, and the abstraction boundary remains robust, maintainable, and verifiable across future releases.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Encapsulated Pose Accessor Routing
```gherkin
Given an initialized MDRobotBase instance in MicroPython or native C
When a caller requests the current robot pose (x, y, theta)
Then the request executes via pbio_mdrobotbase_get_pose(rb, &x, &y, &theta)
And valid floating-point pointers receive current coordinate values
And null argument pointers immediately fail closed with PBIO_ERROR_INVALID_ARG
And self->rb->x, self->rb->y, self->rb->theta are never directly dereferenced in pb_type_MDRobotBase_get_state.
```

### Scenario 2: Encapsulated Motion Status Accessor Routing
```gherkin
Given an initialized MDRobotBase instance
When a caller queries the motion status code via robot.status()
Then the query executes via pbio_mdrobotbase_get_motion_status(self->rb, &status)
And returns an integer corresponding to the discrete pbio_mdrobotbase_motion_status_t enum
And null argument pointers immediately fail closed with PBIO_ERROR_INVALID_ARG.
```

### Scenario 3: Encapsulated Done & Stalled Query Accessors
```gherkin
Given an initialized MDRobotBase instance
When a caller queries robot.done() or robot.stalled()
Then robot.done() evaluates through pbio_mdrobotbase_is_done(self->rb, &done)
And robot.stalled() evaluates through pbio_mdrobotbase_is_stalled(self->rb, &stalled)
And null argument pointers immediately fail closed with PBIO_ERROR_INVALID_ARG.
```

### Scenario 4: Encapsulated Motion Type Query Accessor
```gherkin
Given an initialized MDRobotBase instance
When querying or inspecting the active motion type
Then the query executes via pbio_mdrobotbase_get_motion_type(self->rb, &motion_type)
And returns the active motion enum (NONE, NAVIGATE, TURN, PIVOT, TRAJECTORY).
```

### Scenario 5: Flash Footprint & Zero Overhead Guarantee
```gherkin
Given the compiled PBIO firmware and MicroPython modules
When comparing flash footprint before and after accessor encapsulation
Then the firmware binary size increase is less than 64 bytes
And function call latency overhead remains under 1 microsecond.
```

---

## 3. Acceptance Criteria Traceability Matrix

| Requirement ID | Acceptance Criterion | Verification Method |
| :--- | :--- | :--- |
| **AC-MDRB-018-1** | All robot pose queries route through `pbio_mdrobotbase_get_pose()`. | Static inspection of `pb_type_mdrobotbase.c` and unit tests in `test_mdrobotbase.c`. |
| **AC-MDRB-018-2** | All robot status queries route through `pbio_mdrobotbase_get_motion_status()`. | Verified in `pb_type_MDRobotBase_status` and unit test assertions. |
| **AC-MDRB-018-3** | `robot.done()` and `robot.stalled()` route through `pbio_mdrobotbase_is_done()` and `pbio_mdrobotbase_is_stalled()`. | Verified in `pb_type_MDRobotBase_done` and `pb_type_MDRobotBase_stalled`. |
| **AC-MDRB-018-4** | Zero direct struct dereferences remain in status/pose query functions in `pb_type_mdrobotbase.c`. | Regex and AST audit across `pb_type_mdrobotbase.c`. |
| **AC-MDRB-018-5** | PBIO native test suite and VirtualHub suites execute with 100% green pass and zero compiler warnings. | Automated test run via `test-pbio` and master replication harness. |

---

## 4. Sign-Off Gate

- [ ] Technical Lead Approval
- [ ] Product / QA Sign-off
- [ ] 100% Release Gate Certification Passed
