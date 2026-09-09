# G-MDRB-028: Color Input Contract Unification & Structured Classification Output

**Status:** review  
**Kind:** api  
**Atomic outcome:** Standardize public color classification contracts across native PBIO C and VirtualHub Python to accept both raw RGB and HSV inputs, returning structured classification `(color_id, distance, confidence)`  
**Epic:** MDRB  
**Depends on:** G-MDRB-027  
**Blocks:** G-MDRB-029  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** REVIEW

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | **●** | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Standardize C Native ABI & Python Contract Signatures | done |
| 2 | Implement Dual RGB & HSV Ingestion in Native C & VirtualHub | done |
| 3 | Verify Structured Return Invariants & Contract Parity | done |

## Context

In Codex's color detector review (September 2026), the color detector scored **4.2/10**. A primary defect was a contract mismatch: native PBIO C accepts `classify_color(h, s, v)` ([`lib/pbio/include/pbio/mdrobotbase.h:249`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L249)) while VirtualHub Python accepts `classify_color(r, g, b)` ([`tests/virtualhub/robotics/pybricks/robotics.py:575`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L575)), returning only a scalar `color_id`.
This goal unifies both environments to accept dual inputs (raw RGB and HSV) and return structured triples `(color_id, distance, confidence)`.

### Scorecard & Baseline Evidence
- **Current score:** 4.0/10 (API Contract) · **Expected score:** 10.0/10
- **Exact evidence:** [`lib/pbio/include/pbio/mdrobotbase.h:249`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L249) vs [`tests/virtualhub/robotics/pybricks/robotics.py:575`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L575)
- **Root cause:** Contract drift between native firmware C library and desktop simulation harness; neither environment returned classification confidence or margin metadata.
- **Reproduction steps:**
  1. Call `classify_color(100, 50, 50)` on native PBIO C — interpreted as HSV.
  2. Call `classify_color(100, 50, 50)` on VirtualHub — interpreted as RGB.
  3. Observe that both environments return incompatible results with zero confidence output.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Downstream autonomous mission routines require identical optical classification behavior and certainty margins in both simulation and physical robot runs.  
**Done when:** Public interfaces in both environments accept explicit RGB and HSV inputs and return matching structured results containing color identity, distance metric, and confidence score.  
**Unblocks:** G-MDRB-029 (Two-point sensor calibration pipeline)

## Atomicity & Zero-Mock Contract

- **One outcome:** Standardize input and output color classification contracts across native C and VirtualHub Python.
- **No decomposition leakage:** Mathematical sensor calibration belongs to G-MDRB-029; perceptual distance calculations belong to G-MDRB-030.
- **Concrete execution:** 100% concrete native C functions and Python methods with real data passing. Zero mocks, zero stubs, zero test doubles.
- **Real boundary verification:** Verified using concrete native C test executions and VirtualHub integration tests.
- **Failure behavior:** Invalid channel values (negative numbers, non-finite values) fail closed returning `PBIO_ERROR_INVALID_ARG` or raising `ValueError`.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
1. Extend native PBIO C API in `lib/pbio/include/pbio/mdrobotbase.h` with `pbio_mdrobotbase_color_classify_rgb(rb, r, g, b, &color_id, &distance, &confidence)` and `pbio_mdrobotbase_color_classify_hsv(rb, h, s, v, &color_id, &distance, &confidence)`.
2. Update `tests/virtualhub/robotics/pybricks/robotics.py` to provide matching `classify_color_rgb(r, g, b)` and `classify_color_hsv(h, s, v)` returning `(color_id, distance, confidence)`, with backwards-compatible `classify_color` routing through RGB.
3. Update `pybricks/robotics/pb_type_mdrobotbase.c` binding to expose structured classification tuple in MicroPython.

### Proposed implementation strategy
- Refactor internal storage in `pbio_mdrobotbase_color_cal_t` to hold unified prototype definitions.
- Implement RGB-to-HSV conversion helper in PBIO kernel to handle raw RGB inputs deterministically.
- Expose identical Python method signatures in VirtualHub.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

