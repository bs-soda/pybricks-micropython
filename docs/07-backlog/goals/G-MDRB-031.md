# G-MDRB-031: Multi-Sample Prototype Statistical Calibration and Variance Modeling

**Status:** review
**Kind:** feature
**Atomic outcome:** Implement `color_class_t` capturing multi-sample prototype distributions, calculating mean vector, intra-class variance, and outlier filtering
**Epic:** MDRB
**Depends on:** G-MDRB-030
**Blocks:** G-MDRB-032
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Statistical Color Class Model & Welford Accumulator Specification | done |
| 2 | Implement Multi-Sample Registration & Outlier Filtering in C & Python | done |
| 3 | Verify Variance Convergence & Outlier Rejection Across Noisy Samples | done |

## Context

In Codex's color detector review (September 2026), the calibration model was rated **4.2/10** because color prototypes were registered as single static points without variance modeling: "Each calibrated color should store mean_h, mean_s, mean_v, mean_l, mean_a, mean_b, variance_h, variance_s, variance_v, variance_lab, sample_count. The calibration sequence should capture 10–30 samples, compute mean and variance, reject outliers, and set classification thresholds from measured intra-class variance."
This goal implements `pbio_mdrobotbase_color_class_t` in the kernel and VirtualHub, using online Welford accumulation to compute mean and variance over 10–30 samples with automated $2.5\sigma$ outlier rejection.

### Scorecard & Baseline Evidence
- **Current score:** 4.0/10 (Calibration Robustness) · **Expected score:** 9.8/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:833-852`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L833-L852)
- **Root cause:** Single-sample prototype registration stored only a single $(h, s, v)$ point, making the classifier hypersensitive to sensor noise and micro-texture variations.
- **Reproduction steps:**
  1. Register a single prototype over a textured mat tile.
  2. Take multiple readings over slightly different points on the same tile.
  3. Observe that sensor noise and surface sheen cause distance spikes exceeding fixed thresholds.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Real-world robotics mat surfaces possess micro-texture, grain, and print variations; a single sample point cannot capture the natural statistical spread of a color class.
**Done when:** Color prototypes accumulate multiple optical readings, automatically compute class centroid and variance, and filter out transient optical glitches.
**Unblocks:** G-MDRB-032 (Confidence scoring and ambiguity margin rejection)

## Atomicity & Zero-Mock Contract

- **One outcome:** Implement multi-sample statistical prototype calibration and variance modeling.
- **No decomposition leakage:** Perceptual color metrics belong to G-MDRB-030; ambiguity margin logic belongs to G-MDRB-032.
- **Concrete execution:** 100% concrete mathematical accumulation routines executed in native C and Python. Zero mocks, zero stubs.
- **Real boundary verification:** Verified using multi-sample noisy datasets and Gaussian perturbation distributions.
- **Failure behavior:** Samples with zero variance or fewer than required minimum samples fail closed with appropriate status codes.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
1. Define `pbio_mdrobotbase_color_class_t` in `lib/pbio/include/pbio/mdrobotbase.h`:
   ```c
   typedef struct {
       uint8_t color_id;
       float mean_h, mean_s, mean_v;
       float mean_l, mean_a, mean_b;
       float var_h, var_s, var_v, var_lab;
       uint16_t sample_count;
   } pbio_mdrobotbase_color_class_t;
   ```
2. Implement Welford's online one-pass algorithm for numerical stability:
   $$M_k = M_{k-1} + \frac{x_k - M_{k-1}}{k}$$
   $$S_k = S_{k-1} + (x_k - M_{k-1})(x_k - M_k), \quad \sigma^2 = \frac{S_k}{k - 1}$$
3. Implement $2.5\sigma$ outlier rejection pass when sample count $N \ge 10$.
4. Mirror statistical model in `tests/virtualhub/robotics/pybricks/robotics.py`.

### Proposed implementation strategy
- Accumulate circular mean for hue using vector components $(\sum \cos \theta, \sum \sin \theta)$.
- Set dynamic distance thresholds proportional to measured $\sqrt{\sigma^2}$.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

*(None remaining — resolved in favor of Welford's algorithm and 2.5-sigma outlier rejection)*

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-SINGLE-PROTOTYPE-NOISE |
| **Decisions** | PDR-MDRB-WELFORD-STATISTICAL-CALIBRATION |
| **Assumptions required** | A-GAUSSIAN-NOISE-DISTRIBUTION |
| **Evidence** | Codex Architectural Review (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Welford Online Accumulator, Statistical Outlier Rejection |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-031.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | backend-api |
| **Task type** | modify_existing_api |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` |
| **Constraints** | Zero mocks, numerically stable variance calculation, C99 clean build |

## Work steps

### Step 1 — Statistical Color Class Model & Welford Accumulator Specification

