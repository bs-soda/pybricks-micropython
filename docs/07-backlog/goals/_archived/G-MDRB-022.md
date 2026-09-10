# G-MDRB-022: Behavioral Motion Preemption Safety & Non-Disruptive Invalid Command Rejection

**Status:** done
**Kind:** feature
**Atomic outcome:** Implement behavioral proofs and guards verifying that attempting replacement motions with invalid arguments raises ValueError without interrupting ongoing motions or issuing premature stops
**Epic:** MDRB
**Depends on:** G-MDRB-021
**Blocks:** G-MDRB-023
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Preemption Invariant Test Formulation | done |
| 2 | Enforce Atomic Validation Across Turn, Pivot, Nav, and Trajectory Dispatch | done |
| 3 | Behavioral Active-Motion Immunity Test Pass | done |

## Context

In competitive robotics, autonomous routines frequently preempt active motions when sensor events occur (e.g. line detection or obstacle proximity).
If a replacement motion command is dispatched with invalid parameters (e.g. `speed <= 0`, non-finite angles, or empty trajectory lists), the system must reject the invalid command with an exception *without* terminating the currently executing motion.
While G-MDRB-011 reordered cancellation after argument parsing for navigation, the turn and pivot paths still require explicit end-to-end behavioral proofs verifying that:
1. Valid Motion A starts and is actively progressing.
2. Invalid replacement command B is submitted and raises `ValueError`.
3. Motion A continues uninterrupted without experiencing sudden braking or reset.

### Scorecard & Baseline Evidence
- **Current score:** 7/10 (Motion control / preemption safety) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:350-520`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L350-L520), Codex Architectural Review finding P1
- **Root cause:** Lack of explicit behavioral assertions proving that invalid command submission leaves ongoing physical motor execution unaffected.
- **Reproduction steps:**
  1. Start `robot.go_forward(500, speed=200)`.
  2. While robot is in motion, call `robot.turn_to_angle(90, speed=-50)`.
  3. Verify whether motion A stops prematurely or whether motors continue tracking until valid completion.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** An invalid command must never accidentally disarm an active robot in tournament conditions; parameter errors should be caught at the gate without disrupting physical machine momentum.
**Done when:** Comprehensive behavioral test suites prove that invalid turn, pivot, navigation, and trajectory replacement commands raise `ValueError` while the active underlying motion continues executing safely to its target.
**Unblocks:** G-MDRB-023

## Atomicity & Zero-Mock Contract

- **One outcome:** Implement and verify non-disruptive invalid command rejection across all motion entry points.
- **No decomposition leakage:** Numerical multi-scale verification belongs to G-MDRB-023.
- **Concrete execution:** 100% concrete VirtualHub motor simulation and native C dispatch. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified using actual VirtualHub motor simulation running asynchronous generator steps.
- **Failure behavior:** If active motion halts, resets, or changes target upon an invalid replacement command, the test fails immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** VirtualHub Behavioral Test Harness & MicroPython Binding:
1. Audit all motion entry points in `pybricks/robotics/pb_type_mdrobotbase.c`:
   - `navigate_to_goal`
   - `go_forward` / `go_backward`
   - `turn_to_angle` / `turn_angle`
   - `pivot_turn_to_angle` / `pivot_turn_angle`
   - `follow_trajectory`
2. Guarantee that every entry point validates:
   - Speed $> 0$ and finite.
   - Target coordinates / angles are finite.
   - Waypoint array capacity and count $\ge 1$.
   *Before* modifying any internal state or invoking motor reset.
3. In `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` and `test_mdrobotbase_turn.py`:
   - Implement `test_invalid_replacement_command_immunity_turn()`.
   - Implement `test_invalid_replacement_command_immunity_pivot()`.
   - Implement `test_invalid_replacement_command_immunity_nav()`.
   - Implement `test_invalid_replacement_command_immunity_trajectory()`.
   - Assert `ValueError` is raised, `robot.done() == False`, `robot.status() == STATUS_RUNNING`, and motor speed remains non-zero.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Does MicroPython allow catching the exception and continuing the generator? Yes, testing in Python uses standard `try...except ValueError` while asserting generator continuity.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-PREEMPTION-JERK |
| **Decisions** | PDR-MDRB-ATOMIC-PREEMPTION-VALIDATE |
| **Assumptions required** | A-COOPERATIVE-COROUTINE-STEP |
| **Evidence** | Codex Architectural Review finding P1 on preemption behavioral proof |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Transactional Command Dispatch, Non-Disruptive Fault Rejection |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-022.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `tests/virtualhub/robotics/test_mdrobotbase_turn.py` |
| **Constraints** | Zero mocks, zero premature motor cancellation |

## Work steps

### Step 1 — Specification & Preemption Invariant Test Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-022.md` · `docs/02-product/acceptance/G-MDRB-022.md`
**Actions:**
1. Define test pattern: Start Motion A -> Attempt Invalid Motion B -> Catch ValueError -> Assert Motion A Running.
2. Formalize behavioral invariants for each motion type (navigate, turn, pivot, trajectory).
3. Formulate Given-When-Then BDD scenarios in `docs/02-product/acceptance/G-MDRB-022.md`.
**Completion gate:** Acceptance contract exists defining exact preemption test protocol.
**Stop condition:** Ambiguity in motor state assertion semantics.

