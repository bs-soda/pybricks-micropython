# G-MDRB-026: Submodule Provenance, License Attestation & CI Reproducibility Certification

**Status:** done
**Kind:** chore
**Atomic outcome:** Attest lib/btstack submodule tracking, licensing, commit provenance, and CI checkout reproducibility in GitHub Actions workflow, verifying zero submodule drift across clean checkouts
**Epic:** MDRB
**Depends on:** G-MDRB-025
**Blocks:** G-MDRB-027
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Submodule Provenance, License Audit & CI Specification | done |
| 2 | Implement Automated Submodule Integrity Verification Script | done |
| 3 | CI Workflow Integration & Clean Working Tree Attestation | done |

## Context

In Codex's September 2026 architectural review, finding P2 highlighted that `lib/btstack/` required a clear repository decision: "Confirm whether it is intended to be tracked as a submodule, vendored source, or ignored build dependency. Verify its license and provenance. Ensure CI can reproduce the same checkout."
While `lib/btstack` is registered in `.gitmodules`, untracked status or inconsistent submodule initialization creates reproducibility issues in continuous integration and developer onboarding.
This goal formalizes submodule tracking, licensing, and automated CI reproducibility checks.

### Scorecard & Baseline Evidence
- **Current score:** 8/10 (Repository Hygiene & Submodule Reproducibility) · **Expected score:** 10/10
- **Exact evidence:** Codex Architectural Review finding P2, `.gitmodules:4-6`
- **Root cause:** Git submodule status was not verified by an automated CI script, risking uncommitted checkout state or untracked file accumulation.
- **Reproduction steps:**
  1. Inspect `git status`: ensure no dirty submodules or untracked directory notices appear.
  2. Inspect `.gitmodules`: observe submodule definition for `lib/btstack`.
  3. Verify that a fresh `git clone --recursive` cleanly checks out exact commit without manual intervention.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Unverified submodules risk repository contamination, licensing ambiguity, and unreproducible CI build environments.
**Done when:** Submodule commit provenance and licensing are formally audited, an automated verification script checks submodule consistency, and CI verifies a zero-drift clean working tree.
**Unblocks:** G-MDRB-027

## Atomicity & Zero-Mock Contract

- **One outcome:** Attest and automate submodule hygiene, licensing, and CI checkout reproducibility.
- **No decomposition leakage:** Runtime test execution and scorecard elevation belong to G-MDRB-027.
- **Concrete execution:** Real git commands and shell scripts executing on disk. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Tests check actual `.gitmodules` entries, git index trees, and commit SHAs.
- **Failure behavior:** If submodule pointers diverge or working tree is dirty, verification fails immediately.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:**
1. Create standalone executable `scripts/ci/submodule-check.sh` (`set -euo pipefail`) that verifies:
   - All submodules listed in `.gitmodules` exist and match the registered git index tree commits.
   - Pinned commit for `lib/btstack` matches `5d9c44988e61879b409abda35ebf12cf186253bf`.
   - `git status --porcelain` in the root repository and recursively inside each submodule reports zero modified, untracked, or conflicted files.
2. Integrate `bash scripts/ci/submodule-check.sh` into `.github/workflows/ci.yml` before firmware compilation and into `scripts/ci/governance-check.sh`.
3. Document btstack licensing (BlueKitchen dual-license model: BSD-like for non-commercial educational/open-source robotics use) in `docs/06_raw/` audit report.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

