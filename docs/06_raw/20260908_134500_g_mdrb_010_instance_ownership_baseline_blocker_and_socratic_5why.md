# 🏛️ G-MDRB-010 Baseline Blocker & Socratic 5-Why Dialectic Report

**Timestamp:** `2026-09-08T13:45:00+07:00`  
**Goal:** `G-MDRB-010` (Safe Robot-Base Instance Ownership & Duplicate Motor-Pair Rejection)  
**Epic:** `MDRB` (MDRobotBase Production Hardening)  
**Exact-HEAD Provenance:** `0d263eeb557161b97bfb214da3932e60408544d6`  
**Active Branch:** `feature/mdrobotbase-enhancement`  
**PR Target:** `epic/MDRB`  
**Constitution Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass), Article III (Structured Explanation Standard)  

---

## 1. Executive Summary & Baseline Replication Blocker

### Baseline Replication Blocker Description
In `lib/pbio/src/mdrobotbase.c:145-152`, `pbio_mdrobotbase_get_robotbase()` scans the pool for re-entrant matching instances with identical left and right servos. When found, it assigns `*rb_address = rb` and returns `PBIO_SUCCESS`:
```c
    // Check for re-entrant matching instances with identical left and right servos
    for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
        pbio_mdrobotbase_t *rb = &mdrobotbases[i];
        if (mdrobotbase_in_use[i] && rb->left == left && rb->right == right) {
            *rb_address = rb;
            return PBIO_SUCCESS;
        }
    }
```

### Critical Defect Dynamics
1. **Dangling Pointer & Use-After-Free Vulnerability:**
   When two high-level Python wrappers (e.g. `robot_a` and `robot_b`) are constructed with identical motor pairs, both receive pointers to the same native `pbio_mdrobotbase_t` slot. When `robot_a.close()` is called, `pbio_mdrobotbase_put_robotbase()` stops the motors, resets pointers, and marks the slot free (`mdrobotbase_in_use[slot] = false`). However, `robot_b` retains its pointer to that slot. Subsequent operations on `robot_b` dereference deallocated or reassigned memory, risking silent state corruption or hardware faults.
2. **Partial Motor Overlap Aliasing:**
   If instance 1 owns `(Port A, Port B)` and instance 2 requests `(Port A, Port C)`, the current loop fails to detect that `Port A` is already exclusively claimed. Both instances proceed to drive `Port A` simultaneously with conflicting control commands.
3. **Legacy Test Expectation Mismatch:**
   In `lib/pbio/test/src/test_mdrobotbase.c:320`, the test suite previously validated this flawed re-entrant acquisition by asserting `pbio_mdrobotbase_get_robotbase(...) == PBIO_SUCCESS` and `rb1_re == rb1`.

### Baseline Test Results
- Duplicate Allocation Rejection Check: **FAILED** (returns `PBIO_SUCCESS` instead of `PBIO_ERROR_BUSY`)
- Partial Motor Overlap Rejection Check: **FAILED** (allocates without detecting busy servo)
- Socratic Dialectic Evaluation: **Blocked pending C driver patch and test assertion updates**

---

## 2. Socratic 5-Why Recursive Dialectic Tree (5 Branches x Level 5)

