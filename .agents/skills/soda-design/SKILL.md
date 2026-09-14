---
name: soda-design
version: "1.2.0"
description: >-
  Product design for UI/UX goals — turn discovery + a goal into a validated
  design: UX flow, wireframe, project-derived design tokens, component UI spec,
  then a React + Tailwind build and an accessibility review. Use on any goal
  that adds or changes a screen, flow, or component. Triggers: design G-xxx,
  ux flow, wireframe, tokens, ui spec, design review, a11y check. Collaboration
  phases PLAN → EXECUTE → REVIEW. Design is goal-scoped and human-approved
  before implementation starts.
---

# Product design (UI / UX)

**Model:** Discovery → **UX flow → Wireframe → Tokens → UI spec → Build → Review** → ship

This skill fills the gap between `soda-discovery` (what to build and why) and implementation goals
(the code). It produces **good UX** — flows that match real user jobs, every screen state covered,
accessible by default — and **UI that matches the requirement**, because the visual system is
**derived per project** from brand and discovery, never guessed.

Post-ship evolution (did the design work?): [soda-learning-loop](../soda-learning-loop/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Design is goal-scoped** | One design effort serves one `G-xxx`. No redesigning unrelated screens. |
| **Requirements before pixels** | Never draw UI without a linked pain `P-xxx`, a user/job, and success criteria. If missing, go back to `soda-discovery`. |
| **Tokens are derived, not invented** | Color, type, spacing come from the project brand + brief. Capture them once, reuse everywhere. No hard-coded hex or magic numbers in components. |
| **Every state is a deliverable** | Empty, loading, error, success, and edge cases are part of the design — not an afterthought. |
| **Accessible by default** | WCAG 2.1 AA is a gate, not a nice-to-have. |
| **Human approves the design** | The design spec is approved by a human (designer / product) **before** the implement goal reaches `ready`. Agent drafts; human signs off. |

## Where design artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Design tokens** (canonical) | `docs/03-architecture/design-tokens.md` + `code/**/tokens.*` | product |
| **UX flow + screen states** | `docs/03-architecture/ux/G-xxx.md` | product |
| **UI / component spec** | `docs/02-product/design/G-xxx.md` | product |
| **Design system components** | `code/**/components/` (React + Tailwind) | product |
| **Design decisions** | `docs/05-decisions/` (PDR/ADR) for brand, framework, or pattern choices | product |

These are **product-owned** — `soda-os upgrade` never overwrites them. This skill ships the *procedure*,
the project fills the *content*.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal is marked **`Kind: design`** (or `Profile: designer`, or task type `design_ui` / `add_ui` / `modify_ui`) | **Auto-run this skill as part of PLAN — do not wait for a separate command.** Produce the UX flow + UI spec, then stop for human approval before any UI code |
| User says **"design G-xxx"** | Produce or refine the full design spec for that goal — no production code yet |
| User says **"ux flow"** | Stage 2 only — flow + states |
| User says **"wireframe"** | Stage 3 only — lo-fi layout |
| User says **"tokens"** | Stage 4 — derive or update design tokens (needs human approval to change existing tokens) |
| User says **"ui spec"** | Stage 5 — component anatomy, variants, states, a11y |
| User says **"design review"** / **"a11y check"** | Stage 7 — run the review gate on a built UI |
| Goal is not UI (API, migration, infra) | Not this skill |

### Optional consumer design MCP (Figma, …)

Not part of soda-os. If the **consumer** connected a design-file MCP and the goal **Notes for AI** / **How** name it:

- **PLAN default = read-only** — pull frames, spacing, tokens as *evidence* into `docs/03-architecture/ux/` and `design-tokens.md`. Do not treat the board as SSOT over the approved UI spec.
- Do **not** comment, publish, or rename files in the design tool unless **In** lists that write.
- File IDs / board URLs stay in the consumer goal — never in soda-os.
- Missing file ID → **`clarify G-xxx`**. Do not guess which Figma file.

See [external-tools.md](../../../docs/06-workflows/external-tools.md). Human still approves the UI spec before `ready`.

Design draft alone never sets a goal to `ready` or `done` — that stays with the human (see Governance).

---

## The design lifecycle (7 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Frame the problem (PLAN)

Read first, from the goal and discovery:

- Goal **Intent** (`Why` / `Done when`) and linked pains `P-xxx`
- The user / **job to be done** and the trigger context (device, environment, frequency)
- Success criteria + any metric from `docs/02-product/` (success coverage)
- Constraints `C-xxx` (brand, compliance, platform, performance budget)

Write a 3-line frame at the top of `docs/03-architecture/ux/G-xxx.md`:

```markdown
**User & job:** [who] needs to [job] so that [outcome].
**Success:** [observable — task completes in N steps / error rate < X / metric].
**Constraints:** [brand, platform, a11y, performance].
```

**Gate:** if you cannot name the user, the job, and success — stop and run `soda-discovery`.

### Stage 2 — UX flow & states (PLAN)

Map the path, not just the happy screen.

1. **Flow:** entry → steps → exit, as a numbered list or Mermaid `flowchart`.
2. **Decision points:** what branches the flow (auth, empty data, permissions).
3. **Screen states** — every view must define all of these:

| State | Design question |
|-------|-----------------|
| **Empty** | First use / no data — what guides the user? |
| **Loading** | Skeleton or spinner? Optimistic? |
| **Error** | What failed, how to recover, whose fault language |
| **Partial** | Some data, some missing / degraded |
| **Success / ideal** | The populated, working view |

**Gate:** all five states named for each screen in scope.

### Stage 3 — Wireframe (lo-fi) (PLAN)

Layout and hierarchy before color. Content priority first: what is the one primary action per screen?

- Block-level layout (regions, grid, order) as annotated ASCII or a Figma frame.
- Reading order = DOM order = tab order (write it down — it drives a11y later).
- Responsive intent: how the layout reflows at `sm` / `md` / `lg`.

**Gate:** one clear primary action per screen; mobile and desktop intent both described.

### Stage 4 — Design tokens (derive per project) (PLAN)

Do **not** style with raw values. Derive a token set from the project brand + brief, store it once,
and reference it everywhere. Changing existing tokens needs human approval (record as a PDR/ADR).

Canonical set to define in `docs/03-architecture/design-tokens.md`:

| Group | Tokens | Default scale (override per brand) |
|-------|--------|-------------------------------------|
| **Color** | `bg`, `surface`, `text`, `muted`, `primary`, `primary-fg`, `border`, `success`, `warning`, `danger` | Derived from brand; verify AA contrast for every text/bg pair |
| **Type** | font family, size scale, line-height, weight | 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 |
| **Spacing** | scale | **8pt grid**: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 |
| **Radius** | `sm` `md` `lg` `full` | 4 · 8 · 12 · 9999 |
| **Elevation** | shadow steps | 0 · sm · md · lg |
| **Breakpoints** | `sm` `md` `lg` `xl` | 640 · 768 · 1024 · 1280 |
| **Motion** | duration + easing | 150ms / 200ms, ease-out; honor `prefers-reduced-motion` |

Express tokens as **CSS variables** (source of truth) and map them into `tailwind.config` so components
use semantic classes, not raw values:

```js
// tailwind.config.js — tokens map to CSS vars, themable + brand-driven
theme: {
  extend: {
    colors: {
      bg: 'var(--color-bg)', surface: 'var(--color-surface)',
      text: 'var(--color-text)', muted: 'var(--color-muted)',
      primary: 'var(--color-primary)', 'primary-fg': 'var(--color-primary-fg)',
      border: 'var(--color-border)',
      success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)',
    },
    borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
  },
}
```

```css
/* :root defines the brand; [data-theme="dark"] overrides — one place to retheme */
:root {
  --color-bg: #ffffff; --color-surface: #f7f8fa; --color-text: #1f2a44;
  --color-primary: #2b6cb0; --color-primary-fg: #ffffff; --color-border: #e2e8f0;
  --radius-md: 8px; /* … */
}
```

**Gate:** every color pair used for text passes WCAG AA (4.5:1 body, 3:1 large). No component may ship a
raw hex or pixel value that a token could carry.

### Stage 5 — UI / component spec (PLAN → approval)

For each component in the goal, write the spec in `docs/02-product/design/G-xxx.md`:

```markdown
## Component: <Name>

**Anatomy:** [regions/slots]
**Variants:** [primary | secondary | ghost | …]
**Sizes:** [sm | md | lg]
**States:** default · hover · focus-visible · active · disabled · loading · error
**Props (React):** name: type — purpose (required?)
**Responsive:** behavior at sm / md / lg
**Accessibility:** role, name/label source, keyboard interaction, focus order, live-region if async
**Tokens used:** color.primary, spacing.16, radius.md, …
**Content:** label copy, empty/error strings (see soda-discovery success/constraints)
```

**Gate (human approval):** a human reviews the UX flow + UI spec and approves **before** the implement
goal is promoted to `ready`. Link the spec in the goal's **Context manifest** (`Profile: designer`,
`Skills: soda-design`).

