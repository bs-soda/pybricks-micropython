# Socratic 5-Why Dialectic & Baseline Blocker Report: G-MDRB-014

**Timestamp:** `2026-09-08T14:30:00+07:00`  
**Goal:** `G-MDRB-014` (Differential-Drive Kinematic Invariants & Bidirectional Gear-Ratio Semantics)  
**Epic:** `MDRB`  
**Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariant:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Baseline Blocker Identification & Reproduction

### The Blocker
While `pbio_mdrobotbase_motor_to_wheel_deg` and `pbio_mdrobotbase_wheel_to_motor_dps` were implemented in earlier refactoring, the kinematic layer lacks:
1. **Missing Bidirectional Symmetric Helpers:** `pbio_mdrobotbase_wheel_to_motor_deg` and `pbio_mdrobotbase_motor_to_wheel_dps` are not declared in `lib/pbio/include/pbio/mdrobotbase.h` or defined in `lib/pbio/src/mdrobotbase.c`.
2. **Unverified Round-Trip Invertibility:** There is no automated proof assertion that $\text{wheel\_to\_motor}(\text{motor\_to\_wheel}(m)) = m$ within $|error| < 10^{-4}$ across $m \in [-100000.0, 100000.0]$.
3. **Unverified Differential Straight-Line Invariant:** There is no test proving that equal motor inputs produce $\Delta \theta = 0.0 \pm 10^{-5}\text{ rad}$ and distance $s = (\Delta \theta_{\text{motor}} / R) \cdot (\pi D / 360)$ across extreme gear ratios $R \in [0.01, 100.0]$.

### Empirical Reproduction
1. Examine `lib/pbio/include/pbio/mdrobotbase.h`: `pbio_mdrobotbase_wheel_to_motor_deg` is missing.
2. Examine `lib/pbio/test/src/test_mdrobotbase.c`: `test_mdrobotbase_kinematic_invariants` is missing.
3. Observe lack of formal algebraic proof for round-trip invertibility across $R \in [0.01, 100.0]$.

---

## 2. 5-Why Recursive Dialectic Analysis (5 Branches x Level 5 Depth)

### Branch 1: Bidirectional Gear Ratio Invertibility
- **Why 1:** Why must motor-to-wheel and wheel-to-motor transformations be strictly invertible?  
  Because high-level trajectory tracking and odometry dead reckoning continuously convert between wheel space and motor encoder space; any asymmetry accumulates as odometry drift.
- **Why 2:** Why must $R$ divide for motor-to-wheel and multiply for wheel-to-motor?  
  Because gear ratio $R$ is defined as $R = \text{motor\_rotations} / \text{wheel\_rotations}$. Under gear reduction ($R > 1$), the motor rotates $R$ times faster and covers $R$ times more angular degrees than the wheel.
- **Why 3:** Why must the numerical tolerance satisfy $|error| < 10^{-4}$ degrees?  
  Because single-precision IEEE 754 float arithmetic has 24 bits of mantissa (~7 decimal digits). For angles up to $10^5$ degrees, float precision guarantees accuracy to $< 10^{-4}$ degrees.
- **Why 4:** Why must helper functions be symmetrical: `motor_to_wheel_deg` and `wheel_to_motor_deg`?  
  Because ad-hoc inline multiplications and divisions scatter conversion logic and risk operator inversion bugs.
- **Why 5:** Why does complete algebraic invertibility certify mathematical correctness?  
  Because satisfying $|f^{-1}(f(x)) - x| < \epsilon$ and $|f(f^{-1}(y)) - y| < \epsilon$ across all $x, y$ is the mathematical definition of a bijective, invertible coordinate isometry.

### Branch 2: Velocity & Speed Vector Symmetry
- **Why 1:** Why must velocity conversions support both positive and negative speed vectors?  
  Because robots drive forward and in reverse, and differential turns require one wheel rotating in reverse while the other rotates forward.
