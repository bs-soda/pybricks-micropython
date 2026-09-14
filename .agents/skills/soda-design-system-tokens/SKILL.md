---
name: soda-design-system-tokens
version: "1.0.0"
description: >-
  Multi-platform design token architecture, W3C DTCG token formatting, and automated token
  compilation to CSS Variables, Tailwind CSS, Flutter ThemeData, and iOS/Android native themes.
  Manage dark/light mode switches, high-contrast accessibility tokens, and multi-brand white-labeling.
  Use on goals creating or modifying design tokens across Web and Mobile. Triggers:
  design tokens, token pipeline, theme switch, dark mode, dtcg, white-label tokens.
  Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Multi-platform design tokens & theme architecture

**Model:** Brand Token Extraction → **W3C DTCG Token Schema → Multi-Target Compilation → Dark/Light Mode Switching → Contrast Verification**

This skill engineers a **single source of truth (SSOT) design token pipeline**, compiling semantic design tokens across Web (CSS/Tailwind), Mobile (Flutter `ThemeData`), and Native platforms (iOS/Android).

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-creative-direction](../soda-creative-direction/SKILL.md) and [soda-design](../soda-design/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Tokens are the SSOT** | Zero hardcoded values in UI code. Every color, spacing, radius, typography scale, and elevation MUST be backed by a named token. |
| **Semantic abstraction** | Use semantic roles (`--color-surface-elevated`, `--color-text-muted`), never raw physical names (`--color-light-gray-2`). |
| **W3C DTCG compliance** | Token files follow the standard W3C Design Tokens Community Group JSON format (`$value`, `$type`, `$description`). |
| **Deterministic compilation** | Compiling token JSON produces deterministic outputs across CSS, JS/TS, Dart, and Kotlin without drift. |
| **Human approves token changes** | Modifying or adding canonical design tokens requires human approval and an updated PDR/ADR. |

## Where token artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Canonical tokens (DTCG JSON)** | `docs/03-architecture/design-tokens.json` | product |
| **Token reference guide** | `docs/03-architecture/design-tokens.md` | product |
| **Web compiled tokens** | `code/**/styles/tokens.css` + `tailwind.config.js` | product |
| **Flutter compiled tokens** | `code/**/theme/app_tokens.dart` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal adds or updates design tokens, themes, or color schemes | **Auto-run this skill during PLAN & EXECUTE.** Update `design-tokens.json` and compile to platform targets |
| User says **"tokens G-xxx"** / **"design tokens G-xxx"** | Propose or refine the token specification for that goal |
| User says **"dark mode"** / **"theme switch"** | Stage 3 — configure dark/light/high-contrast semantic token pairs |
| User says **"compile tokens"** / **"token pipeline"** | Stage 4 — run automated token compilation to Web and Mobile code |
| User says **"token audit"** / **"contrast check"** | Stage 5 — verify WCAG AA compliance across all theme pairs |

---

## The design token engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — W3C DTCG token schema authoring (PLAN)

Define structured tokens in `docs/03-architecture/design-tokens.json`:

```json
{
  "color": {
    "brand": {
      "primary": {
        "$value": "hsl(250, 95%, 64%)",
        "$type": "color",
        "$description": "Primary brand action color."
      }
    },
    "surface": {
      "base": {
        "$value": "{color.obsidian.950}",
        "$type": "color"
      }
    }
  },
  "spacing": {
    "4": { "$value": "16px", "$type": "dimension" }
  },
  "radius": {
    "md": { "$value": "8px", "$type": "dimension" }
  }
}
```

**Deliverable:** Valid W3C DTCG JSON file.  
**Gate:** All token aliases resolve cleanly without circular dependencies.

### Stage 2 — Semantic role mapping (PLAN)

Separate Global Palette (raw hues) from Semantic Roles:
- **Global:** `slate.900`, `indigo.500`, `emerald.400`.
- **Semantic:** `bg.canvas`, `surface.elevated`, `text.primary`, `border.subtle`, `action.hover`.

**Deliverable:** Semantic role mapping table in `docs/03-architecture/design-tokens.md`.  
**Gate:** No physical color names used directly in component styling rules.

### Stage 3 — Dark, light & high-contrast theme pairs (PLAN → EXECUTE)

1. Maintain 1-to-1 semantic variable names across themes.
2. Light mode: High lightness background (`#ffffff`), dark text (`#0f172a`).
3. Dark mode: Deep obsidian background (`#0b0d13`), light text (`#f8fafc`).
4. High-contrast: Augmented border widths ($2\text{px}$) and maximum contrast ($\ge 10:1$).

**Deliverable:** CSS variable definitions for `[data-theme="light"]` and `[data-theme="dark"]`.  
**Gate:** Theme toggle transitions smoothly without page reload or layout shift.

### Stage 4 — Multi-target compilation pipeline (EXECUTE)

Compile `design-tokens.json` to platform targets:
- **Web (CSS Variables):** `:root { --color-primary: hsl(250, 95%, 64%); }`
- **Web (Tailwind):** `theme.extend.colors.primary = 'var(--color-primary)'`
- **Mobile (Flutter Dart):** `static const colorPrimary = Color(0xFF5B50F6);`
- **iOS (Swift):** `static let primary = Color("ColorPrimary")`

**Deliverable:** Compiled token files across `code/`.  
**Gate:** All target platforms compile cleanly with zero missing token errors.

### Stage 5 — Automated contrast & accessibility verification (REVIEW)

- [ ] Every text and background token pair meets WCAG 2.1 AA ($\ge 4.5:1$ for body, $\ge 3:1$ for large text).
- [ ] No component in the codebase uses un-tokenized raw hex codes or magic px values.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Maintain W3C DTCG token definitions as the single source of truth | Manually edit compiled CSS/Dart token files without updating `design-tokens.json` |
| Add semantic tokens with documented purpose and theme pairs | Introduce arbitrary hex values directly in component templates |
| Ensure full cross-platform parity across Web, Mobile, and Native | Remove or rename existing tokens without a deprecation migration |

---

## Related

- [soda-creative-direction](../soda-creative-direction/SKILL.md) — Visual identity & palette design
- [soda-design](../soda-design/SKILL.md) — UI/UX component specifications
- [soda-code-review](../soda-code-review/SKILL.md)
