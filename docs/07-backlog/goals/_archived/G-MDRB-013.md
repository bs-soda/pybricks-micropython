# G-MDRB-013: Motion-Status Enum Boundary Validation & Failure State Contract

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Constrain pbio_mdrobotbase_set_motion_status to valid pbio_mdrobotbase_motion_status_t enums, rejecting out-of-range integers with PBIO_ERROR_INVALID_ARG and preserving existing status  
**Epic:** MDRB  
**Depends on:** G-MDRB-012  
**Blocks:** G-MDRB-014  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Enum Boundary Contract Alignment | done |
| 2 | Enforce Strict Enum Whitelist in pbio_mdrobotbase_set_motion_status | done |
| 3 | Verification & Out-of-Bounds Status Test Pass | done |

## Context

In `lib/pbio/src/mdrobotbase.c:592-598`, `pbio_mdrobotbase_set_motion_status()` assigns the input argument directly to `rb->motion_status` without verifying that the value falls within the declared enumeration range (`NONE`, `RUNNING`, `COMPLETED`, `STALLED`, `TIMED_OUT`). Passing an invalid integer (such as -1, 99, or uninitialized memory) corrupts the motion status register, returning `PBIO_SUCCESS` and breaking status query methods (`stalled()`, `done()`, `status()`).

### Scorecard & Baseline Evidence
- **Current score:** 7/10 (Error handling) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:592-598`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L592-L598)
- **Root cause:** Function assigns enum value directly without validating against `pbio_mdrobotbase_motion_status_t` bounds.
- **Reproduction steps:**
  1. Initialize `rb` with status `PBIO_MDROBOTBASE_STATUS_RUNNING`.
  2. Call `pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)999)`.
  3. Observe function returns `PBIO_SUCCESS` and `rb->motion_status` becomes 999.
  4. Expected: Function must return `PBIO_ERROR_INVALID_ARG` and status must remain `PBIO_MDROBOTBASE_STATUS_RUNNING`.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Unvalidated status registers cause state machine corruption and lead high-level controllers to misinterpret device failure conditions.  
**Done when:** All status modifications are validated against permitted lifecycle states, invalid integers are rejected with an argument error, and prior valid state is preserved.  
**Unblocks:** G-MDRB-014  

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: strict validation of the motion status enum boundary.
- **No decomposition leakage:** Kinematic invariants (G-MDRB-014) and geometry bounds (G-MDRB-016) are kept in separate goals.
- **Concrete execution:** No mocks, stubs, fakes, or dummy fallback values.
- **Real boundary verification:** Verified directly against PBIO C driver enum contracts.
- **Failure behavior:** Invalid status writes return `PBIO_ERROR_INVALID_ARG` without altering existing status.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C PBIO driver validation whitelist:
1. In `pbio_mdrobotbase_set_motion_status()`, validate `rb != NULL` returning `PBIO_ERROR_INVALID_ARG` if null.
2. Implement a `switch (status)` whitelist matching `PBIO_MDROBOTBASE_STATUS_NONE`, `RUNNING`, `COMPLETED`, `STALLED`, and `TIMED_OUT`.
3. In all matching cases, update `rb->motion_status = status` and return `PBIO_SUCCESS`.
4. In `default:`, return `PBIO_ERROR_INVALID_ARG` without mutating `rb->motion_status`.
5. Implement unit test `test_mdrobotbase_motion_status_bounds()` in `lib/pbio/test/src/test_mdrobotbase.c`.

### Proposed implementation strategy
- In `pbio_mdrobotbase_set_motion_status`, use a switch statement covering `PBIO_MDROBOTBASE_STATUS_NONE`, `RUNNING`, `COMPLETED`, `STALLED`, and `TIMED_OUT`.
- Return `PBIO_ERROR_INVALID_ARG` on default.
- Keep previous valid status untouched when an invalid value is rejected.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) `pbio_mdrobotbase_set_motion_status` remains part of the public PBIO C API (declared in `lib/pbio/include/pbio/mdrobotbase.h`) to allow motion engines, simulation runners, and test harnesses to set status while strictly validating enum boundaries.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-INVALID-STATUS-ENUM |
| **Decisions** | PDR-MDRB-ENUM-WHITELIST-VALIDATION |
| **Assumptions required** | A-CLOSED-ENUM-TAXONOMY |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Whitelist Validation, Immutable State Transitions |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-013.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, strict enum validation |

## Work steps

### Step 1 — Specification & Enum Boundary Contract Alignment

**Allowed files:** `docs/07-backlog/goals/G-MDRB-013.md` · `docs/02-product/acceptance/G-MDRB-013.md`  
**Actions:**

1. Define test cases for all valid status enums (0 through 4).
2. Define test cases for invalid negative and out-of-bounds integers (-1, 5, 100, 999).

**Completion gate:** Acceptance contract defined with zero unresolved clarification tags.  
**Stop condition:** Unspecified status enum codes.

### Step 2 — Enforce Strict Enum Whitelist in pbio_mdrobotbase_set_motion_status

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h`  
**Actions:**

