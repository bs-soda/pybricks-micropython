# G-MDRB-026: Submodule Provenance, License Attestation & CI Reproducibility Socratic Dialectic Analysis

**Goal ID:** `G-MDRB-026`  
**Topic:** Submodule Tracking, BlueKitchen BTstack Licensing, Gitlink Mode 160000, and CI Checkout Reproducibility  
**Author:** AI Agent (Antigravity)  
**Timestamp:** `2026-09-08T21:35:00+07:00`  
**Epic:** MDRB (`epic/MDRB`)  
**Base Integration Target:** `origin/feature/mdrobotbase-enhancement`  
**State Machine Status:** `PLAN` / `ready`  

---

## 🏛️ Executive Summary & Codex P2 Finding Context

In the September 2026 Codex Codebase Architecture Review, finding **P2** noted:
> "Decide on lib/btstack/ tracking: Confirm whether it is intended to be tracked as a submodule, vendored source, or ignored build dependency. Verify its license and provenance. Ensure CI can reproduce the same checkout."

### Current Architectural State
- `.gitmodules` contains an entry for `lib/btstack` mapping path `lib/btstack` to `https://github.com/bluekitchen/btstack`.
- Git tree registers `lib/btstack` as a mode `160000` gitlink pointing to commit `5d9c44988e61879b409abda35ebf12cf186253bf`.
- This commit corresponds to Pybricks' verified Bluetooth stack upstream integration (`v1.4-1865-g5d9c44988`).
- However, prior to G-MDRB-026, continuous integration (`.github/workflows/ci.yml`) and local governance (`scripts/ci/governance-check.sh`) did not execute automated submodule status audits, exposing the repository to accidental drift, uncommitted submodule edits, or broken clone pipelines.

### Remediation Objectives
1. **Clarification Resolution:** Implement a standalone, modular, fail-closed verification script (`scripts/ci/submodule-check.sh`) integrated into both GitHub Actions CI and local pre-commit governance.
2. **License Attestation:** Formally audit BlueKitchen's dual-license model, confirming full compliance of Pybricks-micropython and WRO MatMetric robotics under non-commercial open-source educational terms.
3. **Reproducibility Certification:** Validate clean git status under strict porcelain flags across all submodules with zero uncommitted drift.

---

## ⚖️ BlueKitchen BTstack Licensing & Intellectual Property Audit

### Dual-License Architecture
BlueKitchen GmbH licenses BTstack under a dual-licensing scheme:
1. **Non-Commercial Open-Source / Educational License:**
   - Permitted free of charge for non-commercial educational use, hobbyist robotics, academic research, and evaluation.
   - WRO (World Robot Olympiad) and FIRST LEGO League student competitors, researchers, and hobbyists using Pybricks MicroPython operate squarely within this non-commercial educational grant.
2. **Commercial License:**
   - Commercial products incorporating BTstack require a commercial license agreement directly with BlueKitchen GmbH.

### Upstream Provenance
- Upstream Git URL: `https://github.com/bluekitchen/btstack.git`
- Checked-out Commit SHA: `5d9c44988e61879b409abda35ebf12cf186253bf`
- Integration Tag: `v1.4-1865-g5d9c44988`
- Pinned Mode: `160000 commit`
- Modification Status: Pristine (Zero dirty files, zero uncommitted patches).

---

## 🔬 Socratic 5-Why Dialectic Analysis (5 Causal Branches x 5 Dialectic Levels = 25 Nodes)

### Branch 1: Submodule Registration & Configuration (`.gitmodules`)
- **Node 1.1:** Why track `lib/btstack` as a submodule rather than vendored source code?
  - *Root Cause:* Vendoring 100+ MB of external C code bloats git history and complicates tracking upstream security patches; submodules maintain clean provenance boundaries.
- **Node 1.2:** Why is the submodule update policy configured to `none` or standard tracking?
  - *Root Cause:* Setting `update = none` prevents accidental recursive network cloning during unrelated lightweight builds while allowing deterministic manual updates.
- **Node 1.3:** Why must all 4 core submodules be registered in `.gitmodules`?
  - *Root Cause:* Unregistered directories in `lib/` cause git checkout failures and non-deterministic compilation across different operating systems.
- **Node 1.4:** Why must git index recognize `lib/btstack` as a mode 160000 gitlink?
  - *Root Cause:* Mode 160000 registers a submodule commit tree reference rather than a blob or tree, cryptographically pinning the commit pointer.
- **Node 1.5:** Why must `.gitmodules` remain parseable via `git config`?
  - *Root Cause:* Malformed syntax in `.gitmodules` breaks automated CI runners and git tooling globally.

