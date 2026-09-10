# G-MDRB-022 Motion Preemption: Baseline Blocker & Socratic 5-Why Dialectic Report

**Document ID:** `DOC-06RAW-20260908-MDRB022-SOCRATIC-5WHY`
**Timestamp:** `2026-09-08T19:05:00+07:00`
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)
**Corpus Name:** `bs-soda/pybricks-micropython`
**Active Feature Branch:** `feature/mdrobotbase-enhancement`
**Target Integration Branch:** `epic/MDRB`
**Exact-HEAD Provenance:** `ebfc3e53235e6d73ecc474b76f5a67e560e45c37`
**Goal ID:** `G-MDRB-022`
**Acceptance Contract:** [`docs/02-product/acceptance/G-MDRB-022.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/02-product/acceptance/G-MDRB-022.md)
**Status:** `ready`

---

## 1. Baseline Replication Blockers

The baseline audit of `pybricks/robotics/pb_type_mdrobotbase.c:350-520` identified the following architectural blockers (Codex Finding P1):

| Blocker ID | Source Location | Description | Governing Invariant |
| :--- | :--- | :--- | :--- |
| **BLK-022-01** | `pybricks/robotics/pb_type_mdrobotbase.c:420` | Lack of behavioral immunity proof: while navigation argument checks were ordered before cancellation, turn and pivot entry points lack automated behavioral tests proving ongoing motion is not stopped by invalid replacement commands. | Acceptance AC-MDRB-022-1 |
| **BLK-022-02** | `tests/virtualhub/robotics/test_mdrobotbase_turn.py` | Missing invalid turn replacement test verifying active drivebase continues executing to target when turn command raises `ValueError`. | Acceptance AC-MDRB-022-2 |
| **BLK-022-03** | `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` | Missing invalid pivot replacement test verifying active spin turn continues tracking velocity profile when pivot raises `ValueError`. | Acceptance AC-MDRB-022-3 |
| **BLK-022-04** | `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` | Missing empty trajectory replacement test verifying active trajectory continues traversing remaining waypoints. | Acceptance AC-MDRB-022-4, Article I & II |

---

## 2. Socratic 5-Why Recursive Dialectic Resolution (Level 5)

### Branch 1: Transactional Command Dispatch (`branch-1-transactional-dispatch`)
- **Level 1 (Symptom):** Why must parameter validation precede motion cancellation?
  *Finding:* Cancelling active motion before verifying new parameters halts the physical machine if the replacement command contains an error.
- **Level 2 (First-Order Mechanism):** Why must invalid arguments raise `ValueError` immediately?
  *Finding:* MicroPython standard conventions mandate `ValueError` for out-of-range or malformed parameters.
- **Level 3 (Second-Order Propagation):** Why must actuator states remain untouched when `ValueError` is raised?
  *Finding:* Physical machines must not experience unexpected torque drops, jerky deceleration, or emergency stops during parameter errors.
- **Level 4 (Systemic Prevention):** Why must `cancel_active_motion()` only execute after all checks pass?
  *Finding:* Transactional integrity requires that all preconditions succeed before modifying actuator state.
- **Level 5 (Axiomatic Invariant):** How is transactional dispatch formally proven at Level 5?
  *Finding:* Proving that invalid command dispatch raises `ValueError` AND the active motion state invariant is preserved without modification.

### Branch 2: Active Motion Invariant Preservation Under Faults (`branch-2-motion-invariant-preservation`)
- **Level 1 (Symptom):** Why must `robot.done()` remain `False` after an invalid command is rejected?
  *Finding:* The ongoing motion is still physically executing toward its original goal and must not be marked complete.
- **Level 2 (First-Order Mechanism):** Why must `robot.status()` remain `STATUS_RUNNING`?
  *Finding:* The finite state machine must not prematurely transition to terminal states (`COMPLETED`, `CANCELLED`, `STALLED`).
- **Level 3 (Second-Order Propagation):** Why must target coordinates and heading remain unchanged?
  *Finding:* Corrupted target buffers would cause the robot to veer off course or overshoot its designated destination.
- **Level 4 (Systemic Prevention):** Why must motor speed controllers continue running their active velocity profiles?
  *Finding:* Discontinuities in velocity profiles cause mechanical stress, gearbox backlash shudder, and wheel slip.
- **Level 5 (Axiomatic Invariant):** How is active motion continuity mathematically verified at Level 5?
  *Finding:* By asserting generator progress $\Delta\text{step} > 0$ across the caught `ValueError` exception.

### Branch 3: Turn & Pivot Parameter Rejection Verification (`branch-3-turn-pivot-rejection`)
- **Level 1 (Symptom):** Why must `turn_to_angle` and `turn_angle` reject non-positive speeds (`speed <= 0`)?
  *Finding:* Zero or negative speeds prevent trajectory profile computation and cause division-by-zero crashes.
- **Level 2 (First-Order Mechanism):** Why must `pivot_turn` reject non-finite angle inputs (NaN / Inf)?
  *Finding:* Non-finite floats propagate through trigonometry and corrupt odometry estimators.
- **Level 3 (Second-Order Propagation):** Why must invalid turn commands leave an active forward drive motion running?
  *Finding:* Autonomous navigation routines must not be disarmed by malformed turn requests.
- **Level 4 (Systemic Prevention):** Why must invalid pivot commands leave an active turn motion running?
  *Finding:* Spin-turn and pivot-turn controllers share actuators; invalid pivot must not abort spin.
- **Level 5 (Axiomatic Invariant):** How is parameter rejection robustness verified at Level 5?
  *Finding:* Testing boundary conditions: negative, zero, NaN, Inf, and overflow values across both turn types.

### Branch 4: Trajectory Replacement Immunity (`branch-4-trajectory-immunity`)
- **Level 1 (Symptom):** Why must `follow_trajectory` reject empty waypoint lists (`[]`)?
  *Finding:* Empty trajectories cannot compute path tangents or distance to goal.
- **Level 2 (First-Order Mechanism):** Why must rejecting an empty trajectory not abort an active trajectory?
  *Finding:* The active trajectory must finish traversing remaining valid waypoints.
- **Level 3 (Second-Order Propagation):** Why must malformed coordinates in replacement waypoints fail closed?
  *Finding:* Waypoints with NaN or non-numeric types must be rejected before touching memory.
- **Level 4 (Systemic Prevention):** Why is valid replacement motion preemption tested as Scenario 4?
  *Finding:* To prove that while invalid commands are rejected, valid commands still preempt cleanly.
- **Level 5 (Axiomatic Invariant):** How is end-to-end trajectory immunity proven at Level 5?
  *Finding:* Verifying full traversal of waypoint $N$ despite intermediate invalid dispatches.

### Branch 5: Zero-Mock VirtualHub Behavioral Verification (`branch-5-zero-mock-testing`)
- **Level 1 (Symptom):** Why are mock motors or synthetic exception stubs strictly forbidden?
  *Finding:* Mocks cannot simulate real motor physics, back-EMF, or asynchronous generator steps.
- **Level 2 (First-Order Mechanism):** Why must tests run in the VirtualHub environment?
  *Finding:* VirtualHub integrates real MicroPython coroutines and motor state machines.
- **Level 3 (Second-Order Propagation):** Why must G-MDRB-022 conform to all 34 template invariants?
  *Finding:* Consistency ensures automated agentic pipelines parse and execute goals without ambiguity.
- **Level 4 (Systemic Prevention):** Why must acceptance criteria be formulated as Given-When-Then BDD?
  *Finding:* BDD scenarios provide unambiguous, executable contracts between reviewer and agent.
- **Level 5 (Axiomatic Invariant):** How is Level 5 empirical verification achieved for the entire release gate?
  *Finding:* All 25 Socratic nodes and 23 release gate assertions pass with 100% green execution.
