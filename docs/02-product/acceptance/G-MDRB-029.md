# Acceptance Contract: G-MDRB-029

**Goal ID:** `G-MDRB-029`  
**Title:** Two-Point Sensor Calibration Pipeline with Dark-Offset and White-Gain Normalization  
**Epic:** MDRB  
**Kind:** feature  

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Dark-Offset Calibration Subtraction (AC-MDRB-029-1)
- **Given** an MDRobotBase instance calibrated with black reference $[R_0=20.0, G_0=15.0, B_0=10.0]$.
- **When** raw optical sensor readings $[20.0, 15.0, 10.0]$ are received.
- **Then** the normalized output vector is exactly $[0.0, 0.0, 0.0]$.

### Scenario 2: White-Reference Gain Normalization (AC-MDRB-029-2)
- **Given** black reference $[20.0, 15.0, 10.0]$ and white reference $[220.0, 215.0, 210.0]$.
- **When** raw optical sensor readings $[220.0, 215.0, 210.0]$ are received.
- **Then** the normalized output vector is exactly $[1.0, 1.0, 1.0]$.

### Scenario 3: Mid-Scale Proportional Linearity (AC-MDRB-029-3)
- **Given** calibrated black reference $[0.0, 0.0, 0.0]$ and white reference $[100.0, 100.0, 100.0]$.
- **When** mid-scale raw readings $[50.0, 25.0, 75.0]$ are received.
- **Then** the normalized output vector is $[0.5, 0.25, 0.75] \pm 0.001$.

### Scenario 4: Degenerate Dynamic Range Rejection (AC-MDRB-029-4)
- **Given** a white reference vector where $C_w \le C_0 + 5.0$.
- **When** `set_white_reference()` is called.
- **Then** the C API returns `PBIO_ERROR_INVALID_ARG` and preserves previous valid calibration.
- **And** VirtualHub raises `ValueError`.

### Scenario 5: Multi-Lux Invariant Reflection Normalization (AC-MDRB-029-5)
- **Given** sensor calibration under ambient level $L_1$, yielding normalized target vector $V_1$.
- **When** ambient lighting shifts to $L_2$ and references are re-calibrated.
- **Then** normalized reading of the identical surface color yields $V_2$ where $|V_2 - V_1| < 0.05$.
