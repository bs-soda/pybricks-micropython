# Acceptance Contract: G-MDRB-032

**Goal ID:** `G-MDRB-032`
**Title:** Confidence Scoring and Ambiguity Margin Rejection Engine
**Epic:** MDRB
**Kind:** feature

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Unambiguous Sample High Confidence (AC-MDRB-032-1)
- **Given** registered prototypes for Red (ID 1) and Blue (ID 2) with large chromatic separation ($D_{\text{red}}=5.0, D_{\text{blue}}=80.0$).
- **When** an optical reading matching Red is classified.
- **Then** `color_id` returns 1.
- **And** `confidence` returns $> 0.85$.

### Scenario 2: Borderline Ambiguity Rejection (AC-MDRB-032-2)
- **Given** registered prototypes for Red ($h=0^\circ$) and Orange ($h=30^\circ$).
- **When** a borderline reading ($h=15^\circ$) is presented where $|D_{\text{red}} - D_{\text{orange}}| < \text{ambiguity\_threshold}$.
- **Then** `color_id` is rejected as `Color.NONE` (0).
- **And** `confidence` returns $< 0.15$.

### Scenario 3: Absolute Cutoff Threshold Rejection (AC-MDRB-032-3)
- **Given** max distance cutoff threshold set to $40.0$.
- **When** a distant color reading with minimum distance $55.0$ is presented.
- **Then** `color_id` returns `Color.NONE` (0) regardless of margin.

### Scenario 4: Single-Prototype Boundary Invariant (AC-MDRB-032-4)
- **Given** only a single prototype registered in the base.
- **When** a matching sample is classified within threshold.
- **Then** `color_id` returns the prototype ID and `confidence` returns $1.0$.

### Scenario 5: MicroPython Tuple Return Completeness (AC-MDRB-032-5)
- **Given** a MicroPython call `base.classify_color(r, g, b)`.
- **When** an ambiguous reading is processed.
- **Then** it returns tuple `(0, dist, conf)`.
