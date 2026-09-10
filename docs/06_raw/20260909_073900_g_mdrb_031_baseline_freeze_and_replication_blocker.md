# G-MDRB-031 Baseline Freeze & Initial Replication Blocker Record

**Document ID:** `DOC-06RAW-20260909-073900-MDRB031-BASE`
**Timestamp:** `2026-09-09T07:39:00+07:00`
**Goal:** [G-MDRB-031](../../07-backlog/goals/G-MDRB-031.md)
**Epic:** MDRB (Modular Differential Robot Base)
**Status:** `in_progress`
**Collaboration Phase:** `PLAN` $\to$ `EXECUTE`
**Exact-HEAD Provenance:** `d57160ff6ee8fad56925a82387146686a8270091`
**Author:** AI Agent (Pair Programming with Human Architect)

---

## 1. Baseline Architectural Freeze

In accordance with Section II & IV of the Global Engineering Constitution and Soda OS governance, this document freezes the pre-implementation state and establishes the exact-HEAD provenance before code modification for **Goal G-MDRB-031: Multi-Sample Prototype Statistical Calibration and Variance Modeling**.

### 1.1 Baseline Scorecard
- **Calibration Robustness:** `4.0 / 10.0`
- **Target Scorecard:** `9.8 / 10.0`
- **Root Cause Identified by Codex Review:**
  Prototypes are registered as single static points without variance modeling. A single optical reading cannot capture natural mat grain, gloss variation, or sensor electrical noise, causing distance spikes and false classifications when encountering slight variations on the competition field.

### 1.2 Exact-HEAD Provenance
- **Git Commit:** `d57160ff6ee8fad56925a82387146686a8270091`
- **Active Branch:** `feature/mdrobotbase-enhancement`
- **Clean Tree Check:** Repository is clean and tracking `origin/feature/mdrobotbase-enhancement`.

---

## 2. Identified Replication Blockers

| Blocker ID | Domain | Subsystem | Concrete Defect Description | Resolution Gate |
|---|---|---|---|---|
| `BLK-MDRB031-01` | Architecture / ABI | Header (`mdrobotbase.h`) | Missing `pbio_mdrobotbase_color_class_t` defining statistical distribution fields (`mean_h, mean_s, mean_v, mean_l, mean_a, mean_b, var_h, var_s, var_v, var_lab, sample_count`). | Declare struct and public API in header. |
| `BLK-MDRB031-02` | Algorithm / Math | Firmware C (`mdrobotbase.c`) | Single-sample registration in `pbio_mdrobotbase_color_cal_add_prototype` without multi-sample buffer accumulation ($10 \le N \le 30$) or Welford recurrence $M_k = M_{k-1} + \frac{x_k - M_{k-1}}{k}$. | Implement Welford online accumulator and class finalizer. |
| `BLK-MDRB031-03` | Color Science / Topology | Firmware & Sim | Linear hue averaging produces invalid means on the circle (e.g., $358^\circ$ and $2^\circ$ linearly average to $180^\circ$ instead of $0^\circ$). | Implement circular mean vector calculation $\text{atan2}\left(\sum \sin \theta_i, \sum \cos \theta_i\right) \pmod{360^\circ}$. |
| `BLK-MDRB031-04` | Safety / Life-cycle | Firmware & Sim | No statistical outlier filtering; corrupt readings (glints, shadows) distort prototype centers. No fail-closed minimum sample guard ($N < 5$). | Implement $2.5\sigma$ outlier rejection and fail-closed `PBIO_ERROR_INVALID_OP` check. |

---

## 3. Work Steps Execution Roadmap

1. **Step 1:** Define `pbio_mdrobotbase_color_class_t` and declare multi-sample accumulation API in `lib/pbio/include/pbio/mdrobotbase.h`.
2. **Step 2:** Implement Welford online accumulation, circular mean vector projection, and $2.5\sigma$ outlier filtering in native C and VirtualHub Python.
3. **Step 3:** Verify multi-sample noise convergence and synthetic outlier rejection across PBIO unit tests and VirtualHub Python suites under `-Wall -Wextra -Werror`.
