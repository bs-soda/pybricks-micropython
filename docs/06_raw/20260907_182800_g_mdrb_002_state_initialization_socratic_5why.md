# G-MDRB-002 Socratic 5-Why Dialectic & Baseline Blocker Report

**Goal ID:** G-MDRB-002
**Topic:** Complete State Initialization and Lifecycle Reset
**Epic:** MDRB (MDRobotBase Kinematics & Motion Engine)
**Date & Timestamp:** 2026-09-07T18:28:00+07:00
**Status:** `in_progress` (Collaboration Phase: `EXECUTE`)
**Git HEAD:** `0582aefe38928ed3fe7456775dc5784a901bd28b`
**Git Branch:** `feature/mdrobotbase-enhancement`
**Baseline State:** 11 Passed / 14 Failed (Initial Replication Blocker Recorded)

---

## 1. Frozen Baseline Blocker Manifest

Prior to implementing the C firmware routines for `G-MDRB-002`, the dialectic harness recorded 14 distinct causal node failures across Branches 1, 2, 3, and 4:

1. **Branch 1 (Struct Zeroing):**
   - Missing `pbio_mdrobotbase_init()` declaration in `lib/pbio/include/pbio/mdrobotbase.h`.
   - Missing `memset(rb, 0, sizeof(pbio_mdrobotbase_t))` in `lib/pbio/src/mdrobotbase.c`.
   - Uninitialized pivot PID gains (`kp_pivot`, `ki_pivot`, `kd_pivot`).
   - Uninitialized trajectory point counts and color prototypes array.
2. **Branch 2 (Transient Motion Reset):**
   - Missing `pbio_mdrobotbase_motion_reset()` declaration in `lib/pbio/include/pbio/mdrobotbase.h`.
   - Missing `pbio_mdrobotbase_motion_reset()` implementation in `lib/pbio/src/mdrobotbase.c`.
   - Unhandled motion reset dispatch in `pybricks/robotics/pb_type_mdrobotbase.c`.
   - Residual `stall_time_ms` and `turn_integral` accumulators crossing motion command boundaries.
3. **Branch 3 (Zero-Mock Hygiene):**
   - Missing `test_mdrobotbase_state_initialization` in `lib/pbio/test/src/test_mdrobotbase.c`.
   - Lack of 0xFF/0xAA dirty-memory re-initialization assertions.
4. **Branch 4 (Mutation Resistance):**
   - Lack of isolated test asserting failure when `memset` or `motion_reset` is omitted.

---

## 2. 5-Why Recursive Dialectic Tree (Targeted Resolution Plan)

```text
Branch 1: Complete Struct Zeroing & Uninitialized Field Elimination
  ├── Why 1: Partial initialization leaves >50 members uninitialized
  ├── Why 2: Padding bytes and nested arrays require memset(rb, 0, sizeof(*rb))
  ├── Why 3: Pivot gains kp_pivot, ki_pivot, kd_pivot were omitted from setup
  ├── Why 4: Trajectory point counts and calibration arrays must start at zero
  └── Why 5 (Root): Absolute zero-state determinism is required for safety-critical robotics control structures

Branch 2: Transient Motion Accumulators & False-Stall Prevention
  ├── Why 1: Residual stall_time_ms causes immediate false stalls on subsequent movements
  ├── Why 2: turn_integral windup causes massive overshoot on new turns
  ├── Why 3: pbio_mdrobotbase_motion_reset() must be invoked at every motion entry
  ├── Why 4: Motion reset must preserve persistent configuration while resetting transient state
  └── Why 5 (Root): Transient control state must never cross motion episode boundaries

Branch 3: Zero-Mock Embedded Verification & Byte-Level Hygiene
  ├── Why 1: Mocked structures cannot catch padding or dirty bit persistence bugs
  ├── Why 2: Memory must be pre-filled with 0xFF patterns before init to prove zero-leakage
  ├── Why 3: Pre-polluted motion accumulators must be explicitly verified to reset to 0.0f
  ├── Why 4: NULL pointer inputs must fail closed with PBIO_ERROR_INVALID_ARG
  └── Why 5 (Root): Empirical byte-level memory cleanliness must be proven against adversarial dirty patterns

Branch 4: Exact-HEAD Provenance, Baseline Freezing & Mutation Resistance
  ├── Why 1: Exact commit hash and feature branch prevent configuration drift
  ├── Why 2: Baseline blocker must be frozen before patches to prove authenticity
  ├── Why 3: Omitting memset must be proven to fail tests
  ├── Why 4: SHA-256 digests guarantee touch map boundary integrity
  └── Why 5 (Root): Empirical defensibility requires exact cryptographic provenance and falsifiable mutation resistance

Branch 5: Fail-Closed Continuous Integration, Episode Oracle & Release Gate
  ├── Why 1: Compiler warnings (-Werror) halt pipeline immediately
  ├── Why 2: Measured kernel episodes prove latency and repeatability
  ├── Why 3: Variance non-negativity and valid Student-t CI prove statistical rigor
  ├── Why 4: Human review sign-off is an unbypassable gate before marking done
  └── Why 5 (Root): Complete Socratic release gate is the ultimate guardian of robotics runtime safety
```

---

## 3. Execution Roadmap for G-MDRB-002
- Step 1: Update `lib/pbio/include/pbio/mdrobotbase.h` and `lib/pbio/src/mdrobotbase.c` with `pbio_mdrobotbase_init()` and `pbio_mdrobotbase_motion_reset()`.
- Step 2: Update `pybricks/robotics/pb_type_mdrobotbase.c` with motion reset calls at command entry points.
- Step 3: Add `test_mdrobotbase_state_initialization` in `lib/pbio/test/src/test_mdrobotbase.c`.
- Step 4: Recompile PBIO test runner and verify 100% green execution.
- Step 5: Run Socratic dialectic harness and verify 25/25 nodes pass with Level 5 root convergence.
