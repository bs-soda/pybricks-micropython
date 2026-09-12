# G-MDRB-036: Discrete Algebraic Riccati Equation (DARE) & Mathematically Derived Optimal LQR Tracking Controller

**Status:** review
**Kind:** feature
**Atomic outcome:** Implement mathematically derived optimal LQR tracking controller via Discrete Algebraic Riccati Equation (DARE) with state/control cost matrices (Q, R), discrete closed-loop eigenvalue stability verification, 8 Codex validation test scenarios, and empirical PID comparison benchmark.
**Epic:** MDRB
**Depends on:** G-MDRB-035
**Blocks:** —
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Formulate Discrete State-Space Model, DARE Weight Invariants & BDD Acceptance Scenarios | done |
| 2 | Baseline Freeze & Heuristic Scaling Mathematical Defect Replication Proof | done |
| 3 | Exact-HEAD Provenance & Discrete Eigenvalue Unit Circle Mutation Sensitivity Testing | done |
| 4 | Concrete Optimal DARE LQR Controller Implementation (Zero Mocks, Zero Stubs) | done |
| 5 | Real-World Episode Oracle & Comparative LQR vs. PID Benchmark Execution | done |
| 6 | Master Replication Gate Verification & Release Certification | done |

## Context

Codex static code review identified that while the MDRobotBase tracking controller exhibits stable empirical feedback, it initially relied on a reduced scalar + 2x2 solver to populate the production LUT. This goal delivers the complete mathematically correct full 3-state, 2-input Discrete Algebraic Riccati Equation (DARE) solution via the Structured Doubling Algorithm (SDA), generating active production LUT gains ($k_x, k_y, k_\theta, \rho$) from $K(v_r) = (R + B_d^T P B_d)^{-1} B_d^T P A_d$, proving Riccati residual $\|P - \text{RHS}\|_\infty < 5\times 10^{-4}$ (float32) and $< 10^{-9}$ (double) across all 16 bins, validating discrete closed-loop spectral radius $\rho < 1.0$, guarding `set_lqr_gains()` as legacy manual mode, and confirming superior performance over PID via a 20-trial statistical benchmark (75.34% RMS cross-track error reduction).

### Scorecard & Baseline Evidence
- **Current score:** 10.0/10 · **Remediated from:** 8.9/10 (Codex Review)
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:265-710`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L265-L710)
- **Mathematical validation:** Structured Doubling Algorithm (SDA) solving full 3x3 unicycle DARE in 10–13 iterations; Riccati residual $< 5\times 10^{-4}$ in float32 and $< 10^{-9}$ in double precision; $\rho < 1.0$ across $v \in [-800, 800]$ mm/s.
- **Verification report:** [`docs/06_raw/20260912_204000_g_mdrb_036_full_dare_production_integration_report.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/06_raw/20260912_204000_g_mdrb_036_full_dare_production_integration_report.md)

## Intent

**Why:** A premier robotics platform must provide formally optimal control algorithms with guaranteed stability certificates, mathematically grounded cost trade-offs, and empirical benchmarks demonstrating superior tracking precision over basic PID.

**Done when:** Control gains are derived from $(Q, R)$ optimization via DARE, all discrete closed-loop eigenvalues satisfy $|\lambda_i| < 1.0$ across $v_r \in [50, 800]\text{ mm/s}$, all 8 Codex validation test scenarios pass, and an automated benchmark proves $\ge 20\%$ lower RMS cross-track error than PID.

**Unblocks:** High-speed autonomous navigation, precision docking, and competition path-following certification.

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: mathematically derived optimal LQR tracking via DARE with discrete eigenvalue stability validation and empirical benchmarking.
- **No decomposition leakage:** Kinematic timeouts (`G-MDRB-034`) and instance reclamation (`G-MDRB-035`) are isolated into upstream goals.
- **Concrete execution:** No mocks, stubs, fakes, or dummy matrices. Tested with concrete numerical Riccati solutions, real discrete eigenvalue calculations, and physics-based unicycle simulation.
- **Real boundary verification:** Verified across native PBIO C and Python VirtualHub with identical mathematical formulations.
- **Failure behavior:** Invalid non-positive cost matrices ($Q \nsucceq 0, R \nsucc 0$) or unstable gain configurations ($\max_i |\lambda_i| \ge 1.0$) strictly fail closed with `PBIO_ERROR_INVALID_ARG`.

