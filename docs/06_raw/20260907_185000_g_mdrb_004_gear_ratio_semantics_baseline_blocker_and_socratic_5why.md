# G-MDRB-004 Baseline Blocker & Socratic 5-Why Dialectic Report

**Timestamp:** 2026-09-07T18:50:00+07:00
**Goal:** G-MDRB-004 — Consistent Gear-Ratio Command and Odometry Semantics
**Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
**Git Exact HEAD:** `0582aefe38928ed3fe7456775dc5784a901bd28b`
**Git Branch:** `feature/mdrobotbase-enhancement`
**Author:** Antigravity AI (Pair Programming)
**Status:** BASELINE FROZEN (3/25 Checks Passed - 22 Failures)

---

## 1. Executive Summary & Problem Formulation

In the baseline state of `lib/pbio/src/mdrobotbase.c` and `pybricks/robotics/pb_type_mdrobotbase.c`:
1. `pbio_mdrobotbase_update_state()` calculates wheel displacement directly from raw motor degrees without scaling by `rb->gear_ratio`:
   $$d_{\text{left}} = \left(\frac{d_{\text{left\_ticks}}}{360^\circ}\right) \cdot \pi D_{\text{left}}$$
2. As a consequence, on a 2:1 gear reduction ($R = 2.0$), rotating the motor $720^\circ$ spins the wheel $360^\circ$ (traveling $\approx 175.93\text{mm}$), but odometry computes $351.86\text{mm}$—a catastrophic 100% position error.
3. In `pb_type_mdrobotbase.c`, command conversions are fragmented: straight motion and trajectory tracking omitted `gear_ratio`, while turn and pivot modes contained ad-hoc inline multiplications.
4. No centralized kinematic conversion helpers existed in `mdrobotbase.h` to enforce symmetric forward and inverse gear scaling.
5. In-place turn odometry integrated unscaled wheel displacement, causing violent divergence against gyro heading fusion.

---

## 2. Frozen Baseline Dialectic Failure Execution Output

