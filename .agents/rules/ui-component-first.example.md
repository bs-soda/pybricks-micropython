---
description: Universal IA-First, UI Component-Second & 5-State Design System Standard — cross-platform (Web + Mobile)
alwaysApply: false
---

# Universal IA-First & UI Component-Second Engineering Standard

Copy to `.agents/rules/ui-component-first.md` and set `alwaysApply: true`.

```
  ┌───────────────────────────────────────────────────────────┐
  │ 1. STAGE 1: INFORMATION ARCHITECTURE (IA) FIRST           │
  │    • Define OOUX Domain Entities & Attributes             │
  │    • Define 3-Click Navigation Tree & Site Map Hierarchy  │
  │    • Define Taxonomies & Faceted Search Matrix            │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 2. STAGE 2: DESIGN TOKENS SINGLE SOURCE OF TRUTH          │
  │    • W3C DTCG Tokens (Colors, Typography, Radii, Space)   │
  │    • Compile tokens to CSS variables & Dart ThemeData     │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 3. STAGE 3: UI COMPONENT SECOND (ISOLATED WORKSHOP)       │
  │    • Web: Build atomic components in Storybook            │
  │    • Mobile: Build atomic widgets in Widgetbook           │
  │    • Implement mandatory 5-State Lifecycle Contract       │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 4. STAGE 4: PAGE ASSEMBLY THIRD (ACCORDING TO IA SITE MAP)│
  │    • Assemble verified components into L1/L2/L3 routes    │
  │    • Wire state management, breadcrumbs & Cmd+K palette   │
  └─────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
  ┌───────────────────────────────────────────────────────────┐
  │ 5. STAGE 5: FLOWS, MICRO-INTERACTIONS & BDD VERIFICATION  │
  │    • Spring physics, sound earcons, and route transitions │
  │    • Playwright / Patrol visual pixel regression testing  │
  └───────────────────────────────────────────────────────────┘
```

---

## 1. The Non-Negotiable Hierarchy: Why IA First?

**You cannot design a component without knowing the object it represents.**
1. **IA-First:** Extracts the core domain objects (OOUX: *Projects, Goals, Invoices, Agents*), their relationships, and where they sit in the navigation hierarchy.
2. **Component-Second:** Builds the visual container for that object (Card, Tile, Row, Form) in isolation with all 5 lifecycle states.
3. **Page-Assembly Third:** Assembles components into the route structure defined by the IA Site Map.

---

## 2. Isolated Component Prototyping Workshop

Never assemble full screens, pages, or complex views directly from scratch. All user interfaces must be engineered in an **isolated component workshop**:
- **Web App (React / Next.js / Vite):** Build components inside **Storybook** (`.stories.tsx`).
- **Mobile App (Flutter):** Build components inside **Widgetbook** (`.directories.g.dart` / `@widgetbook.UseCase`).

---

## 3. Mandatory 5-State Component Contract

Every interactive UI component (Buttons, Form Inputs, Metric Cards, Modals, List Items, Tables) MUST explicitly define and visually demonstrate all 5 states:

| State | Purpose | Visual / Behavioral Expectation |
| :--- | :--- | :--- |
| **1. Skeleton / Loading** | Async fetching state | Animated skeleton shimmer matching the final layout geometry to eliminate cumulative layout shift (CLS). |
| **2. Populated / Active** | Normal data state | Standard design token colors, legible typography, proper spacing tokens. |
| **3. Empty State** | Zero data / initial state | Dedicated empty-state illustration, friendly copy, and primary action CTA. |
| **4. Error / Validation** | Operational or input failure | Inline error badge/text, red status border, accessible aria/semantics alert and retry button. |
| **5. Disabled / Read-Only**| Unavailable or no permission| Reduced opacity (0.4-0.6), `pointer-events: none`, or tooltip explaining why disabled. |

---

## 4. Atomic Design Hierarchy

1. **Atoms:** Basic building blocks (Buttons, Badges, Typography, Icons, Input Fields).
2. **Molecules:** Functional groups of atoms (Search Bars, Form Groups, Metric Tiles).
3. **Organisms:** Complete UI sections (Navigation Bars, Table Workbenches, Log Stream Drawers).
4. **Templates / Pages:** Full screen compositions populated with real or mock-free store data.

---

## 5. Visual Quality & Automated Testing Gate

- **Visual Regression Testing:**
  - **Web:** Playwright visual snapshot comparison against Storybook canvas.
  - **Mobile:** Patrol golden-file image comparison against Widgetbook use-cases.
- **Human Review Gate:** No screen-assembly PR may be merged until all component stories/widgets have been visually verified and approved.
