# Acceptance Contract: G-MDRB-034

**Goal ID:** `G-MDRB-034`
**Title:** Dynamic Kinematic Motion Timeout Scaling & Trajectory Deadline Hardening
**Epic:** MDRB
**Kind:** feature

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Long-Distance Trajectory Dynamic Deadline Invariance (AC-MDRB-034-1)
- **Given** an initialized `MDRobotBase` robot with wheel diameter $56.0\text{ mm}$ and axle track $112.0\text{ mm}$.
- **When** executing `follow_trajectory` with 2 waypoints $[(0, 0), (1500, 0)]$ at cruising speed $50.0\text{ mm/s}$.
- **Then** the computed deadline dynamically evaluates to $\ge 47000\text{ ms}$ ($1500/50 \times 1.5 + 2\text{ s}$).
- **And** the motion completes successfully without raising `OSError: [Errno 110] ETIMEDOUT`.
- **And** `robot.done()` evaluates to `True`.

### Scenario 2: Explicit Timeout Parameter Override (AC-MDRB-034-2)
- **Given** an initialized `MDRobotBase` robot.
- **When** calling `straight(1000.0, speed_mm_s=100.0, timeout_ms=50)`.
- **Then** the motion aborts after $50\text{ ms}$ before reaching the commanded distance.
- **And** raises `OSError` with errno `ETIMEDOUT` (110).
- **And** `robot.status` transitions to `4` (`TIMED_OUT`).

### Scenario 3: Real Stall and Incomplete Target Deadline Enforcement (AC-MDRB-034-3)
- **Given** an active motion that is mechanically obstructed or unable to settle within tolerance.
- **When** elapsed clock ticks exceed the computed kinematic deadline $T_{deadline}$.
- **Then** motor output is immediately set to zero PWM / stop mode.
- **And** `motion_status` is recorded as `PBIO_MDROBOTBASE_STATUS_TIMED_OUT`.
- **And** the awaitable dispatcher raises `OSError(ETIMEDOUT)`.

### Scenario 4: VirtualHub and Native PBIO Parity (AC-MDRB-034-4)
- **Given** the motion implementations in `pybricks/robotics/pb_type_mdrobotbase.c` and `tests/virtualhub/robotics/pybricks/robotics.py`.
- **When** evaluating the centralized kinematic deadline helper across straight moves, spin turns, pivot turns, navigation, and multi-segment trajectories.
- **Then** both environments compute identical exact integer deadlines:
  - Straight move (1500 mm @ 50 mm/s, accel 200, decel 200): exact `47750 ms`.
  - Spin turn (90 deg @ 200 deg/s, accel 400, decel 400): exact `4175 ms`.
  - Pivot turn (90 deg @ 150 deg/s, accel 400, decel 400): exact `4025 ms`.
  - Navigation to goal (500 mm @ 100 mm/s, 53.13 deg heading diff): exact `12898 ms`.
  - Right-angle multi-segment trajectory `[(0,0), (500,0), (500,500)]` @ 100 mm/s: exact `20675 ms`.
- **And** both environments raise `OSError: [Errno 110] ETIMEDOUT` upon deadline expiration.

### Scenario 5: Real Monotonic Clock Elapsed-Time Enforcement (AC-MDRB-034-5)
- **Given** an active motion configured with an explicit timeout.
- **When** the motion begins execution.
- **Then** timeout expiration is strictly measured using monotonic elapsed clock time ($t_{now} - t_{start} \ge T_{timeout}$).
- **And** a $150\text{ ms}$ timeout triggers only after $\ge 140\text{ ms}$ of elapsed physical/virtual time (no immediate shortcut aborts).
- **And** a $500\text{ ms}$ timeout on a $100\text{ ms}$ motion completes cleanly with status `COMPLETED` (2) without premature termination.
- **And** actuators are confirmed stopped with measured speed $0.0$ upon abort.

### Scenario 6: Backward Trajectory Kinematic Parity (AC-MDRB-034-6)
- **Given** a robot initialized at position $(0, 0)$ facing heading $0.0^\circ$.
- **When** executing a backward trajectory with `back = True`.
- **Then** each segment orientation is adjusted by $+180.0^\circ$ relative to the travel vector.
- **And** straight backward motion $[(0,0), (1000, 0)]$ @ $200\text{ mm/s}$ requires initial $180^\circ$ orientation change:
  - $t_{linear} = 7.0\text{ s}, t_{angular} = 1.9\text{ s} \implies T_{kinematic} = 8.9\text{ s} \implies T_{deadline} = \mathbf{15350\text{ ms}}$.
- **And** multi-segment backward motion $[(0,0), (300, 400), (300, 1000)]$ @ $100\text{ mm/s}$ yields exact integer deadline $\mathbf{22728\text{ ms}}$.
- **And** both native PBIO C and VirtualHub Python compute identical backward trajectory deadlines.

### Scenario 7: Boundary Vectors Around .5 ms & Floor Semantics (AC-MDRB-034-7)
- **Given** kinematic durations resulting in fractional millisecond products near $.5\text{ ms}$.
- **When** calculating integer deadlines via the contract formula:
  $$T_{deadline} = \max\left(1500\text{ ms}, \left\lfloor T_{kinematic} \times 1.5 \times 1000.0 \right\rfloor + 2000\text{ ms}\right)$$
- **Then** integer floor truncation with floating-point epsilon guard ($1\times 10^{-6}$) is strictly applied.
- **And** boundary products evaluate identically in C and Python:
  - $1000.4\text{ ms} \implies 3000\text{ ms}$
  - $1000.5\text{ ms} \implies 3000\text{ ms}$
  - $1000.6\text{ ms} \implies 3000\text{ ms}$
  - $1001.0\text{ ms} \implies 3001\text{ ms}$
