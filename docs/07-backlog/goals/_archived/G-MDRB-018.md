# G-MDRB-018: Architectural Maintainability & Hardware Abstraction Layer Consolidation

**Status:** done  
**Kind:** chore  
**Atomic outcome:** Refactor shared lifecycle, coordinate transformation, and error translation boundaries between PBIO C driver and MicroPython wrapper to eliminate redundant state coupling  
**Epic:** MDRB  
**Depends on:** G-MDRB-017  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Layer Boundary Definition | done |
| 2 | Decouple MicroPython Wrapper from Internal PBIO Struct Mechanics | done |
| 3 | Verification & End-to-End Regression Pass | done |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c` and `lib/pbio/src/mdrobotbase.c`, lifecycle management, coordinate transformations, and stall tracking responsibilities are split across both the C driver and the MicroPython language wrapper. For instance, the language binding directly mutates motion flags and coordinates while the C driver maintains shadow copies, creating maintenance risks and potential synchronization drift when new features are added.

### Scorecard & Baseline Evidence
- **Current score:** 6/10 (Maintainability) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:945-948`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L945-L948), [`lib/pbio/include/pbio/mdrobotbase.h:35-85`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L35-L85)
- **Root cause:** Incomplete encapsulation between high-level Python binding object and low-level PBIO device driver struct.
- **Reproduction steps:**
  1. Inspect `pb_type_mdrobotbase.c`: MicroPython methods directly access internal fields (`self->rb->x`, `self->rb->theta`, `self->rb->motion_status`).
  2. Modifying internal representation in `mdrobotbase.h` breaks the Python binding in dozens of non-contiguous locations.
  3. Lack of unified accessor API complicates maintenance and memory audits.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Tight coupling between language bindings and driver internals creates maintenance overhead and increases the risk of introducing subtle bugs during future refactoring.  
**Done when:** All driver state is encapsulated behind opaque accessor functions in PBIO, and the language wrapper interacts exclusively through stable C ABI interfaces.  
**Unblocks:** —  

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: consolidation of driver abstraction boundaries and encapsulation.
- **No decomposition leakage:** Behavioral tests and kinematics proofs are completed in preceding goals.
- **Concrete execution:** No mocks, stubs, fakes, or dummy shims.
- **Real boundary verification:** Verified via clean C compilation and 100% pass across all existing regression suites.
- **Failure behavior:** Interface boundary violations or broken builds block execution immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C ABI encapsulation in PBIO and Pybricks MicroPython Binding:
1. Declare clean public C accessor functions in `lib/pbio/include/pbio/mdrobotbase.h`:
   - `pbio_mdrobotbase_get_pose(rb, &x, &y, &theta)`
   - `pbio_mdrobotbase_is_busy(rb, &busy)`
   - `pbio_mdrobotbase_is_done(rb, &done)`
   - `pbio_mdrobotbase_is_stalled(rb, &stalled)`
   - `pbio_mdrobotbase_get_motion_type(rb, &motion_type)`
2. Implement accessors with fail-closed null argument checks in `lib/pbio/src/mdrobotbase.c`.
3. Refactor `pybricks/robotics/pb_type_mdrobotbase.c` query methods (`get_state`, `done`, `stalled`, `status`, and debug prints) to invoke accessor functions instead of direct struct dereferencing.
4. Add native C unit test `test_mdrobotbase_accessor_encapsulation` in `lib/pbio/test/src/test_mdrobotbase.c` and register in `pbio_mdrobotbase_tests[]`.
5. Run full test suites and verify zero compiler warnings and flash increase < 64 bytes.

