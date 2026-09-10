# G-MDRB-001: Safe MDRobotBase Instance Ownership and Allocation

**Status:** done
**Kind:** feature
**Atomic outcome:** Eliminate static singleton aliasing by introducing bounded pool allocation and slot lifecycle recovery for MDRobotBase instances
**Epic:** MDRB
**Depends on:** —
**Blocks:** G-MDRB-002
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Define pool allocation and ownership tracking state in PBIO | done |
| 2 | Implement slot release and finalizer cleanup in MicroPython binding | done |
| 3 | Construct multi-instance isolation and capacity exhaustion tests | done |

## Context

Codex architectural review scorecard assigned Instance Ownership a baseline score of **2/10 (High Risk)**.
In [`lib/pbio/src/mdrobotbase.c:19`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L19), `pbio_mdrobotbase_get_robotbase()` hardcodes allocation to the first array index:
```c
pbio_mdrobotbase_t *rb = &mdrobotbases[0];
```
Regardless of whether a user instantiates multiple robot bases or sequentially re-instantiates an object, all instances receive a pointer to `mdrobotbases[0]`. Mutating parameters, issuing motion commands, or resetting odometry on Robot B overwrites the state and active motor handles of Robot A, leading to physical collisions, actuator cross-talk, and memory corruption.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Multi-actuator robotics runtimes must guarantee strict memory and hardware isolation between distinct robot entities; sharing a single static instance without ownership tracking causes uncontrolled actuator cross-talk and physical accidents.
**Done when:** Two independent robot instances can be instantiated with disjoint motors, command execution on instance A does not alter the motor states or odometry of instance B, slot capacity exhaustion returns an explicit busy error, and destroying an instance frees its allocated slot for reuse.
**Unblocks:** G-MDRB-002 (Complete State Initialization and Lifecycle Reset).

## Atomicity & Zero-Mock Contract

- **One outcome:** Bounded pool allocation, exclusive slot ownership, and deterministic finalizer deallocation for robot base instances.
- **No decomposition leakage:** Deep field zeroing belongs to `G-MDRB-002`; constructor geometry validation belongs to `G-MDRB-003`.
- **Concrete execution:** Real C implementation in embedded firmware. Zero mocks, zero stubs, zero dummy fallback singletons.
- **Real boundary verification:** Verified via real PBIO servo structures in `lib/pbio/test/src/test_mdrobotbase.c` and multi-robot VirtualHub simulation scripts.
- **Failure behavior:** When all pool slots are occupied, allocation returns `PBIO_ERROR_BUSY` (raising `OSError(EBUSY)`) instead of silently stomping on active instances.

## How

**Stack / approach:**
- In `lib/pbio/include/pbio/mdrobotbase.h`:
  - Declare `pbio_error_t pbio_mdrobotbase_put_robotbase(pbio_mdrobotbase_t *rb);`
- In `lib/pbio/src/mdrobotbase.c`:
  - Introduce `static bool mdrobotbase_in_use[PBIO_CONFIG_NUM_MDROBOTBASES];`
  - In `pbio_mdrobotbase_get_robotbase()`:
    1. Check for re-entrant matching instances with identical `left` and `right` servos.
    2. Scan for the first slot where `!mdrobotbase_in_use[i]`.
    3. If none available, return `PBIO_ERROR_BUSY`.
    4. Mark slot `in_use = true` and assign to `*rb_address`.
  - In `pbio_mdrobotbase_put_robotbase()`:
    - Validate pointer address within `mdrobotbases` pool, clear `in_use = false`, and stop motors.
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - Bind `pb_type_MDRobotBase_del` finalizer to invoke `pbio_mdrobotbase_put_robotbase(self->rb)` upon garbage collection.

## Open questions

*(None — architectural contract confirmed via Codex review Step 1)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 1 (Instance ownership)` |
| Root Cause | `lib/pbio/src/mdrobotbase.c:19` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Pool Allocation and Slot Tracking
**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h`, `lib/pbio/src/mdrobotbase.c`
**Actions:**
1. Declare `pbio_mdrobotbase_put_robotbase()` in public header.
2. Implement pool indexing and `mdrobotbase_in_use` tracking in `mdrobotbase.c`.
3. Return `PBIO_ERROR_BUSY` when `PBIO_CONFIG_NUM_MDROBOTBASES` is exceeded.

**Completion gate:** Firmware compiles cleanly; `pbio_mdrobotbase_get_robotbase()` returns independent pointers for distinct calls.
**Stop condition:** Any compiler warning or memory leak.

