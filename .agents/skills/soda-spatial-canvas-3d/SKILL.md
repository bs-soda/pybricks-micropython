---
name: soda-spatial-canvas-3d
version: "1.0.0"
description: >-
  Spatial computing, WebGL/Three.js, dark glassmorphism shaders, glow gradient vectors,
  interactive 2D/3D canvas DAG topologies, and futuristic HUD aesthetics. Use on goals
  implementing rich visual dashboards, node graphs, spatial data maps, or immersive state visualizers.
  Triggers: 3d, threejs, canvas, webgl, glassmorphism, shader, node graph, dag canvas,
  futuristic hud. Collaboration phases PLAN → EXECUTE → REVIEW. Spatial specs are
  human-approved before implementation.
---

# Spatial computing, 3D canvas & glassmorphism

**Model:** Scene Geometry → **Shaders & Lighting → Reactive Node Graph / Canvas → Interactive Orbit Controls → GPU Optimization**

This skill elevates web and mobile frontends with **state-of-the-art visual computing, 3D WebGL graphics, dynamic node graphs, and ultra-luxurious glassmorphism shaders**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Spatial depth hierarchy** | Use lighting, elevation, and translucent glassmorphism to establish unmistakable visual layer priority (Z-index ordering). |
| **60 FPS minimum budget** | WebGL and Canvas operations must maintain $\ge 60$ FPS on standard hardware. Never compromise frame rate for excessive effects. |
| **Data-driven topologies** | Node graphs and 3D visualizers must represent real underlying system state (Goals, Subagents, Knowledge Graph nodes), never decorative fluff. |
| **Graceful degradation** | Provide zero-crash 2D HTML/SVG fallbacks on devices lacking WebGL hardware acceleration or during low-power modes. |
| **Human approves visual shaders** | Shader complexity, GPU draw budgets, and lighting tokens must be approved in the design spec. |

## Where spatial artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Spatial & canvas spec** | `docs/03-architecture/spatial-spec.md` | product |
| **Glassmorphism & shader tokens** | `docs/03-architecture/design-tokens.md` | product |
| **Canvas / 3D components** | `code/**/components/canvas/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces 3D graphics, WebGL, Canvas DAG, or Glassmorphism | **Auto-run this skill during PLAN & EXECUTE.** Define shader materials, geometry pipelines, and GPU budgets |
| User says **"spatial G-xxx"** / **"3d G-xxx"** / **"canvas G-xxx"** | Produce or refine the spatial specification for that goal |
| User says **"glassmorphism"** / **"obsidian shaders"** | Stage 1 — configure glassmorphism backdrop blur tokens and glowing border accents |
| User says **"node graph"** / **"dag canvas"** | Stage 2 — construct 60 FPS interactive DAG canvas |
| User says **"3d visualizer"** / **"threejs"** | Stage 3 — engineer Three.js scene, lighting, and camera orbit controls |
| User says **"gpu optimization"** / **"fps audit"** | Stage 4 — batch draw calls, instanced meshes, and measure frame times |

---

## The spatial engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Obsidian glassmorphism & shader tokens (PLAN)

Define translucent glass tokens in `docs/03-architecture/design-tokens.md`:

```css
/* Obsidian Glass Panel Token */
.glass-panel {
  background: rgba(13, 17, 23, 0.72);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

/* Glowing Vector Accent */
.glass-glow-accent {
  box-shadow: 0 0 20px -4px hsla(250, 95%, 64%, 0.4);
}
```

**Deliverable:** Glassmorphism utility classes and CSS token variables.  
**Gate:** Glass panels maintain WCAG contrast for foreground text against dynamic backgrounds.

### Stage 2 — 2D/3D reactive DAG node canvas (PLAN → EXECUTE)

1. Render Goals (`G-001..G-xxx`) and Subagents as interactive nodes.
2. Spring physics for collision-free auto-layout.
3. Node status halos: Green (Active), Amber (Review), Blue (Shipped), Red (Blocked).
4. Smooth zooming (0.2x to 3.0x), panning, and mini-map radar.

**Deliverable:** Node graph component in Storybook / Widgetbook.  
**Gate:** Graph handles 1,000+ nodes at $\ge 60$ FPS without UI lag.

### Stage 3 — 3D scene geometry & lighting (EXECUTE)

1. Three.js / React Three Fiber scene setup with ambient + directional key light.
2. Floating translucent geometric glyphs representing cognitive clusters.
3. Smooth orbit controls with inertia damping ($0.05$).

**Deliverable:** 3D interactive viewport component.  
**Gate:** Camera controls bounded with clipping planes to prevent disorientation.

### Stage 4 — GPU optimization & draw call batching (EXECUTE)

1. Combine geometries via `InstancedMesh` to keep WebGL draw calls $< 50$.
2. Promote animated elements to GPU composited layers (`will-change: transform`).
3. Automatically downscale resolution (DPR 1.0) on battery-saving or low-end mobile devices.

**Deliverable:** Performance audit report demonstrating 60 FPS telemetry.  
**Gate:** Memory footprint for WebGL context stays $< 64\text{MB}$.

### Stage 5 — Fallback & accessibility review (REVIEW)

- [ ] Laptops without dedicated GPU automatically fall back to 2D Canvas or SVG DAG.
- [ ] Screen readers announce node status via hidden accessible DOM list (`aria-live="polite"`).
- [ ] Keyboard navigation allows jumping between DAG nodes via `Tab` and `Arrow` keys.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Build 60 FPS hardware-accelerated Canvas & WebGL visualizers | Deploy un-optimized 3D scenes that cause browser freezing |
| Use obsidian glassmorphism with verified contrast ratios | Compromise text legibility by placing transparent text on noisy canvases |
| Provide interactive node graphs for goal and agent observability | Introduce 3D elements purely for decoration without linking to real state |

---

## Related

- [soda-design](../soda-design/SKILL.md) — UI/UX specification & component build
- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Micro-animations & haptics
- [soda-testing](../soda-testing/SKILL.md) — Visual regression & performance testing
