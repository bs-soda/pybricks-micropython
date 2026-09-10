# G-MDRB-029: Two-Point Sensor Calibration Pipeline with Dark-Offset and White-Gain Normalization

**Status:** review
**Kind:** feature
**Atomic outcome:** Implement true two-point sensor calibration computing per-channel dark current offset $[R_0, G_0, B_0]$ and white reference intensity $[R_w, G_w, B_w]$ with normalized unit output $[0.0, 1.0]$
**Epic:** MDRB
**Depends on:** G-MDRB-028
**Blocks:** G-MDRB-030
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Two-Point Sensor Calibration Data Structure & Math Specification | done |
| 2 | Implement Dark Offset Subtraction & White Gain Normalization in C & Python | done |
| 3 | Empirical Verification Across Multi-Lux Illumination Sweeps | done |

## Context

In Codex's color detector assessment (September 2026), the calibration subsystem scored **4.0/10**. Codex observed that `set_color_baseline()` merely adjusted `v_scale` without performing true sensor calibration: "It does not compensate for ambient light, sensor offset, white-reference intensity, per-channel gain, exposure differences, or surface brightness changes. Therefore calibration is currently closer to prototype registration than true sensor calibration."
This goal implements two-point reference calibration: dark-current offset subtraction $[R_0, G_0, B_0]$ and white-reference gain normalization $[k_r, k_g, k_b]$, transforming raw optical inputs into standardized $[0.0, 1.0]$ normalized reflection vectors.

### Scorecard & Baseline Evidence
- **Current score:** 4.0/10 (Calibration Effectiveness) · **Expected score:** 10.0/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:814-823`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L814-L823)
- **Root cause:** `set_color_baseline()` only sets `v_scale = (base_v > 5.0f) ? 3.0f : 35.0f;`, completely failing to subtract ambient light or scale per-channel gains.
- **Reproduction steps:**
  1. Register color prototype under $500\text{ lux}$ room light.
  2. Dim lighting to $100\text{ lux}$ or increase to $1500\text{ lux}$.
  3. Call `classify_color()` — all colors fail or misclassify because the raw intensities shifted without reference normalization.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Optical robotics sensors operate under fluctuating competition lighting; without black-level offset subtraction and white-level gain normalization, color classification fails across varying arena conditions.
**Done when:** Optical inputs are deterministically normalized using black and white calibration reference vectors, producing identical normalized $[0.0, 1.0]$ responses across varying illumination levels.
**Unblocks:** G-MDRB-030 (Perceptual circular HSV and CIE Lab classifier)

## Atomicity & Zero-Mock Contract

- **One outcome:** Implement two-point dark-offset and white-gain sensor calibration and normalization.
- **No decomposition leakage:** Contract unification is handled in G-MDRB-028; perceptual color spaces belong to G-MDRB-030.
- **Concrete execution:** 100% concrete mathematical calibration routines executed in native C and Python. Zero mocks, zero stubs.
- **Real boundary verification:** Verified using synthetic optical sensor sweeps across simulated lux ranges ($50$ to $2000\text{ lux}$).
- **Failure behavior:** Degenerate calibration ($R_{\text{white}} \le R_{\text{black}}$) returns `PBIO_ERROR_INVALID_ARG` and fails safe.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
1. Extend `pbio_mdrobotbase_color_cal_t` in `lib/pbio/src/mdrobotbase.c` to store black reference $[R_0, G_0, B_0]$ and white reference $[R_w, G_w, B_w]$.
2. Implement calibration routines `pbio_mdrobotbase_color_cal_set_black_reference(rb, r, g, b)` and `pbio_mdrobotbase_color_cal_set_white_reference(rb, r, g, b)`.
3. Normalize raw optical readings before classification:
   $$R_{norm} = \text{clamp}\left(\frac{R - R_0}{R_w - R_0}, 0.0, 1.0\right)$$
4. Mirror normalization logic in `tests/virtualhub/robotics/pybricks/robotics.py`.

### Proposed implementation strategy
- Compute channel gain scale factors $k_c = \frac{1.0}{C_w - C_0 + \epsilon}$ to avoid per-sample divisions.
- Validate that $C_w > C_0$ for all channels with minimum dynamic range $\Delta \ge 10.0$.
- Apply normalization pre-filter to all inbound RGB samples.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

*(None remaining — resolved in favor of two-point black/white reference calibration with clamped $[0.0, 1.0]$ unit space)*

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-LIGHTING-SENSITIVITY |
| **Decisions** | PDR-MDRB-TWO-POINT-CALIBRATION |
| **Assumptions required** | A-LINEAR-SENSOR-RESPONSE |
| **Evidence** | Codex Architectural Review (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Two-Point Sensor Calibration, Optical Normalization |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-029.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | backend-api |
| **Task type** | modify_existing_api |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, floating-point precision, no divide-by-zero |

## Work steps

### Step 1 — Two-Point Sensor Calibration Data Structure & Math Specification

**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h` · `docs/02-product/acceptance/G-MDRB-029.md`
**Actions:**
1. Define black and white reference vectors in `lib/pbio/include/pbio/mdrobotbase.h`.
2. Declare C API functions: `pbio_mdrobotbase_color_cal_set_black_reference` and `_set_white_reference`.
3. Formulate Given-When-Then BDD acceptance scenarios in `docs/02-product/acceptance/G-MDRB-029.md`.
**Completion gate:** Header compiles cleanly and acceptance scenarios are verified.
**Stop condition:** ABI inconsistency or missing data structure fields.

