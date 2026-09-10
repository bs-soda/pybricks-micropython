# G-MDRB-016: Numerical Robustness, Geometry Bounds, and Quantization Hardening

**Status:** done
**Kind:** feature
**Atomic outcome:** Harden input validation against non-finite floats, zero or negative geometry, integer motor-speed quantization overflow, and millisecond clock wraparound in PBIO and MicroPython layers
**Epic:** MDRB
**Depends on:** G-MDRB-015
**Blocks:** G-MDRB-017
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Numerical Boundary Matrix Formulation | done |
| 2 | Enforce Finite Number Checks & Quantization Protection | done |
| 3 | Verification & Extreme Value Invariant Test Pass | done |

## Context

In `lib/pbio/src/mdrobotbase.c:139-143` and `pybricks/robotics/pb_type_mdrobotbase.c`, constructor arguments and runtime setter methods validate positive wheel diameters and axle track. However, runtime inputs are not uniformly checked against IEEE 754 non-finite values (`isnan`, `isinf`), extreme gear ratios ($R < 0.001$ or $R > 1000.0$), integer speed quantization overflows during `dps * gear_ratio` multiplications, or unsigned 32-bit millisecond clock timer wraparounds in motion timeout loops.

### Scorecard & Baseline Evidence
- **Current score:** 8/10 (Geometry validation) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:139-143`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L139-L143), [`pybricks/robotics/pb_type_mdrobotbase.c:1033-1045`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1033-L1045)
- **Root cause:** Validation relies on standard comparison operators without explicitly guarding against NaN propagation or integer multiplication overflow.
- **Reproduction steps:**
  1. Construct `MDRobotBase` with `wheel_diameter = float('nan')`.
  2. Inquire status or pose: coordinates evaluate to `NaN` and infect all subsequent odometry calculations.
  3. Call `robot.set_gear_ratio(1e-12)`: division by near-zero produces floating-point infinity or catastrophic overflow during speed conversion.
  4. Pass high motor speed `20000 dps` with gear ratio `100.0`: integer product overflows 32-bit signed integer.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Non-finite floats, zero divisions, and integer overflows corrupt motion calculations, leading to firmware panics, uncommanded wheel spins, or runaway robot behavior.
**Done when:** All floating-point inputs are validated as finite, extreme scale ratios are bounded, arithmetic operations are protected against integer overflow, and clock calculations handle millisecond wraparound.
**Unblocks:** G-MDRB-017

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: numerical robustness hardening across floating-point and integer conversions.
- **No decomposition leakage:** Behavioral test harness hardening is reserved for G-MDRB-017.
- **Concrete execution:** No mocks, stubs, fakes, or dummy approximations.
- **Real boundary verification:** Verified via native PBIO C tests exercising edge and boundary values.
- **Failure behavior:** Invalid numerical inputs immediately return `PBIO_ERROR_INVALID_ARG` or raise `ValueError`.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C PBIO kinematics and odometry engine:
1. Guard all float setters in `lib/pbio/src/mdrobotbase.c` against non-finite values (`!isfinite()`).
2. Enforce strict physical bounds on gear ratio in `pbio_mdrobotbase_set_gear_ratio`: $R \in [0.001f, 1000.0f]$.
3. Implement saturating integer conversion in `pbio_mdrobotbase_wheel_to_motor_dps`: clamp products $> \text{INT32\_MAX}$ to $\text{INT32\_MAX}$ and $< \text{INT32\_MIN}$ to $\text{INT32\_MIN}$.
4. Implement circular arithmetic for timeout evaluations: `(uint32_t)(now - start) >= timeout_ms`.
5. Implement comprehensive unit test `test_mdrobotbase_numerical_robustness` in `lib/pbio/test/src/test_mdrobotbase.c`.

### Proposed implementation strategy
- Use `isfinite()` from `<math.h>` on all float parameters (`x`, `y`, `theta`, `speed`, `accel`, `gear_ratio`, `alpha`, backlash limits).
- Clamp speed multiplied by gear ratio to `INT32_MAX` and `INT32_MIN` before casting.
- Implement unsigned circular subtraction for timeout checks: `(uint32_t)(now - start) >= timeout_ms`.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Confirm minimum and maximum allowable gear ratio limits in physical units: strictly bounded to [0.001, 1000.0]. Values outside this range or non-finite are rejected with `PBIO_ERROR_INVALID_ARG`.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-NUMERICAL-OVERFLOW-NAN |
| **Decisions** | PDR-MDRB-FINITE-MATH-BOUNDARY |
| **Assumptions required** | A-IEEE754-COMPLIANT-FPU |
| **Evidence** | `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Defensive Boundary Validation, Saturating Arithmetic |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-016.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero mocks, strict IEEE 754 finite enforcement |

## Work steps

### Step 1 — Specification & Numerical Boundary Matrix Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-016.md` · `docs/02-product/acceptance/G-MDRB-016.md`
**Actions:**

