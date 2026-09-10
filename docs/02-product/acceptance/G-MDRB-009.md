# Acceptance Contract: G-MDRB-009

**Goal ID:** `G-MDRB-009`
**Title:** Maintainability and Duplicate Control Logic Reduction
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Maintainability and Duplicate Control Logic Reduction
  As an embedded robotics firmware maintainer
  I want shared control logic, angle wrapping, motor velocity clamping, and stall evaluation deduplicated into static inline helpers
  So that the motion iteration monolith is maintainable, bug fixes apply uniformly across all motion types, and kinematic behavior remains strictly bit-identical.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Angle Normalization Consolidation
```gherkin
Given angular calculations across navigation, turn, pivot, and trajectory routines
When angles require wrapping into the primary interval [-180.0 deg, +180.0 deg]
Then all calls execute through static inline mdrobotbase_wrap_degrees(angle)
And zero duplicate ad-hoc while loops remain in pybricks/robotics/pb_type_mdrobotbase.c
And mathematical wrapping precision is preserved identically.
```

### Scenario 2: Motor Velocity Clamping Consolidation
```gherkin
Given linear and angular velocity setpoints for left and right wheels
When converting velocities and bounding motor setpoints against driver limits
Then speed clamping is handled through static inline mdrobotbase_clamp_speed(dps, max_speed)
And linear-to-angular motor conversions use unified helper mdrobotbase_linear_to_angular_dps()
And clamping limits are applied uniformly with zero divergent edge-case branches.
```

### Scenario 3: Stall Accumulator Consolidation
```gherkin
Given active motion execution monitoring across straight, turn, and trajectory modes
When tracking commanded versus actual motion progress over an elapsed sample period
Then stall duration accumulation and threshold checking are evaluated through mdrobotbase_evaluate_stall()
And stall thresholds and reset conditions operate identically across all motion states.
```

### Scenario 4: Bit-Identical Kinematic Regression Pass
```gherkin
Given the complete regression test suite established in G-MDRB-008
When tests are compiled and executed against the refactored code
Then 100% of native PBIO C tests and VirtualHub Python tests pass with exit code 0
And zero behavioral divergence or numerical precision drift occurs.
```

### Scenario 5: Maintainability and Code Quality Metrics
```gherkin
Given pybricks/robotics/pb_type_mdrobotbase.c
When refactoring completes
Then the motion iteration function complexity is reduced
And static inline helpers incur zero additional stack frame overhead
And all builds pass with zero compiler warnings.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Angle Wrapping Unification | 100% wrapped via `mdrobotbase_wrap_degrees` | Grep & AST Inspection |
| Speed Clamping Unification | 100% clamped via `mdrobotbase_clamp_speed` | Grep & Code Audit |
| Stall Evaluator Unification | Unified via `mdrobotbase_evaluate_stall` | Source Inspection |
| Regression Pass Rate | 10/10 PBIO tests + VirtualHub tests OK (0 skipped) | Native test runner |
| Execution Latency SLA | $< 10.0$ seconds total test execution | Episode Oracle high-resolution timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-009-1:** Angle normalization is handled exclusively through `mdrobotbase_wrap_degrees()`.
- **AC-MDRB-009-2:** Duplicate motor speed conversion and clamping blocks are replaced with common helpers.
- **AC-MDRB-009-3:** Stall accumulation and timeout evaluation are consolidated into `mdrobotbase_evaluate_stall()`.
- **AC-MDRB-009-4:** All unit and integration regression tests pass 100% green with zero behavior deviation.
- **AC-MDRB-009-5:** Firmware binary compiles cleanly with zero warnings and preserves embedded performance.
