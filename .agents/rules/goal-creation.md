---
description: "set goal" / "set new goal" / "สร้าง goal" / feature request without G-xxx = Draft G-xxx from template + run conformance harness
alwaysApply: true
---

# Goal Creation & Spec Drafting Protocol

When the user asks to **"set goal"**, **"set new goal"**, **"สร้าง goal"**, **"draft goal"**, or describes a new feature/change without specifying an existing `G-xxx` ID:

The agent MUST strictly follow the **Soda OS Standard Goal Creation Protocol**. The agent MUST NEVER hallucinate random goal structures, MUST NEVER create generic implementation plans (`implementation_plan.md`), and MUST NEVER write application code in `code/` or `src/`.

---

## 🚫 The 9 Non-Negotiable Invariants of Goal Creation

1. **Zero Application Code Lock:** Do not modify, create, or delete any application code (`code/`, `src/`). Goal creation is 100% specification drafting in `docs/`.
2. **Deterministic Sequential ID Allocation:** 
   - Inspect `docs/07-backlog/goals.md`, `docs/07-backlog/goals/`, and `docs/07-backlog/goals/_archived/`.
   - Calculate the next sequential goal ID: `G-xxx` (e.g., if highest is `G-031`, assign `G-032`).
3. **Exact Template Fidelity:**
   - Copy the exact structure from `docs/07-backlog/goals/_template.md` (or `template/docs/07-backlog/goals/_template.md`).
   - Retain all canonical sections without omitting or renaming headers.
4. **Strict Separation of WHAT vs. HOW (Zero Premature Stack Guessing):**
   - `## Intent` MUST ONLY contain **Why:**, **Done when:**, and **Unblocks:** (WHAT / WHY only).
   - `## Intent` MUST NEVER mention frameworks, database types, third-party libraries, or implementation file structures.
   - `## How` MUST remain empty (`**Stack / approach:** —`) during `draft` and `planned` states.
5. **Zero Guessing / Mandatory Socratic Clarification Markers:**
   - The agent MUST NOT guess unspecified parameters, auth schemes, data contracts, or scope boundaries.
   - Every ambiguity MUST be registered under `## Open questions` as `- [ ] [NEEDS CLARIFICATION: <exact question>]`.
6. **Collaboration Phase & Plan Initialization:**
   - Status defaults to `draft` or `planned`.
   - Collaboration phase is initialized to **DEFINE** (`| ● | ○ | ○ | ○ | ○ |`).
   - All steps in `#### Plan` and `## Work steps` are marked `pending`.
7. **Two-Way Central Backlog Registration:**
   - Add the new goal row to `docs/07-backlog/goals.md` under **Active queue**.
   - Add the new goal row to `docs/07-backlog/goals.md` under **Dashboard** (DEFINE phase `●`).
8. **Mandatory Goal Conformance Harness Pass:**
   - Immediately upon writing `docs/07-backlog/goals/G-xxx.md`, execute the automated conformance harness:
     ```bash
     node scripts/harness/goal-template-conformance-harness.mjs G-xxx
     ```
     (or `soda-os validate-goal G-xxx`).
   - Verify that all 25 template checks pass 100% green. If any checks fail, fix the goal markdown immediately.
9. **ClickUp Sync Invariant:**
   - If ClickUp integration is configured (`scripts/clickup.config.json` exists), run `soda-os sync-clickup G-xxx` (or `node scripts/goals/sync-clickup.js G-xxx`) to initialize the task card.

---

## 📋 Canonical Goal File Schema (`docs/07-backlog/goals/G-xxx.md`)

