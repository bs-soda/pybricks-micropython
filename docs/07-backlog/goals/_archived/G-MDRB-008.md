# G-MDRB-008: Comprehensive MDRobotBase Regression Coverage

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Construct an exhaustive regression test suite across PBIO tinytest and VirtualHub pytest covering all 8 failure domains with zero mocks  
**Epic:** MDRB  
**Depends on:** G-MDRB-007  
**Blocks:** G-MDRB-009  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Expand PBIO tinytest suite with multi-instance, gear ratio, and failure cases | done |
| 2 | Expand VirtualHub pytest suite with trajectory, stall, and lifecycle scenarios | done |
| 3 | Execute combined regression pass and verify 100% green coverage | done |

## Context

Codex architectural review scorecard assigned Test Coverage a baseline score of **5/10 (High Risk)**.
In [`lib/pbio/test/src/test_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/test/src/test_mdrobotbase.c) and [`tests/virtualhub/robotics/test_mdrobotbase_turn.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_turn.py):
- Only happy-path gain getters/setters and basic turns are tested.
- Critical P0 and P1 defect domains completely lack test coverage:
  1. Allocation and instance isolation (creating 2 robots, over-capacity 3rd robot).
  2. Full struct initialization and reuse without dirty state leakage.
  3. Geometry parameter validation (negative track, zero diameter, aliased motors).
  4. Encoder odometry scaling across gear ratios ($1.0, 0.5, 2.0$).
  5. Straight, turn, pivot, and multi-segment trajectory kinematics.
  6. PID vs LQR controller selection and schedule enabling.
  7. Completion, cancellation, timeout, and stall failure handling.
  8. Backlash filter hysteresis and gyro-encoder complementary fusion.
  9. Malformed trajectory inputs and silent truncation prevention.

Without automated regression tests for these domains, future modifications risk re-introducing silent failures and physical crashes.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Embedded robotics firmware requires automated regression tests for all physical failure modes and edge cases; relying solely on happy-path tests allows critical regressions to go undetected until hardware breaks in the field.  
**Done when:** All P0 and P1 remediation scenarios are covered by concrete tests in PBIO tinytest or VirtualHub pytest, executing with real servo structures and simulated clock ticks, achieving 100% green verification without any test doubles or mocks.  
**Unblocks:** G-MDRB-009 (Maintainability and Duplicate Control Logic Reduction).

## Atomicity & Zero-Mock Contract

- **One outcome:** End-to-end regression test suite encompassing all 8 failure domains for MDRobotBase.
- **No decomposition leakage:** Input validation belongs to `G-MDRB-003`/`G-MDRB-007`; refactoring belongs to `G-MDRB-009`.
- **Concrete execution:** Real C tinytest assertions and real Python VirtualHub test scripts. Zero mocks, zero stubs.
- **Real boundary verification:** Verified by running `ctest` in `lib/pbio/test` and `pytest` in `tests/virtualhub/`.
- **Failure behavior:** Any kinematic divergence or unexpected success on failure cases immediately fails the test runner.

## How

**Stack / approach:**
- In `lib/pbio/test/src/test_mdrobotbase.c`:
  - Add `test_mdrobotbase_allocation_isolation()`:
    - Allocate Robot A (Port A/B) and Robot B (Port C/D). Verify distinct addresses.
    - Verify 3rd allocation returns `PBIO_ERROR_BUSY`.
    - Release Robot A; verify 3rd allocation now succeeds.
  - Add `test_mdrobotbase_initialization_hygiene()`:
    - Fill memory with `0x55`, call `pbio_mdrobotbase_init()`, assert all defaults clean.
  - Add `test_mdrobotbase_geometry_boundaries()`:
    - Assert `wheel_diameter <= 0` and `axle_track <= 0` return `PBIO_ERROR_INVALID_ARG`.
  - Add `test_mdrobotbase_gear_ratio_kinematics()`:
    - Test distance scaling across $R \in \{0.5, 1.0, 2.0\}$.
  - Add `test_mdrobotbase_stall_and_timeout()`:
    - Verify non-success error returns on stall and timeout.
- In `tests/virtualhub/robotics/`:
  - Add `test_mdrobotbase_trajectory_limits.py`:
    - Test $>64$ points rejection and malformed tuple handling.
  - Add `test_mdrobotbase_async_lifecycle.py`:
    - Test preemption and all 6 lifecycle sequences.