## How

> Implementation approach and architecture:
1. Formulate discrete state-space unicycle tracking error model for local state vector $x = [e_x, e_y, e_\theta]^T$ ($T_s = 5\text{ ms}$):
   $$A_d(v_r) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & v_r T_s \\ 0 & 0 & 1 \end{bmatrix}, \quad B_d(v_r) = \begin{bmatrix} -T_s & 0 \\ 0 & -\frac{1}{2} v_r T_s^2 \\ 0 & -T_s \end{bmatrix}$$
2. Define standard quadratic cost matrices:
   $$Q = \text{diag}(q_x, q_y, q_\theta) \succeq 0, \quad R = \text{diag}(r_v, r_\omega) \succ 0$$
3. Precompute discrete algebraic Riccati equation (DARE) solution $P$ and optimal gain matrix:
   $$K(v_r) = (R + B_d^T P B_d)^{-1} B_d^T P A_d = \begin{bmatrix} k_{11} & 0 & 0 \\ 0 & k_{22}(v_r) & k_{23}(v_r) \end{bmatrix}$$
   across 16 operating velocity bins ($v_r \in [50, 800]\text{ mm/s}$) with $C^0$ linear interpolation in $O(1)$ time.
4. Implement discrete eigenvalue spectral radius validator:
   $$\rho(A_d(v_r) - B_d(v_r) K(v_r)) < 1.0$$
5. Implement 8 Codex validation test scenarios and automated LQR vs. PID comparative benchmark.

## Open questions

- *Resolved in CLARIFICATION.md:* Confirmed Option A (Full DARE LQR) with precomputed LUT velocity parameterization.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-LQR-HEURISTIC-MATHEMATICS |
| **Decisions** | PDR-MDRB-DARE-OPTIMAL-LQR-CONTROLLER |
| **Assumptions required** | A-UNICYCLE-LOCAL-FRAME-ERROR-DYNAMICS |
| **Evidence** | `docs/06_raw/20260912_152000_codex_lqr_mathematical_rigor_socratic_analysis.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Discrete Linear Quadratic Regulator (DARE), Gain-Scheduled Optimal Control |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-036.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | implementer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | implementer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` · `tests/virtualhub/robotics/test_mdrobotbase_lqr.py` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, zero stubs, discrete spectral radius $< 1.0$, 100% test pass rate |

## Work steps

Ordered execution contract for **this card only** — Antigravity or another agent executes the same list. Do not label steps as "human" vs "AI". Every implementation step must be atomic and include its allowed files, ordered actions, completion gate, and failure/stop condition. Do not use broad instructions such as “implement the feature” or “run tests”.

### Step 1 — Formulate Discrete State-Space Model, DARE Weight Invariants & BDD Acceptance Scenarios

**Allowed files:** `docs/02-product/acceptance/G-MDRB-036.md` · `docs/06_raw/`
**Actions:**

1. Formulate discrete unicycle error state transition matrix $A_d(v_r)$ and input matrix $B_d(v_r)$ at $T_s = 5\text{ ms}$.
2. Solve discrete algebraic Riccati equation $P$ and derive optimal feedback gain matrix $K(v_r)$ across 16 velocity bins.
3. Formulate Given-When-Then BDD acceptance scenarios defining exact quantitative bounds.

**Completion gate:** Acceptance contract and Level-5 Socratic 5-Why report created and linked.
**Stop condition:** Any unverified assumption or unresolved `[NEEDS CLARIFICATION]`.

### Step 2 — Baseline Freeze & Heuristic Scaling Mathematical Defect Replication Proof

**Allowed files:** `docs/06_raw/` · `tests/`
**Actions:**

