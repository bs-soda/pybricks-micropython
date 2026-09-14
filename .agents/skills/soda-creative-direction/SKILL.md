---
name: soda-creative-direction
version: "1.0.0"
description: >-
  Creative direction, art direction, and brand visual identity — craft brand moodboards,
  emotional color palettes, typography scale & pairings, visual metaphors, icon systems,
  and UX copywriting tone. Use on goals establishing project brand identity or refining
  visual aesthetic to achieve a premium, state-of-the-art look. Triggers: creative direction,
  art direction, brand identity, visual theme, moodboard, typography pairing, brand voice.
  Collaboration phases PLAN → EXECUTE → REVIEW. Creative specs are goal-scoped and
  human-approved before implementation starts.
---

# Creative direction & art direction

**Model:** Emotional Discovery → **Moodboard → Color Palette → Typography System → Iconography → UX Copy Voice** → Design Tokens

This skill defines the **creative soul and visual identity** of a Soda OS application. It elevates applications from generic utility tools to stunning, memorable, and high-conversion software experiences.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Emotion-first visuals** | Every color, font weight, and contrast level evokes a specific emotional posture (e.g. *Hyper-Speed Technical Precision*, *Warm Human Care*, *Futuristic Cyber Sovereign*). |
| **Mathematical harmony** | Palettes and typographic scales follow strict mathematical proportions (e.g., Major Third $1.25$ or Perfect Fourth $1.333$, HSL hue-rotation with perceptual lightness compensation). |
| **No generic defaults** | Never use raw uncalibrated colors (plain `#ff0000` red, `#0000ff` blue, or standard gray `#808080`). Every color is custom-tailored with subtle undertones (slate, zinc, or warm obsidian). |
| **Tone of voice alignment** | UI micro-copy (empty states, errors, button labels) matches the brand character: concise, empowering, never robotic or apologetic. |
| **Human approves the creative spec** | The brand guide & moodboard is approved by a human **before** implementation goals consume it. |

## Where creative artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Brand identity guide** | `docs/03-architecture/brand-identity.md` | product |
| **Design tokens (canonical)** | `docs/03-architecture/design-tokens.md` + `code/**/tokens.*` | product |
| **UX copy & voice guide** | `docs/02-product/voice-and-tone.md` | product |
| **Creative decisions (ADR/PDR)** | `docs/05-decisions/` for brand archetype, typography, or color choices | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal is marked **`Kind: creative`** (or `Profile: art-director`, `Profile: designer`) | **Auto-run this skill as part of PLAN.** Produce the brand identity guide + token proposals, then stop for human approval before code |
| User says **"creative direction G-xxx"** / **"art direction G-xxx"** | Produce or refine the full creative spec for that goal — no production code yet |
| User says **"brand identity"** / **"moodboard"** | Stage 1 & 2 only — brand archetype and visual moodboard |
| User says **"palette"** / **"color system"** | Stage 3 — derive or update harmonic 6-tier HSL color palette |
| User says **"typography"** / **"font pairing"** | Stage 4 — typographic scale, line-heights, and display/body/code font pairings |
| User says **"brand voice"** / **"micro-copy"** | Stage 5 — tone of voice, empty state copy, and error recovery phrasing |
| Goal is purely backend / infra | Not this skill |

---

## The creative direction lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Emotional discovery & brand archetype (PLAN)

Read first from discovery and product brief:
- Target persona, emotional posture, and industry vertical
- Emotional keywords (e.g. *Precision, Velocity, Trust, High-Yield, Futuristic*)

Identify the core brand archetype:
1. **The Sovereign Builder:** High precision, dark obsidian (`#0b0d13`), neon status accents, monospace telemetry, razor-sharp borders (e.g., Linear, Warp).
2. **The Human Innovator:** Warm stone backgrounds, vibrant natural greens/purples, soft rounded corners, human-centric typography (e.g., Stripe, Notion).
3. **The High-Velocity Quantum:** Translucent glassmorphism, dynamic glow filters, animated gradient vectors, deep indigo/cyan themes.

**Deliverable:** 3-line archetype statement in `docs/03-architecture/brand-identity.md`.  
**Gate:** Brand archetype explicitly defined and agreed.