### Step 2 — Implement Dark Offset Subtraction & White Gain Normalization in C & Python

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py`
**Actions:**
1. Implement reference setters validating $C_{\text{white}} > C_{\text{black}} + 5.0f$.
2. Implement pre-classification normalization pipeline clamping output to $[0.0f, 1.0f]$.
3. Implement identical normalization logic in `tests/virtualhub/robotics/pybricks/robotics.py`.
**Completion gate:** Normalization converts test vectors $R \in [R_0, R_w]$ to exactly $[0.0, 1.0]$.
**Stop condition:** Division by zero or negative normalized reflection output.

### Step 3 — Empirical Verification Across Multi-Lux Illumination Sweeps

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_color.py`
**Actions:**
1. Construct unit test verifying invariant: scaling both ambient light and signal preserves normalized color vector.
2. Verify zero compiler warnings under `-Wall -Wextra -Werror`.
3. Verify test passes in both native PBIO TinyTest and VirtualHub Python.
**Completion gate:** 100% green tests proving lighting robustness.
**Stop condition:** Any test failure or normalized drift $> 5\%$.

## In

- Two-point black/white reference calibration API.
- Per-channel dark-offset subtraction and white-gain normalization.
- Clamping of normalized vectors to unit interval $[0.0, 1.0]$.

## Out

- CIE Lab perceptual distance metric (G-MDRB-030).
- Multi-sample statistical prototype modeling (G-MDRB-031).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | ADD | `lib/pbio/include/pbio/mdrobotbase.h` — Add black/white reference calibration functions |
| C Impl | CHANGE | `lib/pbio/src/mdrobotbase.c` — Replace baseline scaling with true two-point normalization |
| Python API | ADD | `tests/virtualhub/robotics/pybricks/robotics.py` — Add `set_black_reference` and `set_white_reference` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `embedded-firmware` / `robot-kinematics-engine` |
| **Bounded Context & Domain** | Optical Perception & Sensor Abstraction Layer |
| **Ports & Adapters Topology** | Driving Inbound: Color Sensor Ingestion <br> Driven Outbound: Calibrated Optical Reflection Vector |
| **State Machine & Invariants** | Calibration Invariant: $C_w > C_0 \implies C_{norm} \in [0.0, 1.0]$. Identity: $C = C_0 \implies C_{norm} = 0.0$, $C = C_w \implies C_{norm} = 1.0$. |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Dialectic Report: `docs/06_raw/20260908_224500_mdrobotbase_color_detector_architecture_and_goals_spec.md` |

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
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [x] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [x] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [x] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)
- [x] Sensor Calibration & Color Science Invariants (Two-point black/white reference calibration, circular hue topology, perceptual CIE Lab mapping)
- [x] Statistical Prototype Modeling (Running mean, intra-class variance, sample count, and outlier rejection)
- [x] Ambiguity & Margin Protection (Second-best margin calculation, confidence scoring, and fail-safe Color.NONE rejection)

## Acceptance criteria

- [x] Black reference calibration records per-channel dark offsets $[R_0, G_0, B_0]$.
- [x] White reference calibration records per-channel gains $[k_r, k_g, k_b]$.
- [x] Raw sensor reading matching black reference produces normalized vector $[0.0, 0.0, 0.0]$.
- [x] Raw sensor reading matching white reference produces normalized vector $[1.0, 1.0, 1.0]$.
- [x] Degenerate references ($C_w \le C_0$) fail closed returning `PBIO_ERROR_INVALID_ARG`.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: Calibration unit tests pass.
- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: VirtualHub calibration normalization tests pass.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `lib/pbio/test/src/test_mdrobotbase.c`
- `docs/02-product/acceptance/G-MDRB-029.md`

## Notes for AI

- Zero mocks, zero stubs.
- Guard against divide-by-zero when $C_w - C_0$ is small.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Uncalibrated` | System init | Default unity gain | Flag `is_calibrated = false` | Use unnormalized input |
| `State::CalibratingDark` | Set black reference | $C_0 \ge 0.0$ | Store dark offset | Return error on negative |
| `State::Calibrated` | Set white reference | $C_w > C_0 + 5.0$ | Compute channel gains | Abort if dynamic range too small |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Offset Invariant** | $\forall c \in \{R, G, B\}: C' = C - C_0$. |
| **Gain Normalization** | $C_{norm} = \text{clamp}\left(\frac{C'}{C_w - C_0}, 0.0, 1.0\right)$. |
| **Dynamic Range Guard** | $C_w - C_0 \ge 5.0 \implies \text{Valid}$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

- **Inbound Driving Port:** Optical Sensor Calibration Interface.
- **Outbound Driven Port:** Normalization Matrix Pipeline.

### 7. Optical Sensor Calibration & Perceptual Color Science Invariants

- **Two-Point Calibration Formula:**
  - $R_{norm} = \text{clamp}\left(\frac{R - R_0}{R_w - R_0}, 0.0, 1.0\right)$
  - $G_{norm} = \text{clamp}\left(\frac{G - G_0}{G_w - G_0}, 0.0, 1.0\right)$
  - $B_{norm} = \text{clamp}\left(\frac{B - B_0}{B_w - B_0}, 0.0, 1.0\right)$
