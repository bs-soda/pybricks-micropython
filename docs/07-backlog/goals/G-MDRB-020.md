# G-MDRB-020: Finite State Machine Transition Table and Atomic Motion-Status Coupling

**Status:** review  
**Kind:** feature  
**Atomic outcome:** Implement an explicit state transition table in pbio_mdrobotbase_set_motion_status to atomically couple motion_status and motion_in_progress, eliminating invalid status and busy state combinations  
**Epic:** MDRB  
**Depends on:** G-MDRB-019  
**Blocks:** G-MDRB-021  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Transition Matrix Formalization | done |
| 2 | Implement State Transition Table in pbio_mdrobotbase_set_motion_status | done |
| 3 | State Matrix Fuzzing & Invariant Test Pass | done |

## Context

In [`lib/pbio/src/mdrobotbase.c:589-604`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L589-L604), `pbio_mdrobotbase_set_motion_status()` validates enum values against a whitelist, but permits arbitrary transitions regardless of the active state of `rb->motion_in_progress`.
For example, external callers or internal subroutines can set `status = PBIO_MDROBOTBASE_STATUS_COMPLETED` while `rb->motion_in_progress` remains `true`, or transition from `NONE` directly to `COMPLETED` without ever entering `RUNNING`.
This state divergence violates the finite state machine contract between the low-level motion generator and the high-level Python coroutine awaiter.

### Scorecard & Baseline Evidence
- **Current score:** 7/10 (Motion control / lifecycle safety) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:589-604`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L589-L604)
- **Root cause:** Decoupled assignment of `rb->motion_status` without synchronous validation and mutation of `rb->motion_in_progress`.
- **Reproduction steps:**
  1. Call `pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING)`.
  2. Notice that `rb->motion_in_progress` is not automatically set to `true`.
  3. Call `pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED)` while motors are actively spinning.
  4. Querying `pbio_mdrobotbase_is_busy()` and `pbio_mdrobotbase_is_done()` yields contradictory answers (`busy == true`, `done == true`).

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Contradictory motion lifecycle states lead to asynchronous coroutine deadlocks, missed event notifications, and physical motor runaway during competitive robot tasks.  
**Done when:** All status transitions follow an explicit state transition matrix, and `motion_in_progress` is updated atomically and consistently with `motion_status` such that `busy` and `done` never produce mutually contradictory states.  
**Unblocks:** G-MDRB-021

## Atomicity & Zero-Mock Contract

- **One outcome:** Implement an explicit state-transition table in `pbio_mdrobotbase_set_motion_status` with atomic `motion_in_progress` coupling.
- **No decomposition leakage:** Closed object auditing belongs to G-MDRB-021.
- **Concrete execution:** 100% concrete C state table and tinytest execution. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified via native C unit tests exercising all valid and invalid state transitions across the full state space.
- **Failure behavior:** Prohibited state transitions return `PBIO_ERROR_INVALID_OP` and preserve the previous valid state without mutation.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** Strict State Machine Table in PBIO C Driver:
1. Define formal transition rules:
   - `NONE -> RUNNING` (Valid: `motion_in_progress = true`)
   - `RUNNING -> COMPLETED` (Valid: `motion_in_progress = false`)
   - `RUNNING -> STALLED` (Valid: `motion_in_progress = false`)
   - `RUNNING -> TIMED_OUT` (Valid: `motion_in_progress = false`)
   - `RUNNING -> NONE` (Valid: cancelled, `motion_in_progress = false`)
   - `COMPLETED / STALLED / TIMED_OUT -> RUNNING` (Valid: new motion, `motion_in_progress = true`)
   - `COMPLETED / STALLED / TIMED_OUT -> NONE` (Valid: reset, `motion_in_progress = false`)
   - Prohibited: `NONE -> COMPLETED`, `NONE -> STALLED`, `NONE -> TIMED_OUT`, `COMPLETED -> STALLED` without entering `RUNNING`.
2. Implement 2D lookup table or explicit switch-case validator in `pbio_mdrobotbase_set_motion_status()`.
3. Atomically synchronize `rb->motion_in_progress` inside `pbio_mdrobotbase_set_motion_status()`.
4. Add unit test `test_mdrobotbase_fsm_state_transitions` in `lib/pbio/test/src/test_mdrobotbase.c`.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Should re-asserting the current status (e.g. `RUNNING -> RUNNING`) be permitted? Yes, idempotent re-assertion of the active status is an acceptable no-op and returns `PBIO_SUCCESS`.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-FSM-DESYNCHRONIZATION |
| **Decisions** | PDR-MDRB-ATOMIC-STATUS-FSM |
| **Assumptions required** | A-SYNCHRONOUS-PBIO-TICK |
| **Evidence** | Codex Architectural Review finding P1 on status setter |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Formal Finite State Machine, Atomic State Coupling |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-020.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Atomic status-busy coupling, zero invalid state combinations |

## Work steps

### Step 1 — Specification & Transition Matrix Formalization

**Allowed files:** `docs/07-backlog/goals/G-MDRB-020.md` · `docs/02-product/acceptance/G-MDRB-020.md`  
**Actions:**
1. Formalize the 5x5 state transition matrix for `pbio_mdrobotbase_motion_status_t`.
2. Define invariant: `motion_in_progress == (motion_status == STATUS_RUNNING)`.
3. Create acceptance contract in `docs/02-product/acceptance/G-MDRB-020.md`.
**Completion gate:** Acceptance contract exists defining valid vs invalid state transitions.  
**Stop condition:** Spec drift or contradictory transition requirements.

### Step 2 — Implement State Transition Table in pbio_mdrobotbase_set_motion_status

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h`  
**Actions:**
1. Update `pbio_mdrobotbase_set_motion_status()` to evaluate current `rb->motion_status` against requested status.
2. If transition is invalid, return `PBIO_ERROR_INVALID_OP` and keep previous status.
3. If transition is valid, update `rb->motion_status` and update `rb->motion_in_progress = (status == PBIO_MDROBOTBASE_STATUS_RUNNING)`.
**Completion gate:** Driver compiles cleanly with zero warnings.  
**Stop condition:** Build error or compiler warning.