### Step 2 — Finalizer and Slot Recovery Binding
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Attach finalizer callback `pb_type_MDRobotBase_del` to `pb_type_MDRobotBase`.
2. Ensure slot deallocation calls `pbio_mdrobotbase_put_robotbase()` when object is reclaimed.

**Completion gate:** Python runtime frees robot base slot upon `del robot` or out-of-scope garbage collection.
**Stop condition:** Segmentation fault or double-free vulnerability.

### Step 3 — Multi-Instance Verification Suite
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**
1. Write PBIO test allocating two separate robot base instances on ports A/B and C/D.
2. Assert both instances have distinct memory addresses and independent state.
3. Attempt allocating a 3rd instance when pool is 2 and assert `PBIO_ERROR_BUSY`.

**Completion gate:** Test suite passes 100% green with exit code 0.
**Stop condition:** Any cross-talk between instances or failure to reject over-capacity allocation.

## In

- Pool-based allocation for `pbio_mdrobotbase_t`.
- `in_use` occupancy bitmap/array.
- Deallocation function `pbio_mdrobotbase_put_robotbase()`.
- MicroPython object cleanup integration.
- Deterministic capacity exhaustion error reporting (`PBIO_ERROR_BUSY`).

## Out

- Re-zeroing internal struct fields (handled in `G-MDRB-002`).
- Parameter geometry validation (handled in `G-MDRB-003`).
- Changing motor control algorithms or odometry math.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | Add | `pbio_mdrobotbase_put_robotbase` in `lib/pbio/include/pbio/mdrobotbase.h` |
| Allocation | Modify | `pbio_mdrobotbase_get_robotbase` in `lib/pbio/src/mdrobotbase.c` scans pool |
| Cleanup | Add | `pb_type_MDRobotBase_del` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Testing | Add | Dual-instance & over-capacity tests in `lib/pbio/test/src/test_mdrobotbase.c` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Motor Control Hardware Abstraction |
| **Ports & Adapters Topology** | Inbound: MicroPython `MDRobotBase` constructor <br> Outbound: PBIO Servo Actuators |
| **State Machine & Invariants** | Slot States: `FREE` -> `ALLOCATED` -> `ACTIVE` -> `RELEASED` -> `FREE` |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] `pbio_mdrobotbase_get_robotbase()` returns distinct memory addresses when called with different motor pairs.
- [x] Mutating pose or commanding motion on Robot 1 leaves Robot 2's pose and motor targets unmodified.
- [x] Attempting to allocate an additional instance beyond `PBIO_CONFIG_NUM_MDROBOTBASES` returns `PBIO_ERROR_BUSY`.
- [x] Calling `pbio_mdrobotbase_put_robotbase()` marks the slot available and allows subsequent allocation.
- [x] All tests execute against real PBIO servo structures without mocks or stubs.

## Test plan

- Execute `lib/pbio/test/src/test_mdrobotbase.c` verifying dual-instance allocation and capacity exhaustion.
- Execute VirtualHub multi-robot Python script commanding two independent robots simultaneously.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Ensure slot matching logic allows re-entrant calls with identical motor pairs without consuming extra slots.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Slot::Free` | Constructor invocation | Slot available (`!in_use[i]`) | Mark `in_use[i] = true`, return slot pointer | Return `PBIO_ERROR_BUSY` if pool full |
| `Slot::Allocated` | Motor setup & initialization | Disjoint servo bindings | Initialize instance metadata | Rollback allocation on motor error |
| `Slot::Active` | Motion commands issued | Exclusive motor ownership | Drive assigned motors only | Coordinated emergency stop on fault |
| `Slot::Released` | Python finalizer / `put_robotbase` | Valid pool address | Stop motors, clear `in_use = false` | Return `PBIO_ERROR_INVALID_ARG` if invalid pointer |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Pool Capacity Invariant** | Total active instances $\le N_{\text{max}}$ where $N_{\text{max}} = \text{PBIO\_CONFIG\_NUM\_MDROBOTBASES}$ (default 2). |
| **Pointer Distinctness** | $\forall i \neq j \implies \text{address}(\text{slot}_i) \neq \text{address}(\text{slot}_j)$. |
| **Actuator Exclusivity** | $\text{motors}(\text{robot}_A) \cap \text{motors}(\text{robot}_B) = \emptyset$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython Object Allocation API (`mp_obj_malloc(pb_type_MDRobotBase_obj_t)`).
- **Outbound Driven Port:** PBIO Hardware Servo Driver (`pbio_servo_t`).
