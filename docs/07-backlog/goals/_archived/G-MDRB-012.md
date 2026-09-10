# G-MDRB-012: Closed-Object Guarding & Idempotent Destructor Safety

**Status:** done
**Kind:** feature
**Atomic outcome:** Implement centralized require_open guard across every public MicroPython method in pb_type_mdrobotbase.c to deterministically raise an exception on closed objects and guarantee idempotent close
**Epic:** MDRB
**Depends on:** G-MDRB-011
**Blocks:** G-MDRB-013
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Closed-State Error Semantics Alignment | done |
| 2 | Implement require_open Guard on All Public C Methods | done |
| 3 | Verification & Idempotent Close Regression Test Pass | done |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c:2166-2172`, `pb_type_MDRobotBase_close()` releases native driver resources via `pbio_mdrobotbase_put_robotbase()` and clears `self->rb = NULL`. However, subsequent public methods (e.g. `get_state` at line 945, `turn_angle`, `set_pid_gains`, `navigate_to_goal`) dereference `self->rb` directly without checking whether the object has been closed. This results in hard segmentation faults (`EXC_BAD_ACCESS`) in firmware/simulators when user scripts attempt to interact with a closed or finalized instance.

### Scorecard & Baseline Evidence
- **Current score:** 5/10 (API safety) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:945`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L945), [`2166-2172`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2166-L2172)
- **Root cause:** Absence of an accessor guard verifying that `self->rb != NULL` before accessing struct fields or invoking PBIO drivers.
- **Reproduction steps:**
  1. `robot = MDRobotBase(left, right, 56.0, 112.0)`
  2. `robot.close()`
  3. `robot.get_state()` -> Crash (segmentation fault / null pointer dereference).
  4. `robot.close()` -> Second close must not crash.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Invoking operations on closed device handles causes null-pointer crashes and corrupts runtime stability.
**Done when:** All public methods reject invocations on closed instances with a deterministic exception, and repeated close operations are harmless no-ops.
**Unblocks:** G-MDRB-013

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: uniform closed-object guarding across all public methods and idempotent closing.
- **No decomposition leakage:** Motion lifecycle (G-MDRB-011) and enum status validation (G-MDRB-013) are isolated in separate goals.
- **Concrete execution:** No mocks, stubs, fakes, or dummy fallback structures.
- **Real boundary verification:** Verified via MicroPython C runtime method dispatch and Python regression tests.
- **Failure behavior:** Invoking methods on closed objects raises `OSError(EBADF)` or `RuntimeError`.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C MicroPython binding layer with centralized handle state guarding:
1. Implement static inline helper `pb_type_mdrobotbase_require_open(self)` that verifies `self->rb != NULL` and raises `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("MDRobotBase is closed"))` if null.
2. In `pb_type_MDRobotBase_close`, cancel any active motion, call `pbio_mdrobotbase_put_robotbase(self->rb)`, and set `self->rb = NULL`. Repeated calls execute as a safe no-op returning `mp_const_none`.
3. Guard every public method in `pb_type_MDRobotBase_locals_dict_table` with `require_open` prior to accessing `self->rb`.

