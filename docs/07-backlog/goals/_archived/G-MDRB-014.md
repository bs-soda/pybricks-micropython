# G-MDRB-014: Differential-Drive Kinematic Invariants & Bidirectional Gear-Ratio Semantics

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Verify and prove bidirectional round-trip conversions and differential-drive odometry distance and heading equations under gear ratio scaling R in [0.01, 100.0]  
**Epic:** MDRB  
**Depends on:** G-MDRB-013  
**Blocks:** G-MDRB-015  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Algebraic Kinematic Proof Formulation | done |
| 2 | Enforce Unit Consistency & Invertibility in PBIO Helpers | done |
| 3 | Verification & Numerical Invariant Test Pass | done |

## Context

In `lib/pbio/src/mdrobotbase.c:600-625`, gear-ratio conversion functions (`pbio_mdrobotbase_motor_to_wheel_deg`, `pbio_mdrobotbase_wheel_to_motor_deg`, `pbio_mdrobotbase_motor_to_wheel_dps`, `pbio_mdrobotbase_wheel_to_motor_dps`) encode kinematic transformations between motor encoder ticks and physical wheel degrees. While functional in isolation, the mathematical invariants governing round-trip transformations, straight-line distance conservation ($\Delta \theta = 0$ when $d_L = d_R$), and unit scaling across gear ratios ($R \in [0.01, 100.0]$) lack formal automated proof assertions.

### Scorecard & Baseline Evidence
- **Current score:** 6/10 (Mathematical correctness) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:600-625`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L600-L625)
- **Root cause:** Incomplete test harness coverage verifying algebraic invertibility, tolerance bounds, and sign consistency across differential-drive odometry integration.
- **Reproduction steps:**
  1. Configure $R = 2.5$, wheel diameter $D = 56.0\text{ mm}$, axle track $W = 112.0\text{ mm}$.
  2. Input motor position $M_{left} = 720.0^\circ, M_{right} = 720.0^\circ$.
  3. Validate $d_{wheel} = (720 / 2.5) / 360 \times \pi \times 56.0 = 140.743\text{ mm}$.
  4. Validate $\Delta \theta = (d_{right} - d_{left}) / W = 0.0\text{ rad}$.
  5. Invert $d_{wheel} \to M_{motor}$ and prove identity $|M_{inv} - M| < 10^{-4}$.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Unproven kinematic equations cause odometry drift, inaccurate turning angles, and navigation target misses on geared drivebases.  
**Done when:** All bidirectional gear-ratio and differential-drive equations satisfy strict mathematical invertibility, unit consistency, and numerical identity tests across defined operating ratios.  
**Unblocks:** G-MDRB-015  

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: numerical and algebraic proof of bidirectional kinematic invariants.
- **No decomposition leakage:** Angle wrapping and pivot turn invariants are separated into G-MDRB-015.
- **Concrete execution:** No mocks, stubs, fakes, or string approximations.
- **Real boundary verification:** Verified via native C IEEE 754 floating-point assertions and PBIO odometry integration loops.
- **Failure behavior:** Invariant violations or non-invertible conversions fail the test pass immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C PBIO kinematics layer and native C unit test harness:
1. Complete the bidirectional kinematic helper suite in `lib/pbio/src/mdrobotbase.c` and `lib/pbio/include/pbio/mdrobotbase.h`:
   - `pbio_mdrobotbase_motor_to_wheel_deg`: divides motor angle by gear ratio ($R$).
   - `pbio_mdrobotbase_wheel_to_motor_deg`: multiplies wheel angle by gear ratio ($R$).
   - `pbio_mdrobotbase_motor_to_wheel_dps`: divides motor velocity by gear ratio ($R$).
   - `pbio_mdrobotbase_wheel_to_motor_dps`: multiplies wheel velocity by gear ratio ($R$) with round-to-nearest integer.
2. Formulate and enforce strict IEEE 754 precision guarantees:
   - Prove round-trip identity: $\forall m \in [-100000.0, 100000.0]$, $|\text{wheel\_to\_motor\_deg}(\text{motor\_to\_wheel\_deg}(m)) - m| < 10^{-4}$.
   - Prove inverse identity: $\forall w \in [-100000.0, 100000.0]$, $|\text{motor\_to\_wheel\_deg}(\text{wheel\_to\_motor\_deg}(w)) - w| < 10^{-4}$.
   - Prove straight-line heading conservation: identical motor deltas produce $\Delta \theta = 0.0 \pm 10^{-5}\text{ rad}$ and arc distance $s = (\Delta \theta_{\text{motor}} / R) \cdot (\pi D / 360)$.
3. Implement parameterized native C unit test `test_mdrobotbase_kinematic_invariants` in `lib/pbio/test/src/test_mdrobotbase.c` registered in `pbio_mdrobotbase_tests[]`.

### Proposed implementation strategy
- Audit `lib/pbio/src/mdrobotbase.c` kinematic helpers for exact IEEE 754 precision.
- Implement comprehensive invariant test suite in `lib/pbio/test/src/test_mdrobotbase.c`.
- Verify round-trip identity: `wheel_to_motor(motor_to_wheel(m)) == m` within tolerance.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Gear ratio R is defined as motor_revs / wheel_revs (R > 1 for reduction) across all PBIO and MicroPython interfaces. Motor degrees convert to wheel degrees by dividing by R (motor_deg / R), and wheel degrees convert to motor degrees by multiplying by R (wheel_deg * R).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-KINEMATIC-UNPROVEN |
| **Decisions** | PDR-MDRB-GEAR-RATIO-CONVENTION |
| **Assumptions required** | A-REDUCTION-RATIO-DEFINITION |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Algebraic Invariant Verification, Deterministic Kinematic Modeling |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-014.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, numerical tolerance <= 1e-4 |

## Work steps

### Step 1 — Specification & Algebraic Kinematic Proof Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-014.md` · `docs/02-product/acceptance/G-MDRB-014.md`  
**Actions:**

