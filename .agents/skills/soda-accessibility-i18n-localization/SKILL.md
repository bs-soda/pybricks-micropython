---
name: soda-accessibility-i18n-localization
version: "1.0.0"
description: >-
  Accessibility engineering (WCAG 2.2 AAA compliance, focus trapping, screen-reader ARIA live regions),
  internationalization (i18n multi-language catalogs), bi-directional RTL/LTR layout mirroring (Arabic, Hebrew),
  and locale-aware formatting (Currencies, Buddhist/Gregorian Calendars, Numbers). Use on goals implementing
  accessibility audits, multi-language translation pipelines, RTL layouts, or localized currency/date formats.
  Triggers: accessibility, a11y, wcag, aria, screen reader, i18n, localization, l10n, rtl, ltr,
  multi-language, focus trap. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Accessibility (WCAG 2.2 AAA), i18n & RTL/LTR Localization

**Model:** Accessibility & Locale Audit → **Semantic ARIA & Focus Trap Engine → Multi-Language i18n Catalogs → Bi-Directional RTL/LTR Mirroring → Automated a11y & Translation Gating**

This skill guarantees that all Soda OS applications are **100% accessible to people with disabilities (WCAG 2.2 AAA) and universally localized across languages, currencies, timezones, and bi-directional RTL/LTR layout regimes**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-ux-research-heuristics](../soda-ux-research-heuristics/SKILL.md).

```
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                   ACCESSIBILITY (A11Y) & LOCALIZATION (I18N) ENGINE                     │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│ 1. SEMANTIC ARIA │                 │ 2. KEYBOARD NAV  │                 │ 3. MULTI-LINGUAL │
│    & LIVE REGIONS│                 │    & FOCUS TRAPS │                 │    I18N CATALOGS │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│ • role, aria-live│                 │ • TabIndex flow  │                 │ • en, th, ja, ar │
│ • Screen reader  │                 │ • Focus-visible  │                 │ • Zero hardcoded │
│   announcements  │                 │ • Modal trap ring│                 │   string literals│
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
┌──────────────────┐                                                      ┌──────────────────┐
│ 4. RTL/LTR LAYOUT│                                                      │ 5. LOCALE FORMAT │
│    MIRRORING     │                                                      │    MAPPINGS      │
├──────────────────┤                                                      ├──────────────────┤
│ • dir="rtl" flex │                                                      │ • Currencies ($/฿│
│ • Logical CSS    │                                                      │ • Date/Calendars │
│   properties     │                                                      │ • Number formats │
└──────────────────┘                                                      └──────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **WCAG 2.2 AAA standard** | Minimum $7:1$ text contrast ratio, clear `:focus-visible` rings, and zero keyboard navigation traps. |
| **Zero hardcoded string literals** | Every user-facing text, button label, tooltip, and error message MUST derive from typed translation catalogs (`t('goals.create')`). |
| **Logical CSS properties for RTL** | Use CSS Logical Properties (`margin-inline-start`, `inset-inline`) rather than physical directions (`margin-left`) to support instant RTL mirroring. |
| **Screen reader announcements** | Async data loads, agent streaming completions, and toast notifications MUST announce via `aria-live="polite"` regions. |
| **Human approves localization keys** | New translation keys and contextual strings require review to ensure cultural nuance and grammatical correctness. |

## Where accessibility & localization artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **A11y & localization spec** | `docs/02-design/accessibility-localization.md` | product |
| **Translation message catalogs** | `docs/02-design/i18n/{en,th,ja,ar}.json` | product |
| **A11y audit reports** | `docs/02-design/a11y-audit.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal adds new UI components, multi-language support, RTL layouts, or conducts a11y audits | **Auto-run this skill during PLAN & EXECUTE.** Write ARIA tags, translation catalogs, and logical CSS |
| User says **"accessibility G-xxx"** / **"a11y G-xxx"** | Run comprehensive WCAG 2.2 audit and produce accessibility remediations |
| User says **"i18n"** / **"localization"** | Stage 2 — scaffold multi-language message catalogs and type-safe translation hooks |
| User says **"rtl"** / **"arabic"** / **"hebrew"** | Stage 3 — configure bi-directional RTL layout rules using CSS logical properties |
| User says **"keyboard nav"** / **"focus trap"** | Stage 4 — implement focus containment for modals, drawers, and dropdowns |
| User says **"a11y audit"** / **"axe test"** | Stage 5 — run automated Axe-core linter and screen-reader tree verification |

