# Comprehensive MDRobotBase Codebase Audit, Baseline Evidence, and Remediation Backlog (G-MDRB-010 – G-MDRB-018)

**Date & Timestamp:** 2026-09-08T10:45:00+07:00
**Repository:** `pybricks-micropython`
**Active Branch:** `feature/mdrobotbase-enhancement`
**Target Integration Branch:** `epic/MDRB`
**Exact-HEAD Provenance:** `0582aefe38928ed3fe7456775dc5784a901bd28b`
**Audit Invariant:** Zero Mocks, Zero Stubs, Zero String Simulations (Article I Non-Negotiable)

---

## 1. Executive Summary & Codebase Baseline

An in-depth technical audit of the `pybricks-micropython` working tree was conducted focusing on the `MDRobotBase` robotics motion engine across the PBIO C driver (`lib/pbio/src/mdrobotbase.c`), C headers (`lib/pbio/include/pbio/mdrobotbase.h`), MicroPython bindings (`pybricks/robotics/pb_type_mdrobotbase.c`), and unit/virtual test harnesses.

While recent commits established basic pool allocation, dirty state zeroing, and helper functions, critical lifecycle, ownership, validation ordering, and mathematical verification gaps remain unaddressed in the current working tree.

### Current vs. Projected Scorecard

| Area | Current Score | Status | Projected Score | Remediation Goal |
|---|---:|---|---:|---|
| **Instance allocation & ownership** | 7/10 | Slot pool exists, but duplicate motor-pair reuse creates dangling pointers on `close()` | 10/10 | [G-MDRB-010](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-010.md) |
| **Motion lifecycle & preemption** | 5/10 | Motion entry points cancel active motion before parsing arguments | 10/10 | [G-MDRB-011](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-011.md) |
| **API safety & closed handles** | 5/10 | `close()` leaves null pointer without uniform `require_open()` guards | 10/10 | [G-MDRB-012](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-012.md) |
| **Error handling & status enums** | 7/10 | `pbio_mdrobotbase_set_motion_status()` accepts out-of-range integers | 10/10 | [G-MDRB-013](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-013.md) |
| **Kinematic & gear-ratio math** | 6/10 | Bidirectional round-trip invariants and unit consistency unproven | 10/10 | [G-MDRB-014](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-014.md) |
| **Angle normalization & turns** | 6/10 | Pure spin ($\Delta x, \Delta y = 0$) and pivot invariants unverified | 10/10 | [G-MDRB-015](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-015.md) |
| **Numerical input validation** | 8/10 | Non-finite floats (`NaN`, `Inf`) and quantization overflow unguarded | 10/10 | [G-MDRB-016](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-016.md) |
| **Test quality & harnesses** | 8/10 | Vacuous assertions (`assert robot.done() or not robot.done()`) | 10/10 | [G-MDRB-017](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-017.md) |
| **Architectural maintainability** | 6/10 | Tight struct coupling between MicroPython and PBIO driver | 10/10 | [G-MDRB-018](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-018.md) |
| **Aggregate Score** | **6.8 / 10** | **Baseline with Critical Defect Blocks** | **9.8 / 10** | **Epic MDRB Full Remediation** |

---

## 2. Investigation of High-Priority Defect Findings

### Finding 1 (P0): Duplicate Motor-Pair Reuse is Unsafe
- **WHERE:** [`lib/pbio/src/mdrobotbase.c:145-152`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L145-L152)
- **WHY:** In `pbio_mdrobotbase_get_robotbase()`, if an allocated instance already references the requested `left` and `right` servo pointers, the existing pointer is returned. Two independent Python wrapper objects point to the same native memory slot. When one object calls `close()` or is collected by the GC, `pbio_mdrobotbase_put_robotbase()` frees the slot, leaving the second wrapper pointing to unallocated memory.
- **FOR WHOM:** Multi-robot applications, interactive REPL sessions, and unit testing environments.
- **HOW:** Remove the re-entrant matching loop and return `PBIO_ERROR_BUSY` when any requested motor is already owned by an active instance.

### Finding 2 (P0): Invalid New Motion Arguments Cancel Running Motion
- **WHERE:** [`pybricks/robotics/pb_type_mdrobotbase.c:1008-1009`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1008-L1009), [`1402`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1402), [`1556`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1556), [`1734`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1734)
- **WHY:** Functions call `pb_type_mdrobotbase_cancel_active_motion(self)` and `pbio_mdrobotbase_motion_reset(self->rb)` prior to argument parsing (`mp_arg_parse_all`) and validation. If the caller provides invalid arguments, the running motion has already been cancelled and stopped.
- **FOR WHOM:** Asynchronous motion dispatchers, supervisory planners, and reactive obstacle avoidance controllers.
- **HOW:** Move cancellation and reset below argument parsing and validation. Only commit state transitions once new parameters are proven valid.

