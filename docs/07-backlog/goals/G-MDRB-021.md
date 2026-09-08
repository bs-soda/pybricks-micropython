# G-MDRB-021: Exhaustive Closed-Object Method Audit and Idempotent Lifecycle Attestation

**Status:** review  
**Kind:** feature  
**Atomic outcome:** Enforce pb_type_mdrobotbase_require_open across all 49 methods in the MDRobotBase locals dictionary table, proving raising OSError(EBADF) across every public method after close() and verifying idempotent close()  
**Epic:** MDRB  
**Depends on:** G-MDRB-020  
**Blocks:** G-MDRB-022  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & 49-Method Audit Matrix Formalization | done |
| 2 | Enforce require_open Guard on Color Calibration & Utility Methods | done |
| 3 | Comprehensive Post-Close Reflection & Idempotency Test Pass | done |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c`, `_robotics_MDRobotBase_locals_dict_table` defines 49 public methods and properties. While motion dispatch and standard kinematics getters/setters guard against access after `close()` via `pb_type_mdrobotbase_require_open()`, color calibration routines (`reset_color_calibration`, `set_color_baseline`, `set_color_threshold`, `add_color_prototype`, `classify_color`) and certain specialized parameter helpers did not uniformly assert `require_open()`.
Calling these methods on a closed robot base risks operating on a freed C struct pointer (`self->rb == NULL`), resulting in null-pointer dereferences or corrupting reallocated memory slots.

### Scorecard & Baseline Evidence
- **Current score:** 8/10 (Closed-object safety) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:2305-2405`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2305-L2405)
- **Root cause:** Incomplete guard coverage across secondary color calibration and sensor utility functions.
- **Reproduction steps:**
  1. Instantiate `robot = MDRobotBase(...)`.
  2. Call `robot.close()`.
  3. Call `robot.classify_color(100, 200, 50)`.
  4. Method attempts to read calibration tables from `self->rb`, dereferencing a null pointer.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** A closed object must be completely dead to all runtime interactions except idempotent finalization; invoking any operational method on a closed instance must fail deterministically rather than crashing the firmware.  
**Done when:** Every single public method in the class table enforces the closed-object guard, invoking any method after `close()` raises `OSError(EBADF)` with zero side effects, and calling `close()` multiple times is proven safe and idempotent.  
**Unblocks:** G-MDRB-022

## Atomicity & Zero-Mock Contract

- **One outcome:** Audit all 49 public methods in `pb_type_mdrobotbase.c` and prove 100% fail-closed behavior after `close()`.
- **No decomposition leakage:** Preemption behavioral tests belong to G-MDRB-022.
- **Concrete execution:** 100% concrete C guard checks and Python reflection tests. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified via dynamic reflection looping over `dir(robot)` in `test_mdrobotbase_lifecycle.py` and calling every callable after `close()`.
- **Failure behavior:** Any unguarded method or crash under post-close invocation fails the test suite immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C Method Table Audit in Pybricks MicroPython Binding:
1. Enumerate all 49 methods in `_robotics_MDRobotBase_locals_dict_table`.
2. Inspect each method implementation to verify `pb_type_mdrobotbase_require_open(self)` is executed as the very first instruction before argument parsing or struct dereferencing.
3. Patch color calibration methods:
   - `reset_color_calibration`
   - `set_color_baseline`
   - `set_color_threshold`
   - `add_color_prototype`
   - `classify_color`
4. In `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`, implement an automated reflective audit test:
   - Instantiate robot.
   - Close robot.
   - Iterate over `[m for m in dir(robot) if not m.startswith('__')]`.
   - Invoke each method with dummy arguments; assert `OSError` with `errno == EBADF`.
   - Call `robot.close()` 5 additional times; assert zero exceptions.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Should `close()` itself raise `EBADF` if called repeatedly? No, `close()` is a destructor/finalizer and must be strictly idempotent (subsequent calls are safe no-ops).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-CLOSED-NULL-DEREF |
