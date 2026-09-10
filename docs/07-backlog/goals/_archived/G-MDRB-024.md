# G-MDRB-024: Single-Source-of-Truth FSM Status Transition Engine & Terminal Helper Enforcement

**Status:** done
**Kind:** feature
**Atomic outcome:** Eliminate direct motion_status field assignments in the MicroPython C binding and route all status updates through validated FSM transition helpers coupled atomically with motion_in_progress
**Epic:** MDRB
**Depends on:** G-MDRB-023
**Blocks:** G-MDRB-025
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Transition Helper Specification & Terminal Matrix Alignment | done |
| 2 | Route Production Dispatch and Terminal Paths through Helpers | done |
| 3 | Single-Source-of-Truth Verification & Illegal Transition Rejection Test Pass | done |

## Context

In Goal G-MDRB-020, a deterministic 5x5 Finite State Machine transition matrix was implemented within `lib/pbio/src/mdrobotbase.c` (`pbio_mdrobotbase_set_motion_status`).
However, Codex's September 2026 architectural review identified that production motion execution in `pybricks/robotics/pb_type_mdrobotbase.c` still contains 15 direct field assignments (e.g. `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`), completely bypassing the transition table and creating a dual-source-of-truth hazard.
This goal eliminates all raw assignments and routes every state change through validated terminal transition helpers.

### Scorecard & Baseline Evidence
- **Current score:** 8.7/10 (Async lifecycle / FSM truth) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:169`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L169), [`205`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L205), [`230`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L230), [`469`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L469), [`545`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L545), [`628`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L628)
- **Root cause:** Dispatcher routines directly mutate struct member `rb->motion_status` instead of invoking encapsulated transition helpers that enforce the 5x5 FSM matrix.
- **Reproduction steps:**
  1. Inspect `pybricks/robotics/pb_type_mdrobotbase.c` at lines 169, 205, 230, 271, 469, 492, 545, 575, 628, 652, 671, 1307, 1547, 1732, 1939.
  2. Notice that assigning `motion_status` directly does not validate against `mdrobotbase_fsm_transition_table` or synchronously update `motion_in_progress`.
  3. Attempt an illegal cross-terminal transition during runtime; observe that direct mutation succeeds without error.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Direct state mutations bypass state machine validation, allowing invalid transitions that cause desynchronization between execution flags and reported motion states.
**Done when:** All motion status transitions occur strictly through validated state machine functions, with zero direct mutations remaining in runtime dispatchers, and state and execution flags are provably coupled at all times.
**Unblocks:** G-MDRB-025

## Atomicity & Zero-Mock Contract

- **One outcome:** Enforce the FSM transition table as the sole mechanism for updating motion status across all motion execution paths.
- **No decomposition leakage:** Dispatcher function decomposition belongs to G-MDRB-025.
- **Concrete execution:** Verified using real C driver compilation and VirtualHub runtime execution. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Tests assert actual status enum values and boolean progress flags on concrete robot base instances.
- **Failure behavior:** Any attempted illegal transition must return an error code and leave internal states unmodified.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
1. Implement internal transition helpers in `lib/pbio/src/mdrobotbase.c` (`pbio_mdrobotbase_mark_running`, `pbio_mdrobotbase_mark_completed`, `pbio_mdrobotbase_mark_stalled`, `pbio_mdrobotbase_mark_timed_out`) that route all state updates through `pbio_mdrobotbase_set_motion_status()` to validate against the 5x5 FSM transition table, while atomically synchronizing `rb->motion_in_progress`.
2. Expose the helper prototypes in `lib/pbio/include/pbio/mdrobotbase.h`.
3. In `pybricks/robotics/pb_type_mdrobotbase.c`, eliminate all 15 raw `self->rb->motion_status = ...` assignments by replacing them with static wrapper functions `pb_type_mdrobotbase_mark_*(&self)` that delegate to PBIO driver transition functions.
4. Add comprehensive unit tests in `lib/pbio/test/src/test_mdrobotbase.c` and VirtualHub lifecycle tests in `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` verifying illegal transition rejection, atomic flag coupling, and 100% transition table enforcement.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Transition helpers reside primarily in the PBIO C driver (`lib/pbio/src/mdrobotbase.c`), exposing `pbio_mdrobotbase_mark_running()`, `pbio_mdrobotbase_mark_completed()`, `pbio_mdrobotbase_mark_stalled()`, and `pbio_mdrobotbase_mark_timed_out()`, with matching convenience wrappers in `pybricks/robotics/pb_type_mdrobotbase.c` to guarantee atomic coupling of `motion_status` and `motion_in_progress` across all runtime layers.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-DUAL-FSM-TRUTH |
| **Decisions** | PDR-MDRB-ENCAPSULATED-TRANSITIONS |
| **Assumptions required** | A-COOPERATIVE-COROUTINE-STEP |
| **Evidence** | Codex Architectural Review finding P1 (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | State Pattern, Encapsulated State Machine, Atomic State Coupling |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-024.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `lib/pbio/src/mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` |
| **Constraints** | Zero direct assignments to `rb->motion_status` outside transition functions |

## Work steps

### Step 1 — Transition Helper Specification & Terminal Matrix Alignment

**Allowed files:** `docs/07-backlog/goals/G-MDRB-024.md` · `docs/02-product/acceptance/G-MDRB-024.md`
**Actions:**
1. Formulate transition helper prototypes (`pbio_mdrobotbase_mark_running`, `pbio_mdrobotbase_mark_completed`, `pbio_mdrobotbase_mark_stalled`, `pbio_mdrobotbase_mark_timed_out`).
2. Map all 15 direct mutation call sites in `pb_type_mdrobotbase.c` to their required helper functions.
3. Formulate Given-When-Then BDD acceptance scenarios in `docs/02-product/acceptance/G-MDRB-024.md`.
**Completion gate:** Acceptance contract exists defining exact transition rules and assertions.
**Stop condition:** Unresolved transition rules or ambiguous terminal semantics.

### Step 2 — Route Production Dispatch and Terminal Paths through Helpers

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h` · `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Implement internal transition helpers in `lib/pbio/src/mdrobotbase.c` that wrap `pbio_mdrobotbase_set_motion_status()`.
2. Replace all 15 raw `self->rb->motion_status = ...` assignments in `pybricks/robotics/pb_type_mdrobotbase.c` with helper calls.
3. Guarantee that `motion_status` and `motion_in_progress` are updated in a single atomic operation.
**Completion gate:** Clean compilation with 0 direct `motion_status =` matches outside transition definitions.
**Stop condition:** Compiler error or remaining raw assignments in dispatch loops.

### Step 3 — Single-Source-of-Truth Verification & Illegal Transition Rejection Test Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**
1. Implement test cases verifying that completed, stalled, and timed-out terminal paths strictly update status and reset progress flag.
2. Assert that illegal transitions (e.g. `COMPLETED` -> `STALLED`) are rejected and return `PBIO_ERROR_INVALID_OP`.
3. Run native PBIO and VirtualHub test suites to confirm 100% green execution.
**Completion gate:** All FSM terminal tests pass without failure or skips.
**Stop condition:** Any test failure where status and progress flag disagree.

## In

- Elimination of direct `rb->motion_status` assignments across all motion routines.
- Encapsulation of state changes behind transition helper functions.
- Synchronous atomic coupling of `motion_status` and `motion_in_progress`.

## Out

- Altering the 5x5 state transition matrix definition itself.
- Changes to motion trajectory generation math.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Update | `lib/pbio/src/mdrobotbase.c` — Expose atomic terminal transition helpers |
| MicroPython | Update | `pybricks/robotics/pb_type_mdrobotbase.c` — Route all state assignments through transition helpers |
| Tests | Add | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` — Add single-source-of-truth FSM verification tests |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `robot-kinematics-engine` / `pbio-device-driver` |
| **Bounded Context & Domain** | Motion Execution State Machine & Actuator Supervision |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython Async Generator Loop <br> Driven Outbound: PBIO Actuator Controllers |
| **State Machine & Invariants** | Finite State Machine 5x5 Transition Matrix enforces $S_{next} \in \text{Allowed}(S_{current})$. |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero mocks or test doubles. |
| **Socratic 5-Why Blueprint** | Dialectic Report: `docs/06_raw/20260908_210000_codex_review_audit_and_mdrb_024_027_remediation_roadmap.md` |

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
- [x] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [x] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [x] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [x] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)