```text
================================================================================
🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-004
================================================================================

📌 Exact-HEAD Provenance: 0582aefe38928ed3fe7456775dc5784a901bd28b
🌿 Active Feature Branch: feature/mdrobotbase-enhancement

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Kinematic Directionality & Gear Ratio Definition (branch-1-gear-ratio-definition)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why must gear ratio be defined unambiguously as R = motor / wheel?... ❌ FAIL
       Details: mdrobotbase.h must declare shared conversion helpers
  [L2] Why must conversion helpers be declared in pbio/mdrobotbase.h?... ❌ FAIL
       Details: pbio_mdrobotbase_motor_to_wheel_deg must be declared in mdrobotbase.h
  [L3] Why must pbio_mdrobotbase_motor_to_wheel_deg divide by gear_ratio?... ❌ FAIL
       Details: pbio_mdrobotbase_motor_to_wheel_deg must compute motor_deg / rb->gear_ratio
  [L4] Why must pbio_mdrobotbase_wheel_to_motor_dps multiply by gear_ratio?... ❌ FAIL
       Details: pbio_mdrobotbase_wheel_to_motor_dps must compute wheel_dps * rb->gear_ratio
  [L5] Why must pbio_mdrobotbase_set_gear_ratio reject non-positive and non... ❌ FAIL
       Details: pbio_mdrobotbase_set_gear_ratio must validate ratio > 0.0001f and isfinite

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Odometry Encoder Tick Scaling (branch-2-odometry-encoder-scaling)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why did baseline odometry omit gear ratio scaling in update_state()?... ❌ FAIL
       Details: pbio_mdrobotbase_update_state must use pbio_mdrobotbase_motor_to_wheel_deg
  [L2] Why does an unscaled gear ratio produce 100% odometry error at R = 2... ❌ FAIL
       Details: Scenario 1 in acceptance contract verified with motor_to_wheel scaling
  [L3] Why must motor tick deltas be converted to wheel degrees before dist... ❌ FAIL
       Details: d_left_ticks must be converted to wheel degrees via pbio_mdrobotbase_motor_to_wheel_deg
  [L4] Why must gear ratio scaling precede backlash hysteresis evaluation?... ❌ FAIL
       Details: Gear ratio scaling must occur prior to backlash filter hysteresis evaluation
  [L5] Why must multi-ratio odometry achieve < 0.1mm error tolerance?... ❌ FAIL
       Details: Acceptance contract and test suite verify distance tolerance

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Bidirectional Kinematic Consistency Across Motion Commands (branch-3-command-consistency)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why must straight motion commands use pbio_mdrobotbase_wheel_to_moto... ❌ FAIL
       Details: pb_type_mdrobotbase.c must call pbio_mdrobotbase_wheel_to_motor_dps
  [L2] Why must turn and pivot commands use pbio_mdrobotbase_wheel_to_motor... ❌ FAIL
       Details: Turn and pivot handlers must use pbio_mdrobotbase_wheel_to_motor_dps
  [L3] Why must trajectory tracking use pbio_mdrobotbase_wheel_to_motor_dps... ❌ FAIL
       Details: Trajectory handler must use pbio_mdrobotbase_wheel_to_motor_dps
  [L4] Why must MicroPython set_gear_ratio validate float finiteness and po... ✅ PASS
  [L5] Why does centralized helper usage eliminate command-odometry drift?... ❌ FAIL
       Details: Scenario 4 verified with shared helper consistency

────────────────────────────────────────────────────────────────────────────────
▶ Branch: In-Place Turn Odometry Kinematics (branch-4-turn-odometry-scaling)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why does in-place turning odometry depend on gear ratio scaling?... ❌ FAIL
       Details: In-place turn heading calculation uses scaled wheel travel
  [L2] Why does unscaled gear ratio in odometry fight the gyro complementar... ✅ PASS
  [L3] Why must turn odometry scale accurately across R in {0.5, 1.0, 2.0}?... ❌ FAIL
       Details: Multi-ratio turn odometry verified across ratios
  [L4] Why must the turn test assert heading change within 0.5 degrees tole... ❌ FAIL
       Details: Turn test assertions enforce tight angular bounds
  [L5] Why is empirical in-place turn verification non-negotiable?... ❌ FAIL
       Details: test_mdrobotbase_gear_ratio_kinematics implements multi-ratio turn test

────────────────────────────────────────────────────────────────────────────────
▶ Branch: Multi-Ratio Embedded Test Suite & Zero-Mock Verification (branch-5-multi-ratio-verification)
────────────────────────────────────────────────────────────────────────────────
  [L1] Why must the test suite execute real tests across ratios 0.5, 1.0, a... ❌ FAIL
       Details: test_mdrobotbase.c must implement test_mdrobotbase_gear_ratio_kinematics
  [L2] Why must test verify 720 deg rotation at R = 2.0 yields 175.93 mm?... ❌ FAIL
       Details: Test asserts 720 deg motor rotation yields 175.93 mm at R = 2.0
  [L3] Why must test verify 180 deg rotation at R = 0.5 yields 175.93 mm?... ❌ FAIL
       Details: Test asserts 180 deg motor rotation yields 175.93 mm at R = 0.5
  [L4] Why must test_mdrobotbase_gear_ratio_kinematics be registered in tes... ❌ FAIL
       Details: pbio_mdrobotbase_tests array must include test_mdrobotbase_gear_ratio_kinematics
  [L5] Why is the complete Socratic release gate the ultimate guardian of r... ✅ PASS

════════════════════════════════════════════════════════════════════════════════
📊 Dialectic Evaluation Summary: 3/25 Checks Passed (12.0%)
❌ Failed Checks: 22
⚠️ Goal G-MDRB-004 has pending dialectic requirements.
```

---

## 3. Five-Why Dialectic Decomposition

### Branch 1: Kinematic Directionality & Gear Ratio Definition
- **L1:** Why must gear ratio be defined as $R = \omega_{\text{motor}} / \omega_{\text{wheel}}$?
  *Root finding:* In standard mechanical engineering, a 2:1 reduction means $R = 2.0$ (motor turns faster than output wheel).
- **L2:** Why must conversion helpers be declared in `mdrobotbase.h`?
  *Root finding:* Exposes an immutable contract ensuring all firmware consumers compute forward/inverse kinematics identically.
- **L3:** Why must `motor_to_wheel_deg` divide by $R$?
  *Root finding:* $\theta_{\text{wheel}} = \theta_{\text{motor}} / R$. Dividing converts motor encoder degrees to true wheel degrees.