## Open questions

*(None — regression test plan confirmed via Codex review Step 8)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 8 (Test coverage)` |
| Root Cause | `lib/pbio/test/src/test_mdrobotbase.c` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |
| VirtualHub Tests | `tests/virtualhub/robotics/` |

## Work steps

### Step 1 — PBIO C Regression Suite Expansion
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**
1. Implement test groups for allocation, initialization, geometry, gear ratios, and stall.
2. Register new test cases in tinytest runner.

**Completion gate:** All PBIO unit tests compile and pass green under `ctest`.  
**Stop condition:** Any failed assertion.

### Step 2 — VirtualHub Python Integration Test Suite
**Allowed files:** `tests/virtualhub/robotics/**`  
**Actions:**
1. Implement trajectory capacity and malformed coordinate tests.
2. Implement async motion preemption and lifecycle test scripts.

**Completion gate:** All pytest tests pass green under Python 3 test environment.  
**Stop condition:** Any uncaught exception or hanging test.

### Step 3 — Regression Coverage Audit & Attestation
**Allowed files:** `scripts/harness/mdrobotbase-epic-harness.mjs`  
**Actions:**
1. Run automated epic verification harness verifying all 8 failure domains are tested.
2. Verify zero mocks or stubs across test code.

**Completion gate:** Epic verification harness reports 100% green attestation.  
**Stop condition:** Any uncovered defect domain.

## In

- Comprehensive C test cases in `test_mdrobotbase.c`.
- VirtualHub integration tests in `tests/virtualhub/robotics/`.
- Concrete assertions for all P0 and P1 scorecard items.
- Full verification of edge cases, negative inputs, and fault conditions.

## Out

- Modifying runtime firmware logic (pure QA verification goal).
- Adding synthetic benchmark loads unrelated to MDRobotBase.
- Hardware in the loop (HIL) bench setups.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Tests | Add | 8 new test functions in `lib/pbio/test/src/test_mdrobotbase.c` |
| Python Tests | Add | Trajectory & lifecycle tests in `tests/virtualhub/robotics/` |
| CI Harness | Modify | Conformance verification in `scripts/harness/mdrobotbase-epic-harness.mjs` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Automated Test Harness Infrastructure |
| **Ports & Adapters Topology** | Inbound: Tinytest & Pytest Test Runners <br> Outbound: PBIO C Library & MicroPython Binaries |
| **State Machine & Invariants** | Test Oracle Invariant: $\forall \text{failure domain } d, \text{assert}(\text{detects}(d))$ |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] All 8 defect categories have automated tests running in PBIO or VirtualHub suites.
- [x] Tests execute against real PBIO servo structures with zero mocks or stubs.
- [x] Test suite fails if gear ratio is unscaled, dimensions are unvalidated, or stall returns success.
- [x] All test cases pass with exit code 0 under standard test commands (`ctest`, `pytest`).
- [x] Test execution time remains under 10 seconds.

## Test plan

- Run `make -C lib/pbio/test test` and verify all tests pass.
- Run `pytest tests/virtualhub/robotics/` and verify all tests pass.

## Touch map

- `lib/pbio/test/src/test_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_turn.py`
- `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `scripts/harness/mdrobotbase-epic-harness.mjs`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Use tinytest macros (`tt_uint_op`, `tt_want_int_op`) consistently with existing PBIO tests.
- Ensure all test servos are properly allocated and initialized through PBIO port interfaces.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Test::Setup` | Test runner start | Test ports available | Initialize servos & robot bases | Abort on hardware setup failure |
| `Test::Execution` | Execute test vector | Real inputs applied | Measure outputs & return codes | Record failure on assertion mismatch |
| `Test::Teardown` | Test function exit | Clean memory | Release robot base slots | Detect memory leak |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Coverage Completeness** | $\text{count}(\text{tested domains}) = 8 / 8$. |
| **Kinematic Precision** | Max allowed odometry discrepancy $\epsilon < 0.1\text{mm}$. |
| **Zero Mock Invariant** | $\text{mocks\_count} = 0 \land \text{stubs\_count} = 0$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Tinytest Runner Hook (`PBIO_PT_THREAD`).
- **Outbound Driven Port:** Device Driver State Assertion Port (`tt_uint_op`).
