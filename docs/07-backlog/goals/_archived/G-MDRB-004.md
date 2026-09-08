# G-MDRB-004: Consistent Gear-Ratio Command and Odometry Semantics

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Symmetrically scale wheel encoder odometry and motor commands by the gear ratio and eliminate kinematic scaling drift  
**Epic:** MDRB  
**Depends on:** G-MDRB-003  
**Blocks:** G-MDRB-005  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Unify gear ratio kinematic definitions and add shared conversion helpers | done |
| 2 | Apply gear ratio scaling to tick integration in pbio_mdrobotbase_update_state() | done |
| 3 | Construct multi-ratio kinematic verification tests (ratios 1.0, 0.5, 2.0) | done |

## Context

Codex architectural review scorecard assigned Gear-Ratio Odometry a baseline score of **5/10 (High Risk)**.
In [`pybricks/robotics/pb_type_mdrobotbase.c:511-512`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L511-L512), motion commands multiply wheel velocity by `self->rb->gear_ratio`:
```c
int32_t left_dps = (int32_t)(((left_vel / (3.14159265f * diam_left_mm)) * 360.0f) * self->rb->gear_ratio);
```
However, in [`lib/pbio/src/mdrobotbase.c:229-230`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L229-L230), odometry state calculation completely omits `rb->gear_ratio`:
```c
float d_left = (d_left_ticks / 360.0f) * 3.14159265f * diam_left_mm;
float d_right = (d_right_ticks / 360.0f) * 3.14159265f * diam_right_mm;
```
This introduces a severe mathematical asymmetry:
- Commands assume $R = \frac{\theta_{\text{motor}}}{\theta_{\text{wheel}}}$. For a $2:1$ gear reduction ($R = 2.0$), the motor rotates $2^\circ$ per $1^\circ$ of wheel rotation.
- In `update_state()`, raw motor ticks are treated directly as wheel degrees without dividing by $R$.
- Consequently, at $R = 2.0$, rotating the motor $720^\circ$ produces an actual wheel distance of $1 \times \pi \times D \approx 175.93\text{mm}$, but odometry computes $2 \times \pi \times D \approx 351.86\text{mm}$ (a 100% odometry error).
- At $R = 0.5$, odometry reads 50% of the actual travel distance.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Actuator commands and sensor feedback must share identical kinematic conversion equations; an unscaled gear ratio in odometry causes massive pose drift and guarantees navigation failure on geared drivetrains.  
**Done when:** Motor encoder ticks are scaled by the gear ratio in state updates, straight-line distance and in-place turns yield mathematically exact expected values for arbitrary positive gear ratios, and command-odometry math cannot diverge.  
**Unblocks:** G-MDRB-005 (Distinct Timeout and Stall Failure Reporting).

## Atomicity & Zero-Mock Contract

- **One outcome:** Exact kinematic gear-ratio consistency between motor command velocity and encoder odometry integration.
- **No decomposition leakage:** Dimension validation belongs to `G-MDRB-003`; timeout/stall logic belongs to `G-MDRB-005`.
- **Concrete execution:** 100% concrete C floating-point calculations with real servo angle feedback. Zero mocks, zero stubs.
- **Real boundary verification:** Verified via numerical assertions in `lib/pbio/test/src/test_mdrobotbase.c` across ratios 1.0, 0.5, and 2.0.
- **Failure behavior:** Setting a non-positive or non-finite gear ratio ($R \le 0$ or NaN) returns `PBIO_ERROR_INVALID_ARG`.

## How

**Stack / approach:**
- In `lib/pbio/include/pbio/mdrobotbase.h`:
  - Document convention: `gear_ratio` $R = \frac{\omega_{\text{motor}}}{\omega_{\text{wheel}}}$.
  - Declare conversion helpers:
    - `float pbio_mdrobotbase_motor_to_wheel_deg(const pbio_mdrobotbase_t *rb, float motor_deg);`
    - `int32_t pbio_mdrobotbase_wheel_to_motor_dps(const pbio_mdrobotbase_t *rb, float wheel_dps);`
