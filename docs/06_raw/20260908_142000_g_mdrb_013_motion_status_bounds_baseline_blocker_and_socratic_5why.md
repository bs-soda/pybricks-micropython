# Socratic 5-Why Dialectic & Baseline Blocker Report: G-MDRB-013

**Timestamp:** `2026-09-08T14:20:00+07:00`
**Goal:** `G-MDRB-013` (Motion-Status Enum Boundary Validation & Failure State Contract)
**Epic:** `MDRB`
**Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Status:** `in_progress` · **Collaboration Phase:** `EXECUTE`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Executive Summary & Problem Formulation

In `lib/pbio/src/mdrobotbase.c:593-599`, `pbio_mdrobotbase_set_motion_status()` accepts any `pbio_mdrobotbase_motion_status_t` value and directly assigns it to `rb->motion_status`:

```c
pbio_error_t pbio_mdrobotbase_set_motion_status(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_status_t status) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->motion_status = status;
    return PBIO_SUCCESS;
}
```

Because C enums are treated as integer types, callers can pass any arbitrary or out-of-range integer (e.g. `-1`, `5`, `999`, or garbage memory values). The function uncritically writes this value into `rb->motion_status` and returns `PBIO_SUCCESS`. This corrupts internal finite state machine (FSM) tracking, causes undefined behavior in status query accessors (`stalled()`, `done()`, `status()`), and violates the fail-closed invariant.

---

## 2. Baseline Replication Blocker Verification

Running baseline validation checks reveals the following concrete blockers:
1. **Unconstrained Enum Assignment:** `pbio_mdrobotbase_set_motion_status()` does not inspect whether `status` belongs to `{PBIO_MDROBOTBASE_STATUS_NONE, RUNNING, COMPLETED, STALLED, TIMED_OUT}`.
2. **Register Corruption on Out-of-Bounds Input:** Passing integer `999` mutates `rb->motion_status` to `999` and returns `PBIO_SUCCESS`.
3. **Absence of Status Boundary Unit Tests:** `lib/pbio/test/src/test_mdrobotbase.c` does not contain a dedicated test asserting `PBIO_ERROR_INVALID_ARG` when out-of-bounds statuses are passed.

---

## 3. Five Distinct Socratic Branches through Level 5

### 🌿 Branch 1: Enum Whitelist Specification & Domain Bounds
- **Level 1 (Symptom):** Why does `pbio_mdrobotbase_set_motion_status` accept invalid status values?
  *Root:* It performs no validation on the input `status` argument before assigning to `rb->motion_status`.
- **Level 2 (First-Order Mechanism):** Why does C allow invalid integers to be passed to an enum parameter?
  *Root:* In C99, enumeration types are compatible with integer types, so callers can pass or cast arbitrary integers without compiler rejection.
- **Level 3 (Second-Order Coupling):** Why does an invalid status value disrupt higher-level controllers?
  *Root:* Higher-level callers rely on discrete lifecycle states (`NONE`, `RUNNING`, `COMPLETED`, `STALLED`, `TIMED_OUT`) to decide whether to await, cancel, or report errors.
- **Level 4 (Systemic Control):** Why is a `switch (status)` whitelist the optimal architectural guard?
  *Root:* A switch explicitly matches each valid enum case and routes all out-of-range, negative, or unmapped integers to `default: return PBIO_ERROR_INVALID_ARG;`.
- **Level 5 (Root Resolution):** How do we guarantee absolute adherence to the whitelist contract?
  *Root Resolution:* Implement explicit switch whitelist in `lib/pbio/src/mdrobotbase.c` and verify all 5 valid enums and multiple out-of-bounds integers in native tests.

### 🌿 Branch 2: State Immutability on Invalid Input
- **Level 1 (Symptom):** Why does invalid input corrupt existing status?
  *Root:* The assignment occurs unconditionally before any boundary validation is performed.
- **Level 2 (First-Order Mechanism):** Why must state remain unchanged when a write is rejected?
  *Root:* In transactional computing, a rejected modification must be atomic and produce zero state mutation.
- **Level 3 (Second-Order Coupling):** Why would a corrupted status register mislead application code?
  *Root:* If a robot is `RUNNING` and an invalid status write occurs, leaving the register in an invalid state could cause safety observers to miss active motor movements.
- **Level 4 (Systemic Control):** How is state immutability guaranteed in the setter?
  *Root:* The assignment `rb->motion_status = status;` is placed strictly inside the validated cases of the switch statement.
