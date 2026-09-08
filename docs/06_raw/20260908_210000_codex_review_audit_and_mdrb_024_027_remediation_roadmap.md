# Codex Codebase Review Audit & MDRobotBase Final Remediation Roadmap (G-MDRB-024 – G-MDRB-027)

**Document ID:** `DOC-06RAW-20260908-MDRB-CODEX-AUDIT-024-027`  
**Timestamp:** `2026-09-08T21:00:00+07:00`  
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)  
**Corpus Name:** `bs-soda/pybricks-micropython`  
**Active Feature Branch:** `feature/mdrobotbase-enhancement`  
**Target Integration Branch:** `epic/MDRB`  
**Current HEAD:** `65c97fd8`  
**Baseline Score:** 8.7 / 10  
**Target Elevated Score:** 9.4 / 10  

---

## 1. Executive Summary & Review Audit

Following the completion and shipping of Goals `G-MDRB-019` through `G-MDRB-023` at commit `65c97fd8`, an in-depth architectural and code-level review by Codex evaluated the MDRobotBase engine.

The evaluation awarded an overall score of **8.7/10** (up from 8.1/10 and earlier 6.8/10), recognizing substantial hardening across instance ownership, lifecycle initialization, geometry validation, closed-object safety, trajectory validation, and regression test suites.

However, Codex identified 4 critical areas preventing immediate 9.4/10 release certification:
1. **P1 — The FSM is not the single source of truth:** Direct field mutations (`self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_...`) bypass the formal 5x5 FSM transition table in `pybricks/robotics/pb_type_mdrobotbase.c`.
2. **P2 — Motion dispatcher remains difficult to verify:** Monolithic `pb_type_mdrobotbase_motion_iterate_once()` contains 550+ lines across 4 motion types with duplicated terminal stop logic and tight coupling.
3. **P2 — Untracked `lib/btstack/` requires repository decision:** Provenance, licensing, and CI checkout reproducibility must be certified.
4. **P1 — Runtime tests still need to be executed & recorded:** Source code test presence must be substantiated with concrete runtime outputs, compiler warning audits, and sanitizer verification.

---

## 2. Area Scorecard Breakdown

| Area | Current Score | Status | Projected Score | Remediation Goal |
|---|---:|---|---:|---|
| **Instance ownership** | 9/10 | Pool allocation & foreign pointer safety verified | 10/10 | [`G-MDRB-019`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-019.md) |
| **Initialization** | 9/10 | Central initialization/reset comprehensive | 10/10 | [`G-MDRB-002`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-002.md) |
| **Geometry validation** | 9/10 | Bounds and finite-value validation present | 10/10 | [`G-MDRB-003`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-003.md) |
| **Gear-ratio math** | 9/10 | Explicit motor/wheel conversion helpers verified | 10/10 | [`G-MDRB-004`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-004.md) |
| **Motion control** | 8/10 | Monolithic dispatcher branch complexity | 10/10 | **`G-MDRB-025`** |
| **Async lifecycle** | 8/10 | FSM direct field assignment bypasses table | 10/10 | **`G-MDRB-024`** |
| **Closed-object safety** | 9/10 | 49 methods guarded by `require_open()` | 10/10 | [`G-MDRB-021`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-021.md) |
| **Error reporting** | 8/10 | Timeout and stall distinguished; needs unified terminal helper | 10/10 | **`G-MDRB-024`** |
| **Trajectory validation** | 9/10 | Invalid sizes, points, and coordinates rejected | 10/10 | [`G-MDRB-007`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/_archived/G-MDRB-007.md) |
| **Mathematical correctness** | 8/10 | Multi-scale tests implemented; runtime proof execution needed | 10/10 | **`G-MDRB-027`** |
| **Test coverage** | 9/10 | Extensive PBIO and VirtualHub test suites present | 10/10 | **`G-MDRB-027`** |
| **Maintainability** | 7/10 | Helper consistency improved; dispatcher requires modular sub-controllers | 9/10 | **`G-MDRB-025`** |
| **Repository Hygiene** | 8/10 | Submodule `lib/btstack` tracked; needs CI provenance attestation | 10/10 | **`G-MDRB-026`** |
| **Aggregate Score** | **8.7 / 10** | **Strong Release Candidate with 4 Remaining Gaps** | **9.4+ / 10** | **Epic MDRB Full Remediation** |

---

## 3. Four-Goal Atomic Remediation Architecture

