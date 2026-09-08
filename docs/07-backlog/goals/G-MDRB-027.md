# G-MDRB-027: Multi-Environment Runtime Test Execution Matrix, Compiler Warning Audit & Final Scorecard Attestation

**Status:** draft  
**Kind:** qa  
**Atomic outcome:** Execute and record unified runtime test suites across native PBIO and VirtualHub runners, audit zero compiler warnings, and publish final scorecard attestation elevating MDRobotBase to 9.4+/10  
**Epic:** MDRB  
**Depends on:** G-MDRB-026  
**Blocks:** —  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Runtime Test Matrix & Compiler Audit Specification | pending |
| 2 | Execute PBIO, VirtualHub, and Compiler Warning Test Pass | pending |
| 3 | Publish Release Proofs and Elevate Architectural Scorecard to 9.4+/10 | pending |

## Context

In Codex's latest review (September 2026), the MDRobotBase engine achieved an 8.7/10 rating, with the finding: "Runtime tests still need to be executed... source-level test presence is not proof. The current review has not established that the complete PBIO and VirtualHub suites compile and pass together. Required release evidence: PBIO test target output, VirtualHub test output, compiler warning output, sanitizer/static-analysis output, test environment and commit hash."
This goal executes the full battery across both test environments, captures exact terminal outputs, audits for zero compiler warnings, and publishes the formal release certification elevating MDRobotBase to **9.4+/10**.

### Scorecard & Baseline Evidence
- **Current score:** 8.7/10 (Overall MDRobotBase engine) · **Expected score:** 9.4/10
- **Exact evidence:** Codex Architectural Review (September 2026) release recommendation
- **Root cause:** Test suites existed in source, but unified execution across both native C and VirtualHub environments had not been captured in a single release attestation document.
- **Reproduction steps:**
  1. Compile PBIO test target `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`.
  2. Execute VirtualHub tests `python3 -m unittest discover tests/virtualhub/robotics/`.
  3. Compile firmware with `-Wall -Wextra -Werror` and verify zero warnings.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Autonomous competition firmware must be proven by empirical runtime execution data rather than source code presence alone.  
**Done when:** All native and virtual test suites pass with recorded empirical logs, the compiler emits zero warnings, and an audited release certification elevates the overall architectural score to 9.4+/10.  
**Unblocks:** — (Epic MDRB 100% full closeout)

## Atomicity & Zero-Mock Contract

