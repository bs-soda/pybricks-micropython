# G-MDRB-035: Resilient Multi-Tier Instance Reclamation & RAII Lifecycle Management

**Status:** review
**Kind:** feature
**Atomic outcome:** Eliminate orphaned EBUSY lockouts on script restart by implementing system lifecycle de-initialization hooks, re-entrant exact-pair motor re-binding, and Python RAII context managers while preserving fail-closed duplicate motor protection.
**Epic:** MDRB
**Depends on:** G-MDRB-034
**Blocks:** —
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Clarification, Socratic 5-Why Dialectic & BDD Specification | done |
| 2 | Baseline Freeze & Blocker Replication Proof | done |
| 3 | Exact-HEAD Provenance & Motor Ownership Mutation Sensitivity Testing | done |
| 4 | Concrete Multi-Tier Reclamation Implementation (Zero Mocks, Zero Stubs) | done |
| 5 | Real-World Episode Oracle & Script Restart Raw-Trial Execution | done |
| 6 | Master Replication Gate Verification & Release Certification | done |

## Context

When an unhandled exception (such as `ETIMEDOUT`) crashes a robot script, execution terminates before `robot.close()` can be called. Because `pb_type_MDRobotBase` lacked an automatic garbage collection finalizer and `lib/pbio/src/main.c` lacked an application reset hook for `mdrobotbase`, the native slot remained marked active in `mdrobotbase_in_use[i]`. When the operator re-executed the script, `pbio_mdrobotbase_get_robotbase()` detected that the requested motors were still registered as owned, returning `PBIO_ERROR_BUSY` and raising `OSError: [Errno 16] EBUSY: Device or resource busy`. This goal implements a multi-tier reclamation architecture that ensures clean script restarts while preserving fail-closed safety against conflicting motor allocations.

