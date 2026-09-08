# G-MDRB-011: Validate-Before-Cancel Motion Lifecycle & Preemption Safety

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Enforce argument parsing and geometric/speed validation prior to invoking cancel_active_motion and motion_reset across all motion dispatch methods in pb_type_mdrobotbase.c  
**Epic:** MDRB  
**Depends on:** G-MDRB-010  
**Blocks:** G-MDRB-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Validation Ordering Alignment | done |
| 2 | Reorder Motion Dispatch Argument Parsing Before Cancellation | done |
| 3 | Verification & Invalid Preemption Regression Test Pass | done |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c:1008-1009`, `1402`, `1556`, and `1734`, motion entry functions (`navigate_to_goal`, `turn_angle`, `pivot_angle`, `follow_trajectory`) invoke `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)` at the very beginning of the C function, prior to calling `mp_arg_parse_all` or validating argument types and bounds. If a user calls a new motion with missing, malformed, or out-of-range arguments, MicroPython raises a `TypeError` or `ValueError`, but the active running motion has already been prematurely aborted and motor controllers reset.

### Scorecard & Baseline Evidence
- **Current score:** 10/10 (Async lifecycle verified) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:1008-1009`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1008-L1009), [`1402`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1402), [`1556`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1556), [`1734`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1734)
- **Root cause:** Preemptive cancellation occurs at method preamble instead of transition commit point following successful validation.
- **Reproduction steps:**
  1. Dispatch background straight motion: `task = run_task(robot.straight(1000, speed_mm_s=200))`
  2. Attempt invalid preemption: `robot.navigate_to_goal("invalid_coordinate", 0)`
  3. Catch expected `TypeError` in user code.
  4. Observe motors: Robot has unexpectedly stopped because `cancel_active_motion` executed before argument validation failed.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Aborting active motion routines before validating replacement commands corrupts autonomous navigation state and violates transaction safety.  
**Done when:** Any invalid, malformed, or out-of-range motion command raises an immediate exception without cancelling the active motion or issuing motor stop commands.  
**Unblocks:** G-MDRB-012  

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: strict validate-before-cancel sequencing across all motion entry points.
- **No decomposition leakage:** Ownership checks (G-MDRB-010) and closed-state guards (G-MDRB-012) are separate atomic deliverables.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or dummy simulations in implementation or acceptance tests.
- **Real boundary verification:** Verified via MicroPython C runtime argument parsing and virtual hub asynchronous task execution.
- **Failure behavior:** Malformed inputs raise standard Python exceptions while existing motion continues towards its target.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C MicroPython binding layer with two-phase parameter commit:
1. Parse all keyword and positional arguments via `mp_arg_parse_all`.
2. Extract and validate parameters (finite float coordinates, speeds > 0, trajectory length $\in [2, 64]$, each waypoint containing at least 2 finite coordinates).
3. Only upon full validation passing, execute `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)`.
4. Commit parameters to `self->rb` and initiate the new motion.

### Proposed implementation strategy
- Move `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)` to execute only after `mp_arg_parse_all` succeeds and all parameters are verified.
- Define a transactional motion dispatch pattern: Parse -> Validate -> Cancel Old -> Initialize New.
- Write tests dispatching an active motion, firing an invalid command, and asserting that the original motion finishes successfully.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] Trajectory points array validation validates all points, bounds, and parameters before cancelling active motion.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-LIFECYCLE-PREEMPTION |
| **Decisions** | PDR-MDRB-VALIDATE-BEFORE-CANCEL |
| **Assumptions required** | A-TRANSACTIONAL-MOTION-COMMIT |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Two-Phase Commit, Transactional State Transition |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-011.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` |
| **Constraints** | Zero mocks, zero premature motor cancellation |

## Work steps

### Step 1 — Specification & Validation Ordering Alignment

**Allowed files:** `docs/07-backlog/goals/G-MDRB-011.md` · `docs/02-product/acceptance/G-MDRB-011.md`  
**Actions:**

1. Specify Given-When-Then BDD scenarios for invalid motion dispatch during running motion.
2. Formulate test matrix covering navigate, turn, pivot, and follow_trajectory.

**Completion gate:** Acceptance criteria defined with zero unresolved clarification tags.  
**Stop condition:** Ambiguity regarding which validation exceptions are non-cancelling.

### Step 2 — Reorder Motion Dispatch Argument Parsing Before Cancellation

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**

1. Move `cancel_active_motion` and `motion_reset` below `mp_arg_parse_all` and parameter sanity checks in `pb_type_MDRobotBase_navigate_to_goal`.
2. Apply the same reordering in `turn_angle`, `pivot_angle`, and `follow_trajectory`.

**Completion gate:** C code compiles without warnings and passes unit tests.  
**Stop condition:** Compiler warnings or regression in valid motion dispatch.

### Step 3 — Verification & Invalid Preemption Regression Test Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`  
**Actions:**