### Stage 6 — Build Component-First in React (Storybook) or Flutter (Widgetbook) (EXECUTE)

Only after the spec is approved and the goal is `in_progress`. Stay inside the goal **touch map**.

1. **Build in Isolation First:**
   - **React (Web):** Create `*.stories.tsx` in **Storybook** covering all 5 states (default, hover/focus, loading/skeleton, error, disabled) before embedding in pages.
   - **Flutter (Mobile):** Create `@widgetbook.UseCase` in **Widgetbook** with dedicated directories for iOS, Android, and Huawei responsive variants.
2. **Implementation Invariants:**
   - **Semantic structure first**; add ARIA or Flutter `Semantics` to ensure full screen reader support.
   - Use **token-backed design tokens** (Tailwind classes / `AppThemeData`) — zero raw hex or arbitrary magic numbers.
   - Implement **all spec states**, including `loading` shimmer and inline `error`.
   - Interactive elements: visible `focus-visible` ring, hit target ≥ 44×44px (Web) / ≥ 48×48dp (Mobile).
   - Async UI: reflect loading/empty/error from Stage 2; announce changes via `aria-live` or accessibility alerts.
   - Motion via tokens; wrap non-essential animation in `motion-reduce:` / `MediaQuery.disableAnimations`.
   - Responsive via token breakpoints; test reflow across Desktop, Tablet, iOS, Android, and Huawei devices.

