# G-MDRB-001 — Acceptance Contract

> Strict verification contract for G-MDRB-001: Safe MDRobotBase Instance Ownership and Allocation.

## Goal Reference

- **Goal:** G-MDRB-001 — Safe MDRobotBase Instance Ownership and Allocation
- **Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
- **Status:** ready
- **Touch map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `lib/pbio/test/src/test_mdrobotbase.c`

---

## Scenario 1: Dual Independent Robot Instances (Happy Path)

**Expected behavior:** Two independent robot instances are allocated on disjoint motor pairs. Each instance has a distinct memory address in `mdrobotbases`, and state/odometry updates to robot 1 do not alter robot 2.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_get_robotbase(&rb1, &servo_a, &servo_b, ...)` followed by `pbio_mdrobotbase_get_robotbase(&rb2, &servo_c, &servo_d, ...)` |
| **Output** | `PBIO_SUCCESS` on both calls; `rb1 != rb2`; `&rb1 != &rb2` |
| **Preconditions** | PBIO initialized, `PBIO_CONFIG_NUM_MDROBOTBASES >= 2`, distinct servo pointers |

### Edge cases

| Case | Input | Expected |
|------|-------|----------|
| Re-entrant acquisition | Call `get_robotbase` again with identical servos `servo_a` and `servo_b` | Returns existing `rb1` pointer with `PBIO_SUCCESS` without consuming a second slot |

---

## Scenario 2: Slot Deallocation and Deterministic Reuse (Happy Path)

**Expected behavior:** Releasing an active robot base slot via `pbio_mdrobotbase_put_robotbase()` frees its occupancy flag and halts motors. A subsequent allocation reuses the released slot.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_put_robotbase(rb1)` followed by new `pbio_mdrobotbase_get_robotbase(&rb3, &servo_e, &servo_f, ...)` |
| **Output** | `PBIO_SUCCESS`; `rb3` allocates the freed slot |
| **Preconditions** | `rb1` was previously allocated and active |

---

## Scenario 3: Pool Capacity Exhaustion (Failure Case)

**Expected behavior:** When all available slots ($N = \text{PBIO\_CONFIG\_NUM\_MDROBOTBASES}$) are active, requesting another robot base fails closed with `PBIO_ERROR_BUSY`.

| Field | Value |
|-------|-------|
| **Input** | Allocate $N$ instances, then attempt allocation of instance $N + 1$ with distinct servos |
| **Output** | Returns `PBIO_ERROR_BUSY`; MicroPython raises `OSError(EBUSY)`; zero memory corruption |
| **Preconditions** | Exactly `PBIO_CONFIG_NUM_MDROBOTBASES` slots currently marked `in_use` |

---

## Scenario 4: Invalid Deallocation Pointer (Failure Case)

**Expected behavior:** Passing a NULL pointer or an address outside the `mdrobotbases` static array to `pbio_mdrobotbase_put_robotbase()` safely returns `PBIO_ERROR_INVALID_ARG`.

| Case | Input | Expected |
|------|-------|----------|
| NULL pointer | `pbio_mdrobotbase_put_robotbase(NULL)` | `PBIO_ERROR_INVALID_ARG` |
| Foreign stack/heap pointer | `pbio_mdrobotbase_put_robotbase(&foreign_rb)` | `PBIO_ERROR_INVALID_ARG` |

---

## Verification

- [ ] Automated C Unit Tests: `lib/pbio/test/src/test_mdrobotbase.c` via `./lib/pbio/test/build/test-pbio`
- [ ] Socratic Dialectic Loop: `scripts/harness/socratic-agentic-loop-g-mdrb-001-harness.mjs`
- [ ] Master Replication & Release Gate: `scripts/harness/master-replication-g-mdrb-001.mjs`

## Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Human reviewer | Batrareth Sudprasert | | pending |