1. Record pre-implementation Git HEAD SHA provenance.
2. Construct deterministic failing test case reproducing heuristic gain scheduling and unverified eigenvalue drift.
3. Capture empirical command output and verify fail-closed behavior before any code modification.

**Completion gate:** Deterministic replication artifact recorded in `docs/06_raw/` with failing test proof.
**Stop condition:** Inability to reliably reproduce the defect against the frozen baseline.

### Step 3 — Exact-HEAD Provenance & Discrete Eigenvalue Unit Circle Mutation Sensitivity Testing

**Allowed files:** `scripts/harness/`
**Actions:**

1. Author isolated mutation test harness validating mathematical, state, and boundary invariants.
2. Introduce controlled fault mutations (e.g., inverted checks, missing clamp floors, scale errors).
3. Verify that 100% of mutation vectors are caught by the invariant test suite.

**Completion gate:** 100% mutation detection rate certified in isolated mutation testing harness.
**Stop condition:** Any mutation test false negative or undetected fault injection.

### Step 4 — Concrete Optimal DARE LQR Controller Implementation (Zero Mocks, Zero Stubs)

**Allowed files:** `pybricks/robotics/` · `lib/pbio/` · `tests/virtualhub/`
**Actions:**

1. Implement production domain logic, state machines, and driver bindings strictly within the touch map.
2. Mirror full functionality in the simulator/virtual runtime ensuring complete architectural parity.
3. Enforce fail-closed error handling and disarm actuators on failure.

**Completion gate:** Code compiles with zero warnings; all unit tests pass with zero mocks or stubs.
**Stop condition:** Any compiler warning, mock object leak, or runtime failure.

### Step 5 — Real-World Episode Oracle & Comparative LQR vs. PID Benchmark Execution

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

- Discrete state-space unicycle tracking error model ($T_s = 5\text{ ms}$).
- Quadratic cost matrices $Q \succeq 0, R \succ 0$ and DARE gain derivation.
- Precomputed velocity-scheduled optimal gain lookup table with $O(1)$ interpolation.
- Discrete closed-loop spectral radius verification ($\rho < 1.0$).
- 8 Codex validation test scenarios and comparative LQR vs. PID benchmark.

## Out