### Finding 3 (P1): `close()` Leaves Stale Handles Subject to Null Dereferences
- **WHERE:** [`pybricks/robotics/pb_type_mdrobotbase.c:945`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L945), [`2166-2172`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2166-L2172)
- **WHY:** Calling `close()` sets `self->rb = NULL`. Subsequent calls to `get_state()` dereference `self->rb->x` without checking if `self->rb` is non-null, triggering segmentation faults.
- **FOR WHOM:** Python user scripts and resource management libraries.
- **HOW:** Implement `pb_type_mdrobotbase_require_open(self)` helper and call it at the preamble of every public method, raising `RuntimeError("MDRobotBase is closed")`. Guarantee idempotent `close()`.

### Finding 4 (P1): Motion Status Setter Accepts Invalid Enum Integers
- **WHERE:** [`lib/pbio/src/mdrobotbase.c:592-598`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L592-L598)
- **WHY:** `pbio_mdrobotbase_set_motion_status()` writes any integer directly to `rb->motion_status` without bounds checking.
- **FOR WHOM:** Internal motion state machine and external telemetry loggers.
- **HOW:** Enforce switch validation against `{NONE, RUNNING, COMPLETED, STALLED, TIMED_OUT}`, rejecting invalid integers with `PBIO_ERROR_INVALID_ARG` and preserving existing status.

### Finding 5 (P1): Incomplete Mathematical Verification of Kinematic Invariants
- **WHERE:** [`lib/pbio/src/mdrobotbase.c:600-625`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L600-L625)
- **WHY:** Gear ratio and differential odometry helpers lack algebraic proofs verifying invertibility, pure spin invariants, pivot turn geometry, and distance conservation across backlash filters.
- **FOR WHOM:** Autonomous navigation planners requiring high-precision dead-reckoning.
- **HOW:** Add formal mathematical proof test suites in `lib/pbio/test/src/test_mdrobotbase.c` with explicit numerical tolerances ($10^{-4}$).

---

## 3. Backlog of Generated Draft Goals

The following 9 goals were generated in strict sequential order, adhering to the enhanced Soda OS goal template:

1. **`G-MDRB-010`**: Safe Robot-Base Instance Ownership & Duplicate Motor-Pair Rejection
   - *Deliverable:* Reject duplicate motor allocations with `PBIO_ERROR_BUSY`.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P0`
2. **`G-MDRB-011`**: Validate-Before-Cancel Motion Lifecycle & Preemption Safety
   - *Deliverable:* Ensure argument validation precedes motion cancellation and motor reset.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P0`
3. **`G-MDRB-012`**: Closed-Object Guarding & Idempotent Destructor Safety
   - *Deliverable:* Add centralized `require_open` guard raising `RuntimeError` on closed handles.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
4. **`G-MDRB-013`**: Motion-Status Enum Boundary Validation & Failure State Contract
   - *Deliverable:* Constrain `pbio_mdrobotbase_set_motion_status` to valid enum values.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
5. **`G-MDRB-014`**: Differential-Drive Kinematic Invariants & Bidirectional Gear-Ratio Semantics
   - *Deliverable:* Prove algebraic invertibility ($w \leftrightarrow m$) and straight-drive odometry.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
6. **`G-MDRB-015`**: Angle Normalization, Pivot-Turn Invariants, and Distance Conservation
   - *Deliverable:* Verify spin ($\Delta x = \Delta y = 0$), pivot geometry, and backlash conservation.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
7. **`G-MDRB-016`**: Numerical Robustness, Geometry Bounds, and Quantization Hardening
   - *Deliverable:* Guard against non-finite floats, speed quantization overflow, and timer wraparound.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
8. **`G-MDRB-017`**: Deterministic PBIO and VirtualHub Behavioral Test Suite Hardening
   - *Deliverable:* Replace vacuous assertions with behavioral trajectory simulations and mutation tests.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P1`
9. **`G-MDRB-018`**: Architectural Maintainability & Hardware Abstraction Layer Consolidation
   - *Deliverable:* Encapsulate internal driver struct members behind stable C ABI accessors.
   - *Status:* `draft` | *Phase:* `DEFINE` | *Priority:* `P2`

---

## 4. Verification & Conformance Attestation

The goal definitions and updated harnesses were validated across the repository:

1. **Goal Template Conformance (`scripts/harness/goal-template-conformance-harness.mjs`):**
   - Result: **20 Passed, 0 Failed (100% Conformance)**
   - All 34 required canonical sections and anti-solutioneering rules verified.
2. **Architecture Design Conformance (`scripts/harness/architecture-design-conformance-harness.mjs`):**
   - Result: **19 Passed, 0 Failed (100% Conformance)**
   - All DDD, Ports & Adapters, Zero-Mock, and Socratic 5-Why linkages verified.
3. **MDRobotBase Epic Harness (`scripts/harness/mdrobotbase-epic-harness.mjs`):**
   - Result: **162 Passed, 0 Failed (100% Conformance)**
   - Verified registration in `epics.md`, `goals.md`, `queues/MDRB.md`, and `goal-id-registry.yaml`.

---

## 5. Execution Order & Human Governance Lock

Per Soda OS governance and global instructions:
- All generated goals are initialized in **`draft`** status and **`DEFINE`** phase.
- Existing user code and test changes in the working tree are strictly preserved.
- **Zero code implementation, promotion to `ready`, local branch integration, or deployment is performed.**
- Advancement to the **PLAN** and **EXECUTE** phases requires explicit human approval for each individual goal.