### Stage 7 — Design & accessibility review (REVIEW)

Run this gate before the goal reaches `review`/`done`. Pairs with [soda-code-review](../soda-code-review/SKILL.md).

**UX quality (heuristics)**

- [ ] One clear primary action per screen; hierarchy matches importance
- [ ] All five states implemented (empty / loading / error / partial / success)
- [ ] Error messages say what happened + how to recover (no blame, no raw stack)
- [ ] Copy matches product voice; no lorem ipsum; numbers/dates/units localized
- [ ] Flow matches the approved Stage 2 flow; no dead ends
- [ ] Nothing from Out of scope was added

**Accessibility (WCAG 2.1 AA)**

- [ ] Contrast AA for text and meaningful UI (verify with tokens)
- [ ] Full keyboard operation; visible focus; logical tab order = reading order
- [ ] Every control has an accessible name; images have alt or are decorative
- [ ] Forms: labels tied to inputs, errors programmatically associated
- [ ] Motion respects `prefers-reduced-motion`; nothing conveyed by color alone
- [ ] Touch targets ≥ 44×44px; zoom to 200% without loss

**System fidelity**

- [ ] Only tokens used — no rogue hex / spacing
- [ ] Matches the approved UI spec (variants, sizes, states)
- [ ] Responsive at sm / md / lg per spec

---

## Modes

### A — New screen / flow (greenfield UI)
Stages 1 → 7. If tokens don't exist yet, Stage 4 sets them up first (one-time, human-approved).

### B — Change to existing UI
Frame the delta (Stage 1), update only affected flow/states and spec, reuse existing tokens and
components. Minimize diff; do not restyle unrelated screens.

### C — Design-system / token setup
Stage 4 as its own goal — derive brand tokens, wire Tailwind + CSS vars, ship base components
(Button, Input, Card…) with full state coverage. Downstream UI goals consume them.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Draft UX flows, wireframes, UI specs | Promote a design goal to `ready` without human approval |
| Derive **proposed** tokens from brand/brief | Change existing tokens/brand without a PDR/ADR + human sign-off |
| Build components inside an approved goal's touch map | Restyle or refactor screens outside the goal |
| Flag contrast/a11y failures and fix them in scope | Mark a UI goal `done` before the Stage 7 review passes + human approves |

Human approvers: **Designer / Product** (UX + UI spec, tokens) · **Tech Lead** (goal `ready`/`done`).
Trace every design goal back to a pain `P-xxx` in [knowledge-map.json](../../../docs/02-product/knowledge-map.json) `goals[]` — a UI with no pain is scope creep.

---

## Definition of done — UI goal

- [ ] UX flow + all screen states approved (Stage 2)
- [ ] UI spec approved by human (Stage 5)
- [ ] Built with tokens only, all states, responsive (Stage 6)
- [ ] Stage 7 design + a11y review passed
- [ ] Acceptance criteria in `docs/02-product/acceptance/G-xxx.md` met
- [ ] `soda-code-review` + `soda-testing` green

## Prompt triggers

| Human says | Action |
|------------|--------|
| design G-xxx | Full lifecycle for the goal (Stages 1–5), stop at human approval |
| ux flow | Stage 2 — flow + states |
| wireframe | Stage 3 — lo-fi layout |
| tokens | Stage 4 — derive/update design tokens (approval to change existing) |
| ui spec | Stage 5 — component spec |
| design review / a11y check | Stage 7 — review gate |

## Related

- [soda-discovery](../soda-discovery/SKILL.md) — pains, journeys, success, constraints (upstream)
- [soda-goal-workflow](../soda-goal-workflow/SKILL.md) — goal execution (Layer 5)
- [soda-code-review](../soda-code-review/SKILL.md) — pairs with Stage 7
- [design-loop.md](../../../docs/06-workflows/design-loop.md) — human-facing overview
- [external-tools.md](../../../docs/06-workflows/external-tools.md) — optional consumer Figma/MCP
- [bundle-profiles/designer.yaml](../../../docs/04-agents/bundle-profiles/designer.yaml)
- `.agents/rules/{stack}.md` — React/Tailwind stack conventions
