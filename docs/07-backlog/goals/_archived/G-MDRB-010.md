# G-MDRB-010: Safe Robot-Base Instance Ownership & Duplicate Motor-Pair Rejection

**Status:** done
**Kind:** feature
**Atomic outcome:** Reject duplicate motor-pair allocations in pbio_mdrobotbase_get_robotbase with PBIO_ERROR_BUSY to prevent dual Python wrappers from sharing and prematurely freeing native memory slots
**Epic:** MDRB
**Depends on:** G-MDRB-009
**Blocks:** G-MDRB-011
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Duplicate Allocation Clarification | done |
| 2 | Enforce PBIO_ERROR_BUSY on Matching Motor Pairs | done |
| 3 | Verification & Dual-Object Collision Test Pass | done |

## Context

In `lib/pbio/src/mdrobotbase.c:145-152`, `pbio_mdrobotbase_get_robotbase()` scans the pool and, when an existing instance with identical left and right servos is found, returns that instance pointer directly. Consequently, two distinct MicroPython `MDRobotBase` objects can hold pointers to the same native structure. When the first object is garbage collected or explicitly closed via `close()`, `pbio_mdrobotbase_put_robotbase()` frees the slot, leaving the second object with a dangling pointer and causing undefined memory behavior or crashes.

### Scorecard & Baseline Evidence
- **Current score:** 7/10 (Instance allocation) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:145-152`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L145-L152)
- **Root cause:** Re-entrant matching loop returns an already allocated slot pointer without tracking reference counts or preventing concurrent aliased ownership.
- **Reproduction steps:**
  1. `robot_a = MDRobotBase(left, right, 56.0, 112.0)`
  2. `robot_b = MDRobotBase(left, right, 56.0, 112.0)`
  3. `robot_a.close()`
  4. `robot_b.get_state()` -> Dereferences released slot or segmentation fault.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Sharing native hardware driver memory across independent high-level object wrappers without reference counting causes use-after-free corruption, silent state aliasing, and hard-to-debug device faults.
**Done when:** Attempting to construct a new drive base instance using a motor pair that is already owned by an active instance deterministically fails closed with an explicit busy error, ensuring strict 1:1 ownership.
**Unblocks:** G-MDRB-011

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: strict prevention of duplicate motor-pair native slot aliasing.
- **No decomposition leakage:** Motion lifecycle, argument parsing, and closed-state method guarding are separated into subsequent atomic goals.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or dummy fallback pointers in implementation or test suites.
- **Real boundary verification:** Verified directly against native PBIO motor structures and allocation pool bounds.
- **Failure behavior:** Duplicate motor allocation returns `PBIO_ERROR_BUSY`, converted to `OSError(EBUSY)` in the runtime layer.

## How

**Stack / approach:**
- In `lib/pbio/src/mdrobotbase.c`:
  - Replace lines 145-152 in `pbio_mdrobotbase_get_robotbase()`.
  - Check all active drivebase slots: if any active slot has `rb->left == left || rb->left == right || rb->right == left || rb->right == right`, immediately return `PBIO_ERROR_BUSY`.
  - Ensure `*rb_address` remains `NULL` on error.
- In `lib/pbio/test/src/test_mdrobotbase.c`:
  - Update `test_mdrobotbase_instance_ownership()` and add `test_mdrobotbase_duplicate_motor_rejection()`:
    - Assert allocating with identical motors returns `PBIO_ERROR_BUSY`.
    - Assert allocating with partially overlapping motors returns `PBIO_ERROR_BUSY`.
    - Assert releasing slot allows subsequent re-acquisition.

## Open questions

- [x] Confirmed: Any motor aliasing (both exact duplicate pair {Left_A, Right_B} and partial motor overlap {Left_A, Right_C}) rejects with PBIO_ERROR_BUSY to maintain exclusive 1:1 physical motor-to-drivebase ownership.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-OWNERSHIP-01 |
| **Decisions** | PDR-MDRB-SLOT-ISOLATION |
| **Assumptions required** | A-MOTOR-EXCLUSIVE-LOCK |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Resource Acquisition Is Initialization (RAII), Slot Pool Isolation |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-010.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, strict PBIO error propagation |

## Work steps

### Step 1 — Specification & Duplicate Allocation Clarification

**Allowed files:** `docs/07-backlog/goals/G-MDRB-010.md` · `docs/02-product/acceptance/G-MDRB-010.md`
**Actions:**

1. Formulate Given-When-Then BDD scenarios for duplicate motor-pair rejection.
2. Confirm error semantics for exact motor-pair re-use vs partial motor overlap.

**Completion gate:** Acceptance contract defined with zero unresolved clarification tags.
**Stop condition:** Unaligned error return code between PBIO and MicroPython.

### Step 2 — Enforce PBIO_ERROR_BUSY on Matching Motor Pairs

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `lib/pbio/include/pbio/mdrobotbase.h`
**Actions:**

1. Remove lines 145-152 in `lib/pbio/src/mdrobotbase.c` returning existing pointers.
2. Replace with explicit scan: if any active robot base references `left` or `right`, return `PBIO_ERROR_BUSY`.

**Completion gate:** C code compiles without warnings and rejects duplicate motor pairs.
**Stop condition:** Any compiler warning or broken existing instance tests.

### Step 3 — Verification & Dual-Object Collision Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**

1. Add unit test `test_mdrobotbase_duplicate_motor_rejection` in `test_mdrobotbase.c`.
2. Verify allocating instance A succeeds, allocating instance B with same servos returns `PBIO_ERROR_BUSY`, closing A allows reallocating B.

**Completion gate:** PBIO test suite passes with exit code 0.
**Stop condition:** Allocation succeeds when it should fail.

## In

- Rejecting duplicate motor allocations in `pbio_mdrobotbase_get_robotbase()`.
- Updating unit tests in `lib/pbio/test/src/test_mdrobotbase.c`.

## Out

- MicroPython method argument validation ordering (addressed in G-MDRB-011).
- Closed-object method guarding (addressed in G-MDRB-012).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Change | `lib/pbio/src/mdrobotbase.c`: return `PBIO_ERROR_BUSY` on duplicate motor pair instead of returning existing instance |
| Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c`: duplicate allocation rejection verification |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Native Instance Ownership |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython `MDRobotBase.__init__` <br> Driven Outbound: PBIO Servo Motor Structures |
| **State Machine & Invariants** | Slot Mutex Invariant: 1 Servo Motor $\in [0, 1]$ active `pbio_mdrobotbase_t` |
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