### Stage 2 — Visual moodboard & aesthetic theme (PLAN)

Define aesthetic pillars:
- Visual density: High (Bloomberg / IDE) vs Balanced (Linear / Vercel) vs Spaced (Consumer iOS).
- Material surface: Obsidian Glassmorphism vs Solid Flat Neumorphism vs Stark Monochromatic.
- Radius & elevation scale: Sharp (2-4px) vs Modern Rounded (8-12px) vs Fluid Pill (9999px).

**Deliverable:** Aesthetic theme matrix in `docs/03-architecture/brand-identity.md`.  
**Gate:** Material surface and density level approved.

### Stage 3 — Color theory & palette formulation (PLAN)

Derive a 6-tier cohesive HSL palette:
- **Base canvas (`--color-bg`):** Deep obsidian (`hsl(222, 47%, 5%)`) or warm off-white (`hsl(40, 20%, 98%)`).
- **Surface elevation (`--color-surface`):** Layered card containers with subtle border contrast (`hsl(222, 30%, 9%)`).
- **Primary accent (`--color-primary`):** Brand identifier with high chromatic vibrancy (`hsl(250, 95%, 64%)` Electric Indigo or `hsl(160, 84%, 45%)` Emerald).
- **Foreground contrast (`--color-text`):** Crisp, readable text passing WCAG AAA contrast ratio ($\ge 7:1$).
- **Status accents:** Semantic Tokens: `success` (Emerald), `warning` (Amber), `danger` (Crimson), `info` (Sky).

**Deliverable:** Palette definition in `docs/03-architecture/design-tokens.md`.  
**Gate:** Contrast ratio passes WCAG AA minimum for all text/bg combinations.

### Stage 4 — Typographic hierarchy & font pairing (PLAN)

Formulate font stacks pairing personality with legibility:
- **Display / Headings:** High-character modern fonts (*Outfit*, *Plus Jakarta Sans*, *Syne*, *Space Grotesk*).
- **Body / Interface:** Crystal-clear legibility (*Inter*, *Geist*, *Roboto*).
- **Telemetry / Code / Numbers:** Tabular figures & monospace clarity (*JetBrains Mono*, *Geist Mono*, *Fira Code*).
- **Modular scale:** $\text{Step}_n = 16\text{px} \times 1.25^n$ ($12, 14, 16, 20, 25, 31, 39, 48$ px).

**Deliverable:** Typography tokens mapped into CSS variables / Flutter `TextTheme`.  
**Gate:** Font stacks defined with fallback system fonts.

### Stage 5 — UX copywriting & voice guidelines (PLAN → approval)

Define voice rules in `docs/02-product/voice-and-tone.md`:
- **Error states:** State what occurred and the exact recovery path. Zero blame, zero raw stack dumps.
- **Empty states:** Provide an inspiring call-to-action with clear guidance on what will appear once data arrives.
- **Button labels:** Action-oriented verb + noun (e.g. *Approve Plan*, *Deploy Staging*, *Sync ClickUp*).

**Gate (human approval):** Human signs off on `brand-identity.md` and token proposals **before** UI implementation begins.

---

## Modes

### A — Greenfield project branding
Stages 1 → 5. Establish full `brand-identity.md`, `voice-and-tone.md`, and initial `design-tokens.md`. Human approves.

### B — Brand refinement / theme update
Frame the delta, update affected color or typography tokens, verify WCAG contrast, preserve component touch map.

### C — Sub-brand / dark-mode variant
Derive dark/light palette pair keeping identical variable semantics (`--color-bg`, `--color-primary`).

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Draft brand guidelines, moodboards, color palettes, font pairings | Promote creative goals to `ready` or `done` without human approval |
| Propose semantic tokens in `design-tokens.md` | Hardcode raw hex values or arbitrary CSS without tokens |
| Write UX copy guidelines in `voice-and-tone.md` | Alter core brand archetype without an ADR |

---

## Related

- [soda-design](../soda-design/SKILL.md) — UI/UX specification & component build
- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Motion & haptics
- [soda-spatial-canvas-3d](../soda-spatial-canvas-3d/SKILL.md) — 3D & glassmorphism
- [soda-code-review](../soda-code-review/SKILL.md)