1. Implement switch validation in `pbio_mdrobotbase_set_motion_status()`.
2. Ensure invalid input leaves `rb->motion_status` unmodified.

**Completion gate:** C code compiles without warnings.  
**Stop condition:** Compiler warnings or broken valid status transitions.

### Step 3 — Verification & Out-of-Bounds Status Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**

1. Add unit test `test_mdrobotbase_motion_status_bounds` in `test_mdrobotbase.c`.
2. Assert `PBIO_ERROR_INVALID_ARG` returned for out-of-range status values.

**Completion gate:** PBIO test suite passes with exit code 0.  
**Stop condition:** Any test failure or status mutation on invalid input.

## In

- Validating `pbio_mdrobotbase_motion_status_t` bounds in `pbio_mdrobotbase_set_motion_status`.
- Adding unit test in `lib/pbio/test/src/test_mdrobotbase.c`.

## Out

- MicroPython wrapper exceptions (addressed in G-MDRB-012).
- Kinematic math (addressed in G-MDRB-014).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Modify | `lib/pbio/src/mdrobotbase.c`: validate `status` against enum whitelist in `pbio_mdrobotbase_set_motion_status` |
| Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c`: test enum bounds validation |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| FSM Motion Lifecycle |
| **Ports & Adapters Topology** | Driving Inbound: PBIO Motion Poller <br> Driven Outbound: Motion Status Register |
| **State Machine & Invariants** | Enum Invariant: $\text{status} \in \{0: \text{NONE}, 1: \text{RUNNING}, 2: \text{COMPLETED}, 3: \text{STALLED}, 4: \text{TIMED\_OUT}\}$ |
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

- [x] Passing any integer not in `{NONE, RUNNING, COMPLETED, STALLED, TIMED_OUT}` returns `PBIO_ERROR_INVALID_ARG`.
- [x] Upon rejection of an invalid status, `rb->motion_status` remains strictly unchanged.
- [x] Passing each of the 5 valid status enums returns `PBIO_SUCCESS` and updates the register.

## Test plan

- Command: `make -C lib/pbio/test test`
- Verification: `test_mdrobotbase_motion_status_bounds` passes cleanly.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Do not allow any arbitrary integer cast to pass silently.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Status::Any` | Status update | `status in ValidEnums` | Update `rb->motion_status` | Return `PBIO_SUCCESS` |
| `Status::Any` | Invalid status update | `status not in ValidEnums` | None | Return `PBIO_ERROR_INVALID_ARG`; keep prior state |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Domain Whitelist** | $\text{Domain}(S) = \{0, 1, 2, 3, 4\}$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `StatusSetterPort` | C ABI function call | `pbio_mdrobotbase_set_motion_status` |
| **Driven (Outbound)** | `StatusRegisterPort` | Memory write | `rb->motion_status` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Status `NONE` | `bg-surface-elevated` |
| **2. Loading / Pending** | Status `RUNNING` | `animate-pulse` |
| **3. Empty State** | Status uninitialized | `text-content-secondary` |
| **4. Error State** | Status `STALLED` or `TIMED_OUT` | `text-status-error` |
| **5. Success State** | Status `COMPLETED` | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Set membership: $s \in \{\text{NONE}, \text{RUNNING}, \text{COMPLETED}, \text{STALLED}, \text{TIMED\_OUT}\}$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Rejecting invalid status produces 0 motor actions.
- **Consistent state on failure:** Status register maintains prior legitimate state.
- **Regression scenarios:** Testing boundary values `INT32_MIN`, `-1`, `5`, `INT32_MAX`.