### Proposed implementation strategy
- Add accessor functions to `pbio/mdrobotbase.h`: `pbio_mdrobotbase_get_pose(rb, &x, &y, &theta)`, `pbio_mdrobotbase_get_motion_status(rb, &status)`, `pbio_mdrobotbase_is_done(rb, &done)`, `pbio_mdrobotbase_is_stalled(rb, &stalled)`.
- Replace direct struct member dereferences in `pb_type_mdrobotbase.c` with accessor calls.
- Retain `pbio_mdrobotbase_t` struct definition in header for unit test and compiler optimization compatibility while enforcing clean accessor encapsulation in language wrapper.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Confirm whether making `pbio_mdrobotbase_t` fully opaque is compatible with existing static pool allocation in `pb_type_mdrobotbase.c`: `pbio_mdrobotbase_t` is allocated internally inside PBIO in the `robotbases` static array in `lib/pbio/src/mdrobotbase.c`. `pb_type_mdrobotbase.c` only holds a reference pointer `pbio_mdrobotbase_t *rb;` inside `_robotics_MDRobotBase_obj_t`. Encapsulation is achieved by providing standard public accessor functions (`pbio_mdrobotbase_get_pose`, `pbio_mdrobotbase_get_motion_status`, `pbio_mdrobotbase_is_done`, `pbio_mdrobotbase_is_stalled`, `pbio_mdrobotbase_get_motion_type`), eliminating direct struct member dereferences in query methods, while keeping the struct definition available in `pbio/mdrobotbase.h` for test harnesses without breaking ABI.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-STRUCT-COUPLING |
| **Decisions** | PDR-MDRB-OPAQUE-DRIVER-BOUNDARY |
| **Assumptions required** | A-STABLE-C-ABI-CONTRACT |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Information Hiding, Opaque Pointer (PIMPL) |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-018.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | chore |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c` |
| **Constraints** | Zero performance overhead, zero API breaking changes |

## Work steps

### Step 1 — Specification & Layer Boundary Definition

**Allowed files:** `docs/07-backlog/goals/G-MDRB-018.md` · `docs/02-product/acceptance/G-MDRB-018.md`  
**Actions:**

1. Map all direct struct access sites in `pb_type_mdrobotbase.c`.
2. Design clean C accessor functions for pose, status, and configuration.

**Completion gate:** Interface contract defined with zero unresolved clarification tags.  
**Stop condition:** Any performance-sensitive inner loop access that cannot be inlined.

### Step 2 — Decouple MicroPython Wrapper from Internal PBIO Struct Mechanics

**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**

1. Implement `pbio_mdrobotbase_get_pose()` and related accessors.
2. Update `pb_type_mdrobotbase.c` to use accessor functions.

**Completion gate:** C codebase compiles without warnings.  
**Stop condition:** Compiler warnings or broken method returns.

### Step 3 — Verification & End-to-End Regression Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/`  
**Actions:**

1. Run full PBIO test suite.
2. Run full VirtualHub test suite.

**Completion gate:** 100% test pass with identical benchmark timings.  
**Stop condition:** Any test failure or execution slowdown.

## In

- Encapsulating PBIO driver struct members behind accessor methods.
- Refactoring `pb_type_mdrobotbase.c` to use the accessor API.

## Out

- Adding new robot features or modifying kinematic algorithms.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Header | Add | `lib/pbio/include/pbio/mdrobotbase.h`: define accessor functions |
| C Driver | Add | `lib/pbio/src/mdrobotbase.c`: implement accessor functions |
| C Binding | Modify | `pybricks/robotics/pb_type_mdrobotbase.c`: replace direct struct access with accessors |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `micropython-binding` |
| **Bounded Context & Domain** | Robotics Kinematics \| Hardware Abstraction Layer Boundary |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython Language Bridge <br> Driven Outbound: PBIO Core Driver Engine |
| **State Machine & Invariants** | Encapsulation Invariant: Language layer possesses zero direct write or read access to private struct fields |
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

- [x] Zero direct struct member dereferences (`self->rb->...`) remain in `pb_type_mdrobotbase.c` outside dedicated accessors.
- [x] All robot pose queries route through `pbio_mdrobotbase_get_pose()`.
- [x] All robot status queries route through `pbio_mdrobotbase_get_motion_status()`.
- [x] Firmware flash footprint increase is less than 64 bytes.

## Test plan

- Command: `make -C lib/pbio/test test && pytest tests/virtualhub/robotics/`
- Verification: All test suites pass cleanly.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`

## Notes for AI

- Maintain inline qualifiers where appropriate to eliminate function call overhead.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Operational` | Pose query | `rb != NULL` | Read encapsulated coordinates | Return `PBIO_ERROR_INVALID_ARG` if null |
| `State::Operational` | Status query | `rb != NULL` | Read encapsulated status | Return `PBIO_ERROR_INVALID_ARG` if null |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Zero Side-Effect Queries** | Accessors are pure functions ($\Delta \text{state} = 0$). |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `OpaqueAccessorPort` | C ABI inline function | `lib/pbio/include/pbio/mdrobotbase.h` |
| **Driven (Outbound)** | `HardwareDriverStatePort` | Direct memory read | `lib/pbio/src/mdrobotbase.c` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Clean architecture state | `bg-surface-elevated` |
| **2. Loading / Pending** | Accessing state via API | `animate-pulse` |
| **3. Empty State** | Zero accessor faults | `text-content-secondary` |
| **4. Error State** | Encapsulation violation | `text-status-error` |
| **5. Success State** | 100% encapsulated build | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Accessor purity: $\forall t, \text{get\_pose}(rb, t) \implies \text{state}(t) = \text{state}(t^+)$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Pure accessor functions issue 0 motor writes.
- **Consistent state on failure:** Read-only accessors cannot corrupt internal driver memory.
- **Regression scenarios:** Verifying ABI stability across refactored methods.
