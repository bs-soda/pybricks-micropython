# MDRobotBase Motion Timeout Clarification & Kinematic Deadline Specification

**Document ID:** `docs/06_raw/20260912_145000_etimedout_kinematic_deadline_clarification.md`
**Timestamp:** `2026-09-12T14:50:00+07:00`
**Target Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`
**Active Branch:** `feature/mdrobotbase-enhancement`
**Clarification Session ID:** `302d2e56-9574-46cf-ad58-6c4733d0b9f4`
**Status:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`
**Allocated Goal ID:** `G-MDRB-034`

---

## 1. Context & Alignment Synthesis

The human operator reported:
> `Found bug ETIMEDOUT: time out`

Through Socratic dialogue and codebase tracing across native C (`pb_type_mdrobotbase.c`) and VirtualHub Python (`pybricks/robotics.py`), the architectural locus and root cause were confirmed:
- **Locus:** Pybricks MDRobotBase motion execution raising `OSError: [Errno 110] ETIMEDOUT` via `pb_error.c`.
- **Root Cause:** Inflexible static or heuristic timeout limits. Specifically:
  - In `follow_trajectory`, the default deadline was hardcoded to `(num_points * 2000) + 1000` ms, ignoring total path distance and speed. For waypoints separated by large distances, the robot inevitably exceeded this fixed deadline while moving normally.
  - In `navigate_to_goal`, acceleration and deceleration ramp durations were missing when parameters were unconfigured, creating an artificially compressed timeout window.
  - In VirtualHub, motion methods lacked timeout parameter forwarding and dynamic deadline enforcement.

---

## 2. Agreed Architectural Remedy: Dynamic Kinematic Deadline Scaling

For every commanded motion, the deadline $T_{deadline}$ shall be dynamically computed from the physical kinematic profile:

$$T_{kinematic} = \sum_{i=0}^{N-2} \frac{\Delta s_i}{v_i} + \frac{v_{max}}{a_{accel}} + \frac{v_{max}}{a_{decel}} + \frac{|\Delta \theta|}{\omega_{turn}}$$

$$T_{deadline} = \max\left(1500\text{ ms}, (uint32\_t)(T_{kinematic} \times 1.5f \times 1000.0f) + 2000\text{ ms}\right)$$

If the caller provides an explicit `timeout_ms` argument, that explicit value overrides the dynamic calculation.

When $T_{deadline}$ expires prior to reaching the arrival tolerance:
1. Actuator output is immediately disarmed / stopped.
2. Motion status transitions to `PBIO_MDROBOTBASE_STATUS_TIMED_OUT` (4).
3. `PBIO_ERROR_TIMEDOUT` is returned and propagated to Python as `OSError: [Errno 110] ETIMEDOUT`.

---

## 3. Atomic Goal Specification: `G-MDRB-034`

- **Goal ID:** `G-MDRB-034`
- **Title:** Dynamic Kinematic Motion Timeout Scaling & Trajectory Deadline Hardening
- **Epic:** `MDRB`
- **Kind:** `feature`
- **Priority:** `P1`
- **Touch Map:**
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`
  - `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
  - `lib/pbio/test/src/test_mdrobotbase.c`
- **Acceptance Criteria:**
  - Trajectory following across long distances ($\ge 1000\text{ mm}$) at low speed ($50\text{ mm/s}$) completes without triggering `ETIMEDOUT`.
  - Stalled or trapped robot fails closed and raises `OSError(ETIMEDOUT)` once the kinematic deadline elapses.
  - VirtualHub and Native PBIO C share identical timeout calculation and status transition semantics.