- In `lib/pbio/src/mdrobotbase.c`:
  - In `pbio_mdrobotbase_update_state()`:
    - Convert motor ticks to wheel ticks:
      $$d_{\text{wheel\_ticks}} = \frac{d_{\text{motor\_ticks}}}{\text{rb->gear\_ratio}}$$
    - Compute linear distance:
      $$d_{\text{left}} = \left(\frac{d_{\text{left\_ticks}}}{\text{rb->gear\_ratio} \cdot 360.0f}\right) \cdot \pi \cdot \text{diam\_left\_mm}$$
  - In `pbio_mdrobotbase_set_gear_ratio()`:
    - Reject $R \le 0.0001f$ or non-finite values with `PBIO_ERROR_INVALID_ARG`.
- In `pybricks/robotics/pb_type_mdrobotbase.c`:
  - Replace ad-hoc inline multiplies with centralized kinematic helpers across straight, turn, pivot, and trajectory handlers.

## Open questions

*(None — kinematic relationship confirmed via Codex review Step 4)*

## Knowledge links

| Type | IDs |
|------|-----|
| Epic Card | `docs/07-backlog/epics/MDRB.md` |
| Review Scorecard | `Codex MDRobotBase remediation scorecard: Step 4 (Gear-ratio odometry)` |
| Root Cause | `lib/pbio/src/mdrobotbase.c:229-230` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| Source Header | `lib/pbio/include/pbio/mdrobotbase.h` |
| Source Implementation | `lib/pbio/src/mdrobotbase.c` |
| MicroPython Binding | `pybricks/robotics/pb_type_mdrobotbase.c` |
| PBIO Test Suite | `lib/pbio/test/src/test_mdrobotbase.c` |

## Work steps

### Step 1 — Kinematic Conversion Helper Definition
**Allowed files:** `lib/pbio/include/pbio/mdrobotbase.h`, `lib/pbio/src/mdrobotbase.c`  
**Actions:**
1. Document gear ratio semantics ($R = \text{motor} / \text{wheel}$).
2. Implement bidirectional conversion helpers in PBIO.
3. Enforce $R > 0$ validation in `pbio_mdrobotbase_set_gear_ratio()`.

**Completion gate:** Helpers compile cleanly and pass unit tests with mathematical precision.  
**Stop condition:** Any negative or zero ratio accepted.

### Step 2 — Odometry Integration Scaling
**Allowed files:** `lib/pbio/src/mdrobotbase.c`, `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Update `pbio_mdrobotbase_update_state()` to divide motor tick delta by `rb->gear_ratio`.
2. Apply identical scaling to backlash threshold conversion.
3. Replace ad-hoc dps equations in MicroPython with the shared conversion helper.

**Completion gate:** Odometry distance equals commanded wheel distance for any ratio.  
**Stop condition:** Divergence between command speed and odometry integration.

### Step 3 — Multi-Ratio Kinematic Test Suite
**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`  
**Actions:**
1. Test ratio $1.0$: rotate motor $360^\circ$ ($D=56\text{mm}$), verify $d \approx 175.93\text{mm}$.
2. Test ratio $2.0$: rotate motor $720^\circ$, verify $d \approx 175.93\text{mm}$.
3. Test ratio $0.5$: rotate motor $180^\circ$, verify $d \approx 175.93\text{mm}$.
4. Test in-place turn odometry for all three ratios.

**Completion gate:** All kinematic tests pass within $0.1\text{mm}$ tolerance.  
**Stop condition:** Error exceeds $0.1\%$ under any tested ratio.

## In

- Dividing motor encoder tick deltas by `gear_ratio` in `pbio_mdrobotbase_update_state()`.
- Shared conversion helper between commands and odometry.
- Validation rejecting $R \le 0$, NaN, and Inf.
- Kinematic test cases for ratios $1.0$, $0.5$, and $2.0$.

## Out

