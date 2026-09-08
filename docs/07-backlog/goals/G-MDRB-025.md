# G-MDRB-025: Motion Dispatcher Modularization & Sub-Controller Decomposition

**Status:** draft  
**Kind:** feature  
**Atomic outcome:** Decompose the monolithic motion iteration function in pb_type_mdrobotbase.c into modular sub-controllers with shared wheel velocity conversion and terminal stop handling  
**Epic:** MDRB  
**Depends on:** G-MDRB-024  
**Blocks:** G-MDRB-026  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Sub-Controller Architecture & Interface Formulation | pending |
| 2 | Extract Modular Step Controllers & Shared Wheel Actuation | pending |
| 3 | Motion Equivalence & Behavioral Regression Verification | pending |

## Context

In `pybricks/robotics/pb_type_mdrobotbase.c`, `pb_type_mdrobotbase_motion_iterate_once()` spans over 550 lines of complex branching logic handling navigation, straight driving, turning, pivoting, and trajectory tracking.
Codex's September 2026 review noted: "pb_type_mdrobotbase_motion_iterate_once() still contains large branches... Extract common terminal handling, wheel-command conversion, and stall handling. Keep each motion controller small enough to test independently."
Decomposing this monolithic dispatcher into clean sub-controllers improves testability, readability, and maintainability without altering kinematic behaviors.

### Scorecard & Baseline Evidence
- **Current score:** 7/10 (Maintainability / Dispatcher Modularity) · **Expected score:** 10/10
- **Exact evidence:** [`pybricks/robotics/pb_type_mdrobotbase.c:194-685`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L194-L685)
- **Root cause:** All motion primitives are implemented in a single massive `switch` block with duplicated velocity conversion, stall evaluation, and servo command code.
- **Reproduction steps:**
  1. Inspect `pb_type_mdrobotbase_motion_iterate_once()` lines 194 to 685.
  2. Observe that navigation, turn, pivot, and trajectory routines duplicate wheel speed conversions (`mdrobotbase_linear_to_angular_dps`) and servo run calls.
  3. Attempting to unit test or benchmark a single motion sub-controller requires driving the full monolithic generator loop.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Monolithic dispatch functions obscure error paths, encourage copy-paste logic duplication, and make independent sub-controller unit testing impractical.  
**Done when:** Each motion primitive is encapsulated in an independent sub-controller function, common wheel speed conversions and terminal stops are unified, and all differential motion regression tests execute with zero behavioural deviation.  
**Unblocks:** G-MDRB-026

## Atomicity & Zero-Mock Contract

