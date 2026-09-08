# Acceptance Contract: G-MDRB-027

**Goal ID:** `G-MDRB-027`  
**Title:** Multi-Environment Runtime Test Execution Matrix, Compiler Warning Audit & Final Scorecard Attestation  
**Epic:** MDRB  
**Kind:** qa  

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: PBIO Native Test Suite Execution Pass (AC-MDRB-027-1)
- **Given** the compiled PBIO test binary `./lib/pbio/test/build/test-pbio`.
- **When** the test runner executes targeting `src/mdrobotbase/..`.
- **Then** all 21 tests report `OK`.
- **And** zero tests are skipped or failed.

### Scenario 2: VirtualHub Lifecycle, Turn, and Trajectory Test Pass (AC-MDRB-027-2)
- **Given** the VirtualHub test suites in `tests/virtualhub/robotics/`.
- **When** `python3 -m unittest discover tests/virtualhub/robotics/` executes.
- **Then** all test functions execute with zero failures and zero errors.

### Scenario 3: Compiler Zero-Warning Verification (AC-MDRB-027-3)
- **Given** the C source files in `lib/pbio/` and `pybricks/robotics/`.
- **When** compilation is executed under `-Wall -Wextra -Werror`.
- **Then** the build completes with zero compiler warnings.

### Scenario 4: Empirical Release Output Recording (AC-MDRB-027-4)
- **Given** the raw release certification in `docs/06_raw/`.
- **When** the document is reviewed.
- **Then** verbatim terminal logs from PBIO, VirtualHub, and compiler checks are embedded alongside Git commit SHA and environment specifications.

### Scenario 5: Final Scorecard Elevation to 9.4+/10 (AC-MDRB-027-5)
- **Given** all acceptance criteria across G-MDRB-001 through G-MDRB-027 are satisfied.
- **When** the architectural scorecard is recomputed across all 12 dimensions.
- **Then** the aggregate score reaches $\ge 9.4 / 10.0$.
