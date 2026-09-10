# G-MDRB-003 — Acceptance Contract

> Strict verification contract for G-MDRB-003: Constructor and Parameter Geometry Validation.

## Goal Reference

- **Goal:** G-MDRB-003 — Constructor and Parameter Geometry Validation
- **Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
- **Status:** ready
- **Touch map:**
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `lib/pbio/test/src/test_mdrobotbase.c`

---

## Scenario 1: Non-Positive Wheel Diameters Rejection (Failure Case)

**Given** an unallocated or dirty robot base slot
**When** `pbio_mdrobotbase_get_robotbase()` or `pbio_mdrobotbase_init()` is called with `wheel_diameter_left <= 0` or `wheel_diameter_right <= 0`
**Then** the call fails closed immediately returning `PBIO_ERROR_INVALID_ARG`, without allocating any pool slot or issuing actuator commands.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_get_robotbase(&rb, srv_l, srv_r, 0, 56000, 112000)` or `(-56000, 56000, 112000)` |
| **Output** | `PBIO_ERROR_INVALID_ARG`; `rb == NULL` |
| **Preconditions** | Valid servo pointers |

---

## Scenario 2: Non-Positive Axle Track Rejection (Failure Case)

**Given** valid servo pointers and positive wheel diameters
**When** `pbio_mdrobotbase_get_robotbase()` or `pbio_mdrobotbase_init()` is called with `axle_track <= 0`
**Then** the call fails closed returning `PBIO_ERROR_INVALID_ARG`, preventing division by zero in differential kinematics ($\Delta\theta = (d_R - d_L)/W$).

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_get_robotbase(&rb, srv_l, srv_r, 56000, 56000, 0)` or `(56000, 56000, -112000)` |
| **Output** | `PBIO_ERROR_INVALID_ARG`; `rb == NULL` |
| **Preconditions** | Valid servo pointers |

---

## Scenario 3: Motor Aliasing Rejection (Failure Case)

**Given** valid positive dimensions
**When** `pbio_mdrobotbase_get_robotbase()` or Python constructor is called with identical left and right servos (`left == right`)
**Then** the call fails closed returning `PBIO_ERROR_INVALID_ARG` (raising `ValueError("left and right motors must be distinct")`), preventing simultaneous conflicting commands to a single actuator.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_get_robotbase(&rb, srv_l, srv_l, 56000, 56000, 112000)` |
| **Output** | `PBIO_ERROR_INVALID_ARG`; `rb == NULL` |
| **Preconditions** | Same servo passed for left and right |

---

## Scenario 4: Non-Finite Floats & Sanity Upper Bounds Rejection (Failure Case)

**Given** valid distinct servos
**When** float parameters containing `NaN`, `+Inf`, `-Inf` or extreme values exceeding sanity bounds (`wheel_diameter > 1000000`, `axle_track > 5000000`) are provided
**Then** the call rejects with `ValueError` in Python and `PBIO_ERROR_INVALID_ARG` in PBIO C.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_get_robotbase(&rb, srv_l, srv_r, 2000000, 56000, 112000)` or `(56000, 56000, 6000000)` |
| **Output** | `PBIO_ERROR_INVALID_ARG`; `rb == NULL` |
| **Preconditions** | Non-finite or extreme dimension inputs |

---

## Scenario 5: Dynamic Wheel Diameter Setter Validation (Happy Path & Guard)

**Given** an active initialized `pbio_mdrobotbase_t` instance
**When** `pbio_mdrobotbase_set_wheel_diameters()` is called
**Then** strictly positive and bounded values update `wheel_diameter_left` and `wheel_diameter_right`, whereas non-positive or extreme values return `PBIO_ERROR_INVALID_ARG` without altering existing dimensions.

| Case | Input | Expected |
|------|-------|----------|
| Valid update | `pbio_mdrobotbase_set_wheel_diameters(rb, 62400, 62400)` | `PBIO_SUCCESS`; dimensions updated |
| Zero left | `pbio_mdrobotbase_set_wheel_diameters(rb, 0, 62400)` | `PBIO_ERROR_INVALID_ARG`; dimensions unchanged |
| Negative right | `pbio_mdrobotbase_set_wheel_diameters(rb, 62400, -500)` | `PBIO_ERROR_INVALID_ARG`; dimensions unchanged |
| Out of bounds | `pbio_mdrobotbase_set_wheel_diameters(rb, 2000000, 62400)` | `PBIO_ERROR_INVALID_ARG`; dimensions unchanged |

---

## Verification Suite Mapping

- **C Embedded Test:** `test_mdrobotbase_geometry_validation` in `lib/pbio/test/src/test_mdrobotbase.c`
- **Socratic Dialectic Harness:** `scripts/harness/socratic-agentic-loop-g-mdrb-003-harness.mjs`
- **Master Replication Runner:** `scripts/harness/master-replication-g-mdrb-003.mjs`
