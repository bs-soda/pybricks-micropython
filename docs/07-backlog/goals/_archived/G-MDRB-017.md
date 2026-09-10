# G-MDRB-017: Deterministic PBIO and VirtualHub Behavioral Test Suite Hardening

**Status:** done
**Kind:** feature
**Atomic outcome:** Replace synthetic tautological assertions with simulated motor and encoder trajectories, explicit numerical tolerance bounds, fail-before-fix proof assertions, and lifecycle state transition checks
**Epic:** MDRB
**Depends on:** G-MDRB-016
**Blocks:** G-MDRB-018
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Test Quality Audit Formulation | done |
| 2 | Refactor VirtualHub & PBIO Suites for Behavioral Verification | done |
| 3 | Verification & Fail-Before-Fix Attestation Pass | done |

## Context

In `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py:83`, assertions such as `assert robot.done() or not robot.done()` evaluate as boolean tautologies without exercising actual asynchronous lifecycle state machine transitions. Similarly, several test cases in `lib/pbio/test/src/test_mdrobotbase.c` verify struct gain fields rather than executing simulated closed-loop motor ticks, measuring trajectory tracking errors, or confirming that active motions fail deterministically on hardware faults.

### Scorecard & Baseline Evidence
- **Current score:** 8/10 (Test coverage) · **Expected score:** 10/10
- **Exact evidence:** [`tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py:83`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py#L83), [`tests/virtualhub/robotics/test_mdrobotbase_trajectory.py:45-55`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_trajectory.py#L45-L55)
- **Root cause:** Tests relied on superficial property existence checks rather than driving simulated encoder dynamics through temporal iterations.
- **Reproduction steps:**
  1. Inspect `test_lifecycle_status_queries` in `test_mdrobotbase_lifecycle.py`.
  2. Notice `assert robot.done() or not robot.done()` passes regardless of whether `done()` returns true, false, or behaves erroneously.
  3. Mutate `mdrobotbase.c` to deliberately break status reporting: the test suite still reports green.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Vacuous and tautological tests create false confidence, masking regressions in motor synchronization, motion preemption, and odometry tracking.
**Done when:** All test suites execute meaningful behavioral assertions with explicit quantitative tolerances, simulated encoder progress, and proven failure on intentional code regressions.
**Unblocks:** G-MDRB-018

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: hardening of the PBIO and VirtualHub behavioral test suites.
- **No decomposition leakage:** Driver refactoring is isolated in G-MDRB-018.
- **Concrete execution:** No mocks, stubs, fakes, or dummy assertions.
- **Real boundary verification:** Verified using actual VirtualHub motor simulation runtimes and PBIO native test harnesses.
- **Failure behavior:** Regression or incorrect motion behavior immediately fails test assertions with expected vs actual output diffs.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** Pybricks VirtualHub (MicroPython) and PBIO C Unit Test Framework:
1. Eliminate tautology `assert robot.done() or not robot.done()` in `test_mdrobotbase_lifecycle.py`, replacing with state machine assertions: `robot.done() == True`, `robot.stalled() == False`, `robot.status() == STATUS_COMPLETED`.
2. Implement dynamic motion state transitions: assert `robot.done() == False` and `robot.status() == STATUS_RUNNING` while background motion is executing, transitioning to `robot.done() == True` and `robot.status() == STATUS_COMPLETED` on finish.
3. Add full trajectory execution test in `test_mdrobotbase_trajectory.py`: execute multi-waypoint path and assert arrival within tolerance ($\le 2.0\text{ mm}$, $\le 1.0^\circ$).
4. Add behavioral closed-loop trajectory simulation test `test_mdrobotbase_behavioral_trajectory_tracking` in `lib/pbio/test/src/test_mdrobotbase.c`, stepping through simulated servo encoder updates and verifying tracking convergence.
5. Verify fail-before-fix sensitivity by introducing mutation test that inverts arrival threshold and confirming failure.

### Proposed implementation strategy
- Eliminate all vacuous assertions (`assert x or not x`).
- Implement state-transition assertions: `assert robot.status() == STATUS_RUNNING` while task active, transitioning to `STATUS_COMPLETED` upon arrival.
- Inject simulated motor stalls to verify that `stalled()` returns true only when stall torque and velocity thresholds are exceeded.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Confirm whether VirtualHub tests run under pytest or standard MicroPython test runners in CI: VirtualHub tests run under MicroPython test framework via `test-virtualhub.sh` (`micropython/tests/run-tests.py`) in CI, and can also be run under `pytest` with mock-free runtime bindings. Both environments execute identical assertions without mocks.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-TAUTOLOGICAL-TESTS |
| **Decisions** | PDR-MDRB-BEHAVIORAL-ASSERTION-STANDARD |
| **Assumptions required** | A-VIRTUALHUB-COOPERATIVE-SCHEDULING |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Behavior-Driven Testing, Temporal State Validation |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-017.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | qa |
| **Task type** | qa |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | qa |
| **Files** | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, zero tautological assertions |

## Work steps

### Step 1 — Specification & Test Quality Audit Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-017.md` · `docs/02-product/acceptance/G-MDRB-017.md`
**Actions:**

1. Audit all existing tests in `test_mdrobotbase_lifecycle.py` and `test_mdrobotbase.c`.
2. Document all vacuous or field-inspection-only tests.
3. Formulate strict behavioral assertion criteria with explicit expected values.

**Completion gate:** Audit table completed and acceptance criteria defined.
**Stop condition:** Any unaddressed tautological assertion.

### Step 2 — Refactor VirtualHub & PBIO Suites for Behavioral Verification

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` · `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**

1. Replace line 83 in `test_mdrobotbase_lifecycle.py` with explicit state checks.
2. Add multi-step trajectory waypoints verification with arrival coordinate checks ($\pm 2.0\text{ mm}$).
3. Add simulated encoder feedback loops in `test_mdrobotbase.c`.

**Completion gate:** Tests execute against real motor models without stubs.
**Stop condition:** Test execution hang or nondeterministic failure.

### Step 3 — Verification & Fail-Before-Fix Attestation Pass

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**

1. Introduce mutation test: invert a completion condition and verify test fails.
2. Revert mutation and verify all tests pass with 100% green exit code.

**Completion gate:** Proven mutation failure and 100% pass on valid code.
**Stop condition:** Mutation passes undetected.

## In

- Hardening `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` and `trajectory.py`.
- Replacing field inspection tests with dynamic trajectory and stall simulation tests.

## Out

- Code deduplication refactoring (addressed in G-MDRB-018).
- Implementation changes to PBIO C core (prior goals).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Python Tests | Modify | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`: replace tautologies with strict FSM assertions |
| Python Tests | Modify | `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`: add waypoint arrival bounds checks |
| C Tests | Modify | `lib/pbio/test/src/test_mdrobotbase.c`: add dynamic encoder simulation loops |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `micropython-binding` \| `embedded-firmware` |
| **Bounded Context & Domain** | Robotics Kinematics \| Quality Engineering & Test Harness |
| **Ports & Adapters Topology** | Driving Inbound: Test Execution Runner <br> Driven Outbound: VirtualHub / PBIO Simulator |
| **State Machine & Invariants** | Sensitivity Invariant: Any non-trivial mutation to motion logic causes $\ge 1$ test failure |
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

- [x] Zero tautological assertions exist in `tests/virtualhub/robotics/`.
- [x] `done()` is asserted `False` while a background motion is active and `True` after target arrival.
- [x] `stalled()` is asserted `False` during unhindered motion and `True` when simulated motor load exceeds stall limits for $> 200\text{ ms}$.
- [x] Final robot coordinate $(x, y, \theta)$ is asserted within numerical tolerance ($\le 2.0\text{ mm}, \le 1.0^\circ$) across all test paths.
- [x] Tests fail reliably when deliberate regressions are introduced.

## Test plan

- Command: `pytest tests/virtualhub/robotics/ && make -C lib/pbio/test test`
- Verification: 100% test pass with meaningful failure on mutation testing.

## Touch map

- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Ensure tests verify physical motion outcomes, not just internal struct variables.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Test::Running` | Motion dispatched | Target valid | Assert `status == RUNNING && !done()` | Fail test if idle |
| `Test::Running` | Target reached | Tolerance satisfied | Assert `status == COMPLETED && done()` | Fail test if still running |
| `Test::Running` | Stall simulated | Load > threshold | Assert `status == STALLED && stalled()` | Fail test if not stalled |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Tolerance Bounds** | $|x_{\text{actual}} - x_{\text{expected}}| \le 2.0\text{ mm}$, $|\theta_{\text{actual}} - \theta_{\text{expected}}| \le 1.0^\circ$. |
| **Non-Tautology Invariant** | Assertion predicate $P \not\equiv \text{True}$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `TestRunnerPort` | Pytest / TinyTest | `tests/virtualhub/robotics/` |
| **Driven (Outbound)** | `VirtualHubDriverPort` | Simulated hardware abstraction | `pybricks/robotics/pb_type_mdrobotbase.c` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Test suite queued | `bg-surface-elevated` |
| **2. Loading / Pending** | Running simulation steps | `animate-pulse` |
| **3. Empty State** | Zero test cases | `text-content-secondary` |
| **4. Error State** | Assertion failure display | `text-status-error` |
| **5. Success State** | 100% tests green | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Mutation score metric: $M = \frac{K_{\text{killed}}}{M_{\text{total}}} = 1.0$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Verified through simulated bus monitors during invalid command dispatch.
- **Consistent state on failure:** Test harness catches and isolates failed scenarios without aborting subsequent test suites.
- **Regression scenarios:** Testing sequence of 50 consecutive back-and-forth moves with cumulative drift tracking.
