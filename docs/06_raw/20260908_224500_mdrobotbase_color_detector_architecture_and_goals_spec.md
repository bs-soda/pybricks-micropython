# MDRobotBase High-Accuracy Color Detector Architecture, 5-Why Dialectic & Atomic Goal Specification

**Document ID:** `20260908_224500_mdrobotbase_color_detector_architecture_and_goals_spec`  
**Timestamp:** `2026-09-08T22:45:00+07:00`  
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Branch:** `feature/mdrobotbase-enhancement`  
**Baseline Review:** Codex Architectural Assessment (September 2026)  
**Baseline Score:** `4.2 / 10.0`  
**Target Score:** `9.8+ / 10.0`  
**Epics Covered:** `MDRB` (MDRobotBase Kinematics & Motion Engine)  
**Goals Defined:** `G-MDRB-028` through `G-MDRB-033`  

---

## 1. Executive Summary & Problem Formulation

In the latest architectural assessment by Codex (September 2026), the `MDRobotBase` color detection subsystem was evaluated at **4.2 / 10.0**, severely lagging behind the rest of the engine (9.62/10.0). While basic color prototypes were registered, the subsystem suffered from fundamental contract mismatches, non-functional baseline calibration, Euclidean distance distortion, single-sample prototype instability, and lack of ambiguity margin rejection.

### Baseline Scorecard vs Target

| Evaluation Category | Baseline Score | Target Score | Primary Architectural Defect |
|---|:---:|:---:|---|
| **RGB/HSV API Contract** | 4.0 / 10.0 | 10.0 / 10.0 | Contract mismatch: Native C accepted `(h, s, v)` while VirtualHub Python expected `(r, g, b)`. |
| **Calibration Effectiveness** | 4.0 / 10.0 | 10.0 / 10.0 | `set_color_baseline()` only modified `v_scale`; zero ambient offset subtraction or per-channel gain normalization. |
| **Lighting Robustness** | 3.0 / 10.0 | 9.5 / 10.0 | Zero white-reference intensity calibration; extreme vulnerability to ambient light and exposure shifts. |
| **Classification Accuracy** | 5.0 / 10.0 | 9.8 / 10.0 | Non-circular hue distance ($359^\circ$ vs $1^\circ = 358^\circ$ error); lack of perceptual CIE $L^*a^*b^*$ color space. |
| **Ambiguity Handling** | 3.0 / 10.0 | 9.5 / 10.0 | Only returns minimum distance; zero second-best margin calculation; misclassifies borderline samples. |
| **Testability & Multi-Env** | 6.0 / 10.0 | 10.0 / 10.0 | Disjoint test suites; no automated multi-lighting or noisy sample verification across PBIO and VirtualHub. |
| **Composite Score** | **4.2 / 10.0** | **9.8 / 10.0** | **Comprehensive color detector overhaul required** |

---

## 2. Socratic 5-Why Dialectic Analysis

```
Level 1 (Direct Symptom):
  Why does the MDRobotBase color detector misclassify standard competition tiles under varying light?
  ↳ Because the classifier computes raw distance against static prototypes that shift drastically when ambient light changes.

Level 2 (Calibration Mechanism):
  Why do static prototypes shift under different ambient light conditions?
  ↳ Because set_color_baseline() only adjusts an arbitrary scalar `v_scale` and does not perform true two-point calibration.

Level 3 (Mathematical Normalization):
  Why does adjusting `v_scale` fail to normalize sensor readings?
  ↳ Because optical sensors exhibit both non-zero dark current (ambient offset R0, G0, B0) and non-uniform channel sensitivities (gain kr, kg, kb); scaling V alone does not subtract the offset nor normalize white balance.

Level 4 (Color Space & Distance Metric):
  Why do similar colors still cross-trigger even when brightness is roughly equal?
  ↳ Because naive Euclidean RGB distance lacks perceptual uniformity, and linear hue math treats 359° and 1° as 358° apart instead of a circular 2° arc.

Level 5 (Statistical Classification & Ambiguity Margins):
  Why does the detector output high confidence on ambiguous boundary readings?
  ↳ Because nearest-neighbor classification takes argmin(D) without checking if the margin to the second-best candidate (D2 - D1) is statistically significant, resulting in arbitrary classification of borderline samples.
```

