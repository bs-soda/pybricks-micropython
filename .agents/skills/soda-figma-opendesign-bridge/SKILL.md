---
name: soda-figma-opendesign-bridge
version: "1.0.0"
description: >-
  Bi-directional design-to-IA and IA-to-design bridge for Figma, OpenDesign, Penpot, and StitchMCP.
  Reads Figma / OpenDesign canvas node trees to automatically extract Information Architecture (IA),
  OOUX domain models, and site maps; conversely reads structured IA markdown specifications to programmatically
  generate UX/UI wireframe components, navigation frames, and design tokens in Figma / OpenDesign.
  Triggers: figma, opendesign, penpot, stitch, figma to ia, ia to figma, design to code, figma tokens,
  design bridge, canvas sync. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Bi-Directional Figma & OpenDesign IA/UX Bridge

**Model:** (Design $\to$ IA): Figma/OpenDesign Node Parse → **OOUX Entity Extraction → Site Map & Routing Generation**  
*(IA $\to$ Design)*: IA Markdown Spec → **Frame Hierarchy Generation → Auto-Layout & Token Mapping → Figma/OpenDesign Canvas Emit**

This skill provides a **seamless bi-directional bridge between visual design platforms (Figma, OpenDesign, Penpot, StitchMCP) and Soda OS specifications**, enabling automated design extraction into Information Architecture and programmatic generation of UX/UI canvas layouts from IA models.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-information-architecture](../soda-information-architecture/SKILL.md), [soda-design](../soda-design/SKILL.md), and [soda-design-system-tokens](../soda-design-system-tokens/SKILL.md).

