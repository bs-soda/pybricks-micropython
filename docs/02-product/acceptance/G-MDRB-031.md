# Acceptance Contract: G-MDRB-031

**Goal ID:** `G-MDRB-031`
**Title:** Multi-Sample Prototype Statistical Calibration and Variance Modeling
**Epic:** MDRB
**Kind:** feature

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Multi-Sample Online Accumulation (AC-MDRB-031-1)
- **Given** an empty prototype slot for color ID 1 (Red).
- **When** 20 samples with Gaussian distribution $\mathcal{N}(\mu=0^\circ, \sigma=3^\circ)$ are ingested.
- **Then** `mean_h` converges to $0^\circ \pm 0.5^\circ$.
- **And** `var_h` converges to $9.0 \pm 1.0$.

### Scenario 2: Circular Mean Hue Around Boundary (AC-MDRB-031-2)
- **Given** 10 samples alternating between $358^\circ$ and $2^\circ$.
- **When** circular mean hue is calculated.
- **Then** `mean_h` evaluates to $0.0^\circ$.
- **And** linear averaging ($180^\circ$) is never produced.

### Scenario 3: Transient Outlier Glitch Rejection (AC-MDRB-031-3)
- **Given** 18 samples centered around Red ($h=0^\circ, \sigma=2^\circ$) and 2 corrupted outlier samples ($h=180^\circ$).
- **When** the class is finalized with outlier filtering enabled.
- **Then** the 2 outlier samples ($> 2.5\sigma$) are rejected.
- **And** final class centroid is unaffected by the corrupt readings.

### Scenario 4: Minimum Sample Count Guard (AC-MDRB-031-4)
- **Given** fewer than 5 samples ingested for a target color.
- **When** class finalization is requested.
- **Then** the C API returns `PBIO_ERROR_INVALID_OP` requiring additional samples.

### Scenario 5: Native C and VirtualHub Statistical Parity (AC-MDRB-031-5)
- **Given** an identical sequence of 25 optical samples.
- **When** ingested into native C `pbio_mdrobotbase_t` and VirtualHub Python `MDRobotBase`.
- **Then** both engines produce identical mean vectors and variance metrics within $0.001$.