---

## 3. High-Accuracy Color Detector Architecture

The overhauled detector replaces ad-hoc heuristics with a 7-stage optical pipeline:

```
[ Raw Optical Sensor Sample (R, G, B) ]
                   ↓
1. Two-Point Calibration: Dark Current Offset Subtraction
   R' = R - R_black,  G' = G - G_black,  B' = B - B_black
                   ↓
2. White-Reference Gain Normalization
   R_norm = clamp(R' / (R_white - R_black), 0.0, 1.0)
   G_norm = clamp(G' / (G_white - G_black), 0.0, 1.0)
   B_norm = clamp(B' / (B_white - B_black), 0.0, 1.0)
                   ↓
3. Dual Color-Space Transformation
   Normalized RGB ───► Circular HSV (h ∈ [0, 360), s ∈ [0, 1], v ∈ [0, 1])
                  └───► Perceptual CIE L*a*b* (L* ∈ [0, 100], a*, b* ∈ [-128, +127])
                   ↓
4. Optical Validity Verification
   If V < V_min (under-exposed) or V > V_max (sensor saturated) ──► Color.NONE
                   ↓
5. Statistical Weighted Composite Distance Evaluation
   dh = min(|h - h_mean|, 360 - |h - h_mean|)
   ΔE_ab = sqrt((ΔL*)^2 + (Δa*)^2 + (Δb*)^2)
   D_i = w_h · (dh / σ_h)^2 + w_s · (Δs / σ_s)^2 + w_v · (Δv / σ_v)^2 + w_lab · (ΔE_ab / σ_lab)^2
                   ↓
6. Ambiguity Margin & Confidence Calculation
   D_best = min_i(D_i),  D_second = min_{j ≠ best}(D_j)
   Margin = D_second - D_best
   Confidence = clamp(Margin / Margin_ref, 0.0, 1.0)
                   ↓
7. Fail-Safe Rejection Gate
   If D_best > D_max OR Margin < Margin_threshold ──► (Color.NONE, D_best, Confidence)
   Else ──► (Best_Color_ID, D_best, Confidence)
```

---

## 4. Mathematical Model & Invariants Spec

### 4.1. Circular Hue Distance Invariant
$$\forall h_1, h_2 \in [0^\circ, 360^\circ): \quad dh(h_1, h_2) = \min(|h_1 - h_2|, 360^\circ - |h_1 - h_2|) \le 180^\circ$$
- **Invariant:** $dh(359^\circ, 1^\circ) = \min(358^\circ, 2^\circ) = 2^\circ$.
- **Symmetry:** $dh(h_1, h_2) = dh(h_2, h_1)$.
- **Triangle Inequality:** $dh(h_1, h_3) \le dh(h_1, h_2) + dh(h_2, h_3)$.

### 4.2. Perceptual CIE $L^*a^*b^*$ Space
Standard sRGB D65 chromatic adaptation:
$$X = 0.4124564 R_{norm} + 0.3575761 G_{norm} + 0.1804375 B_{norm}$$
$$Y = 0.2126729 R_{norm} + 0.7151522 G_{norm} + 0.0721750 B_{norm}$$
$$Z = 0.0193339 R_{norm} + 0.1191920 G_{norm} + 0.9503041 B_{norm}$$

With $X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$:
$$f(t) = \begin{cases} t^{1/3} & \text{if } t > 0.008856 \\ 7.787 t + \frac{16}{116} & \text{otherwise} \end{cases}$$
$$L^* = 116 f(Y / Y_n) - 16, \quad a^* = 500 [f(X / X_n) - f(Y / Y_n)], \quad b^* = 200 [f(Y / Y_n) - f(Z / Z_n)]$$

