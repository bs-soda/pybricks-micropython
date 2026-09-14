---
name: soda-web-vitals-performance
version: "1.0.0"
description: >-
  Core Web Vitals optimization, sub-50ms Interaction to Next Paint (INP), zero Cumulative Layout Shift (CLS),
  Web Worker / Rust WASM off-main-thread compute, bundle splitting, tree-shaking, and Real User Monitoring (RUM).
  Use on goals optimizing frontend rendering speed, reducing JavaScript bundle sizes, eliminating layout shifts,
  or offloading heavy computations to Web Workers. Triggers: web vitals, performance, inp, lcp, cls,
  bundle size, web worker, wasm compute, tree shaking, code split, rum telemetry.
  Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Core Web Vitals, Sub-50ms INP & Web Worker Performance

**Model:** Performance Baseline Audit → **Bundle Budgeting & Code Splitting → Web Worker Off-Thread Compute → Layout Shift & INP Optimization → Real-User Monitoring (RUM)**

This skill engineers **blazing-fast, 60/120 FPS frontend experiences**, enforcing sub-50ms interaction latency (INP), zero layout shifts (CLS), and sub-1.2s Largest Contentful Paint (LCP) across Web and Mobile.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md).

```
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                   SODA OS HIGH-PERFORMANCE RENDERING PIPELINE                           │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│ 1. MAIN UI THREAD│                 │ 2. OFF-THREAD    │                 │ 3. ZERO-CLS      │
│    (Sub-50ms INP)│                 │    WORKER / WASM │                 │    SKELETONS     │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│ 60/120 FPS render│                 │ Heavy filtering, │                 │ Exact dimensional│
│ Non-blocking user│ ──────────────> │ syntax highlight,│ ──────────────> │ reservation      │
│ click & keyboard │                 │ data analytics   │                 │ CLS = 0.00       │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
┌──────────────────┐                                                      ┌──────────────────┐
│ 4. BUNDLE SPLIT  │                                                      │ 5. RUM TELEMETRY │
│    & TREE SHAKE  │                                                      │    OBSERVABILITY │
├──────────────────┤                                                      ├──────────────────┤
│ Route code-split │                                                      │ Real-time p75/p95│
│ Initial < 120KB  │                                                      │ Web Vitals alerts│
└──────────────────┘                                                      └──────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Hard Core Web Vitals limits** | **LCP** $\le 1.2\text{s}$, **INP** $\le 50\text{ms}$ (Interaction to Next Paint), **CLS** $= 0.00$ (Cumulative Layout Shift). |
| **No heavy compute on main looper** | Parsing large JSON payloads, running syntax highlighters, or filtering $> 5,000$ records MUST execute in a Web Worker or Rust WASM module. |
| **Strict bundle budgets** | Initial gzipped JavaScript bundle payload MUST NOT exceed $120\text{KB}$. Route-level dynamic imports (`React.lazy` / `import()`) are mandatory. |
| **Predictable geometric skeletons** | Skeleton loading placeholders MUST match the exact height and width of populated cards to prevent Cumulative Layout Shift (CLS). |
| **Human approves bundle budget increases** | Exceeding the $120\text{KB}$ initial bundle limit or adding large external dependencies ($> 30\text{KB}$) requires human sign-off. |

## Where performance artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Performance budget & audit spec** | `docs/03-architecture/performance-budget.md` | product |
| **Lighthouse & Web Vitals benchmarks**| `docs/03-architecture/web-vitals-benchmarks.md` | product |
| **Web worker scripts** | `code/**/workers/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal optimizes page load speed, refactors heavy rendering loops, or audits Web Vitals | **Auto-run this skill during PLAN & EXECUTE.** Author performance budgets, worker threads, and code-splitting |
| User says **"performance G-xxx"** / **"web vitals G-xxx"** | Run comprehensive Lighthouse audit and execute rendering optimizations |
| User says **"inp"** / **"interaction latency"** | Stage 3 — eliminate long tasks ($> 50\text{ms}$) on the main thread |
| User says **"web worker"** / **"off thread compute"** | Stage 2 — offload heavy calculations or data transformations to Web Workers |
| User says **"bundle size"** / **"code split"** | Stage 1 — configure dynamic imports and analyze bundle dependencies |
| User says **"lighthouse"** / **"perf audit"** | Stage 5 — run automated Lighthouse CI benchmark |