**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h` · `docs/02-product/acceptance/G-MDRB-031.md`
**Actions:**
1. Define `pbio_mdrobotbase_color_class_t` in `lib/pbio/include/pbio/mdrobotbase.h`.
2. Declare multi-sample ingestion functions: `pbio_mdrobotbase_color_cal_add_sample` and `pbio_mdrobotbase_color_cal_finalize_class`.
3. Formulate Given-When-Then BDD scenarios in `docs/02-product/acceptance/G-MDRB-031.md`.
**Completion gate:** Header compiles cleanly and BDD contracts are defined.
**Stop condition:** ABI incompatibility or missing variance fields.

### Step 2 — Implement Multi-Sample Registration & Outlier Filtering in C & Python

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py`
**Actions:**
1. Implement Welford's online accumulation in `lib/pbio/src/mdrobotbase.c`.
2. Implement circular mean calculation for hue using $\text{atan2}(\sum \sin h, \sum \cos h)$.
3. Implement outlier rejection discarding readings $> 2.5\sigma$ from running mean.
4. Implement identical statistical tracking in VirtualHub `robotics.py`.
**Completion gate:** Mean and variance calculations match analytical statistics within $0.1\%$.
**Stop condition:** Numerical underflow, negative variance, or division by zero.

### Step 3 — Verify Variance Convergence & Outlier Rejection Across Noisy Samples

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_color.py`
**Actions:**
1. Write unit test feeding 20 noisy samples with 2 synthetic outliers.
2. Verify outliers are rejected and final mean converges to the true distribution center.
3. Verify zero compiler warnings under `-Wall -Wextra -Werror`.
**Completion gate:** 100% green test execution in PBIO and VirtualHub.
**Stop condition:** Failure to reject outliers or variance divergence.

## In

- `pbio_mdrobotbase_color_class_t` statistical struct.
- Welford online mean and variance accumulation across RGB, HSV, and Lab.
- Circular mean for hue angles.
- Statistical outlier filtering ($2.5\sigma$).

## Out

- Ambiguity margin confidence thresholding (G-MDRB-032).
- Final multi-lighting verification matrix (G-MDRB-033).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | ADD | `lib/pbio/include/pbio/mdrobotbase.h` — Add `pbio_mdrobotbase_color_class_t` and sample accumulation functions |
| C Impl | CHANGE | `lib/pbio/src/mdrobotbase.c` — Upgrade prototype table to statistical class representation |
| Python API | ADD | `tests/virtualhub/robotics/pybricks/robotics.py` — Add multi-sample statistical prototype registration |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `embedded-firmware` / `robot-kinematics-engine` |
| **Bounded Context & Domain** | Optical Perception & Statistical Machine Learning |
| **Ports & Adapters Topology** | Driving Inbound: Optical Sample Stream <br> Driven Outbound: Calibrated Prototype Distribution |
| **State Machine & Invariants** | Sample Invariant: $N \ge 1 \implies \sigma^2 \ge 0$. Outlier Invariant: $\forall x \notin [\mu - 2.5\sigma, \mu + 2.5\sigma] \implies \text{Rejected}$. |
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

- [x] Prototype calibration captures 10 to 30 samples per target color.
- [x] Welford accumulator computes accurate mean vector and positive variance across all channels.
- [x] Circular mean for hue handles angles distributed around $0^\circ / 360^\circ$ without distortion.
- [x] Outlier samples exceeding $2.5\sigma$ are discarded from the final class model.
- [x] Both native C and VirtualHub produce statistically identical class models for identical sample sequences.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: All Welford accumulation and outlier rejection unit tests pass.
- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: All VirtualHub statistical calibration tests pass.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `docs/02-product/acceptance/G-MDRB-031.md`

## Notes for AI

- Zero mocks, zero stubs.
- Use Bessel's correction ($N - 1$) for sample variance when $N > 1$.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Accumulating` | Add sample | Valid color ID | Update running $M_k, S_k$ | Reject if sample limit exceeded |
| `State::Filtering` | Finalize class | $N \ge 10$ samples | Discard outliers $> 2.5\sigma$ | Require more samples if $N < 10$ |
| `State::Active` | Class query | Non-zero variance | Use $\sigma$ for distance | Default to baseline threshold |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Welford Variance** | $\sigma^2 = \frac{S_k}{k - 1} \ge 0.0$. |
| **Circular Mean Hue** | $\bar{\theta} = \text{atan2}\left(\frac{1}{N}\sum \sin \theta_i, \frac{1}{N}\sum \cos \theta_i\right) \pmod{360^\circ}$. |
| **Outlier Threshold** | $|x_i - \mu| > 2.5\sigma \implies \text{Outlier Discard}$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

- **Inbound Driving Port:** Prototype Sample Accumulator.
- **Outbound Driven Port:** Statistical Class Storage Repository.

### 7. Optical Sensor Calibration & Perceptual Color Science Invariants

- **`color_class_t` Data Struct:**
  - `uint8_t color_id`
  - `float mean_h, mean_s, mean_v, mean_l, mean_a, mean_b`
  - `float var_h, var_s, var_v, var_lab`
  - `uint16_t sample_count`
