# G-MDRB-007: Trajectory and Controller Input Validation

**Status:** done
**Kind:** feature
**Atomic outcome:** Enforce strict validation on trajectory coordinates, point capacity limits, tolerances, speeds, and controller enums
**Epic:** MDRB
**Depends on:** G-MDRB-006
**Blocks:** G-MDRB-008
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement fail-closed trajectory capacity and coordinate validation | done |
| 2 | Add controller enum range assertions and parameter positivity checks | done |
| 3 | Construct malformed trajectory and invalid controller test suite | done |

## Context

Codex architectural review scorecard assigned Trajectory Validation a **5/10** and Controller Validation a **4/10 (High Risk)**.
In [`pybricks/robotics/pb_type_mdrobotbase.c:1736-1738, 1770-1775`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1736-L1738):
1. **Silent Trajectory Truncation:** If a user passes more than 64 points, the array is silently truncated:
   ```c
   if (num_points > 64) {
       num_points = 64; // Silently ignores user waypoints!
   }
   ```
   The robot stops at point 64 without notifying the caller that the full path was not executed.
2. **Out-of-Bounds Memory Read:** Each point tuple is accessed without checking length:
   ```c
   mp_obj_get_array(points[i], &p_len, &p_coords);
   self->rb->trajectory_points_x[i] = mp_obj_get_float(p_coords[0]);
   self->rb->trajectory_points_y[i] = mp_obj_get_float(p_coords[1]); // Crashes if p_len < 2!
   ```
   Passing `[(100,)]` triggers an invalid memory read or segmentation fault.
3. **Missing Coordinate & Speed Validation:** Non-finite floats (NaN, Inf), negative speeds, and negative tolerances are accepted without checks.
4. **Invalid Controller Enums:** `pbio_mdrobotbase_set_controller()` accepts arbitrary integer values beyond `PBIO_MDROBOTBASE_CONTROLLER_PID` (0) and `PBIO_MDROBOTBASE_CONTROLLER_LQR` (1), resulting in unhandled switch cases.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Multi-waypoint navigation paths must execute reliably or fail immediately; silent path truncation and malformed coordinates cause memory corruptions, crash the interpreter, or leave robots stranded mid-field.
**Done when:** Trajectories with $>64$ points are rejected with an explicit capacity error, every coordinate is verified to have $\ge 2$ finite values, speeds and tolerances must be strictly positive, and unknown controller types are rejected.
**Unblocks:** G-MDRB-008 (Comprehensive MDRobotBase Regression Coverage).

## Atomicity & Zero-Mock Contract

- **One outcome:** Fail-closed input validation for trajectory paths, waypoint coordinates, and controller mode selection.
- **No decomposition leakage:** Lifecycle transitions belong to `G-MDRB-006`; regression test aggregation belongs to `G-MDRB-008`.
- **Concrete execution:** 100% concrete C validation logic in MicroPython bindings and PBIO library. Zero mocks, zero stubs.
- **Real boundary verification:** Verified via negative test vectors in `lib/pbio/test/src/test_mdrobotbase.c` and VirtualHub pytest.
- **Failure behavior:** Invalid paths or enums return `PBIO_ERROR_INVALID_ARG` (raising `ValueError`) before commanding any motors.

## How

**Stack / approach:**
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - In `pb_type_MDRobotBase_follow_trajectory()`:
    - If `num_points > 64`, raise `mp_raise_ValueError("trajectory exceeds maximum capacity of 64 points")`.
    - If `num_points < 2`, raise `mp_raise_ValueError("trajectory requires at least 2 points")`.
    - For each point $i$:
      - Verify `p_len >= 2`; if not, raise `mp_raise_ValueError("trajectory point must have (x, y) coordinates")`.
      - Check `isfinite(x) && isfinite(y)`; if not, raise `mp_raise_ValueError("trajectory coordinates must be finite")`.
    - Check `speed > 0.0f && tolerance > 0.0f && transition_tolerance > 0.0f`.
- In `lib/pbio/src/mdrobotbase.c`:
  - In `pbio_mdrobotbase_set_controller()`:
    - If `type != PBIO_MDROBOTBASE_CONTROLLER_PID && type != PBIO_MDROBOTBASE_CONTROLLER_LQR`:
      - Return `PBIO_ERROR_INVALID_ARG`.
  - In gain setters:
    - Validate that gains are non-negative and finite (`isfinite() && gain >= 0.0f`).

## Open questions