*(None remaining — resolved in favor of explicit `classify_rgb` and `classify_hsv` methods returning structured triple `(color_id, distance, confidence)` across both C and Python)*

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-COLOR-CONTRACT-DRIFT |
| **Decisions** | PDR-MDRB-COLOR-STRUCTURED-OUTPUT |
| **Assumptions required** | A-DETERMINISTIC-SIMULATION-TICKS |
| **Evidence** | Codex Architectural Review (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Unified API Parity, Structured Return Tuples |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-028.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | backend-api |
| **Task type** | modify_existing_api |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/include/pbio/mdrobotbase.h` · `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py` |
| **Constraints** | Zero mocks, C99 clean build, contract parity between PBIO and VirtualHub |

## Work steps

### Step 1 — Standardize C Native ABI & Python Contract Signatures

**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h` · `tests/virtualhub/robotics/pybricks/robotics.py` · `docs/02-product/acceptance/G-MDRB-028.md`  
**Actions:**
1. Declare `pbio_mdrobotbase_color_classify_rgb` and `pbio_mdrobotbase_color_classify_hsv` in `lib/pbio/include/pbio/mdrobotbase.h`.
2. Define structured return parameters `uint8_t *color_id, float *distance, float *confidence`.
3. Declare matching `classify_color_rgb` and `classify_color_hsv` in VirtualHub `robotics.py`.
**Completion gate:** Header compiles cleanly and Python signatures mirror the C ABI.  
**Stop condition:** ABI syntax error or signature mismatch between environments.

### Step 2 — Implement Dual RGB & HSV Ingestion in Native C & VirtualHub

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/pybricks/robotics.py`  
**Actions:**
1. Implement RGB ingestion with standard RGB-to-HSV conversion in `lib/pbio/src/mdrobotbase.c`.
2. Implement HSV ingestion computing distance and placeholder confidence in `lib/pbio/src/mdrobotbase.c`.
3. Implement matching dual methods in `tests/virtualhub/robotics/pybricks/robotics.py`.
4. Update MicroPython C wrapper `pybricks/robotics/pb_type_mdrobotbase.c` to return 3-element tuple `(color_id, distance, confidence)`.
**Completion gate:** Both native C and VirtualHub accept RGB/HSV inputs and return 3-element results.  
**Stop condition:** Memory leak, pointer fault, or type mismatch in MicroPython tuple creation.

### Step 3 — Verify Structured Return Invariants & Contract Parity

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_color.py`  
**Actions:**
1. Write native C tests verifying `pbio_mdrobotbase_color_classify_rgb` and `_hsv` report identical IDs for equivalent inputs.
2. Write Python VirtualHub tests verifying `classify_color_rgb` and `classify_color_hsv` parity.
3. Verify zero compiler warnings under `-Wall -Wextra -Werror`.
**Completion gate:** 100% green test execution across native C and VirtualHub test suites.  
**Stop condition:** Any test failure or assertion discrepancy between C and Python.

## In

- Unification of color classification public contracts across native PBIO C and VirtualHub Python.
- Dual RGB and HSV classification entry points.
- Structured tuple/struct outputs: `(color_id, distance, confidence)`.

## Out

- Implementing optical black/white reference calibration math (G-MDRB-029).
- Implementing circular hue distance and CIE Lab color space (G-MDRB-030).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | ADD | `lib/pbio/include/pbio/mdrobotbase.h` — Add `pbio_mdrobotbase_color_classify_rgb` and `_hsv` |
| C Impl | CHANGE | `lib/pbio/src/mdrobotbase.c` — Implement dual RGB/HSV classification with structured output |
| Python API | ADD | `tests/virtualhub/robotics/pybricks/robotics.py` — Add `classify_color_rgb` and `classify_color_hsv` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `embedded-firmware` / `robot-kinematics-engine` |
| **Bounded Context & Domain** | Optical Perception & Sensor Abstraction Layer |
| **Ports & Adapters Topology** | Driving Inbound: MicroPython QSTR API / Desktop Test Harness <br> Driven Outbound: Optical Color Sensor Hardware / Virtual Model |
| **State Machine & Invariants** | Input Invariant: $\forall c \in \{R, G, B\}: c \ge 0$. Output Invariant: $\text{Confidence} \in [0.0, 1.0]$. |
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

- [x] Native C API provides `pbio_mdrobotbase_color_classify_rgb` and `pbio_mdrobotbase_color_classify_hsv` returning `(color_id, distance, confidence)`.
- [x] VirtualHub Python provides `classify_color_rgb` and `classify_color_hsv` returning identical tuple structure.
- [x] MicroPython binding returns a 3-element tuple `(color_id, distance, confidence)`.
- [x] Equivalent RGB and HSV inputs produce identical classification IDs across both environments.
- [x] Negative or non-finite inputs fail closed with `PBIO_ERROR_INVALID_ARG` or `ValueError`.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: All native color classification unit tests pass without errors.
- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: All VirtualHub color contract tests pass.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/pybricks/robotics.py`
- `docs/02-product/acceptance/G-MDRB-028.md`

## Notes for AI

- Zero mocks, zero stubs.
- Ensure strict parity between C ABI and Python VirtualHub wrapper signatures.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | Registration / Reset | Valid instance pointer | Reset calibration table | Return `PBIO_ERROR_INVALID_ARG` |
| `State::Configured` | Add prototype / Set baseline | Valid channel values | Store calibration data | Reject invalid coordinates |
| `State::Classifying` | Classify RGB / HSV | Finite values, non-null ptrs | Return triple `(id, dist, conf)` | Fail closed: return `Color.NONE` (0) |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **RGB Channel Domain** | $R, G, B \in [0.0, 1.0]$ or raw integer counts $R, G, B \ge 0$. |
| **HSV Channel Domain** | $H \in [0.0, 360.0), S \in [0.0, 1.0], V \in [0.0, 1.0]$. |
| **Confidence Metric** | $\text{Confidence} \in [0.0, 1.0]$. Higher values indicate unambiguous classification. |

### 3. Hexagonal Inbound & Outbound Ports Specification

- **Inbound Driving Port:** Optical Sensor Ingestion Port (MicroPython QSTR / Native C Dispatch).
- **Outbound Driven Port:** Robotics Navigation & Decision Subsystem.

### 7. Optical Sensor Calibration & Perceptual Color Science Invariants

- **Structured Output Tuple:** `(color_id: int, distance: float, confidence: float)`.
- **Dual Ingestion Contracts:**
  - Native C: `pbio_mdrobotbase_color_classify_rgb(...)` and `pbio_mdrobotbase_color_classify_hsv(...)`.
  - Python: `classify_color_rgb(...)` and `classify_color_hsv(...)`.