## Acceptance criteria

- [x] Zero direct assignments to `self->rb->motion_status` remain in `pybricks/robotics/pb_type_mdrobotbase.c`.
- [x] Reaching a motion destination sets `motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED` and `motion_in_progress = false` via transition helper.
- [x] Encountering a physical stall sets `motion_status = PBIO_MDROBOTBASE_STATUS_STALLED` and `motion_in_progress = false` via transition helper.
- [x] Exceeding motion timeout duration sets `motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT` and `motion_in_progress = false` via transition helper.
- [x] Transitioning into `RUNNING` sets `motion_in_progress = true` and validates against current state in FSM table.

## Test plan

- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: All lifecycle and terminal transition tests pass 100% green.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/include/pbio/mdrobotbase.h`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`

## Notes for AI

- Zero mocks, zero stubs.
- Search with grep to guarantee no `rb->motion_status =` assignments remain outside transition helpers.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `NONE` | `mark_running()` | Valid parameters & idle state | `status=RUNNING, in_prog=true` | Return `PBIO_ERROR_INVALID_OP` if already terminal |
| `RUNNING` | `mark_completed()` | Target reached | `status=COMPLETED, in_prog=false` | Coordinated stop & coast/hold |
| `RUNNING` | `mark_stalled()` | Persistent motor drag > 200ms | `status=STALLED, in_prog=false` | Emergency motor stop & error return |
| `RUNNING` | `mark_timed_out()` | Elapsed time >= timeout_ms | `status=TIMED_OUT, in_prog=false` | Stop motors & raise `ETIMEDOUT` |
| `COMPLETED` | `mark_running()` | New motion command dispatched | `status=RUNNING, in_prog=true` | Reset trajectory step state |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Atomic Coupling Invariant** | $\text{motion\_in\_progress} \iff (\text{motion\_status} == \text{PBIO\_MDROBOTBASE\_STATUS\_RUNNING})$. |
| **Transition Table Conformance** | $\forall (S_1, S_2), \text{Transition}(S_1 \to S_2) \text{ allowed} \iff M[S_1][S_2] == \text{true}$. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython Coroutine Motion Dispatcher.
- **Outbound Driven Port:** PBIO FSM State Engine & Servo Motors.