### 4.3. Statistical Class Model (`color_class_t`)
```c
typedef struct {
    uint8_t color_id;
    float mean_h;
    float mean_s;
    float mean_v;
    float mean_l;
    float mean_a;
    float mean_b;
    float variance_h;
    float variance_s;
    float variance_v;
    float variance_lab;
    uint16_t sample_count;
} pbio_mdrobotbase_color_class_t;
```

---

## 5. Backlog Goal Decomposition (Epic MDRB)

### `G-MDRB-028`: Color Input Contract Unification & Structured Classification Output
- **Kind:** `api` | **Priority:** `P1`
- **Atomic Outcome:** Unify public C API (`lib/pbio/include/pbio/mdrobotbase.h`) and VirtualHub Python API (`tests/virtualhub/robotics/pybricks/robotics.py`) to accept both raw RGB (`classify_rgb`) and HSV (`classify_hsv`), returning structured `(color_id, distance, confidence)`.
- **Touch Map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`
  - `tests/virtualhub/robotics/test_mdrobotbase_color.py`

### `G-MDRB-029`: Two-Point Sensor Calibration Pipeline with Dark-Offset and White-Gain Normalization
- **Kind:** `feature` | **Priority:** `P1`
- **Atomic Outcome:** Implement black-reference offset calibration ($R_{black}, G_{black}, B_{black}$) and white-reference gain calibration ($R_{white}, G_{white}, B_{white}$) storing baseline calibration matrix and producing normalized $[0.0, 1.0]$ optical vectors.
- **Touch Map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`
  - `lib/pbio/test/src/test_mdrobotbase.c`

### `G-MDRB-030`: Perceptual Color Classifier with Circular Hue Distance and CIE L\*a\*b\* Space
- **Kind:** `feature` | **Priority:** `P1`
- **Atomic Outcome:** Implement circular hue difference arithmetic and standard CIE $L^*a^*b^*$ color space transformation with weighted composite distance metrics ($w_h, w_s, w_v, w_{lab}$).
- **Touch Map:**
  - `lib/pbio/src/mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`
  - `lib/pbio/test/src/test_mdrobotbase.c`

### `G-MDRB-031`: Multi-Sample Prototype Statistical Calibration and Variance Modeling
- **Kind:** `feature` | **Priority:** `P2`
- **Atomic Outcome:** Implement `pbio_mdrobotbase_color_class_t` capturing 10–30 samples per color target, computing running mean and variance using Welford's algorithm, and rejecting statistical outliers beyond $2.5\sigma$.
- **Touch Map:**
  - `lib/pbio/include/pbio/mdrobotbase.h`
  - `lib/pbio/src/mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`

### `G-MDRB-032`: Confidence Scoring and Ambiguity Margin Rejection Engine
- **Kind:** `feature` | **Priority:** `P1`
- **Atomic Outcome:** Implement second-best distance calculation ($\text{Margin} = D_2 - D_1$), relative confidence computation, and fail-safe `Color.NONE` rejection when distance exceeds cutoff or confidence falls below ambiguity threshold.
- **Touch Map:**
  - `lib/pbio/src/mdrobotbase.c`
  - `pybricks/robotics/pb_type_mdrobotbase.c`
  - `tests/virtualhub/robotics/pybricks/robotics.py`

### `G-MDRB-033`: Comprehensive Color Detector Verification Matrix & Final Scorecard Attestation
- **Kind:** `qa` | **Priority:** `P1`
- **Atomic Outcome:** Execute empirical test matrix covering hue wraparound ($359^\circ \leftrightarrow 1^\circ$), ambient illumination sweeps ($10\text{ lux}$ to $2000\text{ lux}$), similar color separation (red vs orange, blue vs cyan), noisy samples, and native C vs VirtualHub consistency, elevating detector score to $\ge 9.8 / 10.0$.
- **Touch Map:**
  - `lib/pbio/test/src/test_mdrobotbase.c`
  - `tests/virtualhub/robotics/test_mdrobotbase_color.py`
  - `docs/06_raw/`