| **Decisions** | PDR-MDRB-EXHAUSTIVE-GUARD-AUDIT |
| **Assumptions required** | A-IDEMPOTENT-FINALIZER |
| **Evidence** | Codex Architectural Review finding P1 on closed-object audit |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Defensive Guard Clause, Idempotent Resource Reclamation |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-021.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` |
| **Constraints** | 100% method coverage, zero unhandled null pointer dereferences |

## Work steps

### Step 1 — Specification & 49-Method Audit Matrix Formalization

**Allowed files:** `docs/07-backlog/goals/G-MDRB-021.md` · `docs/02-product/acceptance/G-MDRB-021.md`  
**Actions:**
1. Extract and catalog all 49 function pointers and method entries in `_robotics_MDRobotBase_locals_dict_table`.
2. Formulate Given-When-Then BDD scenarios for all method categories (motion, query, tuning, color calibration).
3. Specify `close()` idempotency contract.
**Completion gate:** Acceptance contract exists with exhaustive method matrix.  
**Stop condition:** Spec drift or omitted method entries.

### Step 2 — Enforce require_open Guard on Color Calibration & Utility Methods

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Add `pb_type_mdrobotbase_require_open(self)` to all color calibration and secondary utility methods.
2. Ensure no C struct dereferences occur prior to the guard.
3. Verify `close()` cleanly zeroes `self->rb = NULL` and remains idempotent on subsequent calls.
**Completion gate:** Clean C compilation without warnings.  
**Stop condition:** Compiler error or broken method signatures.

### Step 3 — Comprehensive Post-Close Reflection & Idempotency Test Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`  
**Actions:**
1. Implement `test_closed_object_exhaustive_audit()` in `test_mdrobotbase_lifecycle.py`.
2. Reflectively inspect and invoke all public methods on a closed robot instance, verifying `OSError(EBADF)`.
3. Verify repeated `robot.close()` calls return safely without raising errors.
**Completion gate:** Python test suite passes 100% with all methods verified.  
**Stop condition:** Any method fails to raise `EBADF` or crashes.

## In

- Audit and guard insertion across all 49 public methods in `pb_type_mdrobotbase.c`.
- Automated reflective test verifying `OSError(EBADF)` across all non-dunder public methods after `close()`.
- Explicit verification of idempotent `close()`.

## Out

- Altering functional color calibration algorithms when object is open.
- Changes to motor hardware drivers.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Binding | Update | `pybricks/robotics/pb_type_mdrobotbase.c` — Insert `require_open()` into color calibration and utility methods |
| VirtualHub | Add | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` — Add exhaustive reflective closed-object audit test |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Fail-Closed Boundary** | $\forall m \in \text{Methods}(\text{MDRobotBase}) \setminus \{\text{close}, \text{\_\_del\_\_}\}, \text{is\_closed}(obj) \implies m(obj) \uparrow \text{OSError}(\text{EBADF})$. |
| **Destructor Idempotency** | $\text{close}(\text{close}(obj)) \equiv \text{close}(obj) \equiv \text{void}$. |
| **Zero Side-Effect Invariant** | Failed calls on closed objects produce zero actuator movements or memory mutations. |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Touch map contains all paths
- [x] No `[NEEDS CLARIFICATION]` markers remaining
- [x] In and Out scope clearly bounded
- [x] Zero Mocks, Zero Stubs contract enforced

## Acceptance criteria

- [x] All 49 entries in `_robotics_MDRobotBase_locals_dict_table` enforce `pb_type_mdrobotbase_require_open()`.
- [x] Invoking color calibration methods (`classify_color`, `reset_color_calibration`, etc.) on a closed object raises `OSError(EBADF)`.
- [x] Invoking motion dispatch methods (`navigate_to_goal`, `turn_to_angle`, etc.) on a closed object raises `OSError(EBADF)`.
- [x] Invoking status/query methods (`get_state`, `status`, `done`, `stalled`) on a closed object raises `OSError(EBADF)`.
- [x] Invoking `close()` multiple times executes safely as an idempotent no-op without raising exceptions.

## Test plan

- Command: `python3 tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- Expected: 100% PASS with all methods checked.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`

## Notes for AI

- Zero mocks, zero stubs.
- Do not bypass `require_open()` for query methods; querying a dead robot's state must fail explicitly.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Object::Open` | Public method invocation | `self->rb != NULL` | Execute requested logic | Normal error handling |
| `Object::Open` | `close()` invocation | Valid instance | Release C slot; `self->rb = NULL` | Pure cleanup |
| `Object::Closed` | Any public method invocation | `self->rb == NULL` | None | Raise `OSError(EBADF)` |
| `Object::Closed` | `close()` invocation | `self->rb == NULL` | None | Safe no-op |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Coverage Invariant** | Method audit coverage $= \frac{49}{49} = 100\%$. |
| **Integer Arithmetic** | Error code equals standard POSIX `EBADF` (9). |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** User MicroPython application scripts.
- **Outbound Driven Port:** Low-level slot deallocation (`pbio_mdrobotbase_put_robotbase`).
