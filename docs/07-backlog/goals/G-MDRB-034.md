# G-MDRB-034: Dynamic Kinematic Motion Timeout Scaling & Trajectory Deadline Hardening

**Status:** review
**Kind:** feature
**Atomic outcome:** Eliminate premature ETIMEDOUT motion failures by dynamically scaling trajectory deadlines from physical path distance and kinematics while ensuring true mechanical stalls fail closed.
**Epic:** MDRB
**Depends on:** G-MDRB-033
**Blocks:** G-MDRB-035
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Specify Dynamic Kinematic Deadline Formulation & BDD Acceptance Scenarios | done |
| 2 | Implement Kinematic Timeout Scaling in PBIO C Bindings & VirtualHub Simulator | done |
| 3 | Verify Long-Distance Trajectory Invariance & Real Mechanical Stall Timeout Guard | done |

## Context

During autonomous trajectory execution, robots encountered premature `ETIMEDOUT: time out` aborts on long waypoint paths and low-speed movements. The root cause is a hardcoded heuristic `(num_points * 2000) + 1000` ms in `follow_trajectory`, which allocates insufficient duration when waypoints are separated by more than a few centimeters. This goal introduces a physically-grounded kinematic deadline calculation where deadlines scale with commanded path distance, velocity, acceleration, and heading changes.

### Scorecard & Baseline Evidence
- **Current score:** 9.0/10 · **Expected score:** 10.0/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:1946-1951`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1946-L1951)
- **Root cause:** Fixed deadline heuristic `(num_points * 2000) + 1000` ms ignores physical path distance $D$, cruising velocity $v$, and acceleration ramps $a$. A 2-point move over $800\text{ mm}$ at $100\text{ mm/s}$ requires $\ge 8.0\text{ s}$, but was capped at $5.0\text{ s}$, causing deterministic motion aborts.
- **Reproduction steps:**
  1. Construct robot base and dispatch `follow_trajectory([(0, 0), (800, 0)], speed_mm_s=100)`.
  2. Observe robot traveling normally until $t = 5000\text{ ms}$.
  3. Firmware aborts motion with `PBIO_ERROR_TIMEDOUT` raising `OSError: [Errno 110] ETIMEDOUT`.

## Intent

**Why:** A robotics platform cannot be deployed in autonomous competitions if valid long-distance or slow-speed maneuvers trigger spurious timeout failures while motors are operating correctly.

**Done when:** All autonomous motion commands compute deadlines dynamically from physical path kinematics, allowing arbitrary long trajectories to complete while guaranteeing that true physical motor jams or unachieved target tolerances fail closed with `ETIMEDOUT` after the kinematic deadline expires.

**Unblocks:** Autonomous mission planners, multi-waypoint navigation, and resilient robot re-run lifecycles.

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: dynamic kinematic motion timeout calculation and trajectory deadline hardening across C firmware and VirtualHub.
- **No decomposition leakage:** Slot reclamation, finalizers, and re-entrant lifecycle recovery are isolated into downstream goal `G-MDRB-035`.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or artificial test timeouts. Tested with concrete mathematical arc length calculations, simulated physical kinematics, and real timer expiration checks.
- **Real boundary verification:** Verified against native PBIO C state machine and Python VirtualHub execution engine.
- **Failure behavior:** When a robot physically stalls or fails to arrive within the kinematic deadline, actuator PWM must be disarmed and `PBIO_ERROR_TIMEDOUT` (`OSError: [Errno 110] ETIMEDOUT`) must be raised.

## How

> Implementation approach and architecture:
1. In `pybricks/robotics/pb_type_mdrobotbase.c`, replace `(num_points * 2000) + 1000` with dynamic Euclidean arc-length summation:
   $$D = \sum_{i=0}^{N-2} \sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2}$$
   $$T_{kinematic} = \frac{D}{v} + \frac{v}{a_{accel}} + \frac{v}{a_{decel}} + \sum \frac{|\Delta \theta_k|}{\omega_{turn}}$$
   $$T_{deadline} = \max\left(1500\text{ ms}, \left\lfloor T_{kinematic} \times 1.5 \times 1000.0 \right\rfloor + 2000\text{ ms}\right)$$
2. In `navigate_to_goal`, guarantee acceleration and deceleration ramp times are always accounted for in $T_{expected}$.
3. In `tests/virtualhub/robotics/pybricks/robotics.py`, implement identical kinematic deadline calculation and support `timeout_ms` parameter override across all motion methods.

## Open questions

- *Resolved in CLARIFICATION.md:* Confirmed dynamic kinematic deadline calculation with 1.5x multiplier and 2000ms grace buffer.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-TIMEOUT-PREMATURE-ABORT |
| **Decisions** | PDR-MDRB-KINEMATIC-DEADLINE-SCALING |
| **Assumptions required** | A-PHYSICAL-KINEMATIC-MEASUREMENT |
| **Evidence** | `docs/06_raw/20260912_134000_etimedout_timeout_bug_socratic_analysis.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Kinematic Deadline Calculation, Fail-Closed Temporal Protection |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-034.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | implementer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | implementer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, zero stubs, zero compiler warnings, 100% test pass rate |