- [x] `pbio_mdrobotbase_get_robotbase()` returns `PBIO_ERROR_BUSY` when invoked with servos already owned by an active instance.
- [x] Calling `pbio_mdrobotbase_put_robotbase()` releases the motor claim, allowing subsequent allocation with the same servos.
- [x] Attempting to construct two MicroPython `MDRobotBase` instances on the same ports raises `OSError(EBUSY)`.
- [x] Zero memory leaks or dangling pointers occur when closing one instance while another instance is operating on different motors.

## Test plan

- Command: `make -C lib/pbio/test test`
- Verification: `test_mdrobotbase_duplicate_motor_rejection` passes cleanly.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Do not attempt to add complex reference counting across MicroPython wrappers; strict exclusive ownership fail-closed is the required architecture.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Slot::Free` | Allocation request | Motor pointers unallocated | Slot marked in use; motors bound | Return `PBIO_ERROR_BUSY` if motor bound |
| `Slot::Active` | Duplicate allocation | Motor pointers match active slot | None | Reject immediately with `PBIO_ERROR_BUSY` |
| `Slot::Released` | Explicit put / close | Slot in use | Motors unbound; memory cleared | Safe no-op if already free |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Exclusive Motor Ownership** | For all $i, j \in [0, N-1]$ where $i \neq j$ and `in_use[i] && in_use[j]`, $\{left_i, right_i\} \cap \{left_j, right_j\} = \emptyset$. |
| **Slot Capacity** | $N = \text{PBIO\_CONFIG\_NUM\_MDROBOTBASES} \le 2$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `RobotBaseAllocationPort` | C ABI function call | `lib/pbio/src/mdrobotbase.c` |
| **Driven (Outbound)** | `ServoClaimPort` | Pointer identity equality | `lib/pbio/src/servo.c` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Slot pool ready for allocation | `bg-surface-elevated` |
| **2. Loading / Pending** | Atomic allocation scan | `animate-pulse` |
| **3. Empty State** | Zero slots active | `text-content-secondary` |
| **4. Error State** | Device busy toast notification | `text-status-error` |
| **5. Success State** | Hardware acquired indicator | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Exclusive motor set intersection invariant: $\{left_A, right_A\} \cap \{left_B, right_B\} = \emptyset$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** When duplicate allocation fails with `PBIO_ERROR_BUSY`, zero motor commands, stops, or state resets are dispatched to the existing running instance.
- **Consistent state on failure:** Existing active drive base continues uninterrupted motion without trajectory jitter or odometry disruption.
- **Regression scenarios:** Sequential allocation and interleaved destruction does not corrupt motor pointers.
