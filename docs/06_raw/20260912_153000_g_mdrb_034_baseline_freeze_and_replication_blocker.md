# G-MDRB-034: Baseline Freeze, Socratic Dialectics & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260912-MDRB034-BASELINE`
**Date/Timestamp:** `2026-09-12T15:30:00+07:00`
**Goal ID:** `G-MDRB-034`
**Status:** `in_progress`
**Collaboration Phase:** `EXECUTE`
**Author:** AI Agent (Antigravity) & Human System Architect
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`
**Branch:** `feature/mdrobotbase-enhancement`
**Exact-HEAD Git SHA:** `439f51ede73108ee6a621984460675437ee92ce2`

---

## 1. Executive Summary & Baseline Freeze

This document freezes the pre-implementation baseline state for **Goal `G-MDRB-034`** (**Dynamic Kinematic Motion Timeout Scaling & Trajectory Deadline Hardening**) in accordance with Section III and IV of the Global Engineering Constitution.

During trajectory execution, autonomous robots encountered premature `ETIMEDOUT: time out` aborts on long waypoint paths and low-speed movements.
The baseline inspection revealed:
- **Baseline Scorecard:** Kinematic Deadline Hardening: **7.0 / 10.0** (spurious timeouts on valid physical trajectories)
- **Target Scorecard:** **10.0 / 10.0** (100% completion of physically valid trajectories with strict fail-closed enforcement on genuine mechanical stalls).

---

## 2. Identified Replication Blockers (Red Phase Baseline)

The following replication blockers are frozen prior to implementation:

- **`BLK-MDRB034-01` (Fixed Waypoint Time Heuristic in `follow_trajectory`):**
  In [`pybricks/robotics/pb_type_mdrobotbase.c:1948`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1948), the deadline is computed as:
  ```c
  uint32_t timeout_ms = (num_points * 2000) + 1000;
  ```
  A 2-point trajectory of distance $1200\text{ mm}$ executed at cruising speed $100\text{ mm/s}$ takes at least $12.0\text{ s}$ to traverse physically. However, the heuristic allocates $(2 \times 2000) + 1000 = 5000\text{ ms} = 5.0\text{ s}$, deterministically aborting at $5.0\text{ s}$ with `PBIO_ERROR_TIMEDOUT` $\to$ `OSError: [Errno 110] ETIMEDOUT`.

- **`BLK-MDRB034-02` (Absence of Acceleration Ramp and Heading Differential in Deadline Calculation):**
  The baseline code does not factor in:
  1. Acceleration and deceleration ramp times $t_{accel} = \frac{v}{a_{accel}}$ and $t_{decel} = \frac{v}{a_{decel}}$.
  2. Angular turning time required for waypoint orientation changes $\sum \frac{|\Delta \theta|}{\omega_{turn}}$.
  This causes tight maneuvers or sharp turns to exceed the deadline even when path length appears small.

- **`BLK-MDRB034-03` (VirtualHub Python Simulator Divergence):**
  In [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py), motion methods like `follow_trajectory`, `straight`, `turn_to_angle`, and `pivot_turn_to_angle` lack dynamic kinematic deadline calculations and explicit `timeout_ms` parameter overrides.

- **`BLK-MDRB034-04` (Absence of Mechanical Stall vs. Normal Maneuver Differentiation Test):**
  Test suites verify normal motions but lack negative tests asserting that when a robot is mechanically blocked and fails to reach target position within $T_{deadline}$, it strictly raises `OSError(ETIMEDOUT)` and transitions FSM to `State::TimedOut`.

---

## 3. Socratic 5-Why Dialectic Traceability

All 25 nodes across 5 causal branches are formulated in `scripts/harness/socratic-agentic-loop-g-mdrb-034-harness.mjs`:
- Branch 1: Trajectory Distance Integration & Cumulative Arc Length Invariants (Levels 1–5)
- Branch 2: Kinematic Duration Calculation (Cruise, Ramp, Turn terms) (Levels 1–5)
- Branch 3: Dynamic Deadline Scaling & Safety Buffer Enforcement (Levels 1–5)
- Branch 4: VirtualHub Parity & Explicit Timeout Override Contract (Levels 1–5)
- Branch 5: Physical Stall Detection & Fail-Closed Guarding (Levels 1–5)

---

## 4. Next Execution Steps (Red $\to$ Green Handoff)

1. Enforce exact-HEAD provenance and isolated mutation tests via `scripts/harness/isolated-mutation-test-g-mdrb-034.mjs`.
2. Update `pybricks/robotics/pb_type_mdrobotbase.c` with dynamic Euclidean arc-length kinematic deadline calculation.
3. Update `tests/virtualhub/robotics/pybricks/robotics.py` with identical kinematic deadline logic and `timeout_ms` override.
4. Add comprehensive test cases in `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`.
5. Verify 100% green pass rate across all harnesses.
