# Acceptance Contract: G-MDRB-016

**Goal ID:** `G-MDRB-016`  
**Title:** Numerical Robustness, Geometry Bounds, and Quantization Hardening  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Numerical Robustness, Geometry Bounds, and Quantization Hardening
  As an embedded robotics firmware engineer
  I want all floating-point and integer inputs in PBIO and MicroPython layers to be strictly guarded against non-finite values, unphysical gear ratios, integer overflow, and clock timer wraparounds
  So that NaN propagation, division by near-zero, integer quantization overflow, and runaway motion caused by millisecond timer wrapping are eliminated at API boundaries.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Rejection of Non-Finite Floating-Point Values
```gherkin
Given an initialized pbio_mdrobotbase_t instance or MicroPython MDRobotBase object
When a caller provides NaN, +Infinity, or -Infinity for coordinates, angles, speeds, or configuration parameters
Then the function immediately rejects the call with PBIO_ERROR_INVALID_ARG (or raises ValueError in Python)
And the internal robot state remains unmodified.
```

### Scenario 2: Strict Gear Ratio Bounds Enforcement in [0.001, 1000.0]
```gherkin
Given an initialized pbio_mdrobotbase_t instance
When pbio_mdrobotbase_set_gear_ratio is called with a ratio <= 0.0, < 0.001, > 1000.0, NaN, or Infinity
Then the function rejects the ratio with PBIO_ERROR_INVALID_ARG
And the active gear_ratio remains unchanged at its previously valid setting.
```

### Scenario 3: Integer Speed Quantization & Saturation Protection
```gherkin
Given an initialized pbio_mdrobotbase_t instance with gear ratio R
When converting high angular wheel velocities to motor speeds via pbio_mdrobotbase_wheel_to_motor_dps
Then the calculated product saturates gracefully at INT32_MAX or INT32_MIN (or max speed bound) without 32-bit two's complement integer wraparound.
```

### Scenario 4: Millisecond Clock Timer Wraparound Safety
```gherkin
Given a motion timeout evaluation in an active trajectory or navigation move
When the hardware millisecond timer wraps from 0xFFFFFFFF to 0x00000000
Then duration elapsed is calculated correctly via unsigned subtraction (uint32_t)(now - start) >= timeout_ms
And motion does not prematurely terminate or lock indefinitely.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Non-Finite Input Rejection | 100% rejection of `NaN`, `+inf`, `-inf` | Boundary value unit test matrix |
| Gear Ratio Valid Domain | Strictly $R \in [0.001, 1000.0]$ | Boundary test ($0.0, 0.0009, 1000.1, -1.0$) |
| Speed Quantization Saturation | No overflow wrapping around 32-bit int bounds | High-velocity conversion assertions |
| Clock Timer Wraparound | Correct duration calculation across $2^{32}-1 \to 0$ | Circular unsigned subtraction tests |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-016-1:** Passing `NaN`, `+inf`, or `-inf` to any coordinate, angle, or speed parameter returns `PBIO_ERROR_INVALID_ARG` or raises `ValueError`.
- **AC-MDRB-016-2:** Gear ratio inputs outside $[0.001, 1000.0]$ are rejected with `PBIO_ERROR_INVALID_ARG`.
- **AC-MDRB-016-3:** Large velocities multiplied by high gear ratios saturate gracefully at maximum integer motor speed without 32-bit wrap-around.
- **AC-MDRB-016-4:** Motion timeout checks calculate elapsed duration correctly across 32-bit unsigned millisecond timer wraparound.
