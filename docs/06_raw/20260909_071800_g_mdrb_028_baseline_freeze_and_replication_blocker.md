# G-MDRB-028 Baseline Freeze & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260909-MDRB028-BASELINE`
**Timestamp:** `2026-09-09T07:18:00+07:00`
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)
**Corpus Name:** `bs-soda/pybricks-micropython`
**Active Feature Branch:** `feature/mdrobotbase-enhancement`
**Base Integration Target:** `epic/MDRB`
**Goal ID:** `G-MDRB-028`
**Kind:** `api`
**Pre-Implementation Git HEAD:** `20ee9fb72dec90d84e92c096fbbd7a2ac28fff2f`

---

## 1. Baseline Architecture & Interface Audit

Prior to the execution of `G-MDRB-028`, the color perception subsystem suffers from interface drift, missing confidence metrics, and asymmetric cross-environment signatures between native embedded C and Python VirtualHub simulation.

### 1.1 Native PBIO C Interface State
In [`lib/pbio/include/pbio/mdrobotbase.h:249`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L249):
```c
pbio_error_t pbio_mdrobotbase_color_cal_classify(
    pbio_mdrobotbase_t *rb,
    float h,
    float s,
    float v,
    uint8_t *matched_color_id,
    float *min_distance
);
```
- Accepts **HSV** only (`h, s, v`). There is **zero** support for raw sensor RGB inputs (`r, g, b`).
- Returns only `matched_color_id` and `min_distance`.
- **Missing:** `confidence` parameter, normalized certainty score, or second-best margin tracking.
- **Missing:** Unified `pbio_mdrobotbase_color_classify_rgb` and `pbio_mdrobotbase_color_classify_hsv` signatures.

### 1.2 VirtualHub Python Interface State
In [`tests/virtualhub/robotics/pybricks/robotics.py:587`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L587):
```python
@_require_open
def classify_color(self, r: float, g: float, b: float) -> int:
    best_id = 0
    min_dist = float("inf")
    for cid, (pr, pg, pb) in self._color_prototypes.items():
        dist = math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2)
        if dist < min_dist:
            min_dist = dist
            best_id = cid
    return best_id
```
- Accepts **RGB** only (`r, g, b`). There is **zero** support for HSV inputs.
- Returns only scalar integer `best_id`.
- **Missing:** Distance metric and confidence score.
- **Missing:** Structured tuple return `(color_id, distance, confidence)`.

### 1.3 MicroPython C Binding State
In [`pybricks/robotics/pb_type_mdrobotbase.c:2245-2266`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2245-L2266):
```c
mp_obj_t tuple[2] = {
    MP_OBJ_NEW_SMALL_INT(matched_color_id),
    mp_obj_new_float(min_dist)
};
return mp_obj_new_tuple(2, tuple);
```
- Returns a 2-element tuple `(color_id, min_dist)`.
- Fails contract requirement for 3-element tuple `(color_id, distance, confidence)`.

---

## 2. Frozen Replication Blockers

The following concrete replication blockers are frozen prior to code changes:

| Blocker ID | Environment | Exact Symptom / Missing Symbol | Root Cause |
|---|---|---|---|
| **BLK-MDRB028-01** | Native PBIO C | Missing symbols `pbio_mdrobotbase_color_classify_rgb` and `pbio_mdrobotbase_color_classify_hsv` with 3-element output pointers `(uint8_t*, float*, float*)` | Never declared in header or implemented in `mdrobotbase.c` |
| **BLK-MDRB028-02** | VirtualHub Python | Missing methods `classify_color_rgb` and `classify_color_hsv` returning 3-tuple `(int, float, float)` | Only scalar `classify_color(r, g, b) -> int` was provided |
| **BLK-MDRB028-03** | MicroPython VM | `classify_color` returns 2-tuple instead of 3-tuple | MicroPython wrapper constructs `mp_obj_new_tuple(2, ...)` |
| **BLK-MDRB028-04** | Test Parity | Missing `tests/virtualhub/robotics/test_mdrobotbase_color.py` | VirtualHub test suite lacked dedicated color classification contract validation |

---

## 3. Baseline Metric Scorecard

| Assessment Dimension | Baseline Metric | Target Metric | Gap |
|---|:---:|:---:|:---:|
| API Contract Parity | 4.0 / 10 | 10.0 / 10 | +6.0 points |
| Structured Return Parity | 5.0 / 10 | 10.0 / 10 | +5.0 points |
| Multi-Space Ingestion (RGB+HSV) | 0.0 / 10 | 10.0 / 10 | +10.0 points |
| Fail-Closed Invalid Input Rejection | 6.0 / 10 | 10.0 / 10 | +4.0 points |