*(None — validation invariants confirmed via Codex review Step 7)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 7 (Trajectory & controller validation)` |
| Root Cause | `pybricks/robotics/pb_type_mdrobotbase.c:1736-1738,1770` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Trajectory Over-Capacity and Coordinate Length Validation
**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Eliminate silent truncation at 64 points; raise `ValueError` for $>64$ points.
2. Enforce minimum point count of 2.
3. Validate tuple length $\ge 2$ and coordinate finiteness for every waypoint.

**Completion gate:** Malformed points and $>64$ point arrays reject cleanly with `ValueError`.
**Stop condition:** Any segmentation fault or out-of-bounds array access.

### Step 2 — Controller Enum and Parameter Positivity Guards
**Allowed files:** `lib/pbio/src/mdrobotbase.c`, `pybricks/robotics/pb_type_mdrobotbase.c`
**Actions:**
1. Reject unknown controller enum values in `pbio_mdrobotbase_set_controller()`.
2. Validate positivity of speeds, tolerances, and acceleration limits.

**Completion gate:** Setting invalid controller enum returns `PBIO_ERROR_INVALID_ARG`.
**Stop condition:** Any unhandled controller mode.

### Step 3 — Negative Input Test Suite
**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`, `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**
1. Test 65-point trajectory (verify rejection).
2. Test 1-coordinate points `[(100,)]` (verify rejection).
3. Test NaN/Inf coordinates (verify rejection).
4. Test controller enum 99 (verify rejection).
5. Verify zero motor commands issued across all negative tests.

**Completion gate:** All negative tests pass 100% green without side effects.
**Stop condition:** Any motor movement on invalid input.

## In

- Explicit error when trajectory exceeds 64 points (no silent truncation).
- Validation of point tuple length $\ge 2$.
- Validation of finite coordinates (`isfinite`).
- Strict controller enum range check (`PID` or `LQR`).
- Rejection of non-positive speeds and tolerances.

## Out

- Altering Bezier/spline trajectory mathematical interpolation.
- Modifying LQR matrix solver equations.
- Expanding hardware buffer beyond 64 points (out of scope for MCU RAM budget).

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Trajectory Limit | Modify | Replace truncation with `ValueError` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Tuple Check | Add | Assert `p_len >= 2` in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Controller Enum | Modify | Strict enum validation in `lib/pbio/src/mdrobotbase.c` |
| Testing | Add | Negative input test suite in `tests/virtualhub/robotics/` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Trajectory Input Validation Boundary |
| **Ports & Adapters Topology** | Inbound: Python Trajectory Argument Parser <br> Outbound: Static Buffer Storage Array |
| **State Machine & Invariants** | Parsing States: `PARSE_ARRAY` -> `VALIDATE_WAYPOINTS` -> `LOAD_BUFFER` |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Passing 65 points to `follow_trajectory()` raises `ValueError` immediately.
- [x] Passing a point with fewer than 2 coordinates raises `ValueError` without crashing.
- [x] Passing NaN or Inf in coordinates, speeds, or tolerances raises `ValueError`.
- [x] Calling `set_controller()` with integer other than 0 or 1 returns `PBIO_ERROR_INVALID_ARG`.
- [x] Invalid inputs produce zero motor commands and do not modify internal pose.

## Test plan

- Execute `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` with malformed trajectory payloads.
- Execute PBIO C tests verifying enum boundaries.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Never silently truncate arrays; fail-closed behavior is mandatory.
- Buffer size 64 is a deliberate memory constraint on embedded microcontrollers; document this clearly.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Trajectory::Intake` | `follow_trajectory(points)` | Points array provided | Validate length $2 \le N \le 64$ | Raise `ValueError` if $N < 2 \lor N > 64$ |
| `Trajectory::ValidatePoints` | Coordinate extraction | $\forall i, \text{len}(p_i) \ge 2 \land \text{isfinite}(x,y)$ | Load into static struct buffers | Raise `ValueError` on malformed tuple |
| `Trajectory::ValidateDynamics` | Velocity & tolerance check | $v > 0 \land \text{tol} > 0$ | Configure motion profile | Raise `ValueError` on non-positive value |
| `Trajectory::Armed` | Motion execution dispatch | All invariants met | Start trajectory motion | None |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Trajectory Capacity Limit** | $2 \le N_{\text{points}} \le 64$. |
| **Point Tuple Dimensionality** | $\forall p \in \text{points}, \text{dim}(p) \ge 2 \land \text{isfinite}(p_0) \land \text{isfinite}(p_1)$. |
| **Controller Enum Space** | $\text{controller} \in \{\text{PBIO\_MDROBOTBASE\_CONTROLLER\_PID} (0), \text{PBIO\_MDROBOTBASE\_CONTROLLER\_LQR} (1)\}$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Trajectory Script Argument Parser (`pb_type_MDRobotBase_follow_trajectory`).
- **Outbound Driven Port:** Static Trajectory Memory Buffer (`trajectory_points_x`, `trajectory_points_y`).
