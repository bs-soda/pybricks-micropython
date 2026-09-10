# G-MDRB-003: Constructor and Parameter Geometry Validation

**Status:** done
**Kind:** feature
**Atomic outcome:** Enforce fail-closed validation on wheel diameters, axle track, motor aliasing, and non-finite dimensions before any motor command or division
**Epic:** MDRB
**Depends on:** G-MDRB-002
**Blocks:** G-MDRB-004
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement strict geometry validation in PBIO constructor and setters | done |
| 2 | Enforce motor aliasing rejection and finite float checks in MicroPython | done |
| 3 | Construct boundary, negative, zero, and non-finite geometry test suite | done |

## Context

Codex architectural review scorecard assigned Geometry Validation a baseline score of **4/10 (High Risk)**.
In [`lib/pbio/src/mdrobotbase.c:14-25`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L14-L25) and [`pybricks/robotics/pb_type_mdrobotbase.c:2018-2040`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2018-L2040), the constructor and setters accept zero and negative wheel diameters and axle tracks:
```c
if (!left || !right) {
    return PBIO_ERROR_INVALID_ARG;
}
rb->axle_track = axle_track;
rb->wheel_diameter_left = wheel_diameter_left;
rb->wheel_diameter_right = wheel_diameter_right;
```
If a user specifies `wheel_diameter <= 0` or `axle_track <= 0`:
1. In `pbio_mdrobotbase_update_state()` ([`lib/pbio/src/mdrobotbase.c:239`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L239)), `delta_theta_enc_rad = (d_right - d_left) / track_mm` triggers an immediate IEEE 754 division by zero, yielding $\pm\infty$ or NaN heading.
2. In motion commands ([`pybricks/robotics/pb_type_mdrobotbase.c:511`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L511)), dividing linear velocity by `diam_left_mm` causes integer overflow and sends erratic max-speed motor commands.
3. If `left == right` (motor aliasing), both wheels bind to the same physical actuator.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Physical dimensions must be strictly positive and finite; allowing non-positive or unvalidated dimensions causes division by zero, floating-point NaN contamination, and dangerous uncontrolled actuator runaway.
**Done when:** Construction or dimension reconfiguration fails immediately with an explicit argument error whenever wheel diameter $\le 0$, axle track $\le 0$, coordinates are non-finite, or left and right motors are identical, guaranteeing zero motor commands are issued.
**Unblocks:** G-MDRB-004 (Consistent Gear-Ratio Command and Odometry Semantics).

## Atomicity & Zero-Mock Contract

- **One outcome:** Fail-closed validation for chassis geometry parameters and actuator bindings.
- **No decomposition leakage:** Gear-ratio scaling belongs to `G-MDRB-004`; trajectory coordinate checks belong to `G-MDRB-007`.
- **Concrete execution:** 100% concrete C validation in PBIO and MicroPython binding. Zero mocks, zero stubs.
- **Real boundary verification:** Verified by invoking real constructors and setters in `lib/pbio/test/src/test_mdrobotbase.c` and Python negative tests.
- **Failure behavior:** Invalid arguments reject immediately with `PBIO_ERROR_INVALID_ARG` (raising `ValueError`) before any hardware state modification.

## How

**Stack / approach:**
- In `lib/pbio/src/mdrobotbase.c`:
  - In `pbio_mdrobotbase_get_robotbase()` and `pbio_mdrobotbase_init()`:
    - Reject `left == right` with `PBIO_ERROR_INVALID_ARG`.
    - Reject `wheel_diameter_left <= 0 || wheel_diameter_right <= 0 || axle_track <= 0`.
    - Reject `wheel_diameter_left > 1000000 || axle_track > 5000000` (sanity bounds).
  - In `pbio_mdrobotbase_set_wheel_diameters()`:
    - Apply identical positive non-zero validation rules.
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - In `pb_type_MDRobotBase_make_new()`:
    - Verify `left_motor != right_motor`.
    - Verify `isfinite(wheel_diameter)` and `isfinite(axle_track)`.
    - Raise `mp_raise_ValueError("wheel diameter and axle track must be positive non-zero")`.

## Open questions