---

## The Performance & Web Vitals Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Bundle Budgeting & Route Code-Splitting (PLAN → EXECUTE)

1. Enforce bundle ceilings in `vite.config.ts` / `next.config.js`:
   - Initial JS chunk $\le 120\text{KB}$ gzipped.
   - Dynamic route chunks $\le 45\text{KB}$ gzipped.
2. Replace static heavy imports with dynamic imports:
   ```typescript
   const ChartWorkbench = React.lazy(() => import("./ChartWorkbench"));
   ```

**Deliverable:** Bundle analysis report in `docs/03-architecture/performance-budget.md`.  
**Gate:** Total initial page download $< 120\text{KB}$ gzipped.

### Stage 2 — Web Worker & Rust WASM Off-Thread Processing (EXECUTE)

1. Offload non-UI tasks to Web Workers using `Comlink`:
   ```typescript
   // worker.ts
   import { expose } from "comlink";
   export const analyticsWorker = {
     calculateDCF: (financialGraph: GraphNode[]) => { /* Heavy Computation */ }
   };
   expose(analyticsWorker);
   ```

**Deliverable:** Web worker modules in `code/**/workers/`.  
**Gate:** Zero main-thread task durations $> 50\text{ms}$ during heavy computations.

### Stage 3 — Interaction to Next Paint (INP) & Zero-CLS Optimization (EXECUTE)

1. **Zero CLS:** Pre-allocate exact bounding box dimensions using CSS `aspect-ratio` or fixed height skeleton wrappers.
2. **Sub-50ms INP:** Wrap non-urgent state updates in `startTransition` (React 19) to prioritize user typing and click responses:
   ```typescript
   startTransition(() => {
     setFilteredResults(heavyFilter(data));
   });
   ```

**Deliverable:** Optimized component rendering hooks.  
**Gate:** Measured INP $\le 50\text{ms}$ and CLS $= 0.00$ on synthetic interaction tests.

### Stage 4 — Virtualized List & Infinite Canvas Rendering (EXECUTE)

1. Render large lists ($> 100$ items) using DOM virtualization (`@tanstack/react-virtual` / Flutter `ListView.builder`).
2. Cap active DOM nodes at $\le 1,500$ nodes regardless of total dataset size.

**Deliverable:** Virtualized workbench component.  
**Gate:** Scrolling 10,000 table rows maintains consistent $60\text{ FPS}$ with zero frame drops.

### Stage 5 — Automated Lighthouse CI & RUM Telemetry (REVIEW)

- [ ] Lighthouse Performance Score $\ge 95 / 100$.
- [ ] Largest Contentful Paint (LCP) $\le 1.2\text{s}$ on simulated 4G mobile network.
- [ ] Real User Monitoring (RUM) beacon configured via OpenTelemetry Web SDK.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Offload heavy computations to Web Workers to guarantee sub-50ms INP | Run blocking CPU-intensive calculations on the main UI looper thread |
| Enforce strict bundle size budgets using dynamic code-splitting | Import monolithic third-party libraries when lightweight alternatives exist |
| Pre-reserve layout geometry to eliminate Cumulative Layout Shift (CLS) | Render large unbounded datasets without DOM virtualization |

---

## Related

- [soda-design](../soda-design/SKILL.md) — 5-State Component UI
- [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md) — SRE Golden Signals
- [soda-micro-frontend-plugins](../soda-micro-frontend-plugins/SKILL.md) — Module Federation
