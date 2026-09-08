# G-MDRB-002: Complete State Initialization and Lifecycle Reset

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Enforce deterministic zero-initialization of all MDRobotBase struct fields and provide dedicated motion reset helpers  
**Epic:** MDRB  
**Depends on:** G-MDRB-001  
**Blocks:** G-MDRB-003  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement centralized pbio_mdrobotbase_init() with full struct zeroing | done |
| 2 | Add dedicated pbio_mdrobotbase_motion_reset() helper | done |
| 3 | Construct state initialization and dirty-field reuse test suite | done |

## Context

Codex architectural review scorecard assigned State Initialization a baseline score of **4/10 (High Risk)**.
In [`lib/pbio/src/mdrobotbase.c:14-66`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L14-L66), `pbio_mdrobotbase_get_robotbase()` initializes only a small subset of fields on `pbio_mdrobotbase_t`. More than 50 critical fields remain uninitialized or retain dirty state across allocations:
- Pivot gains: `kp_pivot`, `ki_pivot`, `kd_pivot` (read in motion loops as uninitialized garbage).
- Motion tracking: `motion_type`, `goal_x`, `goal_y`, `goal_theta`, `has_goal_theta`, `target_speed`, `start_speed`, `end_speed`, `accel_d`, `decel_d`, `use_ramping`, `is_backward`, `tolerance_dist`, `timeout_ms`, `start_time_ms`, `last_step_time_ms`, `turn_integral`, `stall_time_ms`, `stop_behavior`, `motion_in_progress`.
- Navigation internals: `path_len`, `path_x`, `path_y`, `path_theta`, `dist_ref`, `target_speed_for_ramping`, `max_accel`, `dist_traveled`, `kick_speed`, `kick_time`, `align_final_heading`.
- Turn & pivot state: `target_angle`, `speed_deg_s`, `accel_angle`, `decel_angle`, `tolerance_angle`, `pivot_left`, `turn_angle_total`.
- Trajectory tracking: `trajectory_num_points`, `trajectory_current_point_idx`, `trajectory_transition_tolerance`, `trajectory_points_x[64]`, `trajectory_points_y[64]`, segment start coordinates, `trajectory_final_segment_started`.
- Color calibration prototypes count and array.

When a robot instance is reconstructed or reused, dirty accumulators (such as `stall_time_ms` > 250ms) cause immediate false stalls, runaway integration windup, or erratic navigation.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Embedded control structures must start from a strictly known, deterministic zero state; uninitialized fields cause undefined behavior, floating-point NaN propagation, and spurious motion failures across consecutive runs.  
**Done when:** Allocating or initializing a robot base produces identical, zero-leakage defaults across both fresh and previously dirty struct slots, all internal accumulators and trajectory buffers are cleared, and a dedicated motion reset helper resets transient motion variables before each motion.  
**Unblocks:** G-MDRB-003 (Constructor and Parameter Geometry Validation).

## Atomicity & Zero-Mock Contract

- **One outcome:** Complete, centralized struct initialization and transient motion state reset.
- **No decomposition leakage:** Pool allocation belongs to `G-MDRB-001`; dimension checks belong to `G-MDRB-003`.
- **Concrete execution:** 100% concrete C implementation in `lib/pbio/src/mdrobotbase.c`. Zero mocks, zero stubs, zero dummy default structures.
- **Real boundary verification:** Verified via PBIO unit tests in `lib/pbio/test/src/test_mdrobotbase.c` checking byte-for-byte struct cleanliness.
- **Failure behavior:** Invoking motion reset on a NULL pointer returns `PBIO_ERROR_INVALID_ARG` deterministically.

## How

**Stack / approach:**
- In `lib/pbio/include/pbio/mdrobotbase.h`:
  - Declare `pbio_error_t pbio_mdrobotbase_init(pbio_mdrobotbase_t *rb, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track);`
  - Declare `pbio_error_t pbio_mdrobotbase_motion_reset(pbio_mdrobotbase_t *rb);`
- In `lib/pbio/src/mdrobotbase.c`:
  - Implement `pbio_mdrobotbase_init()`:
    1. Perform `memset(rb, 0, sizeof(pbio_mdrobotbase_t))` to guarantee clean slate.
    2. Set default PID/LQR gains, default limits, tolerances, and calibration baselines.
    3. Initialize `kp_pivot = 1.0f`, `ki_pivot = 0.0f`, `kd_pivot = 0.0f`.
  - Implement `pbio_mdrobotbase_motion_reset()`:
    1. Clear `turn_integral = 0.0f`, `stall_time_ms = 0.0f`.
    2. Reset `last_step_time_ms`, `last_step_theta = rb->theta`.
    3. Clear `motion_in_progress = false`, `motion_type = PBIO_MDROBOTBASE_MOTION_NONE`.
    4. Clear trajectory index and segment tracking flags.
  - Call `pbio_mdrobotbase_init()` whenever a slot is newly allocated in `pbio_mdrobotbase_get_robotbase()`.
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - Call `pbio_mdrobotbase_motion_reset()` at the start of `go_forward`, `turn_angle`, `pivot_turn`, and `follow_trajectory`.

## Open questions