- **Why 2:** Why does `wheel_to_motor_dps` use `lroundf`?  
  Because motor servo controllers in PBIO require integer target velocities (degrees per second), and `lroundf` provides symmetric round-to-nearest integer conversion.
- **Why 3:** Why must `motor_to_wheel_dps` divide velocity by $R$?  
  Because wheel angular speed equals motor angular speed divided by the gear reduction ratio.
- **Why 4:** Why must zero velocity input return zero output without NaN or branch instability?  
  Because stationary holds and deadband filters rely on exact zero velocity preservation.
- **Why 5:** Why does velocity symmetry prevent directional bias in path following?  
  Because asymmetric velocity scaling would cause the robot to turn faster in one direction than another during symmetric turning maneuvers.

### Branch 3: Differential-Drive Heading Conservation
- **Why 1:** Why must straight line travel produce zero angular displacement ($\Delta \theta = 0$)?  
  Because when both wheels travel the exact same linear distance, the robot's heading does not change.
- **Why 2:** Why is differential heading defined as $\Delta \theta = (s_{\text{right}} - s_{\text{left}}) / W$?  
  Because by differential-drive unicycle kinematics, the instantaneous angular rate is $\omega = (v_R - v_L) / W$, which integrates over time to $(s_R - s_L) / W$.
- **Why 3:** Why must identical motor movements ($M_L = M_R$) yield $s_L = s_R$ across any gear ratio?  
  Because $s = (\theta_{\text{motor}} / R) \cdot (\pi D / 360)$. With identical wheel diameters and motor rotation, arc distances are identical.
- **Why 4:** Why does the unit test assert $|\Delta \theta| \le 10^{-5}\text{ rad}$?  
  Because this quantifies that rounding error does not produce spurious angular drift during straight trajectory execution.
- **Why 5:** Why does heading conservation guarantee straight-line navigation accuracy?  
  Because it mathematically proves that pure translation commands will not incur rotational drift during dead-reckoning integration.

### Branch 4: Extreme Gear Ratio Domain Support ($R \in [0.01, 100.0]$)
- **Why 1:** Why must the kinematics layer support gear ratios from $0.01$ to $100.0$?  
  Because robotic mechanisms utilize overdrive speed gears ($R = 0.01$) to high-reduction planetary stages ($R = 100.0$).
- **Why 2:** Why must $R \le 0.0001$ be rejected as invalid?  
  Because non-positive or near-zero gear ratios cause division by zero and numerical singularity.
- **Why 3:** Why must conversions remain finite and bounded for $R = 0.01$ and $R = 100.0$?  
  Because float calculations must not overflow or lose mantissa precision across four orders of magnitude.
- **Why 4:** Why does the unit test verify boundary ratios $\{0.01, 0.1, 0.5, 1.0, 2.0, 10.0, 100.0\}$?  
  Because testing both boundary extremes and standard ratios proves operational domain stability.
- **Why 5:** Why does fail-closed ratio validation ensure hardware safety?  
  Because invalid ratios would send astronomical or NaN velocity commands to physical servos, potentially causing motor runaway.

### Branch 5: Zero-Mock Native C Testing & Release Certification
- **Why 1:** Why must the unit test be implemented in native C without mocks?  
  Because Article I of the Global Engineering Constitution strictly prohibits test doubles, requiring direct execution against real PBIO structures.
- **Why 2:** Why must `test_mdrobotbase_kinematic_invariants` be registered in `pbio_mdrobotbase_tests[]`?  
  Because the native C runner `test-pbio` must execute the test in CI and local verification passes.
- **Why 3:** Why must the test evaluate both positive and negative values across all ratios?  
  Because verifying all 4 quadrants ensures sign symmetry and lack of signed-zero or truncation anomalies.
- **Why 4:** Why must `test-pbio` pass with 0 skipped tests?  
  Because zero skipped tests guarantees that every assertion is actively validated on target architecture.
- **Why 5:** Why does complete dialectic proof certify readiness for release?  
  Because all causal assumptions have been resolved down to physical mathematical principles.