- **Level 5 (Root Resolution):** How is immutability verified in the test harness?
  *Root Resolution:* Initialize `rb` with status `RUNNING`, invoke setter with `999`, assert return code is `PBIO_ERROR_INVALID_ARG`, and assert `rb->motion_status == PBIO_MDROBOTBASE_STATUS_RUNNING`.

### 🌿 Branch 3: Negative and Boundary Value Rejection
- **Level 1 (Symptom):** Why are negative integers particularly hazardous for enum registers?
  *Root:* Negative integers may be interpreted as negative error codes or cause signed comparison bugs in user scripts.
- **Level 2 (First-Order Mechanism):** What are the exact boundary values surrounding the enum range $[0, 4]$?
  *Root:* The immediate boundaries are $-1$ (below `NONE: 0`) and $5$ (above `TIMED_OUT: 4`), as well as extreme bounds `INT32_MIN` and `INT32_MAX`.
- **Level 3 (Second-Order Coupling):** Why must both negative and positive boundaries be rejected?
  *Root:* Callers might pass signed error codes or uninitialized stack memory with arbitrary bit patterns.
- **Level 4 (Systemic Control):** Does the switch statement handle negative integers safely without undefined overflow?
  *Root:* Yes, C switch statements operate on the integer promotion of the enum argument and branch directly to `default:` for any value not in $\{0, 1, 2, 3, 4\}$.
- **Level 5 (Root Resolution):** How do we empirically verify boundary rejection?
  *Root Resolution:* Test $-1, -100, 5, 6, 100, 999$ in `test_mdrobotbase_motion_status_bounds` and confirm all return `PBIO_ERROR_INVALID_ARG`.

### 🌿 Branch 4: Null Handle Guarding
- **Level 1 (Symptom):** Why must `pbio_mdrobotbase_set_motion_status` check `if (!rb)`?
  *Root:* Passing a null pointer without checking would cause a fatal memory segmentation fault upon `rb->motion_status`.
- **Level 2 (First-Order Mechanism):** Why must null pointer check return `PBIO_ERROR_INVALID_ARG`?
  *Root:* PBIO library conventions dictate that invalid device pointer arguments return `PBIO_ERROR_INVALID_ARG`.
- **Level 3 (Second-Order Coupling):** Why must null handle checking strictly precede the enum switch?
  *Root:* Any access to `rb` before verifying non-null is unsafe.
- **Level 4 (Systemic Control):** Does the existing implementation already have a null check?
  *Root:* Yes, lines 594-596 check `if (!rb) return PBIO_ERROR_INVALID_ARG;`, which must be preserved alongside the new enum whitelist.
- **Level 5 (Root Resolution):** How is null handle safety verified?
  *Root Resolution:* Invoke `pbio_mdrobotbase_set_motion_status(NULL, PBIO_MDROBOTBASE_STATUS_RUNNING)` and verify it returns `PBIO_ERROR_INVALID_ARG` without faulting.

### 🌿 Branch 5: Zero-Mock Native Testing & Release Certification
- **Level 1 (Symptom):** Why can we not test status validation using synthetic mocks or dummy structs?
  *Root:* Article I of the Agentic Constitution strictly forbids mocks, stubs, and fallbacks.
- **Level 2 (First-Order Mechanism):** What concrete structures must be used for testing?
  *Root:* Real `pbio_mdrobotbase_t` instances allocated via `pbio_mdrobotbase_get_robotbase()` and backed by mock-free simulated servos in `lib/pbio/test/src/test_mdrobotbase.c`.
- **Level 3 (Second-Order Coupling):** How many tests in the MDRobotBase test suite must pass?
  *Root:* All 11 existing tests plus the new `test_mdrobotbase_motion_status_bounds` (total 12 tests) must pass with 0 skipped.
- **Level 4 (Systemic Control):** How does this link into master replication?
  *Root:* The master replication harness executes the compiled binary `build/test-pbio src/mdrobotbase/..` and verifies exact test counts and return codes.
- **Level 5 (Root Resolution):** How do we verify release readiness?
  *Root Resolution:* Run full 24-gate master replication runner and ensure 100% green attestation across all gates before requesting human review.

---

## 4. Planned Implementation Touch Map

1. **`lib/pbio/src/mdrobotbase.c`**: Refactor `pbio_mdrobotbase_set_motion_status` with strict `switch (status)` whitelist.
2. **`lib/pbio/test/src/test_mdrobotbase.c`**: Add `test_mdrobotbase_motion_status_bounds` and register in `pbio_mdrobotbase_tests`.
