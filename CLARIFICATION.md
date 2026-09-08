# MDRobotBase Epic Hardening & Goal Template Enhancement — Clarification State Machine

**Session ID:** `2825f1e8-2b5b-47e9-a98e-357aa3c3ef66`  
**Current State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Timestamp:** `2026-09-07T15:10:00+07:00`

---

## 👁️ Fact vs. Assumption Audit

### `[OBSERVED_FACTS]`
1. `lib/pbio/src/mdrobotbase.c` defines `static pbio_mdrobotbase_t mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES];` and unconditionally assigns `&mdrobotbases[0]`.
2. `lib/pbio/src/mdrobotbase.c` ignores `rb->gear_ratio` during odometry distance and angle integration in `pbio_mdrobotbase_update_state()`.
3. `pybricks/robotics/pb_type_mdrobotbase.c` returns `PBIO_SUCCESS` when a motion times out or stalls, preventing Python callers from intercepting failure.
4. `docs/07-backlog/goals/_template.md` exists and defines the 31-section Soda OS goal standard, but requires explicit adaptation for embedded C / robotics kinematics.
5. `scripts/harness/goal-template-conformance-harness.mjs` validates goals, and `scripts/harness/test-goal-template-harness.mjs` had a path assumption that failed on local test runs.

### `[UNDETERMINED_DYNAMICS]`
1. **Epic Slug & Scope**: Should the new epic be registered as `MDRB` (MDRobotBase) with queue `queues/MDRB.md`, while retaining goal IDs `G-002` through `G-007` to match Codex's exact scorecard breakdown?
2. **Allocation Failure Strategy for Multi-Instance (G-002)**: If more than `PBIO_CONFIG_NUM_MDROBOTBASES` instances are requested, should PBIO return `PBIO_ERROR_BUSY` (or `PBIO_ERROR_NOT_SUPPORTED`), or dynamically track free slots?
3. **Stall & Timeout Error Representation in MicroPython (G-006)**: When a motion stalls or times out, should MicroPython raise an explicit exception (e.g. `OSError(ETIMEDOUT)` / `TimeoutError`), or provide a return status code dictionary?

---

## 🎯 Point-by-Point Multiple-Choice Alignment Matrix

### Question 1: Epic Registration & ID Namespace Mapping
How should the MDRobotBase hardening goals be organized in Soda OS?
- [x] **(Recommended) Option A:** Register Epic slug `MDRB` (*MDRobotBase Drivebase Engine & Kinematics Hardening*) in `docs/07-backlog/epics.md`, create `docs/07-backlog/queues/MDRB.md`, and establish cards `G-002.md` through `G-007.md` under `docs/07-backlog/goals/` linked from `MDRB.md`.
- [ ] **Option B:** Keep all goals exclusively under legacy `CORE` queue (`docs/07-backlog/queues/CORE.md`) without registering a new epic slug.

### Question 2: Goal Work Steps Granularity & Zero-Mock Invariant
How should each of the 6 atomic goals (G-002 to G-007) format work steps?
- [x] **(Recommended) Option A:** 100% concrete, atomic work steps containing `Allowed files:`, ordered `Actions:`, explicit `Completion gate:`, and blocking `Stop condition:`, verified by an automated epic conformance harness (`scripts/harness/mdrobotbase-epic-harness.mjs`).
- [ ] **Option B:** High-level narrative work steps without machine-verifiable gates.

### Question 3: Motion Error Handling Strategy (G-006)
How should `pb_type_mdrobotbase_motion_iterate_once()` propagate timeouts and stalls to MicroPython?
- [x] **(Recommended) Option A:** Return `PBIO_ERROR_TIMEDOUT` on timeout and `PBIO_ERROR_FAILED` (or `PBIO_ERROR_AGAIN` until failure threshold) on stall, mapped in MicroPython to raise `OSError(ETIMEDOUT)` or `RuntimeError` rather than silently returning success.
- [ ] **Option B:** Return a boolean or state tuple without raising an exception.

---

## 📝 User Write-In Feedback
*(You may edit checkboxes or add notes below, then notify Antigravity to transition state).*

```text

```
