# Acceptance Contract: G-MDRB-011

**Goal ID:** `G-MDRB-011`
**Title:** Validate-Before-Cancel Motion Lifecycle & Preemption Safety
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Validate-Before-Cancel Motion Lifecycle & Preemption Safety
  As an autonomous robotics software engineer
  I want all motion dispatch methods in MDRobotBase to fully parse and validate arguments before cancelling active motions
  So that malformed, out-of-range, or erroneous user commands cannot abort ongoing robot maneuvers or corrupt navigational state.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Non-cancelling Argument Error Rejection in `navigate_to_goal`
```gherkin
Given active motion A is running in the background towards target coordinates
When user code dispatches navigate_to_goal with missing arguments, invalid types, or non-finite coordinates
Then MicroPython raises TypeError or ValueError immediately
And active motion A continues executing towards its original target coordinates
And zero motor stop or motion reset commands are issued to PBIO.
```

### Scenario 2: Non-cancelling Non-finite Parameter Rejection in `turn_to_angle` & `turn_angle`
```gherkin
Given active motion A is running in the background towards target heading
When user code dispatches turn_angle or turn_to_angle with non-finite target angle (NaN or Inf) or non-positive speed
Then MicroPython raises ValueError immediately
And active motion A continues executing towards its original target
And zero motor stop or motion reset commands are issued to PBIO.
```

### Scenario 3: Non-cancelling Parameter Rejection in `pivot_turn_to_angle` & `pivot_turn_angle`
```gherkin
Given active motion A is running in the background
When user code dispatches pivot_turn_angle or pivot_turn_to_angle with non-finite target angle (NaN or Inf) or non-positive speed
Then MicroPython raises ValueError immediately
And active motion A continues executing towards its original target
And zero motor stop or motion reset commands are issued to PBIO.
```

### Scenario 4: Non-cancelling Trajectory Bounds & Point Validation in `follow_trajectory`
```gherkin
Given active motion A is running in the background
When user code dispatches follow_trajectory with fewer than 2 points, more than 64 points, malformed point tuples (< 2 coordinates), or non-finite coordinates
Then MicroPython raises ValueError immediately
And active motion A continues executing without interruption
And internal trajectory buffer is not mutated prior to complete validation
And zero motor stop or motion reset commands are issued to PBIO.
```

### Scenario 5: Clean Valid Motion Preemption
```gherkin
Given active motion A is running in the background
When user code dispatches valid motion command B with fully-verified parameters
Then active motion A is cleanly cancelled and motion state reset
And motion B takes ownership of motor controllers and begins execution towards its new target.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Argument Validation Precedence | 100% of parse/check steps occur before cancel | Static AST & sequence inspection |
| Motion Reset Precedence | 100% of motion_reset calls occur after validation | C function call graph inspection |
| Invalid Preemption Rejection | Zero active motions cancelled on TypeError/ValueError | Python & C lifecycle regression tests |
| Trajectory Buffer Atomicity | Zero trajectory points copied to internal struct if any point invalid | Two-phase commit buffer inspection |
| Zero Mock Invariant | 0 mocks, 0 stubs in tests | Static AST & code pattern audit |
| Execution Latency SLA | $< 10.0$ seconds total test suite execution | Episode Oracle timer |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-011-1:** Calling `navigate_to_goal` with invalid types or missing parameters raises `TypeError` without cancelling an active background motion.
- **AC-MDRB-011-2:** Calling `turn_angle` or `pivot_angle` with non-finite values (`nan`, `inf`) raises `ValueError` without cancelling an active background motion.
- **AC-MDRB-011-3:** Calling `follow_trajectory` with an empty or oversized trajectory list or invalid coordinate tuples raises `ValueError` without cancelling an active background motion.
- **AC-MDRB-011-4:** Zero motor stop commands are issued to PBIO when a new motion call fails validation.
