# Acceptance Contract: G-MDRB-030

**Goal ID:** `G-MDRB-030`  
**Title:** Perceptual Color Classifier with Circular Hue Distance and CIE L*a*b* Space  
**Epic:** MDRB  
**Kind:** feature  

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Circular Hue Boundary Distance (AC-MDRB-030-1)
- **Given** two hue angles $h_1 = 359.0^\circ$ and $h_2 = 1.0^\circ$.
- **When** `pbio_mdrobotbase_circular_hue_distance(h1, h2)` is calculated.
- **Then** the result is exactly $2.0^\circ$.
- **And** `pbio_mdrobotbase_circular_hue_distance(h2, h1)` returns identically $2.0^\circ$.

### Scenario 2: Maximum Circular Hue Arc Bound (AC-MDRB-030-2)
- **Given** arbitrary angles across $[0.0^\circ, 360.0^\circ)$.
- **When** circular hue distance is computed across all angle pairs.
- **Then** $dh(h_1, h_2) \le 180.0^\circ$ for all pairs.

### Scenario 3: CIE Lab White Reference Mapping (AC-MDRB-030-3)
- **Given** a normalized white RGB vector $[1.0, 1.0, 1.0]$.
- **When** converted to CIE $L^*a^*b^*$ coordinates.
- **Then** $L^* \in [99.9, 100.0]$, $a^* \in [-0.5, 0.5]$, and $b^* \in [-0.5, 0.5]$.

### Scenario 4: CIE Lab Black Reference Mapping (AC-MDRB-030-4)
- **Given** a normalized black RGB vector $[0.0, 0.0, 0.0]$.
- **When** converted to CIE $L^*a^*b^*$ coordinates.
- **Then** $L^* == 0.0$, $a^* == 0.0$, and $b^* == 0.0$.

### Scenario 5: Similar Color Discrimination Invariant (AC-MDRB-030-5)
- **Given** calibrated prototypes for Red ($h=0^\circ$) and Orange ($h=30^\circ$).
- **When** an ambiguous warm test sample ($h=10^\circ$) is classified.
- **Then** the weighted composite distance assigns lower distance to Red than Orange, maintaining sharp boundary separation without cross-triggering.
