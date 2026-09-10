# G-MDRB-032: Baseline Freeze, Socratic Dialectics & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260909-MDRB032-BASELINE`
**Date/Timestamp:** `2026-09-09T07:48:00+07:00`
**Goal ID:** `G-MDRB-032`
**Status:** `in_progress`
**Collaboration Phase:** `EXECUTE`
**Author:** AI Agent (Antigravity) & Human System Architect
**Workspace:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`
**Branch:** `feature/mdrobotbase-enhancement`
**Exact-HEAD Git SHA:** `d57160ff6ee8fad56925a82387146686a8270091`

---

## 1. Executive Summary & Baseline Freeze

This document freezes the pre-implementation baseline state for **Goal `G-MDRB-032`** (**Confidence Scoring & Ambiguity Margin Rejection Engine**) in accordance with Section III and IV of the Engineering Constitution.

In Codex's architectural assessment (September 2026), ambiguity handling scored **3.0 / 10.0**, stating:
> *"Minimum-distance classification alone can choose the wrong color when two prototypes are close. Add: `confidence = second_best_distance - best_distance`. Reject the result as `Color.NONE` when either `best_distance > absolute_threshold` or `confidence < ambiguity_threshold`. Return `(color_id, distance, confidence)` instead of only `(color_id, distance)`."*

### Pre-Implementation Baseline Scorecard
| Dimension | Pre-G-MDRB-032 Baseline | Target (G-MDRB-032) |
|---|:---:|:---:|
| **Ambiguity Handling & Margin Scoring** | 3.0 / 10.0 | **9.8 / 10.0** |
| Borderline Candidate Disambiguation | 2.0 / 10.0 | 10.0 / 10.0 |
| Normalized Confidence Calibration | 4.0 / 10.0 | 10.0 / 10.0 |
| Dual Fail-Safe Rejection (Cutoff + Margin) | 3.0 / 10.0 | 10.0 / 10.0 |

---

## 2. Identified Replication Blockers (Red Phase Baseline)

The following replication blockers are frozen prior to code changes:

- **`BLK-MDRB032-01` (Absence of Ambiguity Margin Rejection):**
  The classifier loop in `lib/pbio/src/mdrobotbase.c:1070-1096` and `tests/virtualhub/robotics/pybricks/robotics.py:1002-1011` only checks `min_d > max_thresh`. When two competing prototypes are nearly equidistant (e.g. $D_1 = 15.0, D_2 = 15.2$), the classifier outputs $D_1$'s color ID without rejecting the borderline reading, causing false positive transitions on tile boundaries.

- **`BLK-MDRB032-02` (Missing Configurable Ambiguity Threshold API):**
  Neither native C `lib/pbio/include/pbio/mdrobotbase.h` nor VirtualHub `robotics.py` provides `set_color_ambiguity_threshold` or stores `ambiguity_threshold` in `pbio_mdrobotbase_color_cal_t`.

- **`BLK-MDRB032-03` (Single-Prototype Confidence Defect):**
  When only 1 prototype is calibrated, current code computes $\text{conf} = 1 - D_1 / \text{cutoff}$, violating Acceptance Scenario 4 which requires $\text{conf} = 1.0$ within cutoff because in the limit $D_2 \to \infty$, $(D_2 - D_1)/(D_2 + D_1) = 1.0$.

- **`BLK-MDRB032-04` (MicroPython Method Binding Gap):**
  `pybricks/robotics/pb_type_mdrobotbase.c` does not yet expose `set_color_ambiguity_threshold` for user script configuration.

---

## 3. Socratic 5-Why Dialectic Traceability

All 25 nodes across 5 branches verified passing in `scripts/harness/socratic-agentic-loop-g-mdrb-032-harness.mjs`:
- Branch 1: Second-Best Candidate Tracking ($D_1 \le D_2$)
- Branch 2: Margin Calculation & Normalized Confidence Scoring
- Branch 3: Dual Fail-Safe Rejection (Absolute Cutoff & Ambiguity Margin)
- Branch 4: Boundary Topology & Edge Cases ($N=1$, Equidistant Ties)
- Branch 5: Scorecard Elevation & Ambiguity Handling Alignment (3.0/10 $\to$ 9.8/10)

---

## 4. Next Implementation Actions
1. **Step 1:** Add `ambiguity_threshold` to `pbio_mdrobotbase_color_cal_t` and declare `pbio_mdrobotbase_color_cal_set_ambiguity_threshold`.
2. **Step 2:** Implement dual-rejection logic in C and Python; clamp confidence strictly to $[0.0, 1.0]$. Expose MicroPython binding.
3. **Step 3:** Add comprehensive unit tests verifying borderline rejection and single-prototype limits.
