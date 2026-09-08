# G-MDRB-004 — Acceptance Contract

> Strict verification contract for G-MDRB-004: Consistent Gear-Ratio Command and Odometry Semantics.

## Goal Reference

- **Goal:** G-MDRB-004 — Consistent Gear-Ratio Command and Odometry Semantics
- **Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
- **Status:** ready
- **Touch map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `lib/pbio/test/src/test_mdrobotbase.c`

---

## Scenario 1: Gear Ratio 2.0 (2:1 Reduction) Odometry Scaling (Happy Path)

**Given** an MDRobotBase with wheel diameter $D = 56\text{mm}$, axle track $W = 112\text{mm}$, and `gear_ratio = 2.0`  
**When** both left and right motor shafts rotate forward by $720^\circ$  
**Then** the wheel rotates by $720^\circ / 2.0 = 360^\circ$, and `update_state()` computes linear distance $d = \pi \times 56\text{mm} = 175.93 \pm 0.1\text{mm}$.

| Field | Value |
|-------|-------|
| **Input** | `gear_ratio = 2.0f`, $\Delta\theta_{\text{motor}} = 720^\circ$ |
| **Expected Wheel Angle** | $360^\circ$ |
| **Expected Distance** | $175.93 \pm 0.1\text{mm}$ |
| **Expected Pose** | $x \approx 175.93\text{mm}$, $y \approx 0.0\text{mm}$, $\theta \approx 0.0^\circ$ |

---

## Scenario 2: Gear Ratio 0.5 (1:2 Overdrive) Odometry Scaling (Happy Path)

**Given** an MDRobotBase with wheel diameter $D = 56\text{mm}$, axle track $W = 112\text{mm}$, and `gear_ratio = 0.5`  
**When** both left and right motor shafts rotate forward by $180^\circ$  
**Then** the wheel rotates by $180^\circ / 0.5 = 360^\circ$, and `update_state()` computes linear distance $d = \pi \times 56\text{mm} = 175.93 \pm 0.1\text{mm}$.

| Field | Value |
|-------|-------|
| **Input** | `gear_ratio = 0.5f`, $\Delta\theta_{\text{motor}} = 180^\circ$ |
| **Expected Wheel Angle** | $360^\circ$ |
| **Expected Distance** | $175.93 \pm 0.1\text{mm}$ |
| **Expected Pose** | $x \approx 175.93\text{mm}$, $y \approx 0.0\text{mm}$, $\theta \approx 0.0^\circ$ |

---

## Scenario 3: In-Place Turn Odometry Scaling Across Gear Ratios (Happy Path)

**Given** an MDRobotBase with track $W = 112\text{mm}$ and arbitrary gear ratio $R \in \{0.5, 1.0, 2.0\}$  
**When** left motor rotates $-\Delta\theta_{\text{motor}}$ and right motor rotates $+\Delta\theta_{\text{motor}}$  
**Then** differential heading $\Delta\theta_{\text{enc\_rad}} = (d_{\text{right}} - d_{\text{left}}) / W$ is scaled by $1/R$, producing mathematically exact angular heading change.

| Field | Value |
|-------|-------|
| **Input** | $R = 2.0f$, $W = 112\text{mm}$, $\Delta\theta_{\text{motor, left}} = -720^\circ$, $\Delta\theta_{\text{motor, right}} = +720^\circ$ |
| **Expected Heading Change** | $\Delta\theta = \frac{2 \times 175.93\text{mm}}{112\text{mm}} \times \frac{180^\circ}{\pi} \approx 180.0^\circ \pm 0.2^\circ$ |

---

## Scenario 4: Command Velocity & Kinematic Helper Consistency (Happy Path)

**Given** an MDRobotBase with positive gear ratio $R$  
**When** converting linear wheel velocity $v$ or angular rate $\omega_{\text{wheel}}$ to motor dps  
**Then** `pbio_mdrobotbase_wheel_to_motor_dps(rb, wheel_dps)` returns $(int32\_t)\text{lroundf}(\text{wheel\_dps} \times R)$, exactly matching the inverse of `pbio_mdrobotbase_motor_to_wheel_deg()`.

| Helper | Input | Output Formula |
|---|---|---|
| `pbio_mdrobotbase_motor_to_wheel_deg` | `motor_deg = 720.0f, R = 2.0f` | `360.0f` |
| `pbio_mdrobotbase_wheel_to_motor_dps` | `wheel_dps = 360.0f, R = 2.0f` | `720` |

---

## Scenario 5: Non-Positive or Non-Finite Gear Ratio Rejection (Failure Case)

**Given** an active MDRobotBase instance  
**When** `pbio_mdrobotbase_set_gear_ratio()` is called with $R \le 0.0001f$, $R > 1000.0f$, `NaN`, or `Inf`  
**Then** the call fails closed returning `PBIO_ERROR_INVALID_ARG` (raising `ValueError` in Python), leaving the previous gear ratio unmodified.

| Case | Input | Expected |
|------|-------|----------|
| Zero ratio | `set_gear_ratio(rb, 0.0f)` | `PBIO_ERROR_INVALID_ARG` |
| Negative ratio | `set_gear_ratio(rb, -1.5f)` | `PBIO_ERROR_INVALID_ARG` |
| Micro ratio underflow | `set_gear_ratio(rb, 0.00001f)` | `PBIO_ERROR_INVALID_ARG` |
| Extreme ratio overflow | `set_gear_ratio(rb, 5000.0f)` | `PBIO_ERROR_INVALID_ARG` |
| Non-finite NaN | `set_gear_ratio(rb, NAN)` | `PBIO_ERROR_INVALID_ARG` |

---

## Verification Suite Mapping

- **C Embedded Test:** `test_mdrobotbase_gear_ratio_kinematics` in `lib/pbio/test/src/test_mdrobotbase.c`
- **Socratic Dialectic Harness:** `scripts/harness/socratic-agentic-loop-g-mdrb-004-harness.mjs`
- **Master Replication Runner:** `scripts/harness/master-replication-g-mdrb-004.mjs`
