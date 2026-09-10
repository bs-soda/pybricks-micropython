# G-MDRB-009: Maintainability and Duplicate Control Logic Reduction

**Status:** done
**Kind:** chore
**Atomic outcome:** Deduplicate redundant control math, speed conversions, and heading normalization across the 900+ line motion iteration monolith without altering behavior
**Epic:** MDRB
**Depends on:** G-MDRB-008
**Blocks:** —
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Extract reusable static inline helpers for heading wrapping, motor dps, and stall checks | done |
| 2 | Refactor motion iteration branches to use unified helpers | done |
| 3 | Run regression test suite and verify identical kinematic behavior | done |

## Context

Codex architectural review scorecard assigned Maintainability a baseline score of **5/10 (High Risk)**.
In [`pybricks/robotics/pb_type_mdrobotbase.c:72-975`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L72-L975), the single function `pb_type_mdrobotbase_motion_iterate_once()` spans over 900 lines. Within this function, identical blocks of code are duplicated repeatedly across `PBIO_MDROBOTBASE_MOTION_NAVIGATE`, `PBIO_MDROBOTBASE_MOTION_TURN`, `PBIO_MDROBOTBASE_MOTION_PIVOT`, and `PBIO_MDROBOTBASE_MOTION_TRAJECTORY`:
1. **Angle Normalization:**
   ```c
   while (diff > 180.0f) diff -= 360.0f;
   while (diff < -180.0f) diff += 360.0f;
   ```
   Duplicated 12 separate times in `pb_type_mdrobotbase.c`.
2. **Motor DPS Conversion & Clamping:**
   ```c
   int32_t left_dps = (int32_t)(((left_vel / (3.14159265f * diam_left_mm)) * 360.0f) * self->rb->gear_ratio);
   if (left_dps > 1000) left_dps = 1000;
   if (left_dps < -1000) left_dps = -1000;
   ```
   Duplicated 6 times with minor discrepancies in clamping limits.
3. **Stall Evaluator:**
   The logic checking commanded velocity against actual progress over an elapsed window is duplicated across navigate, turn, and trajectory branches.

This massive duplication introduces high risk of divergent behavior whenever a bug fix or enhancement is applied to one branch but omitted in others.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Duplicate control loops create maintenance hazards and divergence risks; extracting verified common helpers ensures uniform behavior and prevents localized bug re-emergence.
**Done when:** Shared control math, angle normalization, and motor speed clamping are consolidated into modular helpers, function complexity of the motion iteration monolith is significantly reduced, and all regression tests produce bit-identical behavioral outputs.
**Unblocks:** — (Epic completion and scorecard promotion).

## Atomicity & Zero-Mock Contract

- **One outcome:** Deduplication of repeated motion control logic and helper extraction without altering runtime behavior.
- **No decomposition leakage:** Regression tests belong to `G-MDRB-008`; bug fixes belong to `G-MDRB-001`–`G-MDRB-007`.
- **Concrete execution:** 100% concrete C refactoring within `pybricks/robotics/pb_type_mdrobotbase.c`. Zero mocks, zero stubs.
- **Real boundary verification:** Verified against the complete regression suite established in `G-MDRB-008`.
- **Failure behavior:** Compilation error or regression test failure triggers immediate rollback.

## How

**Stack / approach:**
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - Define static inline helpers:
    - `static inline float mdrobotbase_wrap_degrees(float angle)`:
      Wraps angle to $[-180.0^\circ, +180.0^\circ]$.
    - `static inline int32_t mdrobotbase_clamp_speed(int32_t dps, int32_t max_speed)`:
      Clamps speed to $[-max, +max]$.
    - `static inline int32_t mdrobotbase_linear_to_angular_dps(float linear_vel_mm_s, float wheel_diam_mm, float gear_ratio)`:
      Computes motor degrees per second cleanly.
    - `static inline bool mdrobotbase_evaluate_stall(pbio_mdrobotbase_t *rb, float v_cmd, float v_actual, float dt_sec, float cmd_thresh, float actual_thresh, float timeout_ms)`:
      Consolidates stall accumulation logic.
  - Refactor `pb_type_mdrobotbase_motion_iterate_once()` to use these helpers across all 4 motion modes.

## Open questions