- **L4:** Why must `wheel_to_motor_dps` multiply by $R$?
  *Root finding:* $\omega_{\text{motor}} = \omega_{\text{wheel}} \times R$. Multiplying scales desired wheel speed to motor shaft dps.
- **L5:** Why must `set_gear_ratio()` validate $R > 0.0001$ and finiteness?
  *Root finding:* Negative or zero ratios invert differential steering or trigger division by zero.

### Branch 2: Odometry Encoder Tick Scaling
- **L1:** Why did baseline odometry omit gear ratio scaling?
  *Root finding:* The original implementation assumed direct-drive (1:1), bypassing $R$.
- **L2:** Why does unscaled ratio cause 100% error at $R = 2.0$?
  *Root finding:* $720^\circ$ of motor rotation was counted as $720^\circ$ of wheel rotation instead of $360^\circ$.
- **L3:** Why must motor tick deltas scale before distance integration?
  *Root finding:* Linear travel is governed by wheel contact with ground, not motor rotor rotation.
- **L4:** Why must gear scaling precede backlash hysteresis?
  *Root finding:* Mechanical backlash is measured at the output wheel frame.
- **L5:** Why enforce $< 0.1\text{mm}$ error tolerance?
  *Root finding:* High precision dead-reckoning is required for autonomous competition navigation.

### Branch 3: Bidirectional Kinematic Consistency Across Motion Commands
- **L1:** Why were command conversions inconsistent across motion types?
  *Root finding:* Straight and trajectory modes lacked $R$ multiplication; turn and pivot had ad-hoc code.
- **L2:** Why must straight commands use the shared helper?
  *Root finding:* Commanded velocity $v$ (mm/s) must generate correct motor angular velocity.
- **L3:** Why must trajectory tracking use the shared helper?
  *Root finding:* Waypoint pursuit algorithms require symmetrical wheel response.
- **L4:** Why validate in MicroPython?
  *Root finding:* Immediate developer feedback with `ValueError`.
- **L5:** Why does centralized helper eliminate drift?
  *Root finding:* Forward and inverse kinematics cancel symmetrically.

### Branch 4: In-Place Turn Odometry Kinematics
- **L1:** Why does in-place turn odometry depend on gear ratio?
  *Root finding:* $\Delta\theta = (d_{\text{right}} - d_{\text{left}}) / W_{\text{track}}$. Unscaled travel corrupts yaw.
- **L2:** Why does unscaled ratio fight the gyro complementary filter?
  *Root finding:* Sensor fusion expects consistent angular rates; mismatched encoder heading induces oscillation.
- **L3:** Why test $R \in \{0.5, 1.0, 2.0\}$?
  *Root finding:* Covers overdrive, direct drive, and reduction gearing.
- **L4:** Why enforce $\le 0.5^\circ$ heading error tolerance?
  *Root finding:* Guarantees accurate orientation tracking through sharp turns.
- **L5:** Why is empirical verification non-negotiable?
  *Root finding:* Proves whole-robot 3-DOF kinematic state estimation works on hardware.

### Branch 5: Multi-Ratio Embedded Test Suite & Zero-Mock Verification
- **L1:** Why test across multiple physical ratios?
  *Root finding:* Prevents hardcoded 1:1 assumptions from creeping back into code.
- **L2:** Why verify $720^\circ \to 175.93\text{mm}$ at $R = 2.0$?
  *Root finding:* Precise mathematical confirmation of 2:1 reduction.
- **L3:** Why verify $180^\circ \to 175.93\text{mm}$ at $R = 0.5$?
  *Root finding:* Precise mathematical confirmation of 1:2 overdrive.
- **L4:** Why register in `pbio_mdrobotbase_tests`?
  *Root finding:* Ensures continuous regression testing.
- **L5:** Why must all 25 nodes converge?
  *Root finding:* Non-negotiable compliance with Article I and Article II.

---

## 4. Remediation Plan & Next Actions

1. Declare helpers in `lib/pbio/include/pbio/mdrobotbase.h`.
2. Implement helpers and odometry scaling in `lib/pbio/src/mdrobotbase.c`.
3. Centralize command calculations in `pybricks/robotics/pb_type_mdrobotbase.c`.
4. Implement `test_mdrobotbase_gear_ratio_kinematics` in `lib/pbio/test/src/test_mdrobotbase.c`.
5. Verify C build, Socratic loop, and master replication gates.
