# Acceptance Contract: G-MDRB-024

**Goal ID:** `G-MDRB-024`
**Title:** Single-Source-of-Truth FSM Status Transition Engine & Terminal Helper Enforcement
**Epic:** MDRB
**Kind:** feature

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Reaching Motion Target Updates Status and Progress Atomically (AC-MDRB-024-1)
- **Given** an MDRobotBase instance in active motion with `status() == STATUS_RUNNING` and `done() == False`.
- **When** the robot advances until the navigation goal or turn target is within terminal tolerance.
- **Then** the terminal helper `pb_type_mdrobotbase_mark_completed()` is invoked.
- **And** `robot.status()` synchronously transitions to `STATUS_COMPLETED`.
- **And** `robot.done()` returns `True`.

### Scenario 2: Physical Motor Stall Updates Status to Stalled without Discrepancy (AC-MDRB-024-2)
- **Given** an MDRobotBase instance actively executing a drive command.
- **When** external mechanical resistance halts the wheels such that stall conditions persist beyond 200 ms.
- **Then** the terminal helper `pb_type_mdrobotbase_mark_stalled()` is invoked.
- **And** `robot.status()` synchronously transitions to `STATUS_STALLED`.
- **And** `robot.done()` returns `True`.

### Scenario 3: Global Motion Timeout Updates Status to Timed-Out (AC-MDRB-024-3)
- **Given** an MDRobotBase instance configured with a non-zero timeout limit `timeout_ms`.
- **When** the elapsed movement duration reaches or exceeds `timeout_ms`.
- **Then** the terminal helper `pb_type_mdrobotbase_mark_timed_out()` is invoked.
- **And** `robot.status()` synchronously transitions to `STATUS_TIMED_OUT`.
- **And** `robot.done()` returns `True`.

### Scenario 4: Zero Direct Struct Field Assignments in MicroPython Layer (AC-MDRB-024-4)
- **Given** the source file `pybricks/robotics/pb_type_mdrobotbase.c`.
- **When** static analysis searches for raw assignment pattern `rb->motion_status =`.
- **Then** zero occurrences are detected outside transition helper implementations.

### Scenario 5: Rejection of Prohibited Cross-Terminal Transitions (AC-MDRB-024-5)
- **Given** an MDRobotBase instance in state `STATUS_COMPLETED`.
- **When** an internal routine erroneously attempts to set state directly to `STATUS_STALLED`.
- **Then** the FSM transition function returns `PBIO_ERROR_INVALID_OP`.
- **And** the status remains unchanged as `STATUS_COMPLETED`.
