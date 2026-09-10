# Acceptance Contract: G-MDRB-025

**Goal ID:** `G-MDRB-025`
**Title:** Motion Dispatcher Modularization & Sub-Controller Decomposition
**Epic:** MDRB
**Kind:** feature

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Main Dispatcher Function Remains Under Complexity Bounds (AC-MDRB-025-1)
- **Given** the source file `pybricks/robotics/pb_type_mdrobotbase.c`.
- **When** static line counting and branch analysis are performed on `pb_type_mdrobotbase_motion_iterate_once()`.
- **Then** the function body length does not exceed 60 lines.
- **And** the cyclomatic complexity is $\le 6$.

### Scenario 2: Modular Navigation Step Controller Preservation (AC-MDRB-025-2)
- **Given** an MDRobotBase instance running `navigate_to_goal(x=200, y=200)`.
- **When** the motion coroutine iterates across successive simulation ticks.
- **Then** `mdrobotbase_step_navigate()` executes the pure pursuit algorithm.
- **And** the robot arrives at destination $(200, 200)$ with position error $\le 2.0\text{ mm}$.

### Scenario 3: Modular Turn Step Controller Preservation (AC-MDRB-025-3)
- **Given** an MDRobotBase instance running `turn_to_angle(90)`.
- **When** the motion coroutine iterates across successive simulation ticks.
- **Then** `mdrobotbase_step_turn()` executes the closed-loop angle PID calculation.
- **And** the robot settles at heading $90^\circ \pm 1.0^\circ$ with center position displacement $\le 0.5\text{ mm}$.

### Scenario 4: Modular Pivot Turn Step Controller Preservation (AC-MDRB-025-4)
- **Given** an MDRobotBase instance running `pivot_turn_to_angle(45)`.
- **When** the motion coroutine iterates across successive simulation ticks.
- **Then** `mdrobotbase_step_pivot()` commands the designated active wheel while holding the pivot wheel fixed.
- **And** the locked pivot wheel exhibits zero rotation ($< 0.05^\circ$).

### Scenario 5: Modular Trajectory Step Controller Preservation (AC-MDRB-025-5)
- **Given** an MDRobotBase instance executing a 4-waypoint trajectory via `follow_trajectory()`.
- **When** the motion coroutine iterates across successive simulation ticks.
- **Then** `mdrobotbase_step_trajectory()` sequences waypoints sequentially until final point arrival.
- **And** all 4 waypoints are visited in exact order without trajectory deviation.
