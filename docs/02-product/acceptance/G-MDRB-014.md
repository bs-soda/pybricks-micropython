# Acceptance Contract: G-MDRB-014

**Goal ID:** `G-MDRB-014`
**Title:** Differential-Drive Kinematic Invariants & Bidirectional Gear-Ratio Semantics
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Differential-Drive Kinematic Invariants & Bidirectional Gear-Ratio Semantics
  As an embedded robotics control engineer
  I want bidirectional gear-ratio kinematic transformations and differential-drive odometry equations to be strictly validated for mathematical invertibility and numerical stability across gear ratios R in [0.01, 100.0]
  So that motor encoder ticks and physical wheel degrees/distance/heading convert symmetrically with error |error| < 10^-4 and straight-line motion conserves heading with delta_theta = 0.0 +/- 10^-5 rad.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Bidirectional Round-Trip Invertibility (Motor -> Wheel -> Motor)
```gherkin
Given an initialized pbio_mdrobotbase_t instance with gear ratio R in [0.01, 100.0]
When pbio_mdrobotbase_motor_to_wheel_deg converts motor degrees m in [-100000.0, 100000.0] to wheel degrees w
And pbio_mdrobotbase_wheel_to_motor_deg converts w back to motor degrees m_inv
Then |m_inv - m| < 10^-4 holds across the entire operating domain.
```

### Scenario 2: Inverse Bidirectional Round-Trip Invertibility (Wheel -> Motor -> Wheel)
```gherkin
Given an initialized pbio_mdrobotbase_t instance with gear ratio R in [0.01, 100.0]
When pbio_mdrobotbase_wheel_to_motor_deg converts wheel degrees w in [-100000.0, 100000.0] to motor degrees m
And pbio_mdrobotbase_motor_to_wheel_deg converts m back to wheel degrees w_inv
Then |w_inv - w| < 10^-4 holds across the entire operating domain.
```

### Scenario 3: Differential-Drive Straight-Line Motion Invariant
```gherkin
Given an initialized pbio_mdrobotbase_t instance with axle track W = 112.0 mm, wheel diameter D = 56.0 mm, and gear ratio R in [0.01, 100.0]
When left and right motors advance identically by delta_theta_motor degrees
Then the differential heading change delta_theta = (s_right - s_left) / W is identically zero (delta_theta = 0.0 +/- 10^-5 rad)
And linear distance traveled equals (delta_theta_motor / R) * (pi * D / 360.0).
```

### Scenario 4: Extreme Boundary Ratio Coverage & Symmetric Velocity Scaling
```gherkin
Given an initialized pbio_mdrobotbase_t instance with boundary gear ratios R in {0.01, 0.1, 0.5, 1.0, 2.0, 10.0, 100.0}
When converting positive and negative wheel velocities via pbio_mdrobotbase_wheel_to_motor_dps and pbio_mdrobotbase_motor_to_wheel_dps
Then the velocity scaling is symmetric across positive and negative speed vectors with zero NaN or infinite outputs.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Round-Trip Error Bound | $|m_{\text{inv}} - m| < 10^{-4}$ degrees | C native unit test assertion |
| Inverse Round-Trip Error Bound | $|w_{\text{inv}} - w| < 10^{-4}$ degrees | C native unit test assertion |
| Straight Drive Heading Delta | $|\Delta \theta| \le 10^{-5}\text{ rad}$ | C native unit test assertion |
| Linear Distance Conservation | $|d_{\text{calc}} - d_{\text{expected}}| < 10^{-4}\text{ mm}$ | C native unit test assertion |
| Gear Ratio Support Domain | $R \in [0.01, 100.0]$ | Parameterized unit tests |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-014-1:** `wheel_to_motor_deg(motor_to_wheel_deg(m)) == m` holds for all $m \in [-100000.0, 100000.0]$ with $|error| < 10^{-4}$.
- **AC-MDRB-014-2:** `motor_to_wheel_deg(wheel_to_motor_deg(w)) == w` holds for all $w \in [-100000.0, 100000.0]$ with $|error| < 10^{-4}$.
- **AC-MDRB-014-3:** Equal left and right motor progress yields $\Delta \theta = 0.0 \pm 10^{-5}\text{ rad}$ and $\Delta \text{distance} = \frac{\Delta \theta_{\text{motor}}}{R} \frac{\pi D}{360}$.
- **AC-MDRB-014-4:** All conversions operate correctly for gear ratios $R \in [0.01, 100.0]$.