## Work steps

### Step 1 — Specify Dynamic Kinematic Deadline Formulation & BDD Acceptance Scenarios

**Allowed files:** `docs/07-backlog/goals/G-MDRB-034.md` · `docs/02-product/acceptance/G-MDRB-034.md` · `docs/06_raw/`
**Actions:**
1. Define exact mathematical kinematic formulas for straight moves, turns, pivots, and multi-point trajectories.
2. Formulate BDD Given-When-Then scenarios in `docs/02-product/acceptance/G-MDRB-034.md` covering long-distance trajectories, low-speed maneuvers, explicit timeout overrides, and genuine stall timeout enforcement.
3. Link the Socratic 5-Why analysis in `docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md`.
**Completion gate:** Acceptance contract exists defining quantitative bounds and test scenarios.
**Stop condition:** Any ambiguity in kinematic calculations or timeout units.

### Step 2 — Implement Kinematic Timeout Scaling in PBIO C Bindings & VirtualHub Simulator

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py`
**Actions:**
1. In `pb_type_mdrobotbase.c`, update `follow_trajectory` to compute total path distance by summing point-to-point segment lengths, computing physical kinematic travel time, and setting $T_{deadline} = (uint32\_t)(T_{kinematic} \times 1.5f \times 1000.0f) + 2000$.
2. In `pb_type_mdrobotbase.c`, update `navigate_to_goal` to compute safe ramp-inclusive deadlines.
3. In `tests/virtualhub/robotics/pybricks/robotics.py`, implement matching kinematic deadline calculation and `timeout_ms` parameter support for `straight`, `turn_to_angle`, `pivot_turn_to_angle`, and `follow_trajectory`.
**Completion gate:** Both C and Python runtimes compute identical kinematic deadlines.
**Stop condition:** Compilation error or divergence between C and Python deadline formulas.

### Step 3 — Verify Long-Distance Trajectory Invariance & Real Mechanical Stall Timeout Guard

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `lib/pbio/test/src/test_mdrobotbase.c` · `docs/06_raw/`
**Actions:**
1. In `test_mdrobotbase_lifecycle.py`, add test executing 1500mm trajectory at 50mm/s verifying completion without `ETIMEDOUT`.
2. Add test verifying explicit `timeout_ms=50` aborts an incomplete move with `OSError(ETIMEDOUT)`.
3. Run `python3 -m unittest discover tests/virtualhub/robotics/` and verify all tests pass 100% green.
4. Run governance and whitespace checks.
**Completion gate:** 100% test pass rate with zero regressions.
**Stop condition:** Any test failure or whitespace error.

## In

- Dynamic kinematic deadline calculation for all motion methods.
- Point-to-point Euclidean path summation in `follow_trajectory`.
- VirtualHub Python parity for `timeout_ms` and timeout enforcement.
- Unit tests validating long trajectories, low speeds, and stall detection.

## Out

- Modifying PID/LQR feedback controller algorithms.
- Modifying instance allocation or motor ownership logic (handled in G-MDRB-035).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Firmware | Modify | `pybricks/robotics/pb_type_mdrobotbase.c` — Dynamic kinematic deadline in follow_trajectory and navigate_to_goal |
| VirtualHub | Modify | `tests/virtualhub/robotics/pybricks/robotics.py` — Mirror dynamic deadline calculation, back parameter, and timeout_ms support |
| Tests | Modify | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` — Add long-distance, timeout override, backward trajectory, and table-driven regression tests |
| Acceptance | Add | `docs/02-product/acceptance/G-MDRB-034.md` — BDD acceptance contract |
| Governance | Modify | `CLARIFICATION.md` — Asynchronous clarification record and consensus log |
| Governance | Modify | `docs/07-backlog/queues/MDRB.md` — Goal backlog queue status transition |
| Audit | Modify | `docs/06_raw/index.md` — Raw documentation index update |
| Audit | Modify | `docs/06_raw/log.md` — Operations chronological audit log |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `embedded-firmware` / `kinematic-control` |
| **Bounded Context & Domain** | Motion Execution & Temporal Safety Governance |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython Awaitable Dispatcher <br> Driven Outbound: Motor PWM & Clock Watchdog |
| **Zero-Mock & Conformance Gate** | 100% real kinematic mathematics, concrete timer ticks, zero test doubles |
| **Socratic 5-Why Blueprint** | [`docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md) |
| **State Machine & Invariants** | $t_{elapsed} \ge T_{deadline} \land \epsilon > \epsilon_{tol} \implies \text{status} = \text{TIMED\_OUT} \land \text{raise OSError(ETIMEDOUT)}$ |

### Mathematical & Data Invariants Spec
$$D_{trajectory} = \sum_{i=0}^{N-2} \sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2}$$
$$T_{kinematic} = \frac{D_{trajectory}}{v_{cruise}} + \frac{v_{cruise}}{a_{accel}} + \frac{v_{cruise}}{a_{decel}} + \sum \frac{|\Delta \theta_k|}{\omega_{turn}}$$
$$T_{deadline} = \max\left(1500\text{ ms}, \left\lfloor T_{kinematic} \times 1.5 \times 1000.0 \right\rfloor + 2000\text{ ms}\right)$$

### Finite State Machine (FSM) Matrix

| Current State | Trigger Event | Guard Condition | Target State | Output Action |
|---|---|---|---|---|
| `State::Running` | Timer Tick | $t_{elapsed} \ge T_{deadline} \land \text{error} > \text{tolerance}$ | `State::TimedOut` | Stop motors, raise `OSError(ETIMEDOUT)` |
| `State::Running` | Target Arrival | $\text{error} \le \text{tolerance}$ | `State::Completed` | Stop motors, return success |

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** `MDRobotBase.straight()`, `turn_to_angle()`, `follow_trajectory()`
- **Outbound Port:** `pbdrv_clock_get_ms()`, `pbio_servo_stop()`

## Spec checklist

- [x] Software & Architecture Design specified by AI Agent
- [x] Intent is WHAT/WHY only
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Atomicity & Zero-Mock Contract confirmed

## Acceptance criteria

- [x] `follow_trajectory` computes deadline dynamically from cumulative segment lengths.
- [x] Trajectory of $1500\text{ mm}$ at $50\text{ mm/s}$ completes without raising `ETIMEDOUT`.
- [x] Explicit `timeout_ms` parameter overrides dynamic calculation.
- [x] Unreached target past deadline raises `OSError: [Errno 110] ETIMEDOUT`.
- [x] VirtualHub and PBIO C share identical timeout calculation semantics.
- [x] Backward trajectory applies segment heading $+180^\circ$ offset identically in C and Python.
- [x] Strict integer floor semantics verified against boundary vectors around $.5\text{ ms}$.

## Test plan

- Execute `python3 -m unittest discover tests/virtualhub/robotics/` verifying all tests pass.
- Execute `./lib/pbio/test/build/test-pbio` verifying 0 regressions.
- Execute `bash scripts/ci/governance-check.sh` verifying clean governance.

## Touch map

### Implementation & Verification Paths
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `docs/02-product/acceptance/G-MDRB-034.md`

### Governance & Audit Ledger Paths
- `CLARIFICATION.md`
- `docs/07-backlog/goals/G-MDRB-034.md`
- `docs/07-backlog/queues/MDRB.md`
- `docs/06_raw/index.md`
- `docs/06_raw/log.md`

## Notes for AI

- Never use fixed constants like `num_points * 2000` for physical motion deadlines.
- Always include acceleration/deceleration durations when calculating kinematic duration.
- Ensure all tests use real coordinates and motors with zero mocks or stubs.