---

## The Accessibility & Localization Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Accessibility & Locale Target Planning (PLAN)

Define supported locales and compliance thresholds:
- **Supported Languages:** English (`en-US`), Thai (`th-TH`), Japanese (`ja-JP`), Arabic (`ar-SA`, RTL).
- **Compliance Target:** WCAG 2.2 AAA ($7:1$ contrast, 44x44px touch targets).

**Deliverable:** Requirements matrix in `docs/02-design/accessibility-localization.md`.  
**Gate:** Contrast ratios and translation schemas established.

### Stage 2 — Multi-Language i18n Catalogs & Formatting Hooks (PLAN → EXECUTE)

1. Scaffold typed translation catalog:
   ```json
   {
     "workspace": {
       "title": "Soda OS Workspace",
       "goal_count": "{count, plural, =0 {No goals} one {# goal} other {# goals}}"
     }
   }
   ```
2. Integrate locale-aware formatters:
   - Currency: `Intl.NumberFormat(locale, { style: 'currency', currency: 'THB' })` $\to$ ฿1,500.00.
   - Date: Buddhist Era calendar formatting support for Thai locales.

**Deliverable:** Translation catalogs in `docs/02-design/i18n/`.  
**Gate:** Zero hardcoded string literals detected in component code.

### Stage 3 — Bi-Directional RTL/LTR Mirroring (EXECUTE)

1. Use CSS Logical Properties:
   ```css
   /* RTL-Compliant Logical Styling */
   .sidebar-nav-item {
     margin-inline-start: var(--soda-space-3);
     padding-inline: var(--soda-space-4);
     border-inline-start: 3px solid var(--soda-primary);
   }
   ```
2. Mirror directional icons (Arrows, Navigation Carets) automatically when `document.dir === 'rtl'`.

**Deliverable:** RTL layout stylesheet rules.  
**Gate:** Switching `dir="rtl"` mirrors the entire layout seamlessly without broken horizontal scrollbars.

### Stage 4 — Semantic ARIA & Modal Focus Trapping (EXECUTE)

1. **Focus Trapping:** When a modal/drawer opens, constrain `Tab` and `Shift+Tab` cycling strictly within the active dialog container.
2. **ARIA Live Regions:**
   ```html
   <div role="status" aria-live="polite" class="sr-only">
     Agent finished execution: Goal G-020 completed.
   </div>
   ```

**Deliverable:** Accessible dialog and notification components.  
**Gate:** Complete entire workflow using keyboard only (`Tab`, `Enter`, `Space`, `Esc`) with zero mouse input.

### Stage 5 — Automated Axe-Core & Screen-Reader Verification (REVIEW)

- [ ] Run `@axe-core/playwright` automated accessibility linter: $0\text{ violations}$.
- [ ] Verify color contrast meets $7:1$ across all light and dark theme permutations.
- [ ] Ensure all icon buttons possess explicit `aria-label` or `title` tags.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Enforce WCAG 2.2 AAA accessibility and keyboard navigation standards | Remove `:focus-visible` outline rings without providing an accessible alternative |
| Extract all text into typed i18n catalogs to support global localization | Hardcode language strings or culture-specific date/currency formats in templates |
| Use CSS logical properties to guarantee seamless RTL layout mirroring | Use physical CSS directions (`left`, `right`) where logical mirroring is required |

---

## Related

- [soda-design](../soda-design/SKILL.md) — 5-State Component UI
- [soda-ux-research-heuristics](../soda-ux-research-heuristics/SKILL.md) — Heuristics & usability
- [soda-design-system-tokens](../soda-design-system-tokens/SKILL.md) — Token variables