```
G-MDRB-010 Root: Duplicate Motor-Pair Ownership & Slot Aliasing Hazard
├── Branch 1: Exclusive Motor-to-Drivebase 1:1 Invariant
│   ├── [L1] Why must duplicate motor pair allocations be rejected?
│   │   └── Finding: Dual Python wrappers sharing native slots leads to use-after-free upon single close.
│   ├── [L2] Why is re-entrant slot sharing a critical firmware hazard?
│   │   └── Finding: PBIO mdrobotbase lacks reference counting; put_robotbase immediately deallocates.
│   ├── [L3] Why must exact motor pair matching return PBIO_ERROR_BUSY?
│   │   └── Finding: Prevents aliased access by enforcing fail-closed single-ownership semantics.
│   ├── [L4] Why must partial motor overlap also return PBIO_ERROR_BUSY?
│   │   └── Finding: One physical motor cannot be driven by two independent kinematic control loops.
│   └── [L5] Level 5 Root Resolution: Does the driver enforce exclusive {left, right} intersection empty set?
│       └── Resolution: pbio_mdrobotbase_get_robotbase must scan all active slots for any matching servo pointer.
├── Branch 2: Fail-Closed Boundary Security & Memory Integrity
│   ├── [L1] Why must failed allocations fail closed without mutating destination pointer?
│   │   └── Finding: Callers must not receive non-NULL pointers on error returns.
│   ├── [L2] Why must the pool scan verify mdrobotbase_in_use before checking motor equality?
│   │   └── Finding: Inactive slots contain stale or NULL pointers that must not block new allocations.
│   ├── [L3] Why must motors be released when pbio_mdrobotbase_put_robotbase is executed?
│   │   └── Finding: Releasing motors allows subsequent legitimate reuse without restarting the hub.
│   ├── [L4] Why must closing one instance never affect other distinct instances?
│   │   └── Finding: Strict slot indexing and pointer bounds check ensure instance isolation.
│   └── [L5] Level 5 Root Resolution: Is memory hygiene completely verified across allocation lifecycles?
│       └── Resolution: Comprehensive lifecycle tests verify safe allocation, rejection, and re-allocation.
├── Branch 3: Zero Mocks & Zero Stubs (Article I Invariant)
│   ├── [L1] Why are mock test doubles forbidden under Article I?
│   │   └── Finding: Embedded hardware timing and pointer aliasing cannot be verified with mocks.
│   ├── [L2] Why must tests execute against concrete pbio_servo_t structures?
│   │   └── Finding: Only real servo structures reflect actual hardware state and control flags.
│   ├── [L3] How do mock-free tests detect pointer corruption that mocks conceal?
│   │   └── Finding: Concrete memory layouts trigger actual traps or assertion mismatches on aliasing.
│   ├── [L4] Why must static AST inspection confirm zero mocks across test files?
│   │   └── Finding: Continuous automated governance prevents regression to mock-based testing.
│   └── [L5] Level 5 Root Resolution: Is Article I fully satisfied across G-MDRB-010?
│       └── Resolution: 100% concrete compilable PBIO tests with zero mocks or stubs.
├── Branch 4: Negative Defect Sensitivity & Regression Detection
│   ├── [L1] Why must tests prove sensitivity by failing when a defect is introduced?
│   │   └── Finding: Tests that pass regardless of driver logic provide zero regression protection.
│   ├── [L2] Why must duplicate allocation with identical servos return PBIO_ERROR_BUSY?
│   │   └── Finding: Proves that the re-entrant sharing defect is permanently eliminated.
│   ├── [L3] Why must partial overlap allocation return PBIO_ERROR_BUSY?
│   │   └── Finding: Proves that cross-port motor theft is prevented.
│   ├── [L4] Why must releasing via put_robotbase allow subsequent re-acquisition?
│   │   └── Finding: Confirms that slots and motors are properly recycled without permanent lockout.
│   └── [L5] Level 5 Root Resolution: Are negative detection assertions empirically active?
│       └── Resolution: test_mdrobotbase_duplicate_motor_rejection asserts error codes and pointer NULLness.
└── Branch 5: Multi-Tier Integration & Release Gate Attestation
    ├── [L1] Why must PBIO C driver changes compile cleanly with zero warnings?
    │   └── Finding: Embedded compilers treat warnings as errors in release builds.
    ├── [L2] Why must the native PBIO unit test suite execute with 10/10 tests OK?
    │   └── Finding: Confirms zero regression across basic, turn, pivot, and trajectory suites.
    ├── [L3] Why must empirical episode latency remain strictly within the SLA?
    │   └── Finding: High-resolution timer proves execution finishes well under 10 seconds.
    ├── [L4] Why must measured kernel episode latency variance remain bounded?
    │   └── Finding: Consistent execution timing confirms absence of deadlocks or memory leaks.
    └── [L5] Level 5 Root Resolution: Is complete release readiness attested for G-MDRB-010?
        └── Resolution: Master replication runner validates all 25+ release gates with 100% attestation.
```

---

## 3. Remediation Strategy & Action Plan

1. **Modify `lib/pbio/src/mdrobotbase.c`:**
   - In `pbio_mdrobotbase_get_robotbase()`, remove re-entrant sharing logic.
   - Scan all active slots (`mdrobotbase_in_use[i]`). If `rb->left == left || rb->left == right || rb->right == left || rb->right == right`, immediately return `PBIO_ERROR_BUSY`.
2. **Update `lib/pbio/test/src/test_mdrobotbase.c`:**
   - In `test_mdrobotbase_instance_ownership()`, assert that re-allocating `(srv_a, srv_b)` returns `PBIO_ERROR_BUSY` and leaves target pointer `NULL`.
   - Add new test case `test_mdrobotbase_duplicate_motor_rejection()` testing:
     - Exact pair collision -> `PBIO_ERROR_BUSY`.
     - Partial overlap `(srv_a, srv_c)` -> `PBIO_ERROR_BUSY`.
     - Partial overlap `(srv_c, srv_b)` -> `PBIO_ERROR_BUSY`.
     - Put instance 1 -> subsequent allocation with `(srv_a, srv_b)` succeeds with `PBIO_SUCCESS`.
3. **Execute Verification:**
   - Run native C test binary (`./lib/pbio/test/build/test-pbio src/mdrobotbase/..`).
   - Run Socratic Agentic Loop harness (`scripts/harness/socratic-agentic-loop-g-mdrb-010-harness.mjs`).
   - Run Master Replication runner (`scripts/harness/master-replication-g-mdrb-010.mjs`).