- **One outcome:** Execute the complete runtime test matrix, audit compiler warnings, and publish final scorecard attestation.
- **No decomposition leakage:** Specific bugfixes belong to G-MDRB-024 through G-MDRB-026.
- **Concrete execution:** 100% concrete native binary execution and VirtualHub simulation. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified using measured kernel execution episodes and real terminal command outputs.
- **Failure behavior:** Any test failure, compiler warning, or score $< 9.4/10$ blocks completion.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** —

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [ ] [NEEDS CLARIFICATION: Should AddressSanitizer (ASan) and UndefinedBehaviorSanitizer (UBSan) runs be included in PBIO test target?]

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-UNVERIFIED-RUNTIME |
| **Decisions** | PDR-MDRB-UNIFIED-RUNTIME-MATRIX |
| **Assumptions required** | A-DETERMINISTIC-SIMULATION-TICKS |
| **Evidence** | Codex Architectural Review release criteria (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Empirical Release Attestation, Zero-Warning Build Hygiene |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-027.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | qa |
| **Task type** | qa |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | qa |
| **Files** | `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py` · `docs/06_raw/` |
| **Constraints** | Zero compiler warnings, 100% green tests, score $\ge 9.4/10$ |

## Work steps

### Step 1 — Runtime Test Matrix & Compiler Audit Specification

**Allowed files:** `docs/07-backlog/goals/G-MDRB-027.md` · `docs/02-product/acceptance/G-MDRB-027.md`  
**Actions:**
1. Define the empirical verification matrix spanning native PBIO TinyTest, VirtualHub robotics, and compiler warning checks.
2. Formulate Given-When-Then BDD scenarios in `docs/02-product/acceptance/G-MDRB-027.md`.
3. Specify release proof artifact structure in `docs/06_raw/`.
**Completion gate:** Acceptance contract exists defining exact runtime execution gates.  
**Stop condition:** Ambiguity in required test targets or compiler flags.

### Step 2 — Execute PBIO, VirtualHub, and Compiler Warning Test Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c` · `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`  
**Actions:**
1. Run `./lib/pbio/test/build/test-pbio src/mdrobotbase/..` and record output.
2. Run `python3 -m unittest discover tests/virtualhub/robotics/` and record output.
3. Run compiler check ensuring zero warnings under `-Wall -Wextra`.
4. Verify all tests pass with 0 failures and 0 skips.
**Completion gate:** 100% green test execution across all targets.  
**Stop condition:** Any failed test or compiler warning.

### Step 3 — Publish Release Proofs and Elevate Architectural Scorecard to 9.4+/10

**Allowed files:** `docs/06_raw/`  
**Actions:**
1. Generate formal release certification document in `docs/06_raw/` with exact terminal logs, commit SHA, and environment metadata.
2. Recalculate scorecard across all 12 architectural categories demonstrating $\ge 9.4/10$.
3. Publish final release certification.
**Completion gate:** Published certification report confirming score $\ge 9.4/10$.  
**Stop condition:** Final calculated score $< 9.4/10$.

## In

- Unified runtime test execution across native PBIO and VirtualHub environments.
- Compiler warning audit guaranteeing clean compilation.
- Publication of empirical release proofs and scorecard elevation to 9.4+/10.

## Out

- Altering robot base control algorithms.
- Modifying MicroPython virtual machine core.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| Docs | Add | `docs/06_raw/` — Add final 9.4+ scorecard attestation report |
| Tests | Update | `lib/pbio/test/src/test_mdrobotbase.c` — Record multi-scale execution output |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `robot-kinematics-engine` / `sre-control-plane` |
| **Bounded Context & Domain** | Quality Assurance & Release Governance |
| **Ports & Adapters Topology** | Driving Inbound: CI Test Matrix Pipeline <br> Driven Outbound: Audit Documentation Ledger |
| **State Machine & Invariants** | Release Gate Invariant: $\text{Gate}(\text{All}) == \text{PASS} \implies \text{Score} \ge 9.4/10$. |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero mocks or test doubles. |
| **Socratic 5-Why Blueprint** | Dialectic Report: `docs/06_raw/20260908_210000_codex_review_audit_and_mdrb_024_027_remediation_roadmap.md` |

## Spec checklist

- [ ] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [ ] How is empty while `draft`; filled in PLAN after clarify
- [ ] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [ ] No `[NEEDS CLARIFICATION]` left in Open questions
- [ ] In / Out unambiguous; Out matches Scope Out
- [ ] Acceptance criteria each testable or reviewable
- [ ] Touch map is real repo paths
- [ ] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [ ] Change delta filled if modifying existing behaviour
- [ ] Critical-path assumptions are not `open` + `low`
- [ ] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [ ] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [ ] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [ ] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [ ] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [ ] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [ ] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)

## Acceptance criteria

- [ ] Native PBIO MDRobotBase test suite executes with 21/21 passed and 0 skipped.
- [ ] VirtualHub lifecycle, turn, and trajectory test suites execute 100% green.
- [ ] C compilation emits zero warnings under `-Wall -Wextra`.
- [ ] Full test execution outputs, commit SHA, and environment metadata are recorded in `docs/06_raw/`.
- [ ] Final architectural scorecard reaches $\ge 9.4/10$ across all 12 categories.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: 21 ok, 0 skipped, 0 failed.

## Touch map

- `lib/pbio/test/src/test_mdrobotbase.c`
- `tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py`
- `docs/06_raw/`

## Notes for AI

- Zero mocks, zero stubs.
- Ensure all execution outputs are copied verbatim into raw certification artifacts.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Test::PBIO` | Run TinyTest suite | Clean binary build | Record OK count | Abort on test failure |
| `Test::VirtualHub` | Run Python unittest | Real motor simulation | Record passed count | Abort on assertion failure |
| `Release::Certified` | All tests pass | Score $\ge 9.4/10$ | Publish release doc | Block release if score $< 9.4$ |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Scorecard Floor** | $\min_{c \in \text{Categories}} \text{Score}(c) \ge 8/10, \quad \text{OverallScore} \ge 9.4/10$. |
| **Warning Invariant** | $|\text{compiler warnings}| == 0$. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** CI Multi-Environment Test Harness.
- **Outbound Driven Port:** LLM Wiki Knowledge Persistence Ledger.