1. Add VirtualHub test starting background motion A and calling invalid motion B.
2. Assert that exception is caught and motion A completes to expected pose.

**Completion gate:** Automated test executes and passes with exit code 0.  
**Stop condition:** Motion A stops early when invalid motion B is dispatched.

## In

- Moving cancellation and reset past argument parsing and parameter validation across all motion entry points.
- Adding regression test in `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`.

## Out

- Native slot allocation logic (addressed in G-MDRB-010).
- Closed-object method guarding (addressed in G-MDRB-012).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Binding | Modify | `pybricks/robotics/pb_type_mdrobotbase.c`: defer `cancel_active_motion` and `motion_reset` until after successful argument parsing and validation |
| Tests | Add | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`: test invalid argument preemption non-interference |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `micropython-binding` \| `robot-kinematics-engine` |
| **Bounded Context & Domain** | Robotics Kinematics \| Async Motion Lifecycle |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython Motion Methods <br> Driven Outbound: PBIO Motor Motion Controller |
| **State Machine & Invariants** | Transaction Invariant: State transitions $S_1 \to S_2$ occur iff new motion parameters $P_{new}$ are valid |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not `open` + `low`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)

## Acceptance criteria

- [x] Calling `navigate_to_goal` with invalid types or missing parameters raises `TypeError` without cancelling an active background motion.
- [x] Calling `turn_angle` or `pivot_angle` with non-finite values (`nan`, `inf`) raises `ValueError` without cancelling an active background motion.
- [x] Calling `follow_trajectory` with an empty or oversized trajectory list raises `ValueError` without cancelling an active background motion.
- [x] Zero motor stop commands are issued to PBIO when a new motion call fails validation.

## Test plan

- Command: `pytest tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- Verification: Assert active motion completes to target distance after failed preemption attempts.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`

## Notes for AI

- Only invoke `pb_type_mdrobotbase_cancel_active_motion` once all arguments are parsed and proven valid.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Running` | New motion request | Parameters parsed & validated | Cancel active motion; start new | If validation fails, remain in `State::Running` |
| `State::Running` | Invalid motion request | Validation fails | Raise exception | Preserve active motion targets & state |
| `State::Transition` | Validated motion commit | Prior motion cancelled | Initialize trajectory & motor targets | Rollback if motor startup fails |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Atomic State Mutation** | Active motion state mutation occurs strictly after $V(P) = \text{true}$ where $V$ is the parameter validator. |
| **Zero Side-Effect Rejection** | For any invalid argument vector $P_{invalid}$, $\Delta \text{motor\_commands} = 0$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `MotionDispatchPort` | MicroPython C method call | `pybricks/robotics/pb_type_mdrobotbase.c` |
| **Driven (Outbound)** | `MotionCancellationPort` | Internal C function | `pb_type_mdrobotbase_cancel_active_motion` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Ready for motion command | `bg-surface-elevated` |
| **2. Loading / Pending** | Validating arguments | `animate-pulse` |
| **3. Empty State** | Zero active motions | `text-content-secondary` |
| **4. Error State** | Invalid argument exception notification | `text-status-error` |
| **5. Success State** | Motion actively running | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- State preservation theorem: Let $S(t)$ be active motion state. For invalid input $I$, $S(t^+) = S(t)$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Proof that syntax/semantic errors in motion calls produce 0 PBIO motor commands.
- **Consistent state on failure:** Robot heading, velocity, and odometry are unaffected by rejected API calls.
- **Regression scenarios:** Interleaving valid and invalid commands during rapid task execution.