1. Define test matrix covering `NaN`, `+Infinity`, `-Infinity`, subnormal floats, and `0.0`.
2. Define maximum speed saturation bounds for 32-bit signed motor targets.

**Completion gate:** Acceptance criteria defined with zero unresolved clarification tags.
**Stop condition:** Unspecified gear ratio or velocity limits.

### Step 2 — Enforce Finite Number Checks & Quantization Protection

**Allowed files:** `lib/pbio/src/mdrobotbase.c` · `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**

1. Add `isfinite()` checks to all MicroPython float parsers and PBIO setter methods.
2. Add saturation clamping in `mdrobotbase_linear_to_angular_dps` to prevent integer overflow.
3. Use signed subtraction for clock timeout evaluation.

**Completion gate:** C code compiles cleanly without warnings.
**Stop condition:** Compiler warnings or floating point performance regressions.

### Step 3 — Verification & Extreme Value Invariant Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**

1. Add `test_mdrobotbase_numerical_robustness` in `test_mdrobotbase.c`.
2. Verify all non-finite inputs return `PBIO_ERROR_INVALID_ARG`.
3. Verify timer arithmetic behaves correctly across simulated 32-bit overflow boundary.

**Completion gate:** All numerical tests pass with exit code 0.
**Stop condition:** Any NaN leakage or uncaught overflow.

## In

- Enforcing `isfinite()` on all coordinate, angle, speed, and gear ratio inputs.
- Saturating speed conversion products to prevent integer overflow.
- Circular arithmetic for millisecond timers.

## Out

- Behavioral test suite assertions (addressed in G-MDRB-017).
- MicroPython architectural refactoring (addressed in G-MDRB-018).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Modify | `lib/pbio/src/mdrobotbase.c`: add `isfinite()` guards and saturation math |
| C Binding | Modify | `pybricks/robotics/pb_type_mdrobotbase.c`: validate parsed floats before use |
| Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c`: test non-finite inputs and overflow bounds |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Numerical Robustness |
| **Ports & Adapters Topology** | Driving Inbound: API Parameter Input <br> Driven Outbound: Math Co-Processor / FPU |
| **State Machine & Invariants** | Finite Number Invariant: $\forall x \in \text{Inputs}, \text{isfinite}(x) == \text{true}$; Saturation: $\text{dps} \in [\text{MIN\_DPS}, \text{MAX\_DPS}]$ |
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

- [x] Passing `NaN`, `+inf`, or `-inf` to any coordinate, angle, or speed parameter returns `PBIO_ERROR_INVALID_ARG` or raises `ValueError`.
- [x] Gear ratio inputs outside $[0.001, 1000.0]$ are rejected with `PBIO_ERROR_INVALID_ARG`.
- [x] Large velocities multiplied by high gear ratios saturate gracefully at maximum integer motor speed without 32-bit wrap-around.
- [x] Motion timeout checks calculate elapsed duration correctly across 32-bit unsigned millisecond timer wraparound.

## Test plan

- Command: `make -C lib/pbio/test test`
- Verification: `test_mdrobotbase_numerical_robustness` passes cleanly.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Never use raw `<` or `>` comparisons alone to detect `NaN`, since all comparisons with `NaN` evaluate to false. Use `isfinite()`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Input::Validation` | Parameter received | `isfinite(p) && p within bounds` | Pass to control loop | Reject with `PBIO_ERROR_INVALID_ARG` |
| `Input::Validation` | NaN or Inf received | `isnan(p) || isinf(p)` | None | Reject with `PBIO_ERROR_INVALID_ARG` |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Finite Domain** | $\forall v \in \mathbb{R}, v \notin \{-\infty, +\infty, \text{NaN}\}$. |
| **Speed Saturation** | $\text{dps}_{\text{clamped}} = \max(-20000, \min(20000, \text{dps}))$. |
| **Timer Wraparound** | $\Delta t = (int32\_t)(t_{\text{current}} - t_{\text{start}})$. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `NumericalSanitizerPort` | C inline validator | `pybricks/robotics/pb_type_mdrobotbase.c` |
| **Driven (Outbound)** | `PBIOActuatorPort` | Sanitized integer targets | `lib/pbio/src/mdrobotbase.c` |

### 4. UI/UX 5-State Matrix

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Valid input ready | `bg-surface-elevated` |
| **2. Loading / Pending** | Sanitizing parameters | `animate-pulse` |
| **3. Empty State** | Zero input pending | `text-content-secondary` |
| **4. Error State** | Invalid numerical argument alert | `text-status-error` |
| **5. Success State** | Input validated and accepted | `text-status-success` |

### 5. Mathematical Model & Numerical Invariants

- Guard predicate: $P(x) = \text{isfinite}(x) \land (x > x_{\min}) \land (x < x_{\max})$.

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Non-finite inputs fail validation at entry, generating 0 motor commands.
- **Consistent state on failure:** FPU status remains clean without signaling unhandled traps.
- **Regression scenarios:** Testing `0.0 / 0.0`, `1.0 / 0.0`, `FLT_MAX`, `-FLT_MAX`.