```
 ┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
 │     VISUAL DESIGN PLATFORM           │          │         SODA OS SPECIFICATION        │
 │  (Figma / OpenDesign / StitchMCP)    │          │     (Markdown, OOUX & Site Maps)     │
 └──────────────────┬───────────────────┘          └──────────────────▲───────────────────┘
                    │                                                 │
                    │ 1. Read Canvas Tree (FRAMES, NODES, COMPONENTS) │
                    ▼                                                 │
 ┌────────────────────────────────────────────────────────────────────┴───────────────────┐
 │ DIRECTION A: DESIGN ➔ IA GENERATION                                                    │
 │ • Extracts Domain Entities (OOUX) & Attribute Naming from UI layers                    │
 │ • Infers Site Map Tree & 3-Click Navigation Depth from Canvas Frames                   │
 │ • Generates `docs/02-design/site-map.md` & `taxonomy-content-model.md`                 │
 └────────────────────────────────────────────────────────────────────────────────────────┘
                    ▲                                                 │
                    │                                                 │
 ┌──────────────────┴─────────────────────────────────────────────────▼───────────────────┐
 │ DIRECTION B: IA ➔ DESIGN CANVAS GENERATION                                             │
 │ • Reads `docs/02-design/information-architecture.md` & OOUX models                     │
 │ • Programmatically emits Auto-Layout Frames (Header, Nav Sidebar, Data Grids, Drawers) │
 │ • Applies W3C Design System Tokens (Colors, Typography, Spacing) into Figma/OpenDesign  │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Bi-directional single source of truth** | The bridge MUST prevent divergence: changes in Figma can sync into IA markdown, and changes in IA markdown can generate updated canvas frames. |
| **Semantic layer parsing** | Layer names (`[Card] ProjectCard`, `[Nav] Sidebar`, `[Button] Primary`) map directly to OOUX entities and Component-First states. |
| **Strict Auto-Layout & token alignment** | Generated canvas frames MUST use native Auto-Layout (Flexbox equivalent) and reference token variables, not hardcoded absolute coordinates. |
| **Zero visual lock-in** | Support open formats (OpenDesign `.opendesign` JSON, Penpot open schema, StitchMCP, and W3C DTCG Tokens) alongside proprietary Figma APIs. |
| **Human approves destructive canvas overwrites** | Re-generating an entire Figma file or discarding existing canvas designs requires explicit human confirmation. |

## Where Figma & OpenDesign bridge artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Figma / OpenDesign sync manifest** | `docs/02-design/figma-bridge/manifest.json` | product |
| **Extracted IA & site map** | `docs/02-design/site-map.md` | product |
| **OOUX domain model** | `docs/02-design/taxonomy-content-model.md` | product |
| **Design token bindings** | `docs/02-design/tokens/figma-tokens.json` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| User provides a Figma URL / OpenDesign file and asks to extract IA | **Auto-run Direction A.** Parse canvas hierarchy, extract OOUX entities, and write `site-map.md` |
| User asks to generate Figma screens / OpenDesign frames from IA specs | **Auto-run Direction B.** Read IA specs and generate structured visual layouts |
| User says **"figma to ia"** / **"read figma"** | Stage 2 — fetch node tree via Figma REST API / OpenDesign parser and synthesize IA |
| User says **"ia to figma"** / **"generate figma"** | Stage 3 — build Auto-Layout frames and emit canvas elements via Figma Plugin / StitchMCP |
| User says **"sync tokens"** / **"figma tokens"** | Stage 4 — synchronize W3C DTCG tokens with Figma Variables / Tokens Studio |
| User says **"design audit"** / **"ia drift check"** | Stage 5 — verify semantic alignment between canvas screens and codebase routes |

---

## The Bi-Directional Bridge Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Bridge configuration & authentication (PLAN)

Configure platform connection:
- **Figma API:** File Key (`FIGMA_FILE_KEY`) + Personal Access Token (`FIGMA_ACCESS_TOKEN`).
- **OpenDesign / Penpot:** Project ID + OpenDesign JSON schema.
- **StitchMCP:** Registered MCP Server with project ID.

**Deliverable:** Connection manifest in `docs/02-design/figma-bridge/manifest.json`.  
**Gate:** API authentication and document read/write permissions verified.

---

### Direction A: Visual Design $\longrightarrow$ Information Architecture (IA)

### Stage 2A — Canvas node tree ingestion & semantic parsing (PLAN → EXECUTE)

1. Traverse canvas nodes: `CANVAS` $\to$ `FRAME` (Screens) $\to$ `INSTANCE` / `COMPONENT` $\to$ `TEXT`.
2. Extract domain structure:
   - Screen Frame Names $\to$ Site Map Route Hierarchy (`/projects`, `/projects/:id/goals`).
   - Grouped Card Layers $\to$ OOUX Domain Entities (`Project`, `Goal`, `Invoice`).
   - Text Layer Content & Labels $\to$ Taxonomy tags, status enums, and attribute fields.

**Deliverable:** Generated `docs/02-design/site-map.md` and `docs/02-design/taxonomy-content-model.md`.  
**Gate:** $100\%$ of Figma top-level frames mapped to structured routes in the site map.

---

### Direction B: Information Architecture (IA) $\longrightarrow$ Visual Canvas

### Stage 3B — Programmatic frame synthesis & Auto-Layout emission (EXECUTE)

1. Read `docs/02-design/information-architecture.md` and OOUX specifications.
2. Generate structured UI frame payloads:
   - **Root Container:** Desktop ($1440\text{px} \times 900\text{px}$) or Mobile ($393\text{px} \times 852\text{px}$).
   - **L1 Global Navigation Frame:** Left sidebar ($260\text{px}$ width, Auto-Layout vertical, $8\text{px}$ gap).
   - **L2 Content Header:** Title, Breadcrumb navigation trail, and Primary Action CTA.
   - **L3 Data Grid / Metric Cards:** Auto-Layout grid ($24\text{px}$ gap, 5-State Component instances).
3. Emit to Figma via REST / Plugin API or generate `.opendesign` JSON package.

**Deliverable:** Synthesized visual screens in Figma / OpenDesign / StitchMCP project.  
**Gate:** Generated frames use strict Auto-Layout (`layoutMode: "VERTICAL" | "HORIZONTAL"`) with zero floating absolute coordinates.

---

### Stage 4 — Design Tokens & Figma Variables synchronization (EXECUTE)

Synchronize W3C DTCG Design Tokens:
- **Colors:** Light/Dark mode color variables mapped to Figma Color Styles / Variables.
- **Typography:** Inter / Outfit font stacks, weights, line heights, and letter spacing.
- **Elevation & Radii:** Blur tokens and corner radius variables ($4\text{px}, 8\text{px}, 16\text{px}$).

**Deliverable:** `docs/02-design/tokens/figma-tokens.json` export.  
**Gate:** 100% of generated canvas elements bound to token variables.

---

### Stage 5 — Semantic IA drift audit & route verification (REVIEW)

- [ ] Run automated drift check: All routes in `docs/02-design/site-map.md` have corresponding Figma frames.
- [ ] No orphan frames in Figma that lack documented routes or OOUX backing.
- [ ] Accessibility contrast check: All generated text-background color pairs pass WCAG 2.2 AAA ($7:1$).

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Parse Figma/OpenDesign canvases to generate structured IA site maps and OOUX models | Overwrite existing Figma designs without backing up original canvas states |
| Programmatically emit Auto-Layout frames driven by IA markdown specifications | Generate hardcoded static shapes with broken non-responsive coordinate layouts |
| Synchronize design tokens bi-directionally between code and Figma Variables | Hardcode raw hex colors in generated canvas layers instead of token references |

---

## Related

- [soda-information-architecture](../soda-information-architecture/SKILL.md) — IA, OOUX & Site maps
- [soda-design](../soda-design/SKILL.md) — UI Component-First design
- [soda-design-system-tokens](../soda-design-system-tokens/SKILL.md) — W3C DTCG Token system
