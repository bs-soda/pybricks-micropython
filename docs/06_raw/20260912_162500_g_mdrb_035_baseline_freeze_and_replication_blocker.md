# G-MDRB-035 Baseline Freeze & Initial Replication Blocker Record

**Document ID:** `docs/06_raw/20260912_162500_g_mdrb_035_baseline_freeze_and_replication_blocker.md`  
**Timestamp:** `2026-09-12T16:25:00+07:00`  
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target Goal:** `G-MDRB-035` (`Resilient Multi-Tier Instance Reclamation & RAII Lifecycle Management`)  
**Status:** **Certified Frozen Baseline & Blocker Recorded**  

---

## 1. Exact-HEAD Provenance & Baseline State

- **Pre-Implementation Git HEAD:** `6edb9750a98eeebbc706d7e38d6ed4cb2a23bd34`
- **Active Feature Branch:** `feature/mdrobotbase-enhancement`
- **Baseline Test Suite Status:**
  - VirtualHub Python Tests: 72 passed, 0 failed
  - Native PBIO Tests: 89 passed, 0 skipped
  - Submodule & Governance: 100% clean

---

## 2. Deterministic Blocker Replication

### Blocker 1: Inability to Re-Instantiate Identical Motor Pairs on Script Restart (`EBUSY`)
- **Location:** [`lib/pbio/src/mdrobotbase.c:153-161`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L153-L161)
- **Empirical Failure Code:**
  ```c
  for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
      pbio_mdrobotbase_t *rb = &mdrobotbases[i];
      if (mdrobotbase_in_use[i] &&
          (rb->left == left || rb->left == right ||
           rb->right == left || rb->right == right)) {
          return PBIO_ERROR_BUSY; // <--- Unconditionally rejects exact same pair
      }
  }
  ```
- **Replication Evidence:**
  When a user script crashes or terminates without `robot.close()`, `mdrobotbase_in_use[0]` remains `true`. Re-running the script attempts to re-allocate motors `(Port.A, Port.B)`. The loop encounters `rb->left == left`, immediately returns `PBIO_ERROR_BUSY`, and raises `OSError: [Errno 16] EBUSY: Device or resource busy`.

### Blocker 2: Absence of System Lifecycle De-initialization Hook in `main.c`
- **Location:** [`lib/pbio/src/main.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/main.c)
- **Empirical Evidence:**
  `pbio_main_start_application_resources()` and `pbio_main_stop_application_resources()` contain IMU reset and bluetooth task teardown, but have zero hooks for `mdrobotbase`. Hard program stops leave all robot slots locked indefinitely until a hardware reboot.

### Blocker 3: Absence of MicroPython RAII Context Manager Protocol
- **Location:** [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)
- **Empirical Evidence:**
  `pb_type_MDRobotBase` defines `close()`, but lacks `__enter__` and `__exit__`. Scripts cannot use `with MDRobotBase(...) as robot:`, making automatic resource reclamation upon unhandled exceptions impossible at the language level.

---

## 3. Socratic Agentic Loop Baseline Failure Output

Running `node scripts/harness/socratic-agentic-loop-g-mdrb-035-harness.mjs` against the frozen baseline produces **14 blockers**:
```text
▶ Branch 1: System Soft-Reset De-initialization Hook...
  [L1] FAIL: pbio_mdrobotbase_deinit is not declared in mdrobotbase.h
  [L2] FAIL: main.c does not invoke pbio_mdrobotbase_deinit
  [L3] FAIL: pbio_mdrobotbase_deinit does not call pbio_servo_stop
  [L4] FAIL: pbio_mdrobotbase_deinit is not hooked into both start and stop application resources
  [L5] FAIL: Slot cleanup does not reset in_use flag and closed status

▶ Branch 2: Re-entrant Exact-Pair Motor Re-binding...
  [L2] FAIL: Exact motor pair comparison (rb->left == left && rb->right == right) is missing
  [L3] FAIL: Motion cancellation on exact_slot re-binding is missing
  [L5] FAIL: Partial overlap is not isolated from exact match

▶ Branch 4: Python RAII Context Manager Protocol...
  [L1] FAIL: pb_type_mdrobotbase.c is missing __enter__ or __exit__
  [L3] FAIL: __exit__ does not invoke close
  [L4] FAIL: Context manager symbols are missing from locals_dict
  [L5] FAIL: VirtualHub is missing __enter__ or __exit__

▶ Branch 5: VirtualHub Parity & Episode Oracle Lifecycle Invariants...
  [L3] FAIL: test_mdrobotbase_lifecycle.py lacks context manager tests

📊 Summary: 11/25 Nodes Passed (14 Blockers Detected)
```

This establishes the formal pre-implementation baseline proving that the defect is reproducible, deterministic, and fully blocked prior to code modification.
