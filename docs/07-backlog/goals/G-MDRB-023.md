# G-MDRB-023: Multi-Scale Numerical Invariant Verification, Submodule Sanitization & Scorecard Elevation

**Status:** review  
**Kind:** qa  
**Atomic outcome:** Execute and record empirical test runs across multiple gear ratios and geometry scales, sanitize the untracked lib/btstack directory, and publish the verified scorecard elevating MDRobotBase to 9.2+/10  
**Epic:** MDRB  
**Depends on:** G-MDRB-022  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Multi-Scale Invariant & Submodule Review Formulation | done |
| 2 | Execute PBIO and VirtualHub Multi-Scale Parameter Sweeps | done |
| 3 | Submodule Sanitization & Scorecard Promotion Pass | done |

## Context

Codex's latest review established a baseline score of **8.1/10** across the MDRobotBase engine. While extensive mathematical invariant tests exist in the codebase, Codex highlighted that:
1. Tests must be executed and recorded empirically in both native PBIO and VirtualHub environments.
2. Invariants must be demonstrated across multiple gear ratios ($R \in [0.1, 10.0]$) and geometry scales (wheel diameters from $30\text{ mm}$ to $120\text{ mm}$, wheel track from $80\text{ mm}$ to $250\text{ mm}$).
3. The untracked `lib/btstack/` submodule directory must be reviewed and cleaned before final shipping.
Executing these steps will fulfill the remaining requirements to advance the architectural scorecard to **9.0–9.3/10**.

### Scorecard & Baseline Evidence
- **Current score:** 8.1/10 (Overall MDRobotBase architecture) · **Expected score:** 9.3/10
- **Exact evidence:** Codex Architectural Review (September 2026)
- **Root cause:** Mathematical proofs and tests were present in source, but multi-scale parameter sweeps and recorded runtime outputs had not yet been codified into a unified verification gate.
- **Reproduction steps:**
  1. Inspect `lib/pbio/test/src/test_mdrobotbase.c`: invariant tests currently test a single standard wheel diameter ($56\text{ mm}$) and wheel track ($112\text{ mm}$).
  2. Inspect git status: `lib/btstack/` appears as an untracked directory.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Autonomous competition platforms require verified numerical stability across diverse physical robot configurations and clean git repository hygiene.  
**Done when:** Numerical kinematic invariants are proven across a parameter sweep of gear ratios and robot dimensions, the `lib/btstack/` submodule status is resolved, and all test suites pass with recorded empirical output elevating the scorecard to 9.2+/10.  
**Unblocks:** — (Epic MDRB full closeout)

## Atomicity & Zero-Mock Contract

- **One outcome:** Execute multi-scale parameter sweep verification, clean git status, and generate final scorecard elevation report.
- **No decomposition leakage:** Specific bugfixes belong to G-MDRB-019 through G-MDRB-022.
- **Concrete execution:** 100% concrete native PBIO test executions and VirtualHub runs. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified via empirical command outputs and measured kernel episode statistics.
- **Failure behavior:** Any test failure, compiler warning, or submodule drift blocks completion.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** Multi-Scale Parameter Matrix in PBIO TinyTest and VirtualHub:
1. Add multi-scale invariant test `test_mdrobotbase_multiscale_kinematic_invariants` in `lib/pbio/test/src/test_mdrobotbase.c`:
   - Test gear ratios: $R \in \{0.2, 0.5, 1.0, 2.5, 5.0, 10.0\}$.
   - Test wheel diameters: $D \in \{30.0, 56.0, 81.6, 120.0\}\text{ mm}$.
   - Test axle tracks: $W \in \{80.0, 112.0, 160.0, 240.0\}\text{ mm}$.
   - Verify distance and angle odometry integration under all combinations.
2. Review `lib/btstack/`: ensure git submodule pointers match `.gitmodules` or add appropriate ignore/checkout rules so working tree is 100% clean.
3. Run compiler checks and sanitizers.
4. Record all test outputs and compute updated scorecard.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) What is the status of `lib/btstack`? `lib/btstack` is an upstream Pybricks git submodule that was left checked out or uninitialized; it will be verified against `.gitmodules` without affecting MDRobotBase.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-MULTISCALE-DRIFT |
| **Decisions** | PDR-MDRB-MULTISCALE-PARAM-SWEEP |
| **Assumptions required** | A-PARAMETRIC-KINEMATIC-LINEARITY |
| **Evidence** | Codex Architectural Review recommendation 7 & 8 |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Parametric Invariant Testing, Clean Repository Hygiene |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-023.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | qa |
| **Task type** | qa |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | qa |
| **Files** | `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` · `docs/06_raw/` |
| **Constraints** | Zero mocks, 100% clean test execution, score $\ge 9.2/10$ |