- Non-linear Model Predictive Control (NMPC) or neural network policies.
- Dynamic matrix inversion on microcontrollers with runtime heap allocation.
- Drivebase mechanical chassis restructuring.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| PBIO C | Modify | `lib/pbio/include/pbio/mdrobotbase.h` — Declare DARE weights API and discrete eigenvalue verification |
| PBIO C | Modify | `lib/pbio/src/mdrobotbase.c` — Implement DARE gain table, interpolation, and discrete spectral radius check |
| Firmware | Modify | `pybricks/robotics/pb_type_mdrobotbase.c` — MicroPython bindings for LQR weights and optimal presets |
| VirtualHub | Modify | `tests/virtualhub/robotics/pybricks/robotics.py` — VirtualHub parity for DARE LQR and eigenvalue validation |
| Tests | Modify | `tests/virtualhub/robotics/test_mdrobotbase_lqr.py` — 8 Codex validation tests and PID benchmark in Python |
| Tests | Modify | `lib/pbio/test/src/test_mdrobotbase.c` — Native C closed-loop DARE convergence and eigenvalue unit-circle tests |
| Docs | Add | `docs/02-product/acceptance/G-MDRB-036.md` — BDD acceptance contract |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | `embedded-firmware` / `optimal-control` |
| **Bounded Context & Domain** | Trajectory Tracking & Optimal Control Governance |
| **Ports & Adapters Topology** | Driving Inbound: Trajectory Dispatcher <br> Driven Outbound: Motor Velocity Setpoints |
| **Zero-Mock & Conformance Gate** | 100% concrete DARE mathematics, zero test doubles, zero memory leaks |
| **Socratic 5-Why Blueprint** | [`docs/06_raw/20260912_152500_g_mdrb_036_socratic_5why.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/06_raw/20260912_152500_g_mdrb_036_socratic_5why.md) |
| **State Machine & Invariants** | $\rho(A_d(v_r) - B_d(v_r) K(v_r)) < 1.0 \implies \text{Optimal Tracking Active}$ <br> $\rho \ge 1.0 \implies \text{Reject Configuration} \land \text{PBIO\_ERROR\_INVALID\_ARG}$ |

### Mathematical & Data Invariants Spec
$$A_d(v_r) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & v_r T_s \\ 0 & 0 & 1 \end{bmatrix}, \quad B_d(v_r) = \begin{bmatrix} -T_s & 0 \\ 0 & -\frac{1}{2} v_r T_s^2 \\ 0 & -T_s \end{bmatrix}$$
$$P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^{-1}(B_d^T P A_d) + Q$$
$$K(v_r) = (R + B_d^T P B_d)^{-1} B_d^T P A_d$$
$$\rho(A_d - B_d K) = \max_i |\lambda_i| < 1.0$$

### Finite State Machine (FSM) Matrix

| Current State | Trigger Event | Guard Condition | Target State | Output Action |
|---|---|---|---|---|
| `State::Configuring` | `set_lqr_weights(Q, R)` | $Q \succeq 0 \land R \succ 0 \land \rho < 1.0$ | `State::Active` | Update gain table, return success |
| `State::Configuring` | `set_lqr_weights(Q, R)` | $Q \nsucceq 0 \lor R \nsucc 0 \lor \rho \ge 1.0$ | `State::Configuring` | Reject with `PBIO_ERROR_INVALID_ARG` |
| `State::Active` | Velocity Update | $v_r \in [v_{min}, v_{max}]$ | `State::Active` | Interpolate $K(v_r)$, output $u = -K e$ |
| `State::Active` | Wheel Saturation | $|v_{wheel}| \ge v_{max}$ | `State::Active` | Symmetrical anti-windup clamping |

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** `MDRobotBase.set_lqr_weights()`, `MDRobotBase.set_lqr_preset()`, `pbio_mdrobotbase_lqr_step()`
- **Outbound Port:** `pbio_servo_set_velocity()`, `mdrobotbases[]`

## Spec checklist

- [x] Software & Architecture Design specified by AI Agent
- [x] Intent is WHAT/WHY only
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Atomicity & Zero-Mock Contract confirmed

## Acceptance criteria

- [x] Gains $K(v_r)$ derived from $(Q, R)$ optimization via DARE without heuristic scaling constants.
- [x] Discrete closed-loop spectral radius satisfies $\rho(A_d - B_d K) < 1.0$ across all operating speeds.
- [x] Certified presets `OPTIMAL_BALANCED`, `OPTIMAL_AGGRESSIVE`, `OPTIMAL_SMOOTH` produce deterministic optimal gains.
- [x] Closed-loop tracking achieves $> 95\%$ error reduction within $1.5\text{ s}$ from initial perturbations.
- [x] All 8 Codex validation test scenarios pass in native PBIO C and VirtualHub Python.
- [x] Comparative benchmark confirms $\ge 20\%$ lower RMS cross-track error than standard PID.

## Test plan

- Execute `python3 -m unittest discover tests/virtualhub/robotics/` verifying all tests pass.
- Execute `./lib/pbio/test/build/test-pbio` verifying 0 regressions.
- Execute `bash scripts/ci/governance-check.sh` verifying clean governance.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `tests/virtualhub/robotics/test_mdrobotbase_lqr.py`
- `lib/pbio/test/src/test_mdrobotbase.c`
- `docs/02-product/acceptance/G-MDRB-036.md`

## Notes for AI

- Never use heuristic scaling terms like `sqrt(v/300)` or arbitrary steering gains like `0.35`.
- Always verify discrete eigenvalues $|\lambda_i| < 1.0$ inside the complex unit circle for sample period $T_s = 5\text{ ms}$.
- Ensure precomputed table interpolation is strictly $O(1)$ with zero runtime heap allocation.
