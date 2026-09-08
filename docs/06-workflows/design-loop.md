# Design loop — UX/UI in the Soda cycle

> **For humans and agents.** How a screen, flow, or component goes from a discovered pain to a shipped,
> accessible UI — without guessing. Driven by the [soda-design](../../.agents/skills/soda-design/SKILL.md) skill.

Design sits **between** discovery and implementation. It is the missing middle: `soda-discovery` says
*what* to build and *why*; the design loop decides *how it looks and behaves*; implementation goals write
the code. Design is **goal-scoped** and **human-approved** before build starts.

```mermaid
flowchart LR
  DIS[soda-discovery\npains · journeys · success] --> FR[Frame]
  FR --> UX[UX flow + states]
  UX --> WF[Wireframe]
  WF --> Tok[Design tokens\n(derived per project)]
  Tok --> SPEC[UI spec]
  SPEC --> APR{Human approves}
  APR -->|yes| BUILD[Build\nReact + Tailwind]
  BUILD --> REV[Design + a11y review]
  REV --> SHIP[Ship]
  APR -->|no| UX
```

## Stages

| # | Stage | Phase | Deliverable | Lives in |
|---|-------|-------|-------------|----------|
| 1 | **Frame** | PLAN | User + job + success + constraints | `docs/03-architecture/ux/G-xxx.md` |
| 2 | **UX flow + states** | PLAN | Flow + empty/loading/error/partial/success | `docs/03-architecture/ux/G-xxx.md` |
| 3 | **Wireframe** | PLAN | Lo-fi layout, hierarchy, responsive intent | ux doc / Figma |
| 4 | **Design tokens** | PLAN | Color/type/spacing/radius/motion, brand-derived | `docs/03-architecture/design-tokens.md` + `code/**/tokens.*` |
| 5 | **UI spec** | PLAN | Component anatomy, variants, states, a11y, props | `docs/02-product/design/G-xxx.md` |
| — | **Approval** | PLAN | Human signs off before the goal is `ready` | goal status |
| 6 | **Build** | EXECUTE | React + Tailwind, tokens only, all states | `code/**/components/` |
| 7 | **Review** | REVIEW | UX heuristics + WCAG 2.1 AA gate | pairs with `soda-code-review` |

## Two rules that keep quality high

1. **Requirements before pixels.** No UI without a linked pain `P-xxx`, a named user/job, and success
   criteria. If they're missing, go back to [knowledge-loop.md](knowledge-loop.md) / `soda-discovery`.
   Optional design-file MCP (Figma, …) is **consumer-connected** and read-only unless the goal **In**
   allows writes — [external-tools.md](external-tools.md).
2. **Tokens are derived, not invented.** The visual system comes from the project's brand and brief,
   captured once as tokens (CSS variables → Tailwind), then reused. Components never carry raw hex or
   magic pixel values. This is what makes the UI come out *as required* instead of ad-hoc.

## Command triggers

| Human says | Skill | Action |
|------------|-------|--------|
| `design G-xxx` | soda-design | Full lifecycle (Stages 1–5), stop at approval |
| `ux flow` | soda-design | Flow + states |
| `wireframe` | soda-design | Lo-fi layout |
| `tokens` | soda-design | Derive/update design tokens |
| `ui spec` | soda-design | Component spec |
| `design review` / `a11y check` | soda-design | Stage 7 review gate |

## Governance

Agent **drafts**; a human (Designer / Product) **approves** the UX flow, UI spec, and any token/brand
change before the implement goal reaches `ready`, and before a UI goal is marked `done`. Every design
goal traces to a pain in [knowledge-map.json](../02-product/knowledge-map.json). See
[knowledge-governance.md](knowledge-governance.md).

## Related

- [soda-design](../../.agents/skills/soda-design/SKILL.md)
- [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — upstream
- [dev-loop.md](dev-loop.md) · [definition-of-done.md](definition-of-done.md)
- [bundle-profiles/designer.yaml](../04-agents/bundle-profiles/designer.yaml)
- [team-workflow.md](team-workflow.md)
