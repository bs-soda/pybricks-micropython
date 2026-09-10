# G-MDRB-024 Socratic Dialectic Analysis & FSM State Machine Hardening

**ISO Timestamp:** `2026-09-08T21:05:00+07:00`
**Author:** AI Agentic Pair (Sodality OS / Antigravity)
**Goal:** [`G-MDRB-024: Single-Source-of-Truth FSM Status Transition Engine & Terminal Helper Enforcement`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-024.md)
**Acceptance Contract:** [`docs/02-product/acceptance/G-MDRB-024.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/02-product/acceptance/G-MDRB-024.md)
**Exact-HEAD Git Commit:** `cae84f3f`
**Status:** In Progress (Red Phase Baseline)

---

## 1. Executive Summary & Problem Formulation

Codex's September 2026 architectural review of the WRO MatMetric / Pybricks robotics engine identified a major architectural defect (P1 Finding):
> **P1 — The FSM is not the single source of truth**
> The code defines and tests a motion-status transition table, but production motion paths directly assign status fields:
> ```c
> self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;
> self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;
> self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT;
> ```
> The FSM therefore governs the public setter, but not the actual completion, stall, and timeout transitions.

A rigorous static analysis audit revealed exactly **15 direct mutation call sites** in `pybricks/robotics/pb_type_mdrobotbase.c`:
1. `Line 169`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT;`
2. `Line 205`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
3. `Line 230`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;`
4. `Line 271`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
5. `Line 469`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;`
6. `Line 492`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
7. `Line 545`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;`
8. `Line 575`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
9. `Line 628`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;`
10. `Line 652`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
11. `Line 671`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;`
12. `Line 1307`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;`
13. `Line 1547`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;`
14. `Line 1732`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;`
15. `Line 1939`: `self->rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;`

These raw assignments bypass the deterministic 5x5 transition table `mdrobotbase_fsm_transition_table` and fail to atomically synchronize `rb->motion_in_progress`, allowing dangerous race conditions and illegal state transitions.

---

## 2. Mathematical Formalization & Invariants

### 2.1 The Atomic Coupling Invariant
For any reachable robot base state $S \in \mathcal{S}$:
$$\text{motion\_in\_progress} \iff (\text{motion\_status} == \text{PBIO\_MDROBOTBASE\_STATUS\_RUNNING})$$

Under direct assignments, if `motion_status` is assigned without resetting `motion_in_progress`, an external caller invoking `robot.done()` observes `False` even though the motion has already completed or stalled, or vice-versa.

### 2.2 The Valid Transition Invariant
Let $\mathcal{T}: \mathcal{S} \times \mathcal{S} \to \{0, 1\}$ be the 5x5 Boolean transition matrix.
For any attempted transition $S_{\text{current}} \to S_{\text{next}}$:
$$\text{Valid}(S_{\text{current}} \to S_{\text{next}}) \iff \mathcal{T}[S_{\text{current}}][S_{\text{next}}] = 1$$
If $\mathcal{T}[S_{\text{current}}][S_{\text{next}}] = 0$, the state machine must reject the transition, return `PBIO_ERROR_INVALID_OP`, and guarantee:
$$S_{\text{current}}' = S_{\text{current}} \quad \text{and} \quad \text{motion\_in\_progress}' = \text{motion\_in\_progress}$$

---

## 3. Socratic 5-Why Dialectic Analysis (5 Branches x Level 5)

### Branch 1: FSM Single Source of Truth & Zero Direct Mutations
- **Why 1:** Why must status changes avoid direct struct field assignment?
  *Because direct assignment bypasses validation logic, allowing arbitrary state corruption.*
- **Why 2:** Why is validation essential for simple status updates?
  *Because terminal states (`COMPLETED`, `STALLED`, `TIMED_OUT`) have strict entry and exit semantics.*
- **Why 3:** Why can't callers be trusted to follow semantics without compiler/runtime enforcement?
  *In a large codebase with multiple motion routines (drive, turn, curve, trajectory), manual updates will inevitably drift or omit flags.*
- **Why 4:** Why must transition functions reside in the PBIO driver core?
  *To establish a single, canonical gate that cannot be bypassed from any binding layer.*
- **Why 5 (Root Resolution):** How is single source of truth mathematically proven?
  *By asserting that 100% of status modifications route through `pbio_mdrobotbase_set_motion_status()` and zero regex matches for direct assignment remain.*

### Branch 2: Atomic State & Progress Coupling
- **Why 1:** Why must `motion_in_progress` be coupled with `motion_status`?
  *To ensure `is_busy()` and `status()` never report contradictory states.*
- **Why 2:** Why can't they be updated sequentially in separate statements?
  *MicroPython coroutines yield cooperatively; a yield or interruption between two assignments exposes an inconsistent intermediate state.*
- **Why 3:** Why does `mark_running()` require atomic coupling?
  *If starting a motion encounters invalid parameters and fails, `motion_in_progress` must not be left set to `true`.*
- **Why 4:** Why must terminal helpers unconditionally clear `motion_in_progress`?
  *Because a finished, stalled, or timed-out robot is by definition no longer in progress.*
- **Why 5 (Root Resolution):** How is atomic coupling invariant verified?
  *By unit tests asserting that $\forall S, \text{is\_busy}(S) == (\text{status}(S) == \text{RUNNING})$.*

### Branch 3: Illegal Transition Rejection & Fail-Closed Safety
- **Why 1:** Why must cross-terminal transitions (e.g. `COMPLETED` -> `STALLED`) fail?
  *A motion that has completed cannot subsequently become stalled.*
- **Why 2:** Why shouldn't the driver silently ignore illegal transitions?
  *Silent failure masks algorithmic errors in upper-level control loops.*
- **Why 3:** Why must `PBIO_ERROR_INVALID_OP` be returned?
  *It signals an operation contrary to the current system state, standard in embedded POSIX and PBIO.*
- **Why 4:** Why must the state remain unchanged on error?
  *To preserve diagnostic context and prevent state machine deadlocks.*
- **Why 5 (Root Resolution):** How is fail-closed safety verified?
  *By testing the complete negative transition submatrix in native C unit tests.*

### Branch 4: Complete Touch Map & Call Site Remediation
- **Why 1:** Why must all 15 call sites be remediated in a single goal?
  *Partial refactoring leaves dead branches with unvalidated state transitions.*
- **Why 2:** Why use static helper wrappers in `pb_type_mdrobotbase.c`?
  *To keep the call sites concise and readable while enforcing delegation to PBIO.*
- **Why 3:** Why must timeout checks invoke `mark_timed_out`?
  *To distinguish timeouts from normal completions and stalls.*
- **Why 4:** Why must stall branches invoke `mark_stalled`?
  *To trigger appropriate recovery behavior in user scripts.*
- **Why 5 (Root Resolution):** How is call site remediation proven?
  *By compiling with zero warnings and validating with static analysis that exactly 0 direct assignments remain.*

### Branch 5: Article I Zero-Mock Invariant & Multi-Environment Verification
- **Why 1:** Why are mocks forbidden?
  *Mocks test assumptions, not reality; they frequently mask memory alignment and pointer bugs.*
- **Why 2:** Why run both native PBIO tests and VirtualHub tests?
  *PBIO tests verify C-level mechanics; VirtualHub tests verify Python binding semantics.*
- **Why 3:** Why measure kernel episodes and confidence intervals?
  *To detect performance regressions and timing anomalies in motor control loops.*
- **Why 4:** Why enforce exact-HEAD provenance?
  *To ensure all test evidence corresponds to the exact committed artifact.*
- **Why 5 (Root Resolution):** How is scorecard elevation to 9.4/10 achieved?
  *By systematically addressing all four Codex review findings with verifiable evidence.*

---

## 4. Next Steps
1. Run initial baseline tests to record the expected replication failure (Red phase).
2. Implement transition helpers in `lib/pbio/src/mdrobotbase.c` and header.
3. Replace all 15 call sites in `pybricks/robotics/pb_type_mdrobotbase.c`.
4. Add C and Python test cases.
5. Re-run all test harnesses and release gates (Green phase).
