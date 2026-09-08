# G-MDRB-005: Distinct Timeout and Stall Failure Reporting

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Eliminate silent masking of motion failures by returning distinct error codes and MicroPython exceptions for timeouts, stalls, and device faults  
**Epic:** MDRB  
**Depends on:** G-MDRB-004  
**Blocks:** G-MDRB-006  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Add distinct PBIO error returns for timeout and stall in motion loops | done |
| 2 | Ensure clean motion state cleanup and error propagation in MicroPython | done |
| 3 | Construct simulated stall and timeout verification test suite | done |

## Context

Codex architectural review scorecard assigned Motion Failure Semantics a baseline score of **4/10 (High Risk)**.
In [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c), timeout and motor stall conditions stop the motors but unconditionally return `PBIO_SUCCESS`:
- Global timeout check ([line 100](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L100)):
  ```c
  if (self->rb->timeout_ms > 0 && elapsed_ms >= self->rb->timeout_ms) {
      pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
      pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
      ...
      return PBIO_SUCCESS; // <--- Returns success on timeout!
  }
  ```
- Stall detection in final turn ([line 161](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L161)):
  ```c
  if (self->rb->stall_time_ms > 200.0f) {
      ...
      return PBIO_SUCCESS; // <--- Returns success on stall!
  }
  ```
- Stall detection in straight motion ([line 421](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L421)):
  ```c
  if (self->rb->stall_time_ms > 250.0f) {
      ...
      return PBIO_SUCCESS; // <--- Returns success on stall!
  }
  ```

Because `PBIO_SUCCESS` is returned, user scripts and autonomous routines believe the robot reached the target waypoint or heading, and proceed to execute mission tasks in the wrong location or while physically jammed.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** A motion failure must never masquerade as a success; silently ignoring timeouts and stalls leads to cumulative localization failure, physical mechanism damage, and broken autonomous sequencing.  
**Done when:** Motor stalls and timeout expirations stop the actuators according to configured completion behavior, clear active motion flags, and return distinct, inspectable failure codes/exceptions to caller scripts.  
**Unblocks:** G-MDRB-006 (Async Cancellation and Repeated-Motion Lifecycle Safety).

## Atomicity & Zero-Mock Contract

- **One outcome:** Explicit failure status reporting and exception propagation for motor stalls and motion timeouts.
- **No decomposition leakage:** Odometry math belongs to `G-MDRB-004`; async preemption mechanics belong to `G-MDRB-006`.
- **Concrete execution:** 100% concrete error return codes in PBIO and MicroPython exception raises. Zero mocks, zero stubs.
- **Real boundary verification:** Verified using real servo stall simulations and hardware timers in PBIO and VirtualHub.
- **Failure behavior:** Stall returns `PBIO_ERROR_FAILED` (or raises `RuntimeError("motor stalled")`), timeout returns `PBIO_ERROR_TIMEDOUT` (or raises `OSError(ETIMEDOUT)`).

## How

**Stack / approach:**
- In `lib/pbio/include/pbio/mdrobotbase.h`:
  - Define `pbio_mdrobotbase_motion_status_t`:
    `PBIO_MDROBOTBASE_STATUS_NONE`, `PBIO_MDROBOTBASE_STATUS_COMPLETED`, `PBIO_MDROBOTBASE_STATUS_STALLED`, `PBIO_MDROBOTBASE_STATUS_TIMED_OUT`.
  - Add `status` field to `pbio_mdrobotbase_t`.
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - On timeout:
    - Set `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT`.
    - Stop servos per `self->rb->stop_behavior`.
    - Clear `motion_in_progress = false`.
    - Return `PBIO_ERROR_TIMEDOUT`.
  - On stall:
    - Set `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED`.
    - Stop servos per `self->rb->stop_behavior`.
    - Clear `motion_in_progress = false`.
    - Return `PBIO_ERROR_FAILED`.
  - In awaitable wrapper:
    - Propagate `PBIO_ERROR_TIMEDOUT` as `OSError(ETIMEDOUT)`.
    - Propagate `PBIO_ERROR_FAILED` as `RuntimeError("motion stalled")` or update queryable `was_stalled()` / `was_timed_out()` status.

## Open questions

*(None — error semantics confirmed via Codex review Step 5)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 5 (Motion failure semantics)` |
| Root Cause | `pybricks/robotics/pb_type_mdrobotbase.c:100,161,421` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Motion Status State Definition
**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h`  
**Actions:**
1. Define `pbio_mdrobotbase_motion_status_t` enum.
2. Add `motion_status` member to `pbio_mdrobotbase_t`.