- Timeout and stall handling (handled in `G-MDRB-005`).
- Async awaitable lifecycle (handled in `G-MDRB-006`).
- Changing motor control PID loop gains.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C API | Add | `pbio_mdrobotbase_motor_to_wheel_deg` in `lib/pbio/include/pbio/mdrobotbase.h` |
| Odometry | Modify | `pbio_mdrobotbase_update_state` divides by `gear_ratio` in `lib/pbio/src/mdrobotbase.c` |
| Setter Guard | Add | Positive ratio check in `pbio_mdrobotbase_set_gear_ratio` in `lib/pbio/src/mdrobotbase.c` |
| Testing | Add | Ratios 1.0, 0.5, 2.0 kinematic tests in `lib/pbio/test/src/test_mdrobotbase.c` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `epic/MDRB` (PR Target) |
| **System Archetype** | `embedded-firmware` \| `robot-kinematics-engine` \| `pbio-device-driver` |
| **Bounded Context & Domain** | Robotics Kinematics \| Differential Drive Odometry |
| **Ports & Adapters Topology** | Inbound: Motor Encoder Angular Feedback <br> Outbound: Pose Odometry Vector ($X, Y, \Theta$) |
| **State Machine & Invariants** | Kinematic Invariant: $\Delta s = \frac{\Delta \theta_{\text{motor}}}{R \cdot 360^\circ} \cdot \pi D$ |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero Test Doubles |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20260907_173500_mdrobotbase_remediation_scorecard_and_backlog.md` |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Atomicity & Zero-Mock Contract confirmed
- [x] Work steps define allowed files, gates, and stop conditions
- [x] Reproduction steps and proof scenarios verified against codebase

## Acceptance criteria

- [x] Rotating motors by $720^\circ$ at $R = 2.0$ with $D = 56\text{mm}$ produces measured distance $175.93 \pm 0.1\text{mm}$.
- [x] Rotating motors by $180^\circ$ at $R = 0.5$ with $D = 56\text{mm}$ produces measured distance $175.93 \pm 0.1\text{mm}$.
- [x] In-place turning angle $\Delta\theta$ scales correctly by gear ratio.
- [x] Setting `gear_ratio <= 0` or non-finite values returns `PBIO_ERROR_INVALID_ARG`.
- [x] Command velocity and odometry distance equations use identical conversion helpers.

## Test plan

- Execute `lib/pbio/test/src/test_mdrobotbase.c` with parameterized gear ratio odometry trials.
- Verify numerical convergence across $R \in \{0.5, 1.0, 2.0, 3.0\}$.

## Touch map

- `lib/pbio/include/pbio/mdrobotbase.h`
- `lib/pbio/src/mdrobotbase.c`
- `pybricks/robotics/pb_type_mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Adhere to Article I: Zero mocks, zero stubs, zero dummy fallbacks.
- Ensure gear ratio scaling is applied before backlash hysteresis evaluation.
- Base integration branch is strictly `epic/MDRB`.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Kinematics::Configured` | `set_gear_ratio(R)` | $R > 0.0001f \land \text{isfinite}(R)$ | Update `rb->gear_ratio` | Return `PBIO_ERROR_INVALID_ARG` |
| `Kinematics::Integrating` | `update_state(gyro)` | Valid encoder ticks | Integrate scaled wheel distance | Compensate backlash hysteresis |
| `Kinematics::Commanding` | Motion step calculation | Target linear speed $v$ | Compute motor dps via $R$ | Clamp to max actuator speed |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Gear Ratio Definition** | $R_{\text{gear}} = \frac{\Delta\theta_{\text{motor}}}{\Delta\theta_{\text{wheel}}}$. |
| **Odometry Wheel Distance** | $d_{\text{wheel}} = \left(\frac{\Delta\theta_{\text{motor}}}{R_{\text{gear}} \cdot 360^\circ}\right) \cdot \pi D_{\text{wheel}}$. |
| **Motor Angular Velocity** | $\omega_{\text{motor\_dps}} = \left(\frac{v_{\text{wheel}}}{\pi D_{\text{wheel}}} \cdot 360^\circ\right) \cdot R_{\text{gear}}$. |
| **Monetary & General Math** | Exact Satang integer arithmetic; zero float math in financial subsystems. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** Encoder Sensor Ingestion Port (`pbio_servo_get_state_control`).
- **Outbound Driven Port:** Robot Base State Emitter Port (`pbio_mdrobotbase_get_state`).
