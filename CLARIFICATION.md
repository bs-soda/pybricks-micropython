# MDRobotBase Epic Hardening & Codex Remediation — Clarification State Machine

**Session ID:** `2825f1e8-2b5b-47e9-a98e-357aa3c3ef66`  
**Current State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Timestamp:** `2026-09-08T19:15:00+07:00`  
**Review Baseline:** Codex Review (`HEAD: ebfc3e53`, Score: `8.1/10`)  
**Target Score:** `9.2–9.3/10`  

---

## 👁️ Fact vs. Assumption Audit

### `[OBSERVED_FACTS]`
1. **Codex Review Scorecard**: 8.1/10 overall across 12 dimensions (`HEAD: ebfc3e53`, `branch: feature/mdrobotbase-enhancement`).
2. **P1 Finding 1 (Unsafe Pointer Comparisons)**: `lib/pbio/src/mdrobotbase.c:187-195` performs relational comparisons on pointers (`rb < &mdrobotbases[0]`) and pointer subtraction (`rb - &mdrobotbases[0]`) which are undefined behavior in ISO C99 §6.5.8 on unrelated objects.
3. **P1 Finding 2 (Decoupled Motion Status Setter)**: `lib/pbio/src/mdrobotbase.c:589-604` mutates `rb->motion_status` without atomically coupling `rb->motion_in_progress`, allowing contradictory states (`COMPLETED` with `busy=true`).
4. **P1 Finding 3 (Closed-Object Safety Audit)**: `pybricks/robotics/pb_type_mdrobotbase.c:2305-2405` contains 49 methods in `_robotics_MDRobotBase_locals_dict_table`. Secondary color calibration helpers (`reset_color_calibration`, `set_color_baseline`, `set_color_threshold`, `add_color_prototype`, `classify_color`) lack uniform `pb_type_mdrobotbase_require_open()` checks.
5. **P1 Finding 4 (Motion Preemption Behavioral Proof)**: Turn and pivot motion dispatch paths lack end-to-end behavioral tests proving that invalid replacement commands (e.g. `speed <= 0`, non-finite angles) raise `ValueError` without stopping or resetting active physical motion.
6. **P2 Finding 5 (Multi-Scale Invariants & Empirical Verification)**: Kinematic invariants must be recorded across multi-scale parameter sweeps ($R \in [0.2, 10.0]$, wheel diameters $30\text{ mm}$–$120\text{ mm}$, axle track $80\text{ mm}$–$240\text{ mm}$) and `lib/btstack/` submodule status cleaned to achieve 9.2+/10.
7. **Epic Structure**: Epic `MDRB` registered in `docs/07-backlog/goal-id-registry.yaml` and `docs/07-backlog/queues/MDRB.md`. Goals `G-MDRB-019` through `G-MDRB-023` have been generated and pass 100% of all 34 template conformance invariants (`scripts/harness/mdrobotbase-epic-harness.mjs`: 202/202 pass).

### `[UNDETERMINED_DYNAMICS]`
- *All architectural and requirement dynamics have been resolved into concrete, atomic goals and test harnesses.*

---

## 🎯 Point-by-Point Alignment Matrix

### Question 1: Atomic Goal Decomposition for Codex Findings
How should Codex's 5 findings be structured into backlog goals?
- [x] **(Recommended) Option A:** Decompose into 5 atomic, single-responsibility goals:
  - `G-MDRB-019`: Portable `uintptr_t` address bounds & modulo alignment validation in `put_robotbase()`.
  - `G-MDRB-020`: Formal finite state machine transition table with atomic `motion_status` and `motion_in_progress` coupling.
  - `G-MDRB-021`: Exhaustive audit of all 49 methods in the locals dictionary ensuring `require_open()` and idempotent `close()`.
  - `G-MDRB-022`: Behavioral preemption safety proofs proving active motion continuity under invalid turn/pivot/nav/trajectory dispatches.
  - `G-MDRB-023`: Multi-scale kinematic parameter sweeps, git submodule hygiene, and final scorecard elevation to 9.2+/10.
- [ ] **Option B:** Combine all findings into a single monolithic goal.

### Question 2: Zero-Mock & Article I Invariant Enforcement
How should testing and verification be executed across the new goals?
- [x] **(Recommended) Option A:** Zero mocks, zero stubs, zero dummy fallbacks. Concrete C TinyTest and VirtualHub Python executions with measured kernel episode statistics and 95% Student-t confidence intervals.
- [ ] **Option B:** Synthetic mock objects and simulated stubs.

### Question 3: Release Gating & Provenance
How should each goal verify release readiness?
- [x] **(Recommended) Option A:** 7 Enterprise Release Gates per goal (Exact-HEAD Provenance, Touch Map SHA-256 digests, Native Test Suite, Domain Specification Invariants, Measured Kernel Episodes, Socratic Agentic Loop 25/25 Dialectic Nodes, BDD Acceptance Matrix).
- [ ] **Option B:** Ad-hoc manual verification.

---

## 📝 User Write-In Feedback
*(All questions aligned. State transitioned to ALIGNMENT_COMPLETE_READY_FOR_EXECUTION).*

```text
Status: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION
Remaining Ambiguities: 0
```
