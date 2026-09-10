# G-MDRB-029 Baseline Freeze & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260909-MDRB029-BASELINE`
**Timestamp:** `2026-09-09T07:26:00+07:00`
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)
**Corpus Name:** `bs-soda/pybricks-micropython`
**Active Feature Branch:** `feature/mdrobotbase-enhancement`
**Base Integration Target:** `epic/MDRB`
**Goal ID:** `G-MDRB-029`
**Kind:** `feature`
**Pre-Implementation Git HEAD:** `0a894704855480e22c8d03ca42c0a30a82907ea6`

---

## 1. Baseline Architecture & Calibration Audit

Prior to the execution of `G-MDRB-029`, the sensor calibration subsystem in MDRobotBase is scored at **4.0/10** by Codex due to the complete absence of true two-point sensor calibration.

### 1.1 Native PBIO C Interface State
In [`lib/pbio/src/mdrobotbase.c:832-843`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L832-L843):
```c
pbio_error_t pbio_mdrobotbase_color_cal_set_baseline(pbio_mdrobotbase_t *rb, float base_h, float base_s, float base_v) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.base_h = base_h;
    rb->color_cal.base_s = base_s;
    rb->color_cal.base_v = base_v;
    return PBIO_SUCCESS;
}
```
- Only sets scalar variables `base_h`, `base_s`, `base_v`.
- In classification: `float v_scale = (rb->color_cal.base_v > 5.0f) ? 3.0f : 35.0f;`.
- **Defects:**
  - Zero dark current offset subtraction $[R_0, G_0, B_0]$.
  - Zero white reference intensity $[R_w, G_w, B_w]$ or per-channel gain scaling $[k_r, k_g, k_b]$.
  - Ambient light shifts directly corrupt nearest-neighbor prototype distance calculations.
  - Missing functions: `pbio_mdrobotbase_color_cal_set_black_reference`, `pbio_mdrobotbase_color_cal_set_white_reference`, `pbio_mdrobotbase_color_normalize`.

### 1.2 VirtualHub Python Interface State
In [`tests/virtualhub/robotics/pybricks/robotics.py:575-577`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L575-L577):
```python
@_require_open
def set_color_baseline(self, r: float, g: float, b: float):
    self._color_baseline = (float(r), float(g), float(b))
```
- Merely stores a tuple `self._color_baseline`.
- Never subtracts black offset or scales channel gains in `classify_color_rgb` or `classify_color_hsv`.
- Missing methods: `set_black_reference(r, g, b)`, `set_white_reference(r, g, b)`, `normalize_color(r, g, b)`.

---

## 2. Frozen Replication Blockers

The following concrete replication blockers are frozen prior to code changes:

| Blocker ID | Environment | Exact Symptom / Missing Symbol | Root Cause |
|---|---|---|---|
| **BLK-MDRB029-01** | Native PBIO C Header | Missing declarations for `pbio_mdrobotbase_color_cal_set_black_reference`, `pbio_mdrobotbase_color_cal_set_white_reference`, and `pbio_mdrobotbase_color_normalize` in `mdrobotbase.h` | Never declared in header |
| **BLK-MDRB029-02** | Native PBIO C Kernel | `pbio_mdrobotbase_color_cal_t` lacks storage for dark offsets $[R_0, G_0, B_0]$, white references $[R_w, G_w, B_w]$, and channel gains $[k_r, k_g, k_b]$ | Structural omission in calibration struct |
| **BLK-MDRB029-03** | VirtualHub Python | Missing methods `set_black_reference`, `set_white_reference`, and `normalize_color` | Python model lacked two-point calibration pipeline |
| **BLK-MDRB029-04** | Normalization Pipeline | Raw inputs are ingested directly without dark-offset subtraction or $[0.0, 1.0]$ unit interval clamping | Input pipeline lacks normalization stage |

---

## 3. Baseline Metric Scorecard

| Assessment Dimension | Baseline Metric | Target Metric | Gap |
|---|:---:|:---:|:---:|
| Two-Point Sensor Calibration | 4.0 / 10 | 10.0 / 10 | +6.0 points |
| Dark-Offset Subtraction $[R_0, G_0, B_0]$ | 0.0 / 10 | 10.0 / 10 | +10.0 points |
| White-Gain Normalization $[0.0, 1.0]$ | 0.0 / 10 | 10.0 / 10 | +10.0 points |
| Dynamic Range Guard ($C_w > C_0 + 5.0$) | 0.0 / 10 | 10.0 / 10 | +10.0 points |
