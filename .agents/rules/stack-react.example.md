---
description: React & Web (Next.js / Vite) stack conventions with Storybook & Playwright — rename to react.md at bootstrap and set alwaysApply
alwaysApply: false
---

# React, Storybook & Playwright Conventions

Copy to `.agents/rules/react.md` (or your stack name) and set `alwaysApply: true`.

## 1. UI Component-First Architecture & Storybook
- **Component Isolation:** Develop leaf and composite UI components in isolation inside **Storybook** (`*.stories.tsx`) before assembling full application screens or pages.
- **5-State Component Contract:** Every interactive component must cover:
  1. `Default` (Primary interactive state)
  2. `Hover / Focus-Visible` (Keyboard accessible with explicit focus ring)
  3. `Loading / Skeleton` (Async loading state)
  4. `Error / Validation` (Inline failure state)
  5. `Disabled / Empty` (Unset or zero-data state)
- **Presentational vs Container Boundaries:** Zero raw API calls or global store dispatches in leaf UI components. All data & actions must be passed via strict TypeScript props.
- **Design Tokens:** Style strictly with token-backed CSS variables or Tailwind utility classes (`bg-primary`, `text-text`, `p-4`, `rounded-md`). Zero hardcoded hex colors (`#123456`) or magic arbitrary margins.

## 2. State, Hooks & Data Fetching
- **Local State:** Component-level state (`useState`, `useReducer`) strictly for UI-only transient states.
- **Shared State:** Centralized store pattern (Zustand / Redux Toolkit / React Query) documented in architecture docs.
- **Centralized Data Fetching Layer:** Dedicated API clients and React Query hooks; no ad-hoc `fetch()` scattered in page components.

## 3. Automated Testing with Playwright & Component Unit Tests
- **Playwright E2E & Visual Regression:**
  - Automated visual regression snapshot tests comparing Storybook stories against baseline snapshots.
  - End-to-end user journey automation testing across Chromium, WebKit (Safari), and Firefox.
  - Test accessibility with `@axe-core/playwright` as a mandatory CI step.
- **Component Tests:** `@testing-library/react` and Vitest for interactive behavior and keyboard navigation.

## 4. Accessibility & Performance
- **WCAG 2.1 AA Compliance:** Minimum contrast ratio 4.5:1, semantic HTML tags (`<main>`, `<nav>`, `<article>`, `<button>`), touch targets $\ge 44 \times 44$ px.
- **Motion & Responsive Tokens:** Wrap non-essential animations in `prefers-reduced-motion` media queries. Support mobile, tablet, and desktop breakpoints seamlessly.
