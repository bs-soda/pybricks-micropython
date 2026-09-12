# MDRobotBase Resilient Instance Reclamation & EBUSY Resolution Specification

**Document ID:** `docs/06_raw/20260912_150500_ebusy_reclamation_architecture_clarification.md`  
**Timestamp:** `2026-09-12T15:05:00+07:00`  
**Target Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Active Branch:** `feature/mdrobotbase-enhancement`  
**Clarification Session ID:** `302d2e56-9574-46cf-ad58-6c4733d0b9f4`  
**Status:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Allocated Goal ID:** `G-MDRB-035`  

---

## 1. Context & Cascading Defect Synthesis

The human operator reported:
> `found bug EBUSY: Device or resource busy`

Following the preceding `ETIMEDOUT: time out` investigation, the architectural connection between the two errors was confirmed:
- **Primary Trigger:** Unhandled motion timeout (`ETIMEDOUT`) crashes the Python script before reaching `robot.close()`.
- **Secondary Symptom (`EBUSY`):** When the script is re-run, `pbio_mdrobotbase_get_robotbase()` scans active slots in `lib/pbio/src/mdrobotbase.c`. Because the previous instance was never freed, the motors are flagged as occupied, returning `PBIO_ERROR_BUSY` (mapped to `MP_EBUSY` / errno 16 via `pybricks/util_pb/pb_error.c`).
- **Underlying Architectural Gap:** Lack of lifecycle de-initialization in `lib/pbio/src/main.c`, absence of automatic re-binding for identical motor pairs, and missing RAII context manager support in MicroPython.

---

## 2. Agreed Architectural Remedy: Multi-Tier Automatic Reclamation

1. **System Soft-Reset Hook:**
   Add `pbio_mdrobotbase_deinit(void)` to:
   - `pbio_main_start_application_resources()`: guarantees clean initial state upon script launch.
   - `pbio_main_stop_application_resources()`: guarantees all motor slots are unlocked upon script termination or crash.
2. **Re-entrant Exact-Pair Reinitialization:**
   Modify `pbio_mdrobotbase_get_robotbase()` in `lib/pbio/src/mdrobotbase.c`:
   - If an allocation request matches an existing active slot with the **exact same motor pair** (`rb->left == left && rb->right == right`), stop any pending motion, re-initialize the slot parameters, and return that slot cleanly instead of failing with `PBIO_ERROR_BUSY`.
   - If a request partially overlaps (e.g. shares only one motor with an active drivebase), preserve strict fail-closed safety by returning `PBIO_ERROR_BUSY`.
3. **Python RAII Context Manager:**
   Implement `__enter__` and `__exit__` on `MDRobotBase` in both C bindings (`pb_type_mdrobotbase.c`) and VirtualHub (`robotics.py`).
4. **VirtualHub Parity:**
   Enforce instance slot limits and motor exclusivity in `tests/virtualhub/robotics/pybricks/robotics.py`.

---

## 3. Atomic Goal Specification: `G-MDRB-035`

- **Goal ID:** `G-MDRB-035`
- **Title:** Resilient Multi-Tier Instance Reclamation & RAII Lifecycle Management
- **Epic:** `MDRB`
- **Kind:** `feature`
- **Priority:** `P1`
- **Touch Map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `lib/pbio/src/main.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`
  - `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
  - `lib/pbio/test/src/test_mdrobotbase.c`
- **Acceptance Criteria:**
  - Re-running a script after an unhandled exception cleanly re-binds identical motor pairs with 0 `EBUSY` errors.
  - Partial motor overlap (aliasing 1 motor across 2 bases) continues to fail closed with `PBIO_ERROR_BUSY`.
  - `with MDRobotBase(...) as robot:` automatically closes and releases slots upon block exit.
