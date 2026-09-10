# G-MDRB-015: Angle Normalization, Pivot-Turn Invariants, and Distance Conservation

**Status:** done
**Kind:** feature
**Atomic outcome:** Implement and prove mathematical invariants for pure spin (dx, dy approx 0), pivot turns (locked wheel distance approx 0), [-180, +180] angle wrapping, and backlash filtering distance conservation
**Epic:** MDRB
**Depends on:** G-MDRB-014
**Blocks:** G-MDRB-016
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Turning Kinematics Invariant Formulation | done |
| 2 | Enforce Spin, Pivot, and Backlash Invariant Mechanics | done |
| 3 | Verification & Odometry Conservation Test Pass | done |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c` and `lib/pbio/src/mdrobotbase.c`, differential turning operations (spin turns, left pivots, and right pivots) and sensor fusion (gyro/encoder complementary filter and mechanical backlash deadband) govern heading and position updates. However, the exact mathematical invariants for spin turns ($\Delta x \approx 0, \Delta y \approx 0, d_L + d_R \approx 0$), single-wheel pivot turns ($d_{\text{locked}} \approx 0, d_{\text{free}} \approx W \cdot |\Delta \theta|$), strict angle wrapping within $[-180.0^\circ, +180.0^\circ]$, and odometry conservation through backlash deadbands are not verified with deterministic simulation proof tests.

### Scorecard & Baseline Evidence
- **Current score:** 10/10 (All turning, pivot, angle wrapping, and backlash invariants proven) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:38-46`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L38-L46) (`mdrobotbase_wrap_degrees`), [`lib/pbio/src/mdrobotbase.c:77-83`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L77-L83) (backlash accumulators)
- **Root cause:** Turning odometry and backlash filtering were validated through manual observation rather than deterministic mathematical proof bounds.
- **Reproduction steps:**
  1. Command $3600^\circ$ pure spin turn.
  2. Measure cumulative displacement: $\Delta x, \Delta y$ must remain $< 0.1\text{ mm}$ in simulation.
  3. Command $90^\circ$ left pivot with locked left wheel.
  4. Measure left wheel progress: must be $0.0\text{ mm}$, while right wheel arc distance must equal $\frac{\pi}{2} W$.
  5. Oscillate motors within backlash threshold $\pm 0.5^\circ$: verify odometry does not exhibit continuous drift.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Violation of turning and backlash invariants leads to insidious cumulative position errors, off-target arrivals, and corrupted field coordinate tracking.
**Done when:** Spin turns conserve position ($\Delta x \approx 0, \Delta y \approx 0$), pivot turns conserve the stationary pivot point, angles remain strictly normalized in $[-180.0^\circ, +180.0^\circ]$, and backlash filters conserve distance over oscillating cycles.
**Unblocks:** G-MDRB-016

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: verification and proof of turning, pivot, angle wrapping, and backlash conservation invariants.
- **No decomposition leakage:** Parameter boundary checks (G-MDRB-016) and test harness suite hardening (G-MDRB-017) are separate goals.
- **Concrete execution:** No mocks, stubs, fakes, or dummy approximations.
- **Real boundary verification:** Verified via deterministic PBIO C simulation test runners and mathematical assertions.
- **Failure behavior:** Invariant violations fail with clear numeric delta diagnostics.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C PBIO kinematics and odometry engine:
1. Provide canonical `pbio_mdrobotbase_wrap_degrees(float angle)` in `lib/pbio/src/mdrobotbase.c` and `lib/pbio/include/pbio/mdrobotbase.h`.
2. Verify pure spin turns in `pbio_mdrobotbase_update_state`: when `PBIO_MDROBOTBASE_MOTION_TURN` is active, center translation $d_{\text{center}} = 0$ and $\sqrt{\Delta x^2 + \Delta y^2} \le 0.05\text{ mm}$.
3. Verify single-wheel pivot turns in `pbio_mdrobotbase_update_state`: rigid-body rotation around locked wheel contact point with $s_{\text{free}} = W \cdot |\Delta \theta| \pm 0.1\text{ mm}$.
4. Verify backlash deadband invariance: sub-threshold oscillations ($|\Delta \text{ticks}| < \text{limit}$) produce zero accumulated net position or heading changes.
5. Implement unit tests in `lib/pbio/test/src/test_mdrobotbase.c`:
   - `test_mdrobotbase_spin_and_pivot_invariants`
   - `test_mdrobotbase_backlash_distance_conservation`

### Proposed implementation strategy
- Add formal kinematic proof tests in `lib/pbio/test/src/test_mdrobotbase.c`.
- Verify CCW positive convention ($\theta > 0$ for left turn) matching ISO robotics conventions.
- Test that backlash filtering acts as a true deadband without adding artificial cumulative bias.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Gyro heading sign convention is positive counter-clockwise (CCW) across all Pybricks hub IMUs and PBIO odometry models. Left turn is positive (+deg), right turn is negative (-deg).

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-HEADING-DRIFT-ODOMETRY |
| **Decisions** | PDR-MDRB-TURNING-KINEMATICS |
| **Assumptions required** | A-ISO-CCW-ROTATION |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Conservation Laws, Differential Geometry Invariants |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-015.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, strict geometric tolerances |

## Work steps

### Step 1 — Specification & Turning Kinematics Invariant Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-015.md` · `docs/02-product/acceptance/G-MDRB-015.md`
**Actions:**