### Proposed implementation strategy
- Add helper `static inline pbio_mdrobotbase_t *pb_type_mdrobotbase_require_open(pb_type_MDRobotBase_obj_t *self)`.
- If `self->rb == NULL`, raise `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("MDRobotBase is closed"))`.
- Call `require_open` as the first line of every public method before reading `self->rb`.
- In `pb_type_MDRobotBase_close`, ensure that calling close on an already-null `self->rb` returns `mp_const_none` safely.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] Validated: Calling close() on an active motion stops motors with configured stop_behavior and releases the native slot.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-CLOSED-OBJECT-SEGFAULT |
| **Decisions** | PDR-MDRB-REQUIRE-OPEN-GUARD |
| **Assumptions required** | A-IDEMPOTENT-CLOSE-SEMANTICS |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Safe Handle Pattern, Defensive Pointer Guarding |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-012.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` |
| **Constraints** | Zero mocks, uniform error type across all accessors |

## Work steps

### Step 1 — Specification & Closed-State Error Semantics Alignment

**Allowed files:** `docs/07-backlog/goals/G-MDRB-012.md` · `docs/02-product/acceptance/G-MDRB-012.md`
**Actions:**

1. Define BDD test scenarios for invoking every public method after `close()`.
2. Confirm expected exception type (`RuntimeError` or `OSError(EBADF)`).

**Completion gate:** Acceptance contract defined with zero unresolved clarification tags.
**Stop condition:** Discrepancy on exception type across bindings.

### Step 2 — Implement require_open Guard on All Public C Methods

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**

1. Define `pb_type_mdrobotbase_require_open(self)` helper in `pb_type_mdrobotbase.c`.
2. Insert `require_open` checks into `get_state`, `get_gear_ratio`, `set_gear_ratio`, `navigate_to_goal`, `turn_angle`, `pivot_angle`, `follow_trajectory`, `set_pid`, `set_lqr`, `stalled`, `done`, and `status`.

**Completion gate:** C code compiles cleanly and guards every dereference of `self->rb`.
**Stop condition:** Compiler warnings or missed method paths.

### Step 3 — Verification & Idempotent Close Regression Test Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
**Actions:**

1. Add unit test verifying that `close()` followed by method calls raises deterministic exception.
2. Verify that calling `close()` twice executes cleanly without crashing.

**Completion gate:** Regression suite executes and passes with exit code 0.
**Stop condition:** Any segmentation fault or unexpected return value.

## In

- Implementing `require_open` helper in `pb_type_mdrobotbase.c`.
- Auditing all public methods to guarantee zero unguarded dereferences of `self->rb`.
- Verifying idempotence of `close()`.

## Out

- Motor validation before cancel (addressed in G-MDRB-011).
- Kinematic formulas (addressed in G-MDRB-014).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Binding | Add | `pybricks/robotics/pb_type_mdrobotbase.c`: `pb_type_mdrobotbase_require_open` helper |
| C Binding | Modify | Guard all public methods against null `self->rb` |
| Tests | Add | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`: closed handle test cases |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `micropython-binding` \| `embedded-firmware` |
| **Bounded Context & Domain** | Robotics Kinematics \| Object Lifecycle & Memory Safety |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython Python Calls <br> Driven Outbound: Safe Handle Dereferencer |
| **State Machine & Invariants** | Lifecycle Invariant: $O_{\text{state}} \in \{\text{Open}, \text{Closed}\}$; if Closed, all operations except `close()` raise error |
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

- [x] Invoking `get_state()`, `stalled()`, `done()`, or `status()` on a closed instance raises `RuntimeError`.
- [x] Invoking `navigate_to_goal()`, `turn_angle()`, or `pivot_angle()` on a closed instance raises `RuntimeError`.
- [x] Calling `close()` repeatedly on the same instance executes as a safe no-op without error or crash.
- [x] Calling `close()` while a motion is running safely terminates the active motion and releases the native slot.

## Test plan

- Command: `pytest tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- Verification: Test sequence `close() -> get_state() -> close()` passes with expected exception.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`

## Notes for AI

- Use `pb_type_mdrobotbase_require_open(self)` at the head of every method before any access to `self->rb`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Handle::Open` | Method invocation | `self->rb != NULL` | Dispatch to PBIO driver | Standard driver error return |
| `Handle::Open` | `close()` called | `self->rb != NULL` | Release native slot; `self->rb = NULL` | Safe cleanup |
| `Handle::Closed` | Method invocation | `self->rb == NULL` | None | Raise `RuntimeError("MDRobotBase is closed")` |
| `Handle::Closed` | `close()` called | `self->rb == NULL` | None | Return `None` (safe no-op) |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Pointer Validity Guard** | $\forall m \in \text{Methods}, \text{Call}(m) \implies (\text{self}\to\text{rb} \neq \text{NULL}) \lor (\text{Exception Raised})$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `PythonMethodGuardPort` | MicroPython C method call | `pybricks/robotics/pb_type_mdrobotbase.c` |
| **Driven (Outbound)** | `SlotReleasePort` | C ABI function call | `pbio_mdrobotbase_put_robotbase` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Handle open and valid | `bg-surface-elevated` |
| **2. Loading / Pending** | Verifying handle state | `animate-pulse` |
| **3. Empty State** | Zero active handles | `text-content-secondary` |
| **4. Error State** | Closed handle error alert | `text-status-error` |
| **5. Success State** | Handle closed safely | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- State idempotence: $\text{close}(\text{close}(H)) = \text{close}(H)$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Invoking any method on a closed handle produces 0 motor commands and 0 bus traffic.
- **Consistent state on failure:** Native memory remains freed; no dangling pointers survive.
- **Regression scenarios:** Interleaved garbage collection and manual closing across multiple threads/tasks.