```markdown
# G-xxx: [Short title]

**Status:** draft | planned  
**Kind:** feature | design | api | migration | qa | chore  
**Depends on:** G-yyy or —  
**Blocks:** G-zzz or —  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | [Step 1 description] | pending |
| 2 | [Step 2 description] | pending |
| 3 | [Verify test plan] | pending |

## Context
[1–3 sentences: Placement in product, initiative, legacy gap, or linked ADR.]

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*
**Why:** [Problem or opportunity — what breaks if we skip this?]
**Done when:** [Concrete observable deliverable / doc state]
**Unblocks:** [Downstream goals or repos]

## How *(PLAN only — leave empty while draft)*
**Stack / approach:** —

## Open questions *(block ready while any [NEEDS CLARIFICATION] remain)*
- [ ] [NEEDS CLARIFICATION: concrete question 1]
- [ ] [NEEDS CLARIFICATION: concrete question 2]

## Knowledge links
| Type | IDs |
|------|-----|
| **Pains addressed** | P-xxx |
| **Decisions** | PDR-xxx, ADR-xxx |
| **Assumptions required** | A-xxx or — |
| **Evidence** | E-xxx |

## Context manifest
| Kind | IDs / paths |
|------|-------------|
| **ADR** | ADR-xxx or — |
| **PDR** | PDR-xxx or — |
| **Patterns** | ORG-xxx or — |
| **Acceptance** | `docs/02-product/acceptance/G-xxx.md` |
| **Skills** | `soda-rest-api` | `soda-design` | — |
| **Profile** | `backend-api` | `qa` | `product` | `designer` |
| **Task type** | `add_api` | `modify_existing_api` | `db_migration` | `qa_verify` | `design_ui` | `add_ui` | `modify_ui` |
| **Playbook** | PB-xxx or — |
| **Default role** | `developer` | `qa` | … |
| **Files** | touch map globs (e.g. `code/src/...`) |
| **Constraints** | C-xxx, scope boundary or — |

## Work steps
1. [First step]
2. [Second step]
3. [Third step — test plan verification]
4. [Handoff / review]

## In
- [In-scope deliverable 1]
- [In-scope deliverable 2]

## Out
- [Explicit out-of-scope boundary 1]
- [Explicit out-of-scope boundary 2]

## Change delta *(brownfield)*
| Area | Action | Path / behaviour |
|------|--------|------------------|
| … | ADD / CHANGE / REMOVE | … |

## Contract draft *(optional)*
| Field / path | Action | Location |
|--------------|--------|----------|
| `...` | ADD / CHANGE / REMOVE | `...` |

## Spec checklist
- [ ] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [ ] How is empty while draft; filled in PLAN after clarify
- [ ] No [NEEDS CLARIFICATION] left in Open questions
- [ ] In / Out unambiguous; Out matches Scope Out
- [ ] Acceptance criteria each testable or reviewable
- [ ] Touch map is real repo paths
- [ ] Knowledge links: Why traces to P-xxx or accepted PDR
- [ ] Change delta filled if modifying existing behaviour
- [ ] Critical-path assumptions are not open + low

## Acceptance criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Test plan
- Commands from AGENTS.md Standard commands
- New/updated test files: `code/...`

## Touch map
- `path/to/...`

## Notes for AI
- Read: [link to specs]
- Acceptance contract: `docs/02-product/acceptance/G-xxx.md` (when ready)
- Skill: [matching soda skill]
- Constraints: [boundaries]
```

---

## ⚡ Agent Response Standard on "set goal"
When the user triggers goal creation, the agent must:
1. Write the new `docs/07-backlog/goals/G-xxx.md` file.
2. Update `docs/07-backlog/goals.md` (Queue + Dashboard).
3. Execute `node scripts/harness/goal-template-conformance-harness.mjs G-xxx` and verify 100% green conformance.
4. Respond in chat with a concise confirmation containing:
   - The created goal link `[G-xxx](file:///path/to/docs/07-backlog/goals/G-xxx.md)`
   - The harness verification confirmation (`✔ 25/25 checks passed`)
   - The identified `[NEEDS CLARIFICATION]` questions
   - The next recommended action: **"Run `clarify G-xxx` to resolve open questions."**
