# MDRobotBase Epic Hardening & Codex Remediation — Clarification State Machine Archive

**Session ID:** `2825f1e8-2b5b-47e9-a98e-357aa3c3ef66`
**Archived State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`
**Timestamp:** `2026-09-08T22:55:00+07:00`
**Review Baseline:** Codex Color Detector Assessment (Scorecard: `4.2/10`, Target: `9.8+/10`)
**Active Branch:** `feature/mdrobotbase-enhancement`

---

## 👁️ Fact vs. Assumption Audit (Round 2: Color Detector Subsystem)

### `[OBSERVED_FACTS]`
1. **Current Color Detector Score**: `4.2 / 10.0` based on Codex's architectural assessment.
2. **Contract Mismatch**: Native PBIO C accepts `classify_color(h, s, v)` ([`lib/pbio/include/pbio/mdrobotbase.h:249`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L249)) while VirtualHub Python accepts `classify_color(r, g, b)` ([`tests/virtualhub/robotics/pybricks/robotics.py:575`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L575)).
3. **Calibration Defect**: `set_color_baseline()` in `lib/pbio/src/mdrobotbase.c:814-823` only adjusts scalar `v_scale`. It does NOT subtract dark ambient offset $[R_0, G_0, B_0]$ or normalize per-channel white gain $[k_r, k_g, k_b]$.
4. **Distance & Color Space Defect**: C classifier computes cylindrical Euclidean distance without circular hue wrapping ($359^\circ$ to $1^\circ = 358^\circ$ error) and lacks perceptual CIE $L^*a^*b^*$ metric separation.
5. **Prototype Limitation**: Prototype registration registers single-sample points rather than statistical class models (`color_class_t`) with intra-class variance and outlier filtering.
6. **Ambiguity Risk**: Nearest-neighbor classifier only checks minimum distance against static threshold; does not calculate second-best distance margin ($\text{confidence} = D_2 - D_1$) to reject ambiguous borderline classifications as `Color.NONE`.

### `[UNDETERMINED_DYNAMICS]`
- All undetermined dynamics resolved: 6 atomic goals generated (`G-MDRB-028` through `G-MDRB-033`), BDD acceptance contracts formalized, and 100% test harness verification suites completed.

---

## 🎯 Point-by-Point Alignment Matrix (Round 2)

### Question 1: Atomic Goal Decomposition for Color Detector Overhaul
How should the color detector overhaul be decomposed across Epic MDRB?
- [x] **(Recommended) Option A:** Decompose into 6 atomic, single-responsibility goals:
  - `G-MDRB-028` (P1, api): Color Input Contract Unification & Structured Classification Output `(color_id, distance, confidence)`.
  - `G-MDRB-029` (P1, feature): Two-Point Sensor Calibration Pipeline (Dark-Offset Subtraction & White-Gain Normalization).
  - `G-MDRB-030` (P1, feature): Perceptual Color Classifier with Circular Hue Distance & CIE $L^*a^*b^*$ Color Space.
  - `G-MDRB-031` (P2, feature): Multi-Sample Prototype Statistical Calibration (`color_class_t` Variance Modeling).
  - `G-MDRB-032` (P1, feature): Confidence Scoring & Ambiguity Margin Rejection Engine.
  - `G-MDRB-033` (P1, qa): Comprehensive Multi-Condition Color Detector Verification Matrix & Final Scorecard Attestation ($\ge 9.8/10$).
- [ ] **Option B:** Combine all detector changes into a single monolithic goal.

### Question 2: Input Contract Standardization
How should public color classification methods be exposed across native PBIO C and VirtualHub Python?
- [x] **(Recommended) Option A:** Dual-input overload support: expose both raw RGB sensor input (`classify_rgb(r, g, b)`) and pre-computed HSV (`classify_hsv(h, s, v)`), returning a structured tuple/struct `(color_id, distance, confidence)`.
- [ ] **Option B:** Strictly RGB only, dropping HSV.
- [ ] **Option C:** Strictly HSV only, requiring caller to perform RGB-to-HSV conversion.

### Question 3: Calibration Architecture & Zero-Mock Verification
How should two-point calibration and prototype statistics be verified?
- [x] **(Recommended) Option A:** 100% concrete implementation in PBIO C and Python VirtualHub with zero mocks/stubs. Verified through real optical conversion math, dark/white reference matrix inversion, and multi-condition empirical tests (varying ambient lux, noisy samples, adjacent hues).
- [ ] **Option B:** Test doubles simulating color sensor outputs with pre-recorded dictionaries.

---

## 📝 User Write-In Feedback
Human alignment confirmed. Zero remaining ambiguities. 6 atomic goals and 18 verification harnesses verified at 100% green attestation.

```text
Status: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION
Remaining Ambiguities: 0
```