### Goal 1: `G-MDRB-024` — Single-Source-of-Truth FSM Status Transition Engine & Terminal Helper Enforcement
- **Kind:** `feature`
- **Priority:** `P1`
- **Atomic Outcome:** Eliminate all 15 direct `self->rb->motion_status = ...` assignments in `pybricks/robotics/pb_type_mdrobotbase.c` and enforce state transitions strictly through validated transition helpers (`pb_type_mdrobotbase_mark_completed()`, `pb_type_mdrobotbase_mark_stalled()`, `pb_type_mdrobotbase_mark_timed_out()`) coupled atomically with `motion_in_progress` via `pbio_mdrobotbase_set_motion_status()`.
- **Target Files:**
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `lib/pbio/src/mdrobotbase.c`
  - `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
  - `docs/02-product/acceptance/G-MDRB-024.md`
- **Verification:** Unit tests proving that status transitions strictly follow the 5x5 FSM table, reject illegal cross-terminal jumps (`COMPLETED` -> `STALLED`), and keep `motion_status` and `motion_in_progress` 100% synchronized.

### Goal 2: `G-MDRB-025` — Motion Dispatcher Modularization & Sub-Controller Decomposition
- **Kind:** `feature`
- **Priority:** `P2`
- **Atomic Outcome:** Decompose monolithic 550-line `pb_type_mdrobotbase_motion_iterate_once()` by extracting isolated, testable sub-controllers (`mdrobotbase_step_navigate()`, `mdrobotbase_step_turn()`, `mdrobotbase_step_pivot()`, `mdrobotbase_step_trajectory()`) with shared wheel velocity conversion (`mdrobotbase_drive_wheels()`) and unified terminal stop handling.
- **Target Files:**
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `tests/virtualhub/robotics/test_mdrobotbase_turn.py`
  - `tests/virtualhub/robotics/test_mdrobotbase_trajectory.py`
  - `docs/02-product/acceptance/G-MDRB-025.md`
- **Verification:** Independent unit verification of each sub-controller with zero regression across all differential drive motions.

### Goal 3: `G-MDRB-026` — Submodule Provenance, License Attestation & CI Reproducibility Certification
- **Kind:** `chore`
- **Priority:** `P2`
- **Atomic Outcome:** Attest `lib/btstack/` submodule tracking, licensing, commit provenance, and CI checkout reproducibility in GitHub Actions workflow, verifying zero submodule drift across clean checkouts.
- **Target Files:**
  - `.gitmodules`
  - `.github/workflows/ci.yml`
  - `scripts/ci/submodule-check.sh`
  - `docs/02-product/acceptance/G-MDRB-026.md`
- **Verification:** Automated CI script asserting `git status --porcelain` is empty after submodule init and checkout matches exact commit `5d9c4498...`.

### Goal 4: `G-MDRB-027` — Multi-Environment Runtime Execution Matrix, Compiler Warning Audit & Final Scorecard Attestation
- **Kind:** `qa`
- **Priority:** `P1`
- **Atomic Outcome:** Execute and empirically capture unified runtime test suites across native PBIO (TinyTest) and VirtualHub runners with compiler warning audit (`-Wall -Wextra -Werror`), sanitizer verification, and final scorecard attestation reaching $\ge 9.4/10$.
- **Target Files:**
  - `lib/pbio/test/src/test_mdrobotbase.c`
  - `tests/virtualhub/robotics/`
  - `docs/06_raw/`
  - `docs/02-product/acceptance/G-MDRB-027.md`
- **Verification:** 100% green execution across all test targets with raw execution logs, compiler zero-warning confirmation, and published release certificate.

---

## 4. Goal Template & Conformance Harness Enhancements

To guarantee that newly drafted goals and future epics adhere to these architectural invariants:
1. **`docs/07-backlog/goals/_template.md` Enhancements:**
   - Add explicit `### Scorecard & Baseline Evidence` template block in Context.
   - Add 4 new architectural checklist items in `## Spec checklist`:
     - FSM Single Source of Truth (no direct state field mutations).
     - Submodule & Repository Cleanliness (zero uncommitted or untracked drift).
     - Dispatcher Modularity (sub-controllers decoupled with shared converters).
     - Multi-Environment Runtime Proof (exact execution commands and logs).
2. **`scripts/harness/goal-template-conformance-harness.mjs` Enhancements:**
   - Validate that new and active goal specifications include `### Scorecard & Baseline Evidence` and all required frontmatter metadata.
3. **`scripts/harness/mdrobotbase-epic-harness.mjs` Enhancements:**
   - Expand `EPIC_GOALS` array from 23 to 27 goals (`G-MDRB-001` to `G-MDRB-027`).
   - Validate zero mocks, touch map integrity, and conformance across all 27 goals.
