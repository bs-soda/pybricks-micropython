# G-MDRB-030 Baseline Freeze & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260909-MDRB030-BASELINE`
**Timestamp:** `2026-09-09T07:32:00+07:00`
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)
**Corpus Name:** `bs-soda/pybricks-micropython`
**Active Feature Branch:** `feature/mdrobotbase-enhancement`
**Base Integration Target:** `epic/MDRB`
**Goal ID:** `G-MDRB-030`
**Kind:** `feature`
**Pre-Implementation Git HEAD:** `1a4ea6e2745b5615b2fae9946103ee28a25a922c`

---

## 1. Baseline Architecture & Classification Audit

Prior to the execution of `G-MDRB-030`, the color classification subsystem in MDRobotBase is scored at **5.0/10** by Codex due to two major mathematical flaws:
1. Linear/non-circular hue distance across the $0^\circ / 360^\circ$ boundary: Red at $359^\circ$ and Red at $1^\circ$ are treated as $358^\circ$ apart instead of $2^\circ$.
2. Absence of perceptual color spaces: Raw Euclidean distance in RGB or cylindrical HSV lacks perceptual uniformity under illumination variations.

### 1.1 Native PBIO C Interface State
In [`lib/pbio/src/mdrobotbase.c:904-912`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L904-L912):
```c
for (size_t i = 0; i < rb->color_cal.num_prototypes; i++) {
    float dx = x - rb->color_cal.prototypes[i].x;
    float dy = y - rb->color_cal.prototypes[i].y;
    float dz = z - rb->color_cal.prototypes[i].z;
    float dist = sqrtf(dx * dx + dy * dy + dz * dz);
```
- Missing declarations and definitions:
  - `pbio_mdrobotbase_circular_hue_distance(float h1, float h2)`
  - `pbio_mdrobotbase_rgb_to_lab(float r, float g, float b, float *l, float *a, float *b_val)`
- Does not compute CIE $L^*a^*b^*$ coordinates ($\Delta E_{ab}$).
- Does not combine circular hue with perceptual differences into a normalized composite distance.

### 1.2 VirtualHub Python Interface State
In [`tests/virtualhub/robotics/pybricks/robotics.py:657-664`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L657-L664):
```python
for cid, proto in self._color_prototypes.items():
    pr, pg, pb = proto[:3]
    dist = math.sqrt((in_r - pr) ** 2 + (in_g - pg) ** 2 + (in_b - pb) ** 2)
```
- Operates in raw Euclidean RGB without circular hue or CIE $L^*a^*b^*$ conversion.
- Misclassifies similar shades and fails across the red boundary.

---

## 2. Frozen Replication Blockers

The following concrete replication blockers are frozen prior to code changes:

| Blocker ID | Environment | Exact Symptom / Missing Symbol | Root Cause |
|---|---|---|---|
| **BLK-MDRB030-01** | Native PBIO C Header | Missing public declarations for `pbio_mdrobotbase_circular_hue_distance` and `pbio_mdrobotbase_rgb_to_lab` in `mdrobotbase.h` | Header lacked perceptual color space signatures |
| **BLK-MDRB030-02** | Native PBIO C Kernel | Missing implementations of circular hue arithmetic and sRGB $\to$ XYZ $\to$ CIE $L^*a^*b^*$ D65 conversion in `mdrobotbase.c` | Color space transforms not implemented |
| **BLK-MDRB030-03** | VirtualHub Python | Missing methods `circular_hue_distance` and `rgb_to_lab` in `robotics.py` | VirtualHub lacked parity implementation |
| **BLK-MDRB030-04** | Classifier Metric | Distance metric does not incorporate composite weighting of $dh$, $\Delta s$, $\Delta v$, and $\Delta E_{ab}$ | Classifier relies on unweighted non-perceptual coordinates |

---

## 3. Baseline Metric Scorecard

| Assessment Dimension | Baseline Metric | Target Metric | Gap |
|---|:---:|:---:|:---:|
| Classification Accuracy Score | 5.0 / 10 | 9.8 / 10 | +4.8 points |
| Circular Hue Wraparound ($359^\circ \leftrightarrow 1^\circ$) | $358.0^\circ$ (FAIL) | $2.0^\circ$ (PASS) | Boundary continuity |
| CIE $L^*a^*b^*$ Perceptual Conversion | None (0.0/10) | 10.0 / 10 | Full standard D65 |
| Composite Multi-Space Distance Metric | None (0.0/10) | 10.0 / 10 | Normalized $D \in [0, 100]$ |