## Work steps

### Step 1 — Multi-Scale Invariant & Submodule Review Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-023.md` · `docs/02-product/acceptance/G-MDRB-023.md`  
**Actions:**
1. Define the multi-scale parameter grid: 6 gear ratios $\times$ 4 diameters $\times$ 4 tracks = 96 permutations.
2. Document acceptance contract in `docs/02-product/acceptance/G-MDRB-023.md`.
3. Inspect `lib/btstack` status and formulate submodule hygiene plan.
**Completion gate:** Acceptance contract exists with quantitative multi-scale criteria.  
**Stop condition:** Spec drift or unresolved parameter grid definitions.

### Step 2 — Execute PBIO and VirtualHub Multi-Scale Parameter Sweeps

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`  
**Actions:**
1. Add `test_mdrobotbase_multiscale_kinematic_invariants()` in `lib/pbio/test/src/test_mdrobotbase.c`.
2. Register in `pbio_mdrobotbase_tests[]` and run PBIO suite.
3. Add multi-scale trajectory tracking verification in VirtualHub.
4. Verify all tests pass with zero numerical divergence.
**Completion gate:** All multi-scale tests pass 100% green.  
**Stop condition:** Any numerical deviation exceeding floating-point tolerance ($10^{-4}$).

### Step 3 — Submodule Sanitization & Scorecard Promotion Pass

**Allowed files:** `.gitmodules` · `docs/06_raw/`  
**Actions:**
1. Sanitize `lib/btstack/` submodule status to achieve 100% clean git status.
2. Compile and record complete test execution evidence into `docs/06_raw/`.
3. Recalculate and publish final scorecard report demonstrating $\ge 9.2/10$.
**Completion gate:** Clean git working tree and published release gate report.  
**Stop condition:** Scorecard $< 9.2/10$ or unresolved git status.

## In

- Parametric multi-scale kinematic invariant unit testing.
- Git submodule review and clean repository state.
- Scorecard elevation report based on empirical test evidence.

## Out

- Modifying upstream btstack Bluetooth stack source code.
- Adding non-robotics feature goals.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| PBIO Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c` — Add `test_mdrobotbase_multiscale_kinematic_invariants` |
| Docs | Add | `docs/06_raw/` — Add scorecard elevation and release attestation report |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Multi-Scale Invariance** | $\forall R \in [0.1, 10.0], D \in [30, 120]\text{ mm}, W \in [80, 250]\text{ mm}, \text{Error}(\text{Odometry}) < 10^{-4}$. |
| **Git Hygiene** | Zero untracked submodules or uncommitted drift in working tree. |
| **Scorecard Threshold** | Minimum 9.2/10 across all 12 architectural categories. |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Touch map contains all paths
- [x] No `[NEEDS CLARIFICATION]` markers remaining
- [x] In and Out scope clearly bounded
- [x] Zero Mocks, Zero Stubs contract enforced

## Acceptance criteria

- [x] Multi-scale kinematic invariant tests pass across 96 parameter combinations.
- [x] Relative error between commanded wheel travel and accumulated odometry is $< 0.01\%$ across all scales.
- [x] Complete PBIO MDRobotBase suite passes (all tests green, 0 skipped).
- [x] Complete VirtualHub lifecycle, turn, and trajectory suites pass green.
- [x] `lib/btstack/` is cleanly resolved with zero untracked git status.
- [x] Final architectural scorecard reaches $\ge 9.2/10$.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: All native C unit tests pass 100% green.

## Touch map

- `lib/pbio/test/src/test_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`
- `docs/06_raw/`

## Notes for AI

- Zero mocks, zero stubs.
- Do not fabricate test results; execute real commands and paste exact outputs.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Test::MultiScale` | Run parameter sweeps | $R > 0, D > 0, W > 0$ | Compute odometry error | Fail on divergence $> 10^{-4}$ |
| `Clean::Submodule` | Git status review | Match `.gitmodules` | Reset / ignore submodule drift | Abort on dirty working tree |
| `Score::Elevated` | All tests pass | Score $\ge 9.2/10$ | Publish release report | Block if score $< 9.2$ |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Multi-Scale Bound** | $\max_{R, D, W} |\Delta s_{\text{cmd}} - \Delta s_{\text{measured}}| \le \epsilon$. |
| **Scorecard Invariant** | Overall weighted architectural score $\ge 9.2 / 10.0$. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Quality Assurance CI/CD Test Pipeline.
- **Outbound Driven Port:** Architectural Scorecard & Audit Ledger.