**Completion gate:** Type definitions compile cleanly.  
**Stop condition:** Any naming conflict with existing PBIO enums.

### Step 2 — Distinct Error Code Return in Motion Loop
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Replace `return PBIO_SUCCESS;` on timeout with `return PBIO_ERROR_TIMEDOUT;`.
2. Replace `return PBIO_SUCCESS;` on stall with `return PBIO_ERROR_FAILED;`.
3. Preserve configured stop behavior (`HOLD`/`BRAKE`/`COAST`).
4. Always clear `motion_in_progress = false` and `motion_type = PBIO_MDROBOTBASE_MOTION_NONE`.

**Completion gate:** Motion loop returns distinct non-success errors on abnormal termination.  
**Stop condition:** Motors left running or motion flag left asserted.

### Step 3 — Stall and Timeout Verification Tests
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`, `tests/virtualhub/robotics/test_mdrobotbase_errors.py`  
**Actions:**
1. Simulate stalled motor where velocity is near zero while command is active; verify stall error returned.
2. Simulate elapsed timeout; verify `PBIO_ERROR_TIMEDOUT` returned.
3. Verify normal arrival still returns `PBIO_SUCCESS`.
4. Verify subsequent motion starts cleanly after stall or timeout.

**Completion gate:** All tests pass with 100% green; failure states strictly separated from success.  
**Stop condition:** Any false positive stall or masked timeout.

## In

- Distinct PBIO error codes (`PBIO_ERROR_TIMEDOUT`, `PBIO_ERROR_FAILED`) for abort conditions.
- Clearing active motion flags on abort.
- Adhering to configured stop behavior on abort.
- Queryable motion status field.

## Out

- Async cancellation and generator preemption (handled in `G-MDRB-006`).
- Changing stall threshold velocities or timers.
- Changing normal motion convergence tolerance.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | Add | `motion_status` in `lib/pbio/include/pbio/mdrobotbase.h` |
| Timeout | Modify | Return `PBIO_ERROR_TIMEDOUT` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Stall | Modify | Return `PBIO_ERROR_FAILED` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Testing | Add | Stall & timeout tests in `lib/pbio/test/src/test_mdrobotbase.c` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Fault Detection & Failure Reporting |
| **Ports & Adapters Topology** | Inbound: Motion Execution Engine <br> Outbound: Exception Dispatch & Motor Stop Ports |
| **State Machine & Invariants** | Motion States: `RUNNING` -> (`COMPLETED` \| `STALLED` \| `TIMED_OUT`) |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Simulating zero progress with active speed command triggers stall abort and returns `PBIO_ERROR_FAILED`.
- [x] Simulating elapsed time exceeding `timeout_ms` triggers timeout abort and returns `PBIO_ERROR_TIMEDOUT`.
- [x] On stall or timeout, motors are stopped according to `stop_behavior` (`HOLD`/`BRAKE`/`COAST`).
- [x] Normal target arrival within tolerance continues to return `PBIO_SUCCESS`.
- [x] Subsequent motion commands start cleanly without stale error residue.

## Test plan

- Execute `lib/pbio/test/src/test_mdrobotbase.c` with simulated motor stalls and timeouts.
- Execute VirtualHub Python tests asserting exception raising on stalled motion.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Never swallow `PBIO_ERROR_TIMEDOUT` or `PBIO_ERROR_FAILED` in the MicroPython awaitable dispatcher.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Motion::Running` | Velocity command active | Progress monitor valid | Drive motors | Transition to abort on fault |
| `Motion::Stalled` | Velocity $< 10\text{deg/s}$ for $>200\text{ms}$ | Commanded $>40\text{deg/s}$ | Stop motors per `then` | Return `PBIO_ERROR_FAILED` |
| `Motion::TimedOut` | Elapsed time $\ge \text{timeout\_ms}$ | Timeout configured | Stop motors per `then` | Return `PBIO_ERROR_TIMEDOUT` |
| `Motion::Success` | Target pose reached | Distance $\le \text{tolerance}$ | Hold position | Return `PBIO_SUCCESS` |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Stall Detection Guard** | $|v_{\text{cmd}}| > 30\text{mm/s} \land |v_{\text{raw}}| < 10\text{mm/s}$ for $t > 250\text{ms}$. |
| **Timeout Guard** | $t_{\text{elapsed}} \ge t_{\text{timeout}} > 0$. |
| **Stop Decoupling** | Status is failure, but actuator command strictly follows configured `stop_behavior`. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Motion Execution Monitor Port (`pb_type_mdrobotbase_motion_iterate_once`).
- **Outbound Driven Port:** Actuator Emergency Stop Port (`pbio_servo_stop`).