### Scorecard & Baseline Evidence
- **Current score:** 8.5/10 · **Expected score:** 10.0/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:153-161`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L153-L161)
- **Root cause:** Native C motor ownership tracking lacks application-level lifecycle hooks in `lib/pbio/src/main.c` and lacks re-entrant re-binding for identical motor pairs. Any script crash leaves the previous instance orphaned and locked.
- **Reproduction steps:**
  1. Instantiate `robot = MDRobotBase(Motor(Port.A), Motor(Port.B))`.
  2. Raise an unhandled exception or abort without calling `robot.close()`.
  3. Instantiate `robot2 = MDRobotBase(Motor(Port.A), Motor(Port.B))` in the same process or next script execution.
  4. Observe `OSError: [Errno 16] EBUSY: Device or resource busy`.

## Intent

**Why:** Autonomous competition robots and interactive classroom sessions must reliably restart scripts after crashes or program stops without requiring a hardware reboot or leaving motors locked in a busy state.

**Done when:** Re-executing a robot script after a crash or program stop cleanly re-claims the hardware slot with zero `EBUSY` errors, while conflicting cross-allocations (sharing 1 motor across 2 active bases) continue to fail closed with `EBUSY`.

**Unblocks:** Autonomous development workflows, rapid iterative testing, competition recovery runbooks, and robust exception-safe robotics programs.

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: resilient multi-tier instance reclamation, system lifecycle deinit, exact-pair re-binding, and RAII context management.
- **No decomposition leakage:** Dynamic kinematic timeout calculation is isolated in upstream goal `G-MDRB-034`.
- **Concrete execution:** No mocks, stubs, fakes, or dummy handles. Tested with concrete native pool allocation scanning, real motor pointers, and physical lifecycle transitions.
- **Real boundary verification:** Verified against native PBIO C motor pools and VirtualHub Python runtime.
- **Failure behavior:** Partial motor overlap (e.g. active robot owns {A, B} and caller requests {A, C}) must strictly return `PBIO_ERROR_BUSY` and leave target pointers `NULL`.

## How

> Implementation approach and architecture:
1. In `lib/pbio/include/pbio/mdrobotbase.h` and `lib/pbio/src/mdrobotbase.c`, implement `pbio_mdrobotbase_deinit(void)`:
   - Loops over all slots $0 \le i < \text{PBIO\_CONFIG\_NUM\_MDROBOTBASES}$.
   - If in use, stops motors, clears `rb->left = NULL, rb->right = NULL`, and marks `mdrobotbase_in_use[i] = false`.
2. Connect `pbio_mdrobotbase_deinit()` to:
   - `pbio_main_start_application_resources()` in `lib/pbio/src/main.c` (clean start).
   - `pbio_main_stop_application_resources()` in `lib/pbio/src/main.c` (clean stop/crash).
3. In `pbio_mdrobotbase_get_robotbase()`:
   - Check if an existing slot matches the **exact same motor pair** (`rb->left == left && rb->right == right`).
   - If matched, stop pending motion, reset controller state, and re-initialize the slot cleanly instead of failing with `PBIO_ERROR_BUSY`.
   - If partial overlap (e.g. `rb->left == left && rb->right != right`), return `PBIO_ERROR_BUSY`.
4. In `pybricks/robotics/pb_type_mdrobotbase.c` and `tests/virtualhub/robotics/pybricks/robotics.py`, implement `__enter__` and `__exit__` context manager methods.

## Open questions

- *Resolved in CLARIFICATION.md:* Confirmed Multi-Tier Automatic Reclamation (Soft-Reset Hook + Re-entrant Re-binding + Context Manager).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-ORPHANED-INSTANCE-EBUSY |
| **Decisions** | PDR-MDRB-MULTI-TIER-INSTANCE-RECLAMATION |
| **Assumptions required** | A-EXCLUSIVE-MOTOR-PAIR-SAFETY |
| **Evidence** | `docs/06_raw/20260912_150000_ebusy_device_or_resource_busy_socratic_analysis.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Resource Acquisition Is Initialization (RAII), Re-entrant Hardware Re-binding |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-035.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | implementer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | implementer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `lib/pbio/src/main.c` · `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, zero stubs, zero memory leaks, 100% test pass rate |

## Work steps

Ordered execution contract for **this card only** — Antigravity or another agent executes the same list. Do not label steps as "human" vs "AI". Every implementation step must be atomic and include its allowed files, ordered actions, completion gate, and failure/stop condition. Do not use broad instructions such as “implement the feature” or “run tests”.

### Step 1 — Clarification, Socratic 5-Why Dialectic & BDD Specification

**Allowed files:** `docs/02-product/acceptance/G-MDRB-035.md` · `docs/06_raw/`
**Actions:**

1. Execute anti-hallucination clarification and resolve all open ambiguities regarding multi-tier instance reclamation.
2. Conduct Socratic 5-Why dialectic root cause analysis across 5 branches down to Level 5.
3. Formulate Given-When-Then BDD acceptance scenarios defining exact quantitative bounds.

**Completion gate:** Acceptance contract and Level-5 Socratic 5-Why report created and linked.
**Stop condition:** Any unverified assumption or unresolved `[NEEDS CLARIFICATION]`.

### Step 2 — Baseline Freeze & Blocker Replication Proof

**Allowed files:** `docs/06_raw/` · `tests/`
**Actions:**

1. Record pre-implementation Git HEAD SHA provenance.
2. Construct deterministic failing test case reproducing `EBUSY: Device or resource busy` upon script restart.
3. Capture empirical command output and verify fail-closed behavior before any code modification.

**Completion gate:** Deterministic replication artifact recorded in `docs/06_raw/` with failing test proof.
**Stop condition:** Inability to reliably reproduce the defect against the frozen baseline.

### Step 3 — Exact-HEAD Provenance & Motor Ownership Mutation Sensitivity Testing

**Allowed files:** `scripts/harness/`
**Actions:**

1. Author isolated mutation test harness validating mathematical, state, and boundary invariants.
2. Introduce controlled fault mutations (e.g., partial overlap leak, inverted match check, missing deinit hook).
3. Verify that 100% of mutation vectors are caught by the invariant test suite.

**Completion gate:** 100% mutation detection rate certified in isolated mutation testing harness.
**Stop condition:** Any mutation test false negative or undetected fault injection.

### Step 4 — Concrete Multi-Tier Reclamation Implementation (Zero Mocks, Zero Stubs)

**Allowed files:** `pybricks/robotics/` · `lib/pbio/` · `tests/virtualhub/`
**Actions:**

1. Implement production domain logic, state machines, and driver bindings strictly within the touch map.
2. Mirror full functionality in the simulator/virtual runtime ensuring complete architectural parity.
3. Enforce fail-closed error handling and disarm actuators on failure.

**Completion gate:** Code compiles with zero warnings; all unit tests pass with zero mocks or stubs.
**Stop condition:** Any compiler warning, mock object leak, or runtime failure.

### Step 5 — Real-World Episode Oracle & Script Restart Raw-Trial Execution

**Allowed files:** `tests/` · `docs/06_raw/`
**Actions:**

1. Execute $N \ge 10$ real kernel episodes or physical hardware trials under varying operating conditions.
2. Record raw per-trial JSON/CSV metrics (trial ID, elapsed wall time, completion state, error).
3. Compute Wilson score 95% confidence interval and verify non-overlapping rejection thresholds.

**Completion gate:** Empirical raw-trial schema validated with 100% success rate and Wilson 95% CI $\ge 0.85$.
**Stop condition:** Any trial failure or empirical confidence interval falling below safety threshold.

### Step 6 — Master Replication Gate Verification & Release Certification

**Allowed files:** `scripts/harness/` · `docs/06_raw/` · `docs/07-backlog/`
**Actions:**

1. Build and execute automated master replication harness verifying all release gates.
2. Run full test discovery, clean native builds, whitespace audit, and CI governance checks.
3. Publish release gate certification report and transition goal status to `review`.

**Completion gate:** Master replication harness passes 100% of gates; governance check passes.
**Stop condition:** Any failing gate, whitespace violation, or governance discrepancy.

## In

- System soft-reset lifecycle hook `pbio_mdrobotbase_deinit()` in `lib/pbio/src/main.c`.
- Re-entrant exact-pair motor re-binding in `lib/pbio/src/mdrobotbase.c`.
- Python RAII context manager protocol (`__enter__` / `__exit__`) in C and VirtualHub.
- Regression tests verifying crash recovery and partial overlap protection.

## Out

- Modifying trajectory generation or kinematic deadline math (handled in G-MDRB-034).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| PBIO C | Modify | `lib/pbio/src/mdrobotbase.c` — Implement pbio_mdrobotbase_deinit and re-entrant exact-pair re-binding |
| PBIO C | Modify | `lib/pbio/include/pbio/mdrobotbase.h` — Declare pbio_mdrobotbase_deinit |
| PBIO C | Modify | `lib/pbio/src/main.c` — Invoke pbio_mdrobotbase_deinit on start/stop application resources |
| Firmware | Modify | `pybricks/robotics/pb_type_mdrobotbase.c` — Implement __enter__ and __exit__ context manager |
| VirtualHub | Modify | `tests/virtualhub/robotics/pybricks/robotics.py` — Implement context manager and motor slot tracking |
| Tests | Modify | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` — Add context manager and crash re-entry tests |
| Tests | Modify | `lib/pbio/test/src/test_mdrobotbase.c` — Add exact-pair re-binding and deinit tests |
| Docs | Add | `docs/02-product/acceptance/G-MDRB-035.md` — BDD acceptance contract |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `embedded-firmware` / `resource-manager` |
| **Bounded Context & Domain** | Hardware Lifecycle & Instance Ownership Governance |
| **Ports & Adapters Topology** | Driving Inbound: Application Lifecycle Controller <br> Driven Outbound: Static Native Pool Allocator |
| **Zero-Mock & Conformance Gate** | 100% concrete native pointers, zero test doubles, zero memory leaks |
| **Socratic 5-Why Blueprint** | [`docs/06_raw/20260912_151500_g_mdrb_035_socratic_5why.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/06_raw/20260912_151500_g_mdrb_035_socratic_5why.md) |
| **State Machine & Invariants** | $\text{ExactPair}(P_{new}, P_{active}) \implies \text{Rebind}(P_{active}) \land \text{PBIO\_SUCCESS}$ <br> $\text{PartialOverlap}(P_{new}, P_{active}) \implies \text{Reject} \land \text{PBIO\_ERROR\_BUSY}$ |

### Mathematical & Data Invariants Spec
$$\text{Overlap}(L_1, R_1, L_2, R_2) = (L_1 = L_2 \lor L_1 = R_2 \lor R_1 = L_2 \lor R_1 = R_2)$$
$$\text{ExactMatch}(L_1, R_1, L_2, R_2) = (L_1 = L_2 \land R_1 = R_2)$$
$$\text{Action} = \begin{cases} \text{Reinit Slot}, & \text{if } \text{ExactMatch} \\ \text{PBIO\_ERROR\_BUSY}, & \text{if } \text{Overlap} \land \neg\text{ExactMatch} \\ \text{Allocate Free Slot}, & \text{otherwise} \end{cases}$$

### Finite State Machine (FSM) Matrix

| Current State | Trigger Event | Guard Condition | Target State | Output Action |
|---|---|---|---|---|
| `Slot::Active` | Application Reset | `pbio_mdrobotbase_deinit()` | `Slot::Free` | Stop motors, clear pointers, unmark in_use |
| `Slot::Active` | Re-allocation | `ExactMatch(left, right)` | `Slot::Active` | Stop motion, reinitialize parameters, return slot |
| `Slot::Active` | Re-allocation | `PartialOverlap(left, right)` | `Slot::Active` | Reject with `PBIO_ERROR_BUSY` |
| `Slot::Free` | Re-allocation | `!in_use[slot]` | `Slot::Active` | Mark in_use, bind motors, initialize |

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** `pbio_main_start_application_resources()`, `pbio_mdrobotbase_get_robotbase()`, `MDRobotBase.__enter__()`
- **Outbound Port:** `pbio_servo_stop()`, `mdrobotbases[]`

## Spec checklist

- [x] Software & Architecture Design specified by AI Agent
- [x] Intent is WHAT/WHY only
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Atomicity & Zero-Mock Contract confirmed

## Acceptance criteria

- [x] Re-running a script after an unhandled exception re-binds identical motor pairs with zero `EBUSY` errors.
- [x] `pbio_mdrobotbase_deinit()` clears all active slots on application start and stop.
- [x] Partial motor overlap across active bases continues to fail closed with `PBIO_ERROR_BUSY`.
- [x] `with MDRobotBase(...) as bot:` automatically invokes `close()` upon block exit.
- [x] All native PBIO C and VirtualHub Python tests pass 100% green.

## Test plan

- Execute `python3 -m unittest discover tests/virtualhub/robotics/` verifying all tests pass.
- Execute `./lib/pbio/test/build/test-pbio` verifying 0 regressions.
- Execute `bash scripts/ci/governance-check.sh` verifying clean governance.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/src/main.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `lib/pbio/test/src/test_mdrobotbase.c`
- `docs/02-product/acceptance/G-MDRB-035.md`
- `docs/07-backlog/goals/G-MDRB-035.md`
- `docs/07-backlog/queues/MDRB.md`
- `docs/06_raw/20260912_150000_ebusy_device_or_resource_busy_socratic_analysis.md`
- `docs/06_raw/20260912_150500_ebusy_reclamation_architecture_clarification.md`
- `docs/06_raw/20260912_151500_g_mdrb_035_socratic_5why.md`
- `docs/06_raw/20260912_162500_g_mdrb_035_baseline_freeze_and_replication_blocker.md`
- `docs/06_raw/20260912_164500_g_mdrb_035_master_replication_and_release_gate_report.md`
- `docs/06_raw/index.md`
- `docs/06_raw/log.md`

## Notes for AI

- Never allow partial motor overlap to succeed — only exact identical motor pairs may be re-bound.
- Always stop physical motors when de-initializing slots.
- Ensure all context manager tests verify both clean exits and exception exits.