*(None — refactoring scope confirmed via Codex review Step 9)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 9 (Maintainability)` |
| Root Cause | `pybricks/robotics/pb_type_mdrobotbase.c:72-975` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Implementation | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |
| VirtualHub Tests | `tests/virtualhub/robotics/` |

## Work steps

### Step 1 — Static Inline Helper Definition
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Define `mdrobotbase_wrap_degrees()`, `mdrobotbase_clamp_speed()`, and `mdrobotbase_linear_to_angular_dps()`.
2. Ensure helpers have zero runtime overhead (compiled inline).

**Completion gate:** Helpers compile cleanly; standalone unit assertions pass.
**Stop condition:** Any compiler warning.

### Step 2 — Motion Iteration Deduplication
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Replace all 12 angle wrapping loops with `mdrobotbase_wrap_degrees()`.
2. Replace motor dps clamping blocks with `mdrobotbase_clamp_speed()`.
3. Unify stall tracking with `mdrobotbase_evaluate_stall()`.

**Completion gate:** `pb_type_mdrobotbase_motion_iterate_once` reduced by $>200$ lines.
**Stop condition:** Any behavioral discrepancy in motion output.

### Step 3 — Regression Validation Pass
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`, `tests/virtualhub/robotics/**`
**Actions:**
1. Run all regression tests from `G-MDRB-008`.
2. Verify all kinematic and async lifecycle tests pass 100% green.

**Completion gate:** 100% regression tests pass with identical values before and after refactoring.
**Stop condition:** Any failed test assertion.

## In

- Consolidating 12 duplicate angle wrapping loops into `mdrobotbase_wrap_degrees()`.
- Consolidating motor dps conversion and clamping into shared helpers.
- Consolidating stall tracking into shared helper.
- Reducing line count and cognitive complexity of `pb_type_mdrobotbase.c`.

## Out

- Changing any mathematical algorithms or control laws.
- Modifying PBIO public headers.
- Altering user-facing Python API.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Helper | Add | `mdrobotbase_wrap_degrees` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Helper | Add | `mdrobotbase_clamp_speed` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Helper | Add | `mdrobotbase_evaluate_stall` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Refactor | Modify | Replace duplicate blocks in `pb_type_mdrobotbase_motion_iterate_once` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Code Cleanliness & Maintainability |
| **Ports & Adapters Topology** | Inbound: Motion Execution Handlers <br> Outbound: Static Inline Pure Functions |
| **State Machine & Invariants** | Refactoring Invariant: $\forall \text{input } x, f_{\text{refactored}}(x) = f_{\text{original}}(x)$ |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Angle normalization is handled exclusively through `mdrobotbase_wrap_degrees()`.
- [x] Duplicate motor speed conversion and clamping blocks are replaced with common helpers.
- [x] Code size / function length of `pb_type_mdrobotbase_motion_iterate_once` is reduced significantly.
- [x] All unit and integration regression tests pass 100% green with zero behavior deviation.
- [x] Firmware binary size is reduced or remains neutral due to helper inlining.

## Test plan

- Execute full test suite from `G-MDRB-008` before and after refactor.
- Compare binary outputs and verify identical numerical results.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Strictly preserve numerical precision; do not change float constants or division order.
- Ensure static functions are marked `static inline` to avoid linker bloat on embedded targets.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Refactor::Baseline` | Test suite executed | All tests passing | Record baseline test results | Abort if baseline fails |
| `Refactor::HelperExtraction` | Extract inline helpers | Pure functions | Replace duplicate code | Rollback on compile error |
| `Refactor::Verification` | Re-run test suite | Zero behavioral drift | Attest clean maintainability | Rollback on test failure |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Angle Wrapping Invariant** | $\forall \theta \in \mathbb{R}, \text{wrap}(\theta) \in [-180.0^\circ, +180.0^\circ]$. |
| **Speed Clamping Invariant** | $\forall v \in \mathbb{R}, |\text{clamp}(v, v_{\text{max}})| \le v_{\text{max}}$. |
| **Zero Side-Effect Invariant** | Pure calculation helpers do not mutate struct pointers or global variables. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Internal Motion Calculation Callers (`pb_type_mdrobotbase_motion_iterate_once`).
- **Outbound Driven Port:** Inline Numerical Computation Primitives.
