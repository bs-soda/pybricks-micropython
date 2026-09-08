# G-MDRB-002 — Acceptance Contract

> Strict verification contract for G-MDRB-002: Complete State Initialization and Lifecycle Reset.

## Goal Reference

- **Goal:** G-MDRB-002 — Complete State Initialization and Lifecycle Reset
- **Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
- **Status:** ready
- **Touch map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `lib/pbio/test/src/test_mdrobotbase.c`

---

## Scenario 1: Fresh Instance Complete Default Initialization (Happy Path)

**Expected behavior:** Calling `pbio_mdrobotbase_init()` on a newly allocated `pbio_mdrobotbase_t` instance sets every field to a strictly defined default value. All PID gains, including pivot gains (`kp_pivot = 1.0f`, `ki_pivot = 0.0f`, `kd_pivot = 0.0f`), odometry coordinates, speed limits, and trajectory arrays are deterministic.

| Field | Value |
|-------|-------|
| **Input** | `pbio_mdrobotbase_init(rb, srv_left, srv_right, 56000, 56000, 112000)` |
| **Output** | `PBIO_SUCCESS`; `rb->kp_pivot == 1.0f`, `rb->ki_pivot == 0.0f`, `rb->kd_pivot == 0.0f`; all trajectory point counts == 0 |
| **Preconditions** | Non-NULL `rb`, `srv_left`, `srv_right` pointers |

### Edge cases

| Case | Input | Expected |
|------|-------|----------|
| Re-entrant acquisition | Call `get_robotbase` on an already active slot with matching motors | Retains active state without zeroing odometry |

---

## Scenario 2: Dirty Slot Pre-fill / Re-initialization Hygiene (Happy Path)

**Expected behavior:** Re-initializing a slot pre-filled with non-zero garbage bytes (`0xFF` or `0xAA`) results in byte-for-byte identical state to a freshly allocated instance. No residual accumulators, stale trajectory points, or floating-point NaNs persist.

| Field | Value |
|-------|-------|
| **Input** | `memset(rb, 0xFF, sizeof(pbio_mdrobotbase_t))` followed by `pbio_mdrobotbase_init(rb, srv_left, srv_right, 56000, 56000, 112000)` |
| **Output** | `PBIO_SUCCESS`; `rb->stall_time_ms == 0.0f`, `rb->turn_integral == 0.0f`, `rb->color_prototypes_count == 0` |
| **Preconditions** | Memory buffer filled with `0xFF` garbage pattern |

---

## Scenario 3: Transient Motion State Reset (Happy Path)

**Expected behavior:** Calling `pbio_mdrobotbase_motion_reset()` before or after a motion command zeroes all transient accumulators (`stall_time_ms`, `turn_integral`, `dist_traveled`, `motion_in_progress`, `motion_type`) while preserving persistent configuration (PID gains, backlash limits, gear ratios, odometry coordinates).

| Field | Value |
|-------|-------|
| **Input** | Pre-pollute `rb->stall_time_ms = 500.0f`, `rb->turn_integral = 25.0f`, `rb->dist_traveled = 1234.0f`, `rb->motion_in_progress = true`, then call `pbio_mdrobotbase_motion_reset(rb)` |
| **Output** | `PBIO_SUCCESS`; `rb->stall_time_ms == 0.0f`, `rb->turn_integral == 0.0f`, `rb->dist_traveled == 0.0f`, `rb->motion_in_progress == false` |
| **Preconditions** | Non-NULL initialized `rb` pointer |

---

## Scenario 4: NULL Pointer & Invalid Parameter Safety (Failure Case)

**Expected behavior:** Passing a NULL pointer to `pbio_mdrobotbase_init()` or `pbio_mdrobotbase_motion_reset()` fails closed with `PBIO_ERROR_INVALID_ARG`.

| Case | Input | Expected |
|------|-------|----------|
| NULL robot pointer to init | `pbio_mdrobotbase_init(NULL, srv_l, srv_r, 56000, 56000, 112000)` | `PBIO_ERROR_INVALID_ARG` |
| NULL servo pointer to init | `pbio_mdrobotbase_init(rb, NULL, srv_r, 56000, 56000, 112000)` | `PBIO_ERROR_INVALID_ARG` |
| NULL robot pointer to motion_reset | `pbio_mdrobotbase_motion_reset(NULL)` | `PBIO_ERROR_INVALID_ARG` |

---

## Verification Suite Mapping

- **C Embedded Test:** `test_mdrobotbase_state_initialization` in `lib/pbio/test/src/test_mdrobotbase.c`
- **Socratic Dialectic Harness:** `scripts/harness/socratic-agentic-loop-g-mdrb-002-harness.mjs`
- **Master Replication Runner:** `scripts/harness/master-replication-g-mdrb-002.mjs`
