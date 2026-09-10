# G-MDRB-025 Socratic Dialectic Analysis & Motion Dispatcher Modularization

**ISO Timestamp:** `2026-09-08T21:20:00+07:00`
**Author:** AI Agentic Pair (Sodality OS / Antigravity)
**Goal:** [`G-MDRB-025: Motion Dispatcher Modularization & Sub-Controller Decomposition`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-025.md)
**Acceptance Contract:** [`docs/02-product/acceptance/G-MDRB-025.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/02-product/acceptance/G-MDRB-025.md)
**Exact-HEAD Git Commit:** `f51bc095c910303af3a99db57ff2d6b8f9281ba7`
**Status:** In Progress (Red Phase Baseline)

---

## 1. Executive Summary & Problem Formulation

Codex's September 2026 architectural review of the WRO MatMetric / Pybricks robotics engine identified a critical maintainability finding (Finding P2):
> **P2 — Dispatcher complexity & monolithic coroutine step**
> `pb_type_mdrobotbase_motion_iterate_once()` in `pybricks/robotics/pb_type_mdrobotbase.c` spans over 570 lines (lines 164–737) with massive nested control blocks for navigation, pure pursuit, spin turn, locked pivot, and multi-point trajectory tracking.
> Each branch duplicates linear-to-angular velocity conversion (`mdrobotbase_linear_to_angular_dps`), motor speed clamping, dual `pbio_servo_run_forever` calls, and terminal stop resets.
> Extract common terminal handling, wheel-command conversion, and stall handling. Keep each motion controller small enough to test independently.

### Baseline Scorecard & Metrics
- **Current Score:** 7/10 (Maintainability / Dispatcher Modularity)
- **Target Score:** 10/10 (Clean decomposition into isolated sub-controllers < 60 lines dispatcher router)
- **Monolith Footprint:** `pb_type_mdrobotbase_motion_iterate_once` spans **574 lines**, cyclomatic complexity $> 32$.

---

## 2. Mathematical Formalization & Sub-Controller Architecture

### 2.1 Unified Sub-Controller Signature
To prevent arbitrary interface variations, all motion sub-controllers conform to the uniform signature:
```c
static pbio_error_t mdrobotbase_step_<mode>(
    pb_type_MDRobotBase_obj_t *self,
    float dt_sec,
    uint32_t elapsed_ms,
    float comp,
    float diam_left_mm,
    float diam_right_mm,
    float track_mm);
```
Where return values adhere to standard PBIO asynchronous coroutine contracts:
- `PBIO_ERROR_AGAIN`: Motion step in progress; coroutine must yield and be re-invoked on the next scheduler tick.
- `PBIO_SUCCESS`: Motion step completed successfully; target destination reached within geometric tolerance.
- `PBIO_ERROR_FAILED`: Motion step aborted due to motor stall.
- `PBIO_ERROR_TIMEDOUT`: Global or local timeout exceeded.

### 2.2 Common Wheel Actuation Invariant
Wheel speed calculation is unified into a single helper:
```c
static inline void mdrobotbase_drive_wheels(
    pb_type_MDRobotBase_obj_t *self,
    float left_vel_mms,
    float right_vel_mms,
    float diam_left_mm,
    float diam_right_mm) {
    int32_t left_dps = mdrobotbase_clamp_speed(mdrobotbase_linear_to_angular_dps(self->rb, left_vel_mms, diam_left_mm), 1000);
    int32_t right_dps = mdrobotbase_clamp_speed(mdrobotbase_linear_to_angular_dps(self->rb, right_vel_mms, diam_right_mm), 1000);
    pbio_servo_run_forever(self->rb->left, left_dps);
    pbio_servo_run_forever(self->rb->right, right_dps);
}
```
This guarantees zero discrepancy between sub-controllers in velocity quantization, saturation clamping, and servo invocation.

### 2.3 Common Terminal Stop Invariant
Terminal stop and encoder angle resetting are unified into:
```c
static inline void mdrobotbase_motion_stop(
    pb_type_MDRobotBase_obj_t *self,
    bool reset_angles) {
    pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
    pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
    if (reset_angles && self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        pbio_servo_reset_angle(self->rb->left, 0, false);
        pbio_servo_reset_angle(self->rb->right, 0, false);
        self->rb->last_left_deg = 0.0f;
        self->rb->last_right_deg = 0.0f;
    }
    self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    self->rb->motion_in_progress = false;
}
```

---

## 3. Socratic 5-Why Recursive Dialectic Analysis (5 Branches x Level 5)

### Branch 1: Dispatcher Modularity & Complexity Bound (`branch-1-dispatcher-modularity`)
1. **[L1] Why must the monolithic dispatcher `pb_type_mdrobotbase_motion_iterate_once` be decomposed?**
   *Premise:* The 574-line switch block mixes odometry updating, timeouts, trajectory math, and motor actuation in a single procedural blob, obscuring error paths and making sub-controller isolation impossible.
2. **[L2] Why must the main router function be strictly bounded below 60 lines?**
   *Premise:* Bounding the router to $\le 60$ lines restricts its responsibility strictly to sensory sampling, timeout checking, and delegating to the active motion primitive.
3. **[L3] Why must sub-controllers return standard `pbio_error_t` status codes?**
   *Premise:* Standardized status codes allow the caller `pb_type_async_wait_or_await` to handle coroutine progression without wrapper objects.
4. **[L4] Why must the dispatcher retain odometry update and global timeout checking centrally?**
   *Premise:* Centralizing `pbio_mdrobotbase_update_state` and `timeout_ms` checks guarantees telemetry freshness and safety timeouts regardless of which sub-controller executes.
5. **[L5] Why is static scoping in `pb_type_mdrobotbase.c` chosen over separate translation units?**
   *Premise:* Micro-embedded Cortex-M targets benefit from compiler LTO and aggressive inlining when functions reside in the same translation unit, avoiding code-size overhead.

### Branch 2: Navigation Sub-Controller Decomposition (`branch-2-navigate-subcontroller`)
1. **[L1] Why must pure pursuit navigation and final heading alignment be isolated into `mdrobotbase_step_navigate`?**
   *Premise:* Pure pursuit involves coordinate frames, ramping profiles, cross-track steer gains, and two-stage orientation alignments that must not intermingle with spin turns.
2. **[L2] Why must LQR and PID navigation modes share the same step function signature?**
   *Premise:* Both algorithms produce forward linear velocity $v_{\text{cmd}}$ and angular velocity $w_{\text{cmd}}$; sharing the signature permits seamless runtime controller switching.
3. **[L3] Why must final heading alignment transition through `align_final_heading` without reallocating awaitables?**
   *Premise:* Two-stage navigation (position arrival followed by in-place orientation) must proceed within the same coroutine lifecycle without resetting user awaitables.
4. **[L4] Why must `mdrobotbase_step_navigate` route wheel commands through `mdrobotbase_drive_wheels`?**
   *Premise:* Eliminates duplicated speed clamping and ensures linear-to-angular conversions are applied identically.
5. **[L5] Why must destination arrival invoke unified `mdrobotbase_motion_stop` and mark status completed?**
   *Premise:* Avoids ad-hoc stop behavior variations and guarantees atomic status synchronization with `motion_in_progress`.

### Branch 3: Turn & Pivot Sub-Controller Decomposition (`branch-3-turn-pivot-subcontrollers`)
1. **[L1] Why must differential spin turns be isolated into `mdrobotbase_step_turn`?**
   *Premise:* Spin turns drive left and right wheels in equal and opposite directions ($v_{\text{left}} = -w_{\text{rad}} \cdot \frac{L}{2}, v_{\text{right}} = w_{\text{rad}} \cdot \frac{L}{2}$) with dedicated angular PID and deceleration profiles.
2. **[L2] Why must single-wheel locked pivot turns be isolated into `mdrobotbase_step_pivot`?**
   *Premise:* Pivot turns lock one wheel in place and swing the opposite wheel at double radius ($v = w_{\text{rad}} \cdot L$), requiring fundamentally different kinematic actuation.
3. **[L3] Why must pivot turns command only the active wheel rather than both wheels?**
   *Premise:* Holding the pivot wheel fixed via servo position control prevents wheel slippage and track scrubbing.
4. **[L4] Why must angular stall detection use distinct speed thresholds ($40^\circ/\text{s}$ vs $60^\circ/\text{s}$)?**
   *Premise:* Pivot turns experience greater mechanical resistance due to single-point ground scrubbing, necessitating calibrated stall parameters.
5. **[L5] Why must angle completion verify angular velocity settling ($|w_{\text{raw}}| < 15^\circ/\text{s}$) when braking?**
   *Premise:* Prevents premature completion triggering while inertial oscillation settles before coming to a complete stop.

### Branch 4: Trajectory Tracking Sub-Controller Decomposition (`branch-4-trajectory-subcontroller`)
1. **[L1] Why must multi-waypoint path following be isolated into `mdrobotbase_step_trajectory`?**
   *Premise:* Trajectory tracking manages an array of coordinates, point indices, and segment start references that are completely distinct from single-point motions.
2. **[L2] Why must empty or completed trajectories return `PBIO_SUCCESS` immediately?**
   *Premise:* Protects against out-of-bounds array reads and gracefully exits zero-waypoint requests.
3. **[L3] Why must intermediate waypoint transitions happen at `trajectory_transition_tolerance` without stopping motors?**
   *Premise:* Continuous velocity through intermediate waypoints enables smooth cornering without jerky stops.
4. **[L4] Why must final waypoint arrival execute full terminal stop and angle reset?**
   *Premise:* The final point represents the end of the planned mission; the robot must brake firmly and settle.
5. **[L5] Why must trajectory motor commands route through `mdrobotbase_drive_wheels`?**
   *Premise:* Ensures trajectory velocity generation conforms to the global speed clamping and unit conversion invariants.

### Branch 5: Kinematic Invariant Preservation & Zero-Mock Verification (`branch-5-kinematic-invariants-zero-mock`)
1. **[L1] Why must modularization introduce zero kinematic deviation ($< 0.001^\circ/\text{s}$)?**
   *Premise:* Modularization is a structural refactoring; changing kinematic equations would invalidate robot odometry on competition mats.
2. **[L2] Why are mocks, stubs, and synthetic simulations strictly forbidden under Article I?**
   *Premise:* Real hardware and embedded firmware require verifiable, fully-implemented C code; synthetic mocks mask compilation and memory bugs.
3. **[L3] Why must touch map integrity be confirmed with non-empty files?**
   *Premise:* Guarantees that all modified components are properly tracked in version control and conform to the specification contract.
4. **[L4] Why must PBIO native test suite compile and run concrete C routines without skipped tests?**
   *Premise:* Directly executes the compiled low-level routines against real unit test assertions.
5. **[L5] Why must the release gate require human sign-off before shipping?**
   *Premise:* Upholds Soda OS governance gate: AI implements within goals, human reviews and approves.

---

## 4. Red Phase Baseline Verification

Running `scripts/harness/master-replication-g-mdrb-025.mjs` against unmodified code confirms the exact baseline replication blocker:
- `pb_type_mdrobotbase_motion_iterate_once()` is currently **574 lines**, which fails Gate 4 (AC-MDRB-025-1 requires $\le 60$ lines).
- `mdrobotbase_step_navigate`, `mdrobotbase_step_turn`, `mdrobotbase_step_pivot`, `mdrobotbase_step_trajectory`, `mdrobotbase_drive_wheels`, and `mdrobotbase_motion_stop` are missing.

This establishes the clean Red-Phase baseline before code implementation.
