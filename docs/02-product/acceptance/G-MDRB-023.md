# Acceptance Contract: G-MDRB-023

**Goal ID:** `G-MDRB-023`
**Title:** Multi-Scale Numerical Invariant Verification, Submodule Sanitization & Scorecard Elevation
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Multi-Scale Numerical Invariant Verification, Submodule Sanitization & Scorecard Elevation
  As the lead robotics product owner
  I want empirical PBIO and VirtualHub test outputs recorded across multi-scale parameter grids and the submodule state cleaned
  So that the MDRobotBase engine is mathematically proven invariant across diverse robot scales and the architectural scorecard is elevated to 9.2+/10.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Multi-Scale Kinematic Invariant Grid
```gherkin
Given a test matrix spanning 6 gear ratios in [0.2, 10.0] and 4 wheel diameters in [30, 120] mm
When pbio_mdrobotbase_update_state executes simulated wheel travel across all 96 parameter combinations
Then the accumulated linear distance matches commanded wheel travel within 0.01% error
And heading integration matches theoretical arc rotation within 0.05 degrees.
```

### Scenario 2: Complete Test Suite Native Execution
```gherkin
Given the full PBIO and VirtualHub test targets
When executed under standard embedded test runners
Then all tests pass without failures or skipped cases
And real empirical command outputs are captured in audit documentation.
```

### Scenario 3: Git Submodule Sanitization
```gherkin
Given git status inspection of the repository
When evaluating lib/btstack/
Then git status reports clean with zero untracked directories or uncommitted drift.
```

### Scenario 4: Architectural Scorecard Elevation
```gherkin
Given the 12 architectural review dimensions from Codex
When evaluated against the comprehensive verification evidence
Then the final weighted scorecard achieves >= 9.2 / 10.0 across all categories.
```

---

## 3. Verification Traceability Matrix

| Acceptance Criteria | Verification Method | Pass Threshold |
|---|---|---|
| AC-MDRB-023-1: Multi-scale kinematic invariant grid | Native C TinyTest | 96/96 permutations green |
| AC-MDRB-023-2: Complete PBIO test suite pass | `test-pbio` execution | 100% pass, 0 skipped |
| AC-MDRB-023-3: Complete VirtualHub test suite pass | Python test runner | 100% pass |
| AC-MDRB-023-4: `lib/btstack/` submodule clean | Git status check | Working tree clean |
| AC-MDRB-023-5: Scorecard report published | Documentation audit | Overall score $\ge 9.2/10$ |