### Step 2 — Enforce Atomic Validation Across Turn, Pivot, Nav, and Trajectory Dispatch

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Review speed, angle, coordinate, and waypoint validation across all motion methods.
2. Ensure fail-closed rejection happens strictly prior to `cancel_active_motion()` and `motion_reset()`.
3. Verify zero mutation of `self->rb` occurs when validation fails.
**Completion gate:** Clean C compilation with zero warnings.
**Stop condition:** Build error or compiler warning.

### Step 3 — Behavioral Active-Motion Immunity Test Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `tests/virtualhub/robotics/test_mdrobotbase_turn.py`
**Actions:**
1. Add behavioral preemption test functions exercising invalid turn, pivot, nav, and trajectory replacements.
2. Run VirtualHub test runners and verify all assertions pass.
3. Verify active motion completes to target destination without premature stopping.
**Completion gate:** All preemption tests pass 100% green.
**Stop condition:** Any test where active motion stops or state resets on invalid command.

## In

- Strict validate-before-cancel enforcement across turn, pivot, navigate, and trajectory dispatch.
- Behavioral test suite proving active motion immunity when invalid commands are intercepted.

## Out

- Modifying PID controller acceleration curves.
- Changes to hardware encoder interrupt handlers.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Binding | Update | `pybricks/robotics/pb_type_mdrobotbase.c` — Validate arguments before cancelling active motion in all dispatchers |
| VirtualHub | Add | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` — Add active motion preemption immunity tests |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Command Atomicity** | $\text{ValidationFailure}(cmd) \implies \text{ActiveState}_{t+1} = \text{ActiveState}_t$. |
| **Non-Disruption** | Invalid parameter exceptions do not invoke `pbio_servo_stop` or reset active odometry targets. |
| **Error Contract** | Rejection always raises `ValueError` for bad parameters and `TypeError` for bad types. |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Touch map contains all paths
- [x] No `[NEEDS CLARIFICATION]` markers remaining
- [x] In and Out scope clearly bounded
- [x] Zero Mocks, Zero Stubs contract enforced

## Acceptance criteria

- [x] Submitting an invalid `turn_to_angle(speed=-100)` while forward motion is active raises `ValueError`.
- [x] Active forward motion remains in progress (`done() == False`, `status() == STATUS_RUNNING`) after the `ValueError`.
- [x] Submitting an invalid `pivot_turn_to_angle(speed=0)` while turn motion is active raises `ValueError`.
- [x] Active turn motion remains in progress without stop or reset.
- [x] Submitting an empty trajectory `follow_trajectory([])` while navigation is active raises `ValueError`.
- [x] Active navigation motion reaches target destination without interruption.

## Test plan

- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: 100% pass across all preemption immunity tests.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `tests/virtualhub/robotics/test_mdrobotbase_turn.py`

## Notes for AI

- Zero mocks, zero stubs.
- Ensure tests verify physical progress of Motion A after catching the exception of Motion B.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| Active State | Inbound Action | Validation Result | Next State | Actuator Command Issued |
|---|---|---|---|---|
| `RUNNING(A)` | Dispatch `B` | `Invalid(B)` | `RUNNING(A)` | None (zero interruption) |
| `RUNNING(A)` | Dispatch `B` | `Valid(B)` | `RUNNING(B)` | Cancel `A`, Start `B` |
| `IDLE` | Dispatch `B` | `Invalid(B)` | `IDLE` | None |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **State Continuity Invariant** | $|\text{target\_pos}(A)_{t+1} - \text{target\_pos}(A)_t| = 0$ on rejected command. |
| **Integer Arithmetic** | Speed checks verify $v > 0$ strictly before motor quantization. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython User Script / Mission Executive.
- **Outbound Driven Port:** Motion State Machine Dispatcher.