- **One outcome:** Modularize the motion iteration dispatcher into isolated sub-controllers while preserving exact kinematic behavior.
- **No decomposition leakage:** Repository hygiene and submodule auditing belong to G-MDRB-026.
- **Concrete execution:** 100% concrete C compilation and VirtualHub trajectory simulations. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Tests verify physical motion execution across all 4 movement types using simulated servo encoders.
- **Failure behavior:** If refactoring alters motion trajectories, speeds, or tolerances, the test suite halts immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** —

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [ ] [NEEDS CLARIFICATION: Should sub-controllers be static functions in pb_type_mdrobotbase.c or partitioned into separate C translation units?]

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-DISPATCHER-BLOAT |
| **Decisions** | PDR-MDRB-MODULAR-SUB-CONTROLLERS |
| **Assumptions required** | A-PARAMETRIC-KINEMATIC-LINEARITY |
| **Evidence** | Codex Architectural Review finding P2 (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Strategy Pattern, Modular Dispatcher, Single Responsibility Principle |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-025.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `pybricks/robotics/pb_type_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_turn.py` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py` |
| **Constraints** | Zero changes to mathematical motion equations or trajectory planning profiles |

## Work steps

### Step 1 — Sub-Controller Architecture & Interface Formulation

**Allowed files:** `docs/07-backlog/goals/G-MDRB-025.md` · `docs/02-product/acceptance/G-MDRB-025.md`  
**Actions:**
1. Define unified sub-controller signatures: `(robot_obj, dt_sec, elapsed_ms, battery_comp) -> pbio_error_t`.
2. Define common actuation helper: `mdrobotbase_drive_wheels(self, left_vel_mms, right_vel_mms)`.
3. Formulate Given-When-Then BDD scenarios in `docs/02-product/acceptance/G-MDRB-025.md`.
**Completion gate:** Acceptance contract exists defining sub-controller modularity requirements.  
**Stop condition:** Ambiguity in sub-controller return codes or parameter passing.

### Step 2 — Extract Modular Step Controllers & Shared Wheel Actuation

**Allowed files:** `pybricks/robotics/pb_type_mdrobotbase.c`  
**Actions:**
1. Extract `mdrobotbase_step_navigate()` for pure pursuit and final heading alignment.
2. Extract `mdrobotbase_step_turn()` for in-place differential spin rotations.
3. Extract `mdrobotbase_step_pivot()` for single-wheel locked pivot turns.
4. Extract `mdrobotbase_step_trajectory()` for multi-waypoint path following.
5. Simplify `pb_type_mdrobotbase_motion_iterate_once()` to a concise 40-line routing dispatcher.
**Completion gate:** Clean C compilation with zero compiler warnings under `-Wall -Wextra`.  
**Stop condition:** Compiler warning or regression in motor velocity calculations.

### Step 3 — Motion Equivalence & Behavioral Regression Verification

**Allowed files:** `tests/virtualhub/robotics/test_mdrobotbase_turn.py` · `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`  
**Actions:**
1. Run complete VirtualHub test battery across turn, pivot, navigate, and trajectory suites.
2. Verify that motion paths, completion times, and final poses match pre-refactoring baselines identically.
3. Verify that code complexity of the main dispatcher function is under 50 lines.
**Completion gate:** All VirtualHub test suites pass 100% green.  
**Stop condition:** Any test failure or trajectory deviation exceeding 0.1 mm.

## In

- Decomposing `pb_type_mdrobotbase_motion_iterate_once()` into modular sub-controllers.
- Unifying wheel speed conversion and servo actuation into shared helpers.
- Preserving 100% identical kinematics and control dynamics.

## Out

- Changing PID gains, feedforward terms, or lookahead distances.
- Modifying MicroPython public API signatures.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| MicroPython | Update | `pybricks/robotics/pb_type_mdrobotbase.c` — Decompose motion dispatcher into modular sub-controllers |
| Tests | Update | `tests/virtualhub/robotics/test_mdrobotbase_turn.py` — Add sub-controller regression assertions |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `robot-kinematics-engine` / `micropython-binding` |
| **Bounded Context & Domain** | Kinematics Sub-Controllers & Velocity Dispatch |
| **Ports & Adapters Topology** | Driving Inbound: Iterative Motion Coroutine <br> Driven Outbound: Wheel Actuator Ports |
| **State Machine & Invariants** | Each sub-controller returns `PBIO_ERROR_AGAIN` during progression, `PBIO_SUCCESS` on arrival. |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero mocks or dummy stubs. |
| **Socratic 5-Why Blueprint** | Dialectic Report: `docs/06_raw/20260908_210000_codex_review_audit_and_mdrb_024_027_remediation_roadmap.md` |

## Spec checklist

- [ ] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [ ] How is empty while `draft`; filled in PLAN after clarify
- [ ] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [ ] No `[NEEDS CLARIFICATION]` left in Open questions
- [ ] In / Out unambiguous; Out matches Scope Out
- [ ] Acceptance criteria each testable or reviewable
- [ ] Touch map is real repo paths
- [ ] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [ ] Change delta filled if modifying existing behaviour
- [ ] Critical-path assumptions are not `open` + `low`
- [ ] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [ ] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [ ] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [ ] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [ ] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [ ] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [ ] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)

## Acceptance criteria

- [ ] `pb_type_mdrobotbase_motion_iterate_once()` is refactored into a concise router under 60 lines.
- [ ] Navigation logic is encapsulated in `mdrobotbase_step_navigate()`.
- [ ] Turn logic is encapsulated in `mdrobotbase_step_turn()`.
- [ ] Pivot logic is encapsulated in `mdrobotbase_step_pivot()`.
- [ ] Trajectory logic is encapsulated in `mdrobotbase_step_trajectory()`.
- [ ] All differential motion test suites in VirtualHub pass with zero behavioural divergence.

## Test plan

- Command: `python3 -m unittest discover tests/virtualhub/robotics/`
- Expected: All turn, trajectory, and navigation tests pass 100% green.

## Touch map

- `pybricks/robotics/pb_type_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_turn.py`
- `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`

## Notes for AI

- Zero mocks, zero stubs.
- Do not modify PID mathematical formulas or control curve constants.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `MOTION_NAVIGATE` | Iterate step | Distance to goal > tolerance | Route to `step_navigate()` | Stop wheels on stall / arrival |
| `MOTION_TURN` | Iterate step | $|e_\theta| > \text{tolerance}$ | Route to `step_turn()` | Stop wheels on stall / arrival |
| `MOTION_PIVOT` | Iterate step | Pivot angle remaining | Route to `step_pivot()` | Stop active wheel on arrival |
| `MOTION_TRAJECTORY` | Iterate step | Waypoints remaining | Route to `step_trajectory()` | Stop wheels on final point arrival |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Sub-Controller Linearity** | Command velocities produced by sub-controllers match legacy output within $\pm 0.001\text{ deg/sec}$. |
| **Dispatcher Footprint** | Router function cyclomatic complexity $\le 6$. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython Coroutine Generator Hook.
- **Outbound Driven Port:** Actuator Velocity Transduction Layer.