*(None — architectural contract confirmed via Codex review Step 3)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 3 (Geometry validation)` |
| Root Cause | `lib/pbio/src/mdrobotbase.c:14-25` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — PBIO Core Geometry Guards
**Allowed files:** `lib/pbio/src/mdrobotbase.c`
**Actions:**
1. Insert strict guards in `pbio_mdrobotbase_get_robotbase()`.
2. Reject `left == right`, non-positive diameters, and non-positive tracks.
3. Update `pbio_mdrobotbase_set_wheel_diameters()` with identical guards.

**Completion gate:** PBIO C API rejects non-positive dimensions with `PBIO_ERROR_INVALID_ARG`.
**Stop condition:** Any uncaught zero-division path remaining.

### Step 2 — MicroPython Constructor & Setter Guards
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Check finite float representation (`isfinite()`) in Python constructor.
2. Reject motor aliasing before PBIO allocation call.
3. Map `PBIO_ERROR_INVALID_ARG` to descriptive `ValueError`.

**Completion gate:** Python scripts passing invalid dimensions receive `ValueError` without side effects.
**Stop condition:** Any motor movement triggered on invalid construction.

### Step 3 — Negative Geometry Test Suite
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`, `tests/virtualhub/robotics/test_mdrobotbase_geometry.py`
**Actions:**
1. Test zero, negative, extreme ($10^9$), NaN, and Inf wheel diameters.
2. Test zero, negative, and extreme axle tracks.
3. Test motor aliasing (`left == right`).

**Completion gate:** All negative tests pass 100% green; zero division-by-zero or crashes.
**Stop condition:** Any test failure or unhandled panic.

## In

- Strict positivity guards ($> 0$) on wheel diameters and axle tracks.
- Motor aliasing prevention (`left != right`).
- Rejection of NaN and Inf floating-point numbers.
- Uniform validation across constructor and runtime setters.

## Out

- Trajectory point coordinate validation (handled in `G-MDRB-007`).
- Controller enum validation (handled in `G-MDRB-007`).
- Changing physical chassis dimensions.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Geometry Guard | Add | Positive checks in `pbio_mdrobotbase_get_robotbase` in `lib/pbio/src/mdrobotbase.c` |
| Setter Guard | Add | Positive checks in `pbio_mdrobotbase_set_wheel_diameters` in `lib/pbio/src/mdrobotbase.c` |
| Binding Guard | Add | `isfinite` checks in `pb_type_MDRobotBase_make_new` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Testing | Add | Negative geometry suite in `lib/pbio/test/src/test_mdrobotbase.c` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Geometry Validation Gate |
| **Ports & Adapters Topology** | Inbound: Constructor & Setter Adapters <br> Outbound: PBIO Actuator Subsystem |
| **State Machine & Invariants** | Validation States: `CHECK_ARGS` -> (`VALID` -> `PROCEED` \| `INVALID` -> `REJECT`) |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Constructing `MDRobotBase` with `wheel_diameter <= 0` returns `PBIO_ERROR_INVALID_ARG` / raises `ValueError`.
- [x] Constructing `MDRobotBase` with `axle_track <= 0` returns `PBIO_ERROR_INVALID_ARG` / raises `ValueError`.
- [x] Passing identical motor for left and right raises `ValueError` before any motor is started.
- [x] Setting wheel diameters via `set_wheel_diameters()` enforces identical validation rules.
- [x] No division by zero or NaN propagation occurs under any input combination.

## Test plan

- Execute `lib/pbio/test/src/test_mdrobotbase.c` with parameterized invalid geometry inputs.
- Execute VirtualHub Python tests asserting `ValueError` on negative dimensions.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Validation must occur before allocating any pool slots or commanding servos.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Validation::Intake` | Constructor / setter invocation | Arguments provided | Transition to `Validation::Inspect` | Reject on NULL pointer |
| `Validation::Inspect` | Range & finiteness check | $D > 0 \land W > 0 \land \text{left} \neq \text{right}$ | Transition to `Validation::Success` | Return `PBIO_ERROR_INVALID_ARG` |
| `Validation::Success` | Parameter assignment | Strict finite bounds verified | Update struct dimensions | None |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Wheel Diameter Invariant** | $D_{\text{wheel,left}} > 0.001\text{m} \land D_{\text{wheel,right}} > 0.001\text{m} \land \text{isfinite}(D)$. |
| **Axle Track Invariant** | $W_{\text{track}} > 0.001\text{m} \land \text{isfinite}(W_{\text{track}})$. |
| **Actuator Distinctness** | $\text{left\_servo} \neq \text{right\_servo}$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython Constructor & Setter Gateway (`pb_type_MDRobotBase_make_new`).
- **Outbound Driven Port:** Dimension Configuration Storage Port (`pbio_mdrobotbase_t`).