1. Define algebraic equations for motor ticks, wheel angle, arc distance, and robot orientation.
2. Establish explicit floating-point error bounds for float arithmetic ($\epsilon = 10^{-4}$).

**Completion gate:** Acceptance contract with quantitative proofs defined.  
**Stop condition:** Ambiguity in gear ratio sign or definition.

### Step 2 — Enforce Unit Consistency & Invertibility in PBIO Helpers

**Allowed files:** `lib/pbio/src/mdrobotbase.c`  
**Actions:**

1. Review and harden `pbio_mdrobotbase_motor_to_wheel_deg` and `pbio_mdrobotbase_wheel_to_motor_deg`.
2. Ensure symmetric behavior across positive and negative speed vectors.

**Completion gate:** C code compiles without warnings.  
**Stop condition:** Any non-invertible math or precision loss.

### Step 3 — Verification & Numerical Invariant Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**

1. Add `test_mdrobotbase_kinematic_invariants` verifying round-trip identity for $R \in \{0.2, 0.5, 1.0, 2.0, 5.0\}$.
2. Verify straight-line drive invariant: equal motor displacements produce zero angular deviation ($\Delta \theta < 10^{-5}\text{ rad}$).

**Completion gate:** Test suite passes with exit code 0.  
**Stop condition:** Any assertion failure exceeding tolerance.

## In

- Proving bidirectional gear ratio transformations.
- Verifying straight drive differential equations.
- Adding comprehensive test coverage in `lib/pbio/test/src/test_mdrobotbase.c`.

## Out

- Angle wrapping to $[-180, +180]$ and pivot invariants (addressed in G-MDRB-015).
- Numerical boundary checks for non-finite values (addressed in G-MDRB-016).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Verify | `lib/pbio/src/mdrobotbase.c`: enforce exact kinematic scaling |
| Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c`: add `test_mdrobotbase_kinematic_invariants` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` |
| **Bounded Context & Domain** | Robotics Kinematics \| Differential Drive Mathematics |
| **Ports & Adapters Topology** | Driving Inbound: Odometry Poller <br> Driven Outbound: Pose Integrator |
| **State Machine & Invariants** | Invertibility Invariant: $\forall w, |f_{\text{m}\to\text{w}}(f_{\text{w}\to\text{m}}(w)) - w| \le 10^{-4}$ |
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

- [x] `wheel_to_motor_deg(motor_to_wheel_deg(m)) == m` holds for all $m \in [-100000.0, 100000.0]$ with $|error| < 10^{-4}$.
- [x] `motor_to_wheel_deg(wheel_to_motor_deg(w)) == w` holds for all $w \in [-100000.0, 100000.0]$ with $|error| < 10^{-4}$.
- [x] Equal left and right motor progress yields $\Delta \theta = 0.0 \pm 10^{-5}\text{ rad}$ and $\Delta \text{distance} = \frac{\Delta \theta_{\text{motor}}}{R} \frac{\pi D}{360}$.
- [x] All conversions operate correctly for gear ratios $R \in [0.01, 100.0]$.

## Test plan

- Command: `make -C lib/pbio/test test`
- Verification: `test_mdrobotbase_kinematic_invariants` passes cleanly.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to SI/metric units: degrees for angles, millimeters for distances, seconds for time.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Kinematics::Ready` | Motor angle update | Finite float values | Compute odometry delta | Reset accumulator if NaN detected |
| `Kinematics::Ready` | Gear ratio change | $R > 0$ and finite | Update internal conversion factor | Reject $R \le 0$ with `PBIO_ERROR_INVALID_ARG` |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Arc Distance Equation** | $s = \frac{\theta_{\text{wheel}}}{360^\circ} \cdot \pi D = \frac{\theta_{\text{motor}}}{360^\circ \cdot R} \cdot \pi D$ |
| **Heading Differential** | $\Delta \theta = \frac{s_{\text{right}} - s_{\text{left}}}{W}$ |
| **Invertibility** | $\left| \frac{\theta \cdot R}{R} - \theta \right| \le \epsilon$ |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `KinematicConversionPort` | Inline C functions | `lib/pbio/src/mdrobotbase.c` |
| **Driven (Outbound)** | `OdometryIntegratorPort` | Float pose accumulator | `rb->x, rb->y, rb->theta` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Pose $(x, y, \theta)$ displayed | `bg-surface-elevated` |
| **2. Loading / Pending** | Integrating tick counts | `animate-pulse` |
| **3. Empty State** | Zero distance traversed | `text-content-secondary` |
| **4. Error State** | Non-finite odometry error | `text-status-error` |
| **5. Success State** | Odometry verified green | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Round-trip identity: $\forall m, | \text{wheel\_to\_motor}(\text{motor\_to\_wheel}(m)) - m | < 10^{-4}$.
- Straight drive invariance: $s_L = s_R \implies \Delta \theta = 0$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Pure mathematical functions perform 0 motor writes.
- **Consistent state on failure:** Rejected gear ratio mutations preserve existing operational ratio.
- **Regression scenarios:** Testing gear ratios $R \in \{0.01, 0.1, 0.5, 1.0, 2.0, 10.0, 100.0\}$.
