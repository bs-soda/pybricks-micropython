# Acceptance Contract: G-MDRB-015

**Goal ID:** `G-MDRB-015`
**Title:** Angle Normalization, Pivot-Turn Invariants, and Distance Conservation
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Angle Normalization, Pivot-Turn Invariants, and Distance Conservation
  As an autonomous robotics control engineer
  I want pure spin turns, single-wheel pivot turns, angle normalization, and backlash filtering to strictly satisfy differential geometry and odometry conservation invariants
  So that center displacement is zero during pure spin turns (<= 0.05 mm), pivot turns accurately sweep s_free = W * |delta_theta| around the stationary locked wheel (+/- 0.1 mm), angles normalize to [-180.0, +180.0] deg, and oscillatory backlash vibrations produce zero net drift.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Pure Spin Turn Center Conservation Invariant
```gherkin
Given an initialized pbio_mdrobotbase_t instance with motion_type set to PBIO_MDROBOTBASE_MOTION_TURN
When left and right wheels rotate with equal magnitude and opposite signs (s_left = -s_right)
Then linear center displacement satisfies sqrt(delta_x^2 + delta_y^2) <= 0.05 mm
And robot heading rotates by delta_theta = (s_right - s_left) / W.
```

### Scenario 2: Single-Wheel Left Pivot Arc Conservation Invariant
```gherkin
Given an initialized pbio_mdrobotbase_t instance with axle track W = 112.0 mm and motion_type set to PBIO_MDROBOTBASE_MOTION_PIVOT (pivot_left = true)
When the left wheel remains stationary (s_left = 0) and the right wheel advances by arc distance s_right
Then the heading change satisfies delta_theta_rad = s_right / W
And the free wheel distance matches arc length s_right = W * |delta_theta_rad| +/- 0.1 mm.
```

### Scenario 3: Single-Wheel Right Pivot Arc Conservation Invariant
```gherkin
Given an initialized pbio_mdrobotbase_t instance with axle track W = 112.0 mm and motion_type set to PBIO_MDROBOTBASE_MOTION_PIVOT (pivot_left = false)
When the right wheel remains stationary (s_right = 0) and the left wheel advances by arc distance s_left
Then the heading change satisfies delta_theta_rad = -s_left / W
And the free wheel distance matches arc length s_left = W * |delta_theta_rad| +/- 0.1 mm.
```

### Scenario 4: Continuous Angle Wrapping in [-180.0, +180.0] Degrees
```gherkin
Given any arbitrary angular heading in degrees (including large positive, large negative, and multiple full rotations)
When pbio_mdrobotbase_wrap_degrees normalizes the angle
Then the resulting angle strictly resides in [-180.0, +180.0]
And wrapping 0 deg returns 0 deg, 180 deg returns 180 deg, and 540 deg returns 180 deg.
```

### Scenario 5: Backlash Filtering Zero-Drift Conservation under Sub-Threshold Oscillation
```gherkin
Given an initialized pbio_mdrobotbase_t instance with backlash filtering enabled and limits set to 1.0 deg
When motor ticks oscillate back and forth within the deadband (+/- 0.5 deg) for 100 cycles
Then cumulative odometry registers (x, y, theta) exhibit zero net drift (delta_x == 0, delta_y == 0, delta_theta == 0).
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Spin Turn Center Drift | $\sqrt{\Delta x^2 + \Delta y^2} \le 0.05\text{ mm}$ | C simulation assertion |
| Left Pivot Arc Accuracy | $|s_R - W \cdot |\Delta \theta|| \le 0.1\text{ mm}$ | C simulation assertion |
| Right Pivot Arc Accuracy | $|s_L - W \cdot |\Delta \theta|| \le 0.1\text{ mm}$ | C simulation assertion |
| Angle Normalization Bounds | $\theta \in [-180.0^\circ, +180.0^\circ]$ | Boundary value test iteration |
| Backlash Vibration Drift | 0.0 net position/heading drift after 100 cycles | C unit test loop |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-015-1:** For pure spin turns with $s_L = -s_R$, odometry center drift satisfies $\sqrt{\Delta x^2 + \Delta y^2} \le 0.05\text{ mm}$.
- **AC-MDRB-015-2:** For left pivot turns with $s_L = 0$, $s_R = W \cdot |\Delta \theta_{\text{rad}}| \pm 0.1\text{ mm}$.
- **AC-MDRB-015-3:** For right pivot turns with $s_R = 0$, $s_L = W \cdot |\Delta \theta_{\text{rad}}| \pm 0.1\text{ mm}$.
- **AC-MDRB-015-4:** Headings normalize to $[-180.0^\circ, +180.0^\circ]$ continuously across multiple full revolutions.
- **AC-MDRB-015-5:** Vibrating motors within the backlash limit produces zero net position or heading drift after 100 cycles.
