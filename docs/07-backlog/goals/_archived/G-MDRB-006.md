# G-MDRB-006: Async Cancellation and Repeated-Motion Lifecycle Safety

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Harden asynchronous motion lifecycle to guarantee deterministic preemption, safe stop calls, and no dangling awaitables  
**Epic:** MDRB  
**Depends on:** G-MDRB-005  
**Blocks:** G-MDRB-007  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement active motion preemption and cancellation protocol in MicroPython binding | done |
| 2 | Guard stop() against NULL awaitable and ensure deterministic iteration termination | done |
| 3 | Construct lifecycle sequence verification test suite | done |

## Context

Codex architectural review scorecard assigned Async Lifecycle a baseline score of **7/10 (Moderate Risk)**.
In [`pybricks/robotics/pb_type_mdrobotbase.c:32,68`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L32), `self->last_awaitable` tracks the running async generator. However:
1. When a new motion command (e.g., `turn_angle`) is invoked while a previous motion (`go_forward`) is still executing, the binding overwrites `self->rb->motion_type` and starts commanding the motors without deterministically canceling or completing the first awaitable.
2. The old awaitable continues to receive iteration cycles from the MicroPython cooperative poller, interleaved with the new motion's commands, corrupting motor setpoints.
3. In `pb_type_MDRobotBase_stop()`, calling `pb_type_async_schedule_stop_iteration(self->last_awaitable)` when no awaitable is active or when already completed risks operating on stale memory.
4. Completion, cancellation, timeout, and stall must all stop or coast strictly according to `then`, without leaving unpolled generators in the task queue.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Multi-step autonomous navigation frequently interrupts or chains motions; allowing orphaned asynchronous tasks to run concurrently with newly dispatched motions creates race conditions and uncontrolled robot movements.  
**Done when:** Dispatching a new motion while an existing motion is active cleanly terminates the previous motion, calling stop when idle is completely safe, and completion, cancellation, timeout, and stall leave no active or iterating awaitable state.  
**Unblocks:** G-MDRB-007 (Trajectory and Controller Input Validation).

## Atomicity & Zero-Mock Contract

- **One outcome:** Deterministic preemption, termination, and state cleanup across the asynchronous motion lifecycle.
- **No decomposition leakage:** Motion failure semantics belong to `G-MDRB-005`; trajectory parsing belongs to `G-MDRB-007`.
- **Concrete execution:** 100% concrete C protothread/awaitable integration. Zero mocks, zero stubs.
- **Real boundary verification:** Verified via sequential and concurrent async lifecycle test loops in VirtualHub and PBIO.
- **Failure behavior:** Attempting to iterate an aborted or canceled motion yields immediate `StopIteration` without sending motor pulses.

## How

**Stack / approach:**
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - Introduce lifecycle preemption helper `pb_type_mdrobotbase_cancel_active_motion(pb_type_MDRobotBase_obj_t *self)`:
    1. If `self->rb->motion_in_progress`:
       - Signal stop iteration on `self->last_awaitable`.
       - Stop servos according to `then` behavior.
       - Clear `self->rb->motion_in_progress = false`.
       - Clear `self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE`.
    2. Set `self->last_awaitable = NULL`.
  - In `pb_type_MDRobotBase_stop()`:
    - Guard `if (self->last_awaitable)` before scheduling stop iteration.
    - Reset `self->last_awaitable = NULL`.
  - Call `pb_type_mdrobotbase_cancel_active_motion(self)` at the beginning of every motion dispatcher (`go_forward`, `turn_angle`, `pivot_turn`, `follow_trajectory`).
  - In `pb_type_mdrobotbase_motion_iterate_once()`:
    - If `!self->rb->motion_in_progress`, return `PBIO_SUCCESS` immediately to trigger generator completion.

## Open questions