*(None remaining — resolved in favor of dedicated `scripts/ci/submodule-check.sh` integrated into CI workflow and governance check)*

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-SUBMODULE-DRIFT |
| **Decisions** | PDR-MDRB-SUBMODULE-PROVENANCE |
| **Assumptions required** | A-GIT-SUBMODULE-TRACKING |
| **Evidence** | Codex Architectural Review finding P2 (September 2026) |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Immutable Dependency Pinning, CI Provenance Attestation |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-026.md` |
| **Skills** | `soda-cloud-infra-sre` · `soda-testing` |
| **Profile** | developer |
| **Task type** | chore |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `.gitmodules` · `.github/workflows/ci.yml` · `scripts/ci/submodule-check.sh` |
| **Constraints** | Zero modification to upstream third-party submodule source trees |

## Work steps

### Step 1 — Submodule Provenance, License Audit & CI Specification

**Allowed files:** `docs/07-backlog/goals/G-MDRB-026.md` · `docs/02-product/acceptance/G-MDRB-026.md`
**Actions:**
1. Document btstack licensing (BlueKitchen dual-license model, BSD-like for non-commercial) and exact pinned commit SHA.
2. Define automated submodule audit requirements in `scripts/ci/submodule-check.sh`.
3. Formulate Given-When-Then BDD scenarios in `docs/02-product/acceptance/G-MDRB-026.md`.
**Completion gate:** Acceptance contract exists defining exact submodule verification rules.
**Stop condition:** Ambiguity in submodule licensing or required commit references.

### Step 2 — Implement Automated Submodule Integrity Verification Script

**Allowed files:** `scripts/ci/submodule-check.sh`
**Actions:**
1. Create `scripts/ci/submodule-check.sh` to verify:
   - All submodules in `.gitmodules` exist and match exact registered commit SHAs.
   - `git status --porcelain` reports zero dirty or untracked submodule entries.
2. Make script executable and verify local pass.
**Completion gate:** Script exits with code 0 on clean repository.
**Stop condition:** Script failure or detected submodule drift.

### Step 3 — CI Workflow Integration & Clean Working Tree Attestation

**Allowed files:** `.github/workflows/ci.yml` · `docs/06_raw/`
**Actions:**
1. Add submodule verification step to `.github/workflows/ci.yml`.
2. Document license and provenance attestation in `docs/06_raw/`.
3. Verify that fresh clone produces 100% clean status.
**Completion gate:** CI workflow definition valid and clean working tree confirmed.
**Stop condition:** Any untracked files or git index errors.

## In

- Formal provenance and license review for `lib/btstack`.
- Automated submodule verification script `scripts/ci/submodule-check.sh`.
- CI workflow step guaranteeing zero submodule drift.

## Out

- Modifying upstream btstack Bluetooth stack code.
- Adding new external submodules.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| CI Scripts | Add | `scripts/ci/submodule-check.sh` — Validate submodule integrity and zero drift |
| CI Config | Update | `.github/workflows/ci.yml` — Run submodule-check.sh during CI |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/mdrobotbase-enhancement` (PR target `epic/MDRB`) |
| **System Archetype** | `sre-control-plane` / `embedded-firmware` |
| **Bounded Context & Domain** | Third-Party Dependencies & Build Provenance |
| **Ports & Adapters Topology** | Driving Inbound: CI Runner Shell <br> Driven Outbound: Git Submodule Subsystem |
| **State Machine & Invariants** | Pinned Commit Invariant: `git rev-parse HEAD:lib/btstack == 5d9c4498...`. |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Zero mocks or stubs. |
| **Socratic 5-Why Blueprint** | Dialectic Report: `docs/06_raw/20260908_210000_codex_review_audit_and_mdrb_024_027_remediation_roadmap.md` |

## Spec checklist

- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable
- [x] Touch map is real repo paths
- [x] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [x] Change delta filled if modifying existing behaviour
- [x] Critical-path assumptions are not `open` + `low`
- [x] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [x] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [x] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [x] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [x] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [x] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [x] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)

## Acceptance criteria

- [x] `lib/btstack` is explicitly registered in `.gitmodules` with exact commit `5d9c4498...`.
- [x] `scripts/ci/submodule-check.sh` exists, is executable, and verifies submodule cleanliness.
- [x] `git status --porcelain` reports zero untracked or dirty files under `lib/btstack/`.
- [x] CI workflow executes submodule verification before building firmware.
- [x] Provenance and license documentation is published in `docs/06_raw/`.

## Test plan

- Command: `bash scripts/ci/submodule-check.sh`
- Expected: All submodules pass integrity verification with exit code 0.

## Touch map

- `.gitmodules`
- `.github/workflows/ci.yml`
- `scripts/ci/submodule-check.sh`

## Notes for AI

- Zero mocks, zero stubs.
- Ensure script handles clean output on fresh clones.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Clean` | `git status` | `git diff --quiet` | Continue CI pipeline | Alert on dirty index |
| `Sync` | Submodule update | Pinned SHA matches | Checkout exact commit | Abort build on SHA mismatch |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Submodule SHA Invariant** | Pinned commit matches upstream Pybricks btstack integration branch. |
| **Index Cleanliness** | $|\text{untracked files in } \texttt{lib/btstack}| == 0$. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** GitHub Actions CI Runner.
- **Outbound Driven Port:** Local Git Submodule Tree.