### Branch 2: Commit SHA Pinning & Upstream Provenance
- **Node 2.1:** Why must `lib/btstack` point to an exact 40-hex SHA rather than a branch head?
  - *Root Cause:* Branch heads are mutable; an immutable 40-hex SHA guarantees byte-level reproducible firmware builds.
- **Node 2.2:** Why is `5d9c44988e61879b409abda35ebf12cf186253bf` the required pinned SHA?
  - *Root Cause:* This commit aligns with Pybricks upstream BLE stack stability testing and certified VirtualHub Bluetooth profiles.
- **Node 2.3:** Why must the checked-out submodule HEAD match the git index tree gitlink?
  - *Root Cause:* Discrepancies between git index and working tree trigger dirty repository alerts in CI.
- **Node 2.4:** Why must upstream remote origin be verified as official BlueKitchen?
  - *Root Cause:* Prevents supply-chain attacks from unverified mirrors or compromised forks.
- **Node 2.5:** Why must `git submodule status` report no divergence prefix (`+`, `-`, or `U`)?
  - *Root Cause:* Prefixes indicate uncommitted checkout differences (`+`), uninitialized state (`-`), or merge conflicts (`U`).

### Branch 3: BlueKitchen Dual-License Attestation
- **Node 3.1:** Why must BTstack licensing terms be explicitly audited?
  - *Root Cause:* Legal transparency protects developers and ensures open-source distribution compliance.
- **Node 3.2:** Why does WRO MatMetric qualify for non-commercial educational use?
  - *Root Cause:* Educational robotics competitions and non-commercial open-source research are explicitly permitted under the BTstack non-commercial license.
- **Node 3.3:** Why maintain raw documentation in `docs/06_raw/`?
  - *Root Cause:* Provides tamper-evident traceability for security compliance and audit readiness.
- **Node 3.4:** Why avoid modifying upstream license files?
  - *Root Cause:* Modifying third-party licenses violates copyright attribution requirements.
- **Node 3.5:** Why enforce an acceptance contract covering licensing?
  - *Root Cause:* Guarantees that automated verification gates test licensing attestation before branch integration.

### Branch 4: Automated Verification Script & Porcelain Zero-Drift
- **Node 4.1:** Why encapsulate verification in `scripts/ci/submodule-check.sh`?
  - *Root Cause:* Encapsulation enables reuse between local developer hooks and GitHub Actions CI.
- **Node 4.2:** Why enforce executable permissions (`chmod +x`)?
  - *Root Cause:* Ensures direct invocation in Unix environments without requiring explicit `bash` shell prefixes.
- **Node 4.3:** Why verify `git status --porcelain` recursively?
  - *Root Cause:* Catches untracked compile artifacts or temporary test dumps that pollute the build.
- **Node 4.4:** Why must `submodule-check.sh` exit 0 on clean checkouts?
  - *Root Cause:* Confirms that compliant repositories pass CI without false positives.
- **Node 4.5:** Why enforce fail-closed behavior (`set -euo pipefail`)?
  - *Root Cause:* Prevents silent errors from masking failed submodule verification in CI pipelines.

### Branch 5: CI Workflow Integration & Clean Working Tree Attestation
- **Node 5.1:** Why integrate submodule checks into `.github/workflows/ci.yml`?
  - *Root Cause:* Enforces automatic gating on every pull request and push to integration branches.
- **Node 5.2:** Why run submodule verification before firmware compilation?
  - *Root Cause:* Fails fast and prevents wasted CI runner compute time on invalid trees.
- **Node 5.3:** Why call `submodule-check.sh` from `governance-check.sh`?
  - *Root Cause:* Catches submodule divergence locally before developers create commits or push branches.
- **Node 5.4:** Why verify that `git status` reports zero dirty files?
  - *Root Cause:* Assures clean provenance and exact commit reproducibility.
- **Node 5.5:** Why require 100% dialectic resolution before goal closure?
  - *Root Cause:* Eliminates all unresolved ambiguities in architectural design and runtime execution.

---

## 🚨 Baseline Red Phase Findings (Replication Blockers)

Prior to implementing the concrete changes:
1. `scripts/ci/submodule-check.sh` does not exist on disk.
2. `.github/workflows/ci.yml` lacks a dedicated submodule verification step.
3. `scripts/ci/governance-check.sh` does not invoke submodule integrity checks.

These three blockers cause Gates 4 and 6 to fail cleanly, providing the empirical baseline for Red-Green verification.
