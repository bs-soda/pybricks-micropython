# Acceptance Contract: G-MDRB-026

**Goal ID:** `G-MDRB-026`
**Title:** Submodule Provenance, License Attestation & CI Reproducibility Certification
**Epic:** MDRB
**Kind:** chore

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Submodule Definition Conformance in Gitmodules (AC-MDRB-026-1)
- **Given** the file `.gitmodules`.
- **When** the submodule entries are parsed.
- **Then** `submodule "lib/btstack"` is defined with valid URL and path.
- **And** the commit checked out matches registered commit `5d9c4498...`.

### Scenario 2: Automated Submodule Integrity Verification Script Pass (AC-MDRB-026-2)
- **Given** the script `scripts/ci/submodule-check.sh`.
- **When** executed in the root workspace.
- **Then** the script exits with status code 0.
- **And** outputs `All submodules verified and clean`.

### Scenario 3: Clean Git Working Tree under Strict Porcelain Status (AC-MDRB-026-3)
- **Given** a git status query executed on the working tree.
- **When** `git status --porcelain` is evaluated.
- **Then** zero modified, untracked, or conflicted files under `lib/btstack/` are reported.

### Scenario 4: CI Workflow Execution Integration (AC-MDRB-026-4)
- **Given** the continuous integration workflow file `.github/workflows/ci.yml`.
- **When** the build pipeline executes.
- **Then** a dedicated submodule verification step executes `scripts/ci/submodule-check.sh` before firmware compilation.

### Scenario 5: Provenance and License Audit Documentation (AC-MDRB-026-5)
- **Given** raw knowledge documentation in `docs/06_raw/`.
- **When** the dependency audit report is reviewed.
- **Then** btstack licensing (BlueKitchen dual-license model) and non-commercial open-source robotics compatibility are formally documented.