### Step 3 — State Matrix Fuzzing & Invariant Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**
1. Implement `test_mdrobotbase_fsm_state_transitions()` in `lib/pbio/test/src/test_mdrobotbase.c`.
2. Test all 25 possible state transition combinations (valid vs invalid).
3. Assert that `is_busy()` and `is_done()` are strictly synchronized with `status()`.
4. Register test in `pbio_mdrobotbase_tests[]`.
**Completion gate:** `make -C lib/pbio/test test` passes 20/20 tests ok.  
**Stop condition:** Any failed assertion or regression.

## In

- Formal state transition matrix validation in `pbio_mdrobotbase_set_motion_status()`.
- Synchronous updating of `motion_in_progress` inside status setter.
- Native C unit tests verifying all 25 state transition combinations.

## Out

- MicroPython awaitable syntax modifications.
- Modifications to low-level motor PID update ticks.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Update | `lib/pbio/src/mdrobotbase.c:589-604` — Enforce state transition matrix and sync `motion_in_progress` |
| PBIO Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c` — Add `test_mdrobotbase_fsm_state_transitions` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **FSM Completeness** | Explicit transition validation across all 5 states: `NONE`, `RUNNING`, `COMPLETED`, `STALLED`, `TIMED_OUT`. |
| **Mutual Consistency** | $\text{motion\_in\_progress} \iff (\text{motion\_status} = \text{STATUS\_RUNNING})$. |
| **Error Handling** | Prohibited state transition returns `PBIO_ERROR_INVALID_OP` and preserves original state. |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Touch map contains all paths
- [x] No `[NEEDS CLARIFICATION]` markers remaining
- [x] In and Out scope clearly bounded
- [x] Zero Mocks, Zero Stubs contract enforced

## Acceptance criteria

- [x] Transitioning `NONE -> RUNNING` succeeds and sets `motion_in_progress = true`.
- [x] Transitioning `RUNNING -> COMPLETED` succeeds and sets `motion_in_progress = false`.
- [x] Transitioning `RUNNING -> STALLED` succeeds and sets `motion_in_progress = false`.
- [x] Transitioning `RUNNING -> TIMED_OUT` succeeds and sets `motion_in_progress = false`.
- [x] Attempting `NONE -> COMPLETED` directly is rejected with `PBIO_ERROR_INVALID_OP`.
- [x] Attempting `NONE -> STALLED` directly is rejected with `PBIO_ERROR_INVALID_OP`.
- [x] Idempotent transition `RUNNING -> RUNNING` returns `PBIO_SUCCESS` without state change.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: 20/20 tests ok, 0 skipped.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Zero mocks, zero stubs.
- Ensure state transition checks handle initial `STATUS_NONE` gracefully.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| Current State | Target State | Permitted? | Side Effect | Return Code |
|---|---|:---:|---|---|
| `NONE` | `RUNNING` | Yes | `motion_in_progress = true` | `PBIO_SUCCESS` |
| `NONE` | `COMPLETED` | No | None | `PBIO_ERROR_INVALID_OP` |
| `NONE` | `STALLED` | No | None | `PBIO_ERROR_INVALID_OP` |
| `NONE` | `TIMED_OUT` | No | None | `PBIO_ERROR_INVALID_OP` |
| `RUNNING` | `COMPLETED` | Yes | `motion_in_progress = false` | `PBIO_SUCCESS` |
| `RUNNING` | `STALLED` | Yes | `motion_in_progress = false` | `PBIO_SUCCESS` |
| `RUNNING` | `TIMED_OUT` | Yes | `motion_in_progress = false` | `PBIO_SUCCESS` |
| `RUNNING` | `NONE` | Yes | `motion_in_progress = false` | `PBIO_SUCCESS` |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Boolean State Equivalence** | $\forall s \in S, \text{is\_busy}(s) \land \text{is\_done}(s) \equiv \text{False}$. |
| **Integer Arithmetic** | Transition matrix encoded as deterministic bitmask or switch table. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Motion generator loop / trajectory completion observer.
- **Outbound Driven Port:** Status query interface (`pbio_mdrobotbase_is_busy`, `is_done`).