*(None — architectural contract confirmed via Codex review Step 2)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 2 (State initialization)` |
| Root Cause | `lib/pbio/src/mdrobotbase.c:14-66` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Centralized Initialization Implementation
**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h`, `lib/pbio/src/mdrobotbase.c`  
**Actions:**
1. Declare and implement `pbio_mdrobotbase_init()`.
2. Apply `memset` zeroing followed by explicit defaults for all struct members (including pivot gains).
3. Update `pbio_mdrobotbase_get_robotbase()` to invoke `pbio_mdrobotbase_init()`.

**Completion gate:** All struct fields have deterministic initial values; no uninitialized memory remains.  
**Stop condition:** Any compiler warning or memory layout mismatch.

### Step 2 — Transient Motion Reset Helper
**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h`, `lib/pbio/src/mdrobotbase.c`, `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Implement `pbio_mdrobotbase_motion_reset()`.
2. Integrate helper at the entry of every motion command dispatch.

**Completion gate:** Consecutive motion commands execute without residual integral or stall accumulators.  
**Stop condition:** Any unhandled motion state transition.

### Step 3 — Initialization & Reuse Conformance Tests
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**
1. Test default field values on freshly allocated instance.
2. Fill struct memory with 0xFF pattern, call `pbio_mdrobotbase_init()`, and verify 100% field hygiene.
3. Test dirty motion accumulators are wiped clean by `pbio_mdrobotbase_motion_reset()`.

**Completion gate:** Test suite passes 100% green with exit code 0.  
**Stop condition:** Any dirty field detected after initialization.

## In

- Complete `memset` and field initialization in `pbio_mdrobotbase_init()`.
- Default pivot PID gains initialization.
- Reusable `pbio_mdrobotbase_motion_reset()` helper.
- Memory hygiene tests verifying zero dirty state leakage.

## Out

- Slot pool allocation (handled in `G-MDRB-001`).
- Odometry gear-ratio calculations (handled in `G-MDRB-004`).
- Changing motor PID tuning values.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | Add | `pbio_mdrobotbase_init` in `lib/pbio/include/pbio/mdrobotbase.h` |
| C API | Add | `pbio_mdrobotbase_motion_reset` in `lib/pbio/include/pbio/mdrobotbase.h` |
| Struct Init | Modify | `pbio_mdrobotbase_get_robotbase` uses centralized init in `lib/pbio/src/mdrobotbase.c` |
| Motion Entry | Modify | Motion commands call motion_reset in `pybricks/robotics/pb_type_mdrobotbase.c` |
| Testing | Add | Struct zeroing and dirty reuse tests in `lib/pbio/test/src/test_mdrobotbase.c` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Motor Control State Management |
| **Ports & Adapters Topology** | Inbound: Motion Command Dispatchers <br> Outbound: PBIO Hardware Servo Controllers |
| **State Machine & Invariants** | Lifecycle States: `UNINITIALIZED` -> `INITIALIZED` -> `MOTION_ACTIVE` -> `MOTION_RESET` |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] All public defaults on a fresh `pbio_mdrobotbase_t` instance match expected specifications.
- [x] A slot pre-filled with non-zero garbage (`0xAA`/`0xFF`) produces identical state to a fresh instance after `pbio_mdrobotbase_init()`.
- [x] Pivot gains `kp_pivot`, `ki_pivot`, `kd_pivot` initialize to `1.0f`, `0.0f`, `0.0f` respectively.
- [x] Invoking `pbio_mdrobotbase_motion_reset()` zeros `stall_time_ms`, `turn_integral`, and `dist_traveled`.
- [x] All tests execute against real PBIO servo structures without mocks or stubs.

## Test plan

- Execute `lib/pbio/test/src/test_mdrobotbase.c` comparing fresh vs dirty reconstructed instance defaults.
- Verify trajectory coordinate arrays and color prototype counts are zeroed.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Never rely on static memory being zeroed by the loader; always use explicit `memset`.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Uninitialized` | Allocation request | Slot allocated | Execute `memset(rb, 0, sizeof(*rb))` | Return `PBIO_ERROR_INVALID_ARG` if NULL |
| `State::Initialized` | Configuration setters | Parameter bounds valid | Assign gains, limits, calibration | Reject out-of-range gains |
| `State::MotionActive` | Motion dispatch | Motion in progress | Iterate control loop | Abort on stall or timeout |
| `State::MotionReset` | Motion completion / start new | Valid instance | Clear transient accumulators | Return `PBIO_ERROR_INVALID_ARG` if NULL |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Clean Memory Invariant** | Immediately following `pbio_mdrobotbase_init()`, $\forall \text{byte} \in \text{padding/unused buffers}, \text{byte} = 0$. |
| **Pivot Gain Default** | $K_{p,\text{pivot}} = 1.0f, K_{i,\text{pivot}} = 0.0f, K_{d,\text{pivot}} = 0.0f$. |
| **Transient Reset Invariant** | Following `motion_reset()`, $\text{stall\_time\_ms} = 0.0f \land \text{turn\_integral} = 0.0f$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Firmware Lifecycle Initialization Port (`pbio_mdrobotbase_init`).
- **Outbound Driven Port:** Servo Hardware Controller Reset Port (`pbio_servo_reset_angle`).
