# G-MDRB-005 Baseline Blocker & Socratic 5-Why Dialectic Report

- **Goal ID:** `G-MDRB-005`
- **Title:** Distinct Timeout and Stall Failure Reporting
- **Timestamp:** `2026-09-07T19:00:00+07:00`
- **Feature Branch:** `feature/mdrobotbase-enhancement`
- **Exact-HEAD Provenance:** `0582aefe38928ed3fe7456775dc5784a901bd28b`
- **Framework:** Soda OS Agent OS
- **Status:** Baseline Blocker Frozen (7 Failures Detected, Remediation Plan Active)

---

## 1. Executive Summary & Defect Characterization

In the baseline implementation of `pybricks/robotics/pb_type_mdrobotbase.c`, motion failures caused by timeout expiration and motor stalls are silently masked:
1. **Global Timeout Masquerade:** When `elapsed_ms >= self->rb->timeout_ms`, the motors are stopped, but the motion iteration routine returns `PBIO_SUCCESS`.
2. **Motor Stall Masquerade:** In final heading alignment ([line 161](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L161)), straight navigation ([line 423](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L423)), turn ([line 505](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L505)), and pivot ([line 601](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L601)), detected stalls halt the actuators but unconditionally return `PBIO_SUCCESS`.
3. **No Queryable Motion Status:** `pbio_mdrobotbase_t` lacks a `motion_status` enum field to inform callers whether a completed motion was successful, timed out, or stalled.
4. **Silent Autonomous Failure:** Caller scripts and higher-level mission planners believe the robot reached its target waypoint or heading, proceeding with mission operations in the wrong physical pose or with jammed mechanisms.

---

## 2. Baseline Socratic Dialectic Evaluation

Execution of `scripts/harness/socratic-agentic-loop-g-mdrb-005-harness.mjs`:
- Total Checks: 25
- Passed Checks: 18 (72.0%)
- Failed Checks: 7 (28.0%)

### Detailed Failure Breakdown

| Branch | Level | Question | Defect Details |
|---|---|---|---|
| `branch-1-silent-failure-masking` | L1 | Why must timeout/stall return distinct error codes instead of `PBIO_SUCCESS`? | `timeout_ms` check at line 89 returns `PBIO_SUCCESS` |
| `branch-1-silent-failure-masking` | L3 | Why must timeout specifically return `PBIO_ERROR_TIMEDOUT`? | Missing `return PBIO_ERROR_TIMEDOUT;` |
| `branch-1-silent-failure-masking` | L4 | Why must motor stall specifically return `PBIO_ERROR_FAILED`? | Missing `return PBIO_ERROR_FAILED;` |
| `branch-1-silent-failure-masking` | L5 | Why must `pbio_mdrobotbase_motion_status_t` be formally defined? | Enum missing from `lib/pbio/include/pbio/mdrobotbase.h` |
| `branch-4-micropython-exception-dispatch` | L4 | Why must caller scripts be able to query `stalled()` or `status()`? | No `stalled` or `done` methods exposed on `MDRobotBase` |
| `branch-5-lifecycle-clean-reset` | L3 | Why must new commands transition `motion_status` to `RUNNING`? | No transition to `PBIO_MDROBOTBASE_STATUS_RUNNING` |
| `branch-5-lifecycle-clean-reset` | L5 | Why is real embedded test execution the verification standard? | `test_mdrobotbase_motion_failure_reporting` not yet in `test_mdrobotbase.c` |

---

## 3. Socratic 5-Why Recursive Dialectic Analysis

### Branch 1: Silent Failure Masking & Error Semantics
- **Why 1:** Why did the baseline motion loop return `PBIO_SUCCESS` on timeout and stall?  
  *Finding:* The original implementation focused only on stopping the motors and clearing `motion_in_progress = false`, treating any termination of the loop as a completed routine.
- **Why 2:** Why is treating an abortive loop exit as success dangerous for autonomous robotics?  
  *Finding:* In competition and industrial robotics, mission planning Sagars depend on successful waypoint arrival. Returning success on stall causes the robot to deploy actuators or score objects in the wrong place.
- **Why 3:** Why must timeout specifically return `PBIO_ERROR_TIMEDOUT`?  
  *Finding:* It uniquely maps to POSIX `ETIMEDOUT` (`OSError: [Errno 110] ETIMEDOUT`), allowing caller scripts to handle deadlines differently from physical motor jams.
- **Why 4:** Why must motor stalls specifically return `PBIO_ERROR_FAILED`?  
  *Finding:* `PBIO_ERROR_FAILED` maps to `RuntimeError`, signaling an unexpected physical obstruction or jammed drivetrain requiring immediate safety intervention.
- **Why 5:** Why must `pbio_mdrobotbase_motion_status_t` be formally declared in `pbio/mdrobotbase.h`?  
  *Finding:* To decouple error return codes from persistent status inspection, providing a standardized C and Python type system for robot state inspection.

---

## 4. Remediation Plan

1. **Header Declaration:** Add `pbio_mdrobotbase_motion_status_t` to `lib/pbio/include/pbio/mdrobotbase.h` with values:
   `PBIO_MDROBOTBASE_STATUS_NONE`, `PBIO_MDROBOTBASE_STATUS_RUNNING`, `PBIO_MDROBOTBASE_STATUS_COMPLETED`, `PBIO_MDROBOTBASE_STATUS_STALLED`, `PBIO_MDROBOTBASE_STATUS_TIMED_OUT`. Add `motion_status` to `pbio_mdrobotbase_t`.
2. **Firmware State Management:** In `lib/pbio/src/mdrobotbase.c`, initialize `motion_status = PBIO_MDROBOTBASE_STATUS_NONE` in `pbio_mdrobotbase_init()` and `pbio_mdrobotbase_motion_reset()`. Add `pbio_mdrobotbase_get_motion_status()`.
3. **Motion Iteration Refactor:** In `pybricks/robotics/pb_type_mdrobotbase.c`:
   - On timeout: set `motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT`, stop servos per `stop_behavior`, reset angles if not coast, clear `motion_type` and `motion_in_progress`, return `PBIO_ERROR_TIMEDOUT`.
   - On stall (alignment, straight, turn, pivot): set `motion_status = PBIO_MDROBOTBASE_STATUS_STALLED`, stop servos per `stop_behavior`, clear flags, return `PBIO_ERROR_FAILED`.
   - On arrival: set `motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED`, return `PBIO_SUCCESS`.
   - On motion launch: set `motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING`.
   - Add Python methods `stalled()`, `done()`, `status()`.
4. **Embedded Verification:** Add `test_mdrobotbase_motion_failure_reporting()` in `lib/pbio/test/src/test_mdrobotbase.c`.