1. Define quantitative bounds for spin turn center-point drift ($\Delta x, \Delta y \le 0.05\text{ mm}$).
2. Formulate pivot turn equations: $s_R = W \cdot \Delta \theta_{rad}$ for left pivot.
3. Formulate backlash filter distance conservation test protocol.

**Completion gate:** Acceptance criteria with explicit tolerances defined.
**Stop condition:** Ambiguity in axle track geometry or pivot center definition.

### Step 2 — Enforce Spin, Pivot, and Backlash Invariant Mechanics

**Allowed files:** `lib/pbio/src/mdrobotbase.c`
**Actions:**

1. Validate angle wrapping boundary conditions at exactly $+180.0^\circ$ and $-180.0^\circ$.
2. Review backlash filter deadband accumulator to ensure zero net drift during symmetric vibration.

**Completion gate:** C code compiles without warnings.
**Stop condition:** Compiler warnings or odometry drift.

### Step 3 — Verification & Odometry Conservation Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**

1. Implement `test_mdrobotbase_spin_and_pivot_invariants`.
2. Implement `test_mdrobotbase_backlash_distance_conservation`.

**Completion gate:** All test cases pass with exit code 0.
**Stop condition:** Center drift $> 0.05\text{ mm}$ or backlash cumulative leak.

## In

- Invariant testing for spin turns, pivot turns, and angle wrapping.
- Backlash filter distance conservation verification.

## Out

- Input range validation (addressed in G-MDRB-016).
- Test framework runner refactoring (addressed in G-MDRB-017).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Verify | `lib/pbio/src/mdrobotbase.c`: verify angle wrapping and backlash filter invariants |
| Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c`: add spin, pivot, and backlash conservation tests |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` |
| **Bounded Context & Domain** | Robotics Kinematics \| Differential Geometry & Odometry |
| **Ports & Adapters Topology** | Driving Inbound: Odometry Update Loop <br> Driven Outbound: Robot Pose Accumulator |
| **State Machine & Invariants** | Spin Invariant: $s_L = -s_R \implies \Delta x = 0 \land \Delta y = 0$; Pivot Invariant: $s_{\text{locked}} = 0 \implies s_{\text{free}} = W |\Delta \theta|$ |
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

- [x] For pure spin turns with $s_L = -s_R$, odometry center drift satisfies $\sqrt{\Delta x^2 + \Delta y^2} \le 0.05\text{ mm}$.
- [x] For left pivot turns with $s_L = 0$, $s_R = W \cdot |\Delta \theta_{\text{rad}}| \pm 0.1\text{ mm}$.
- [x] For right pivot turns with $s_R = 0$, $s_L = W \cdot |\Delta \theta_{\text{rad}}| \pm 0.1\text{ mm}$.
- [x] Headings normalize to $[-180.0^\circ, +180.0^\circ]$ continuously across multiple full revolutions.
- [x] Vibrating motors within the backlash limit produces zero net position or heading drift after 100 cycles.

## Test plan

- Command: `make -C lib/pbio/test test`
- Verification: `test_mdrobotbase_spin_and_pivot_invariants` and `test_mdrobotbase_backlash_distance_conservation` pass cleanly.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Treat $-180.0^\circ$ and $+180.0^\circ$ symmetrically; wrap strictly into $[-180.0^\circ, +180.0^\circ]$.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Odometry::Tracking` | Spin turn tick update | $s_L + s_R = 0$ | $\Delta \theta = (s_R - s_L) / W$; $\Delta x = 0, \Delta y = 0$ | Bound drift if float quantization occurs |
| `Odometry::Tracking` | Left pivot tick update | $s_L = 0$ | $\Delta \theta = s_R / W$; $\Delta x, \Delta y$ on arc | Clamp small locked motor jitter |
| `Odometry::Tracking` | Angle exceeds $\pm 180^\circ$ | Valid float | Normalize to $[-180^\circ, +180^\circ]$ | Modulo wrapping |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Pure Spin Invariant** | $s_L = -s_R \implies \Delta x = 0, \Delta y = 0, \Delta \theta = \frac{2 s_R}{W}$ |
| **Pivot Turn Invariant** | $s_{\text{locked}} = 0 \implies s_{\text{free}} = W \cdot |\Delta \theta|$ |
| **Angle Interval** | $\theta \in [-180.0^\circ, +180.0^\circ]$ |
| **Backlash Conservation** | $\oint_{\text{cycle}} \Delta \text{odometry} = 0$ for sub-threshold oscillation. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `TurnKinematicsPort` | C inline math helpers | `lib/pbio/src/mdrobotbase.c` |
| **Driven (Outbound)** | `PoseAccumulatorPort` | Float register updates | `rb->x, rb->y, rb->theta` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Heading at $0.0^\circ$ | `bg-surface-elevated` |
| **2. Loading / Pending** | Turn in progress | `animate-pulse` |
| **3. Empty State** | Zero angular rotation | `text-content-secondary` |
| **4. Error State** | Heading unwrapped/NaN | `text-status-error` |
| **5. Success State** | Turn completed on target | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Spin displacement: $\Delta x = \int_0^T v(t) \cos\theta(t) dt = 0$ when $v(t) = 0$.
- Pivot displacement: arc of radius $W$ centered at locked wheel.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Pure odometry equations do not issue motor commands.
- **Consistent state on failure:** Corrupted sensor reads trigger fallback to dead-reckoning without NaN propagation.
- **Regression scenarios:** Continuous 10-revolution spin followed by 10-revolution reverse spin returning to $(0, 0, 0)$.
