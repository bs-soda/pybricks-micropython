---
name: soda-data-visualization
version: "1.0.0"
description: >-
  High-density data visualization, financial charts, telemetry dashboards, real-time
  sparklines, and statistical graphics. Design SVG/Canvas/D3 dual-axis charts, orderbook
  depth graphs, heatmaps, sankey diagrams, sunbursts, and colorblind-safe palettes (Viridis,
  Turbo, Plasma). Use on goals implementing metrics, charts, or telemetry dashboards.
  Triggers: data visualization, charts, graphs, sparkline, telemetry dashboard, heatmap,
  candlestick, d3, canvas chart. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# High-density data visualization & financial charting

**Model:** Metric Schema → **Visualization Geometry → Colorblind-Safe Palette → Interactive Canvas/SVG Engine → Tooltip & Density Optimization**

This skill engineers **rich, precise, and high-performance data visualizations** for telemetry streams, financial time-series, agent execution metrics, and complex analytical dashboards.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-spatial-canvas-3d](../soda-spatial-canvas-3d/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **High data-ink ratio** | Maximize information density while eliminating non-essential visual clutter (Edward Tufte's Data-Ink Invariant). |
| **Colorblind-safe accessibility** | Palettes MUST use perceptually uniform, colorblind-safe color maps (Viridis, Plasma, or high-contrast monochromatic ramps) with redundant geometric markers. |
| **Zero-latency streaming** | Real-time sparklines and time-series charts must update via 2D Canvas or SVG paths at 60 FPS without DOM garbage collection spikes. |
| **Contextual hover fidelity** | Tooltips must display exact numbers with full unit notation, percentage deltas, timestamps, and confidence intervals. |
| **Human approves chart grammar** | Chart axes, scales (logarithmic vs linear), and aggregation windows are defined and approved in the design spec. |

## Where data visualization artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Data visualization spec** | `docs/03-architecture/data-viz-spec.md` | product |
| **Chart color maps & tokens** | `docs/03-architecture/design-tokens.md` | product |
| **Chart components** | `code/**/components/charts/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces charts, telemetry meters, or financial data views | **Auto-run this skill during PLAN & EXECUTE.** Define chart types, scales, update frequencies, and tooltip formats |
| User says **"charts G-xxx"** / **"data viz G-xxx"** | Produce or refine the data visualization specification for that goal |
| User says **"sparklines"** / **"telemetry meter"** | Stage 2 — design low-overhead streaming mini-charts |
| User says **"candlestick"** / **"financial chart"** | Stage 3 — build dual-axis time-series with volume and moving average overlays |
| User says **"heatmap"** / **"sankey"** | Stage 4 — construct hierarchical or multi-node flow diagrams |
| User says **"chart review"** / **"data-ink audit"** | Stage 5 — verify 60 FPS rendering, responsiveness, and WCAG AA contrast |

---

## The data visualization lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Chart taxonomy & scale selection (PLAN)

Select the optimal visual grammar based on data dimensions:

| Data relationship | Recommended chart type | Rendering engine |
| :--- | :--- | :--- |
| **Time-series (High-frequency)** | Line chart with area gradient fill | 2D HTML5 Canvas / WebGL |
| **Categorical comparison** | Horizontal bar chart with sorted values | SVG / CSS Flexbox |
| **Part-to-whole breakdown** | Donut chart with central metric KPI | SVG Paths |
| **Multi-variable distribution** | Scatter plot with density contour | 2D Canvas |
| **System throughput flow** | Sankey diagram / Directed flow | D3 / Canvas |

**Deliverable:** Chart specification in `docs/03-architecture/data-viz-spec.md`.  
**Gate:** Scale types (Linear, Logarithmic, Time) and bounds strictly defined.

### Stage 2 — Perceptually uniform color maps (PLAN)

1. Map categorical series to distinct hues separated by $\ge 30^\circ$ on the color wheel.
2. Continuous heatmaps use perceptually uniform ramps:
   - *Viridis:* Deep Purple $\to$ Teal $\to$ Yellow (Optimized for all vision types).
   - *Plasma:* Indigo $\to$ Magenta $\to$ Amber (High emotional vibrancy).
   - *Status Ramp:* Slate (0%) $\to$ Emerald (Target) $\to$ Amber (Warning) $\to$ Crimson (Breach).

**Deliverable:** Palette tokens mapped in `design-tokens.md`.  
**Gate:** Accessible under Protanopia, Deuteranopia, and Tritanopia simulations.

### Stage 3 — Zero-CLS responsive rendering (EXECUTE)

1. Use `ResizeObserver` to smoothly reflow chart dimensions without tearing or redrawing from scratch.
2. Decouple data ingestion from rendering: ring-buffer data array updated at 100Hz, rendered at requestAnimationFrame (60Hz).

**Deliverable:** Chart components in Storybook / Widgetbook.  
**Gate:** Zero Cumulative Layout Shift during data stream initiation.

### Stage 4 — High-precision interactive tooltips (EXECUTE)

1. Crosshair cursor following mouse X-coordinate.
2. Floating tooltip showing:
   - Formatted value with localized currency / unit (e.g., `$1,420.50`, `14.2ms`).
   - Comparison delta vs previous period (e.g. `+12.4% ▲`).
   - ISO timestamp (`2026-08-24 07:15:00 UTC`).

**Deliverable:** Tooltip overlay component with edge collision detection (never clips offscreen).  
**Gate:** Tooltip position updates smoothly at $< 16\text{ms}$ latency.

### Stage 5 — Performance & data-ink audit (REVIEW)

- [ ] Unnecessary background grid lines removed or muted to `rgba(255,255,255,0.05)`.
- [ ] 10,000 data points rendered with $< 5\text{ms}$ frame time.
- [ ] Direct data labeling used where possible to avoid separate detached legends.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Select appropriate chart types that accurately convey quantitative truths | Truncate Y-axes deceptively to exaggerate minor differences |
| Implement 60 FPS Canvas/WebGL charts for large time-series datasets | Render thousands of un-virtualized SVG DOM nodes causing memory leaks |
| Use colorblind-safe palettes with clear quantitative tooltips | Rely purely on color to distinguish between critical chart lines |

---

## Related

- [soda-spatial-canvas-3d](../soda-spatial-canvas-3d/SKILL.md) — 3D & node graph rendering
- [soda-design](../soda-design/SKILL.md) — Design tokens & component spec
- [soda-testing](../soda-testing/SKILL.md) — Visual regression testing
