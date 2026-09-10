# Acceptance Contract: G-MDRB-033

**Goal ID:** `G-MDRB-033`
**Title:** Comprehensive Color Detector Verification Matrix & Final Scorecard Attestation
**Epic:** MDRB
**Kind:** qa

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: PBIO Native Test Suite Execution Pass (AC-MDRB-033-1)
- **Given** the compiled PBIO test binary `./lib/pbio/test/build/test-pbio`.
- **When** the test runner executes targeting `src/mdrobotbase/..`.
- **Then** all color detector tests report `OK`.
- **And** zero tests are skipped or failed.

### Scenario 2: VirtualHub Color Test Suite Pass (AC-MDRB-033-2)
- **Given** the VirtualHub test suites in `tests/virtualhub/robotics/`.
- **When** `python3 -m unittest discover tests/virtualhub/robotics/` executes.
- **Then** all color detector integration tests execute with zero failures and zero errors.

### Scenario 3: Compiler Zero-Warning Verification (AC-MDRB-033-3)
- **Given** the C source files in `lib/pbio/src/mdrobotbase.c` and `pybricks/robotics/`.
- **When** compilation is executed under `-Wall -Wextra -Werror`.
- **Then** the build completes with zero compiler warnings.

### Scenario 4: Multi-Illumination and Wraparound Robustness (AC-MDRB-033-4)
- **Given** the multi-condition test matrix in `test_mdrobotbase_color.py`.
- **When** test runs across $10\text{ lux}$ to $2000\text{ lux}$ and hue wraparound $359^\circ \leftrightarrow 1^\circ$.
- **Then** all targets are classified correctly without false triggers.

### Scenario 5: Final Scorecard Elevation to 9.8+/10 (AC-MDRB-033-5)
- **Given** all acceptance criteria across G-MDRB-028 through G-MDRB-033 are satisfied.
- **When** the color detector scorecard is recomputed across all 6 categories.
- **Then** the aggregate score reaches $\ge 9.8 / 10.0$.