*(None — lifecycle state transitions confirmed via Codex review Step 6)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 6 (Async lifecycle)` |
| Root Cause | `pybricks/robotics/pb_type_mdrobotbase.c:32,68` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Active Motion Preemption Protocol
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Implement `pb_type_mdrobotbase_cancel_active_motion()`.
2. Guard all motion entrypoints to cancel active motions before launching new ones.

**Completion gate:** Starting motion B while motion A is running cleanly terminates motion A without interleaving.  
**Stop condition:** Any concurrent motor command conflict.

### Step 2 — Safe Stop & Null Awaitable Guards
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Check `self->last_awaitable != NULL` before calling `pb_type_async_schedule_stop_iteration`.
2. Clear `self->last_awaitable = NULL` upon completion, cancellation, or stop.

**Completion gate:** Calling `robot.stop()` on an idle robot executes safely without crashes.  
**Stop condition:** Any NULL pointer dereference.

### Step 3 — Lifecycle Sequence Verification Tests
**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`, `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**
1. Test Start -> Complete.
2. Test Start -> Cancel.
3. Test Start -> Timeout.
4. Test Start -> Stall.
5. Test Start Motion A -> immediately Start Motion B.
6. Test Complete -> start second motion.

**Completion gate:** All 6 lifecycle sequences pass 100% green without stale task leakage.  
**Stop condition:** Any zombie awaitable continuing to poll.

## In

- Preemption of active motions upon new motion request.
- Safe `stop()` invocation when idle or unallocated.
- Clearing `last_awaitable` pointers upon termination.
- Test coverage for all 6 canonical lifecycle transitions.

## Out

- Modifying trajectory mathematical interpolation (handled in `G-MDRB-007`).
- Low-level motor PID tuning.
- Multi-robot instance allocation (handled in `G-MDRB-001`).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Preemption | Add | `cancel_active_motion` helper in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Stop Guard | Modify | Guard `self->last_awaitable` in `pb_type_MDRobotBase_stop` in `pb_type_mdrobotbase.c` |
| Iterate Guard | Modify | Immediate completion if `!motion_in_progress` in `pb_type_mdrobotbase.c` |
| Testing | Add | Lifecycle sequence test suite in `tests/virtualhub/robotics/` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Cooperative Async Task Lifecycle |
| **Ports & Adapters Topology** | Inbound: MicroPython Async Generator Loop <br> Outbound: PBIO Protothread Task Scheduler |
| **State Machine & Invariants** | Task States: `IDLE` -> `ACTIVE` -> (`STOPPING` \| `PREEMPTING` \| `FAULTING`) -> `IDLE` |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Calling `stop()` when no motion is active does not crash or raise exceptions.
- [x] Launching motion B while motion A is active terminates motion A and executes motion B cleanly.
- [x] An awaitable stopped by completion, cancellation, timeout, or stall stops iterating immediately.
- [x] Motor stop behavior (`HOLD`/`BRAKE`/`COAST`) is strictly honored across all termination paths.
- [x] No stale awaitable continues to execute in background task poller.

## Test plan

- Execute `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` executing all 6 transition sequences.
- Verify cooperative task scheduler cleans up completed generator contexts.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Ensure generator cleanup happens in constant time without blocking MicroPython poller.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Lifecycle::Idle` | Start motion | No active task | Allocate awaitable, transition to `Active` | Return error on allocation failure |
| `Lifecycle::Active` | New motion commanded | Active motion present | Cancel previous task, start new task | Abort previous task immediately |
| `Lifecycle::Stopping` | `stop()` / cancel requested | Active motion present | Stop servos, trigger `StopIteration` | None |
| `Lifecycle::Terminated` | Completion / abort | Generator finished | Clear `last_awaitable = NULL` | None |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Single Active Task Invariant** | At any timestamp $t$, $\text{count}(\text{active\_awaitables}) \le 1$. |
| **Safe Stop Idempotence** | $\text{stop}() \circ \text{stop}() = \text{stop}()$. |
| **Zero Delay Preemption** | Interruption latency $t_{\text{preempt}} < 5\text{ms}$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython Awaitable Polling Interface (`mp_obj_get_type`).
- **Outbound Driven Port:** Async Task Cancellation Port (`pb_type_async_schedule_stop_iteration`).
