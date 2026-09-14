---
name: soda-ux-research-heuristics
version: "1.0.0"
description: >-
  UX research, Nielsen's 10 Usability Heuristics audit, cognitive friction scoring,
  Jobs-to-be-Done (JTBD) user journey mapping, eye-tracking scanpath hierarchy (F-pattern,
  Z-pattern), Hick's Law decision analysis, and usability interview synthesis. Use on goals
  conducting UX audits, evaluating usability, or mapping end-to-end customer workflows.
  Triggers: ux research, heuristics, usability audit, jtbd, user journey, cognitive load,
  nielsen heuristics, hicks law. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# UX research, usability heuristics & journey mapping

**Model:** Discovery & User Jobs → **Nielsen Heuristic Audit → Cognitive Load Scoring → Scanpath & IA Optimization → Usability Gate**

This skill guarantees that Soda OS interfaces are **grounded in human cognitive psychology, frictionless usability, and verified user behavior**, eliminating subjective design guesswork.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-discovery](../soda-discovery/SKILL.md) and [soda-design](../soda-design/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Jobs-to-be-Done (JTBD)** | Users do not buy features; they hire software to make progress on a specific job (*When [context], I want to [motivation], so I can [outcome]*). |
| **Nielsen's 10 heuristics** | Every screen state is evaluated against the 10 universal usability heuristics (Visibility of system status, User control, Error prevention). |
| **Minimize cognitive load** | Keep simultaneous choices low ($T = b \cdot \log_2(n + 1)$ Hick's Law) and working memory chunks to $\le 7 \pm 2$ (Miller's Law). |
| **F-Pattern visual hierarchy** | Structure key actions and visual anchors along natural eye scanpaths (F-pattern for text-dense, Z-pattern for landing pages). |
| **Human approves UX findings** | Usability audit scores and journey maps must be reviewed and signed off before redesigning interfaces. |

## Where UX research artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **UX research & journey map** | `docs/02-product/user-journey-map.md` | product |
| **Heuristic usability audit** | `docs/02-product/usability-audit.md` | product |
| **Information architecture (IA)** | `docs/03-architecture/information-architecture.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal involves UX research, redesign, or usability improvement | **Auto-run this skill during PLAN.** Evaluate heuristic scores, identify friction points, and map user flows |
| User says **"ux research G-xxx"** / **"usability G-xxx"** | Produce or refine the UX research dossier for that goal |
| User says **"heuristics audit"** / **"nielsen review"** | Stage 2 — run systematic 10-heuristic evaluation scoring (0-4 severity) |
| User says **"user journey"** / **"jtbd"** | Stage 3 — map touchpoints, pains, emotional states, and opportunities |
| User says **"information architecture"** / **"ia sitemap"** | Stage 4 — construct hierarchical sitemap and navigation tree |
| User says **"cognitive load audit"** | Stage 5 — calculate Hick's Law decision time and Fitts's Law target difficulty |

---

## The UX research lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — JTBD framing & context intake (PLAN)

Frame the target user story in `docs/02-product/user-journey-map.md`:
- **Trigger context:** What triggers the need? (e.g., *Agent paused at Stage-Gate waiting for human approval*).
- **Core job:** Review code diffs and accept or reject with clear feedback.
- **Success metric:** Approval completed in $< 30\text{s}$ with zero misclicks.

**Deliverable:** JTBD frame statement.  
**Gate:** Clear functional and emotional outcomes identified.

### Stage 2 — Nielsen 10-heuristic usability audit (PLAN)

Score the target screen across the 10 heuristics (Severity 0 = No issue, 4 = Usability catastrophe):

1. **Visibility of system status:** Live progress pills, streaming indicators.
2. **Match between system and real world:** Human engineering terms, not internal hex hashes.
3. **User control and freedom:** 1-click cancel, undo, and rollback checkpoints.
4. **Consistency and standards:** Uniform design tokens and standard button placements.
5. **Error prevention:** Confirmation gates on destructive actions (e.g. `soda-os init --force`).
6. **Recognition rather than recall:** Contextual previews, recent history, visible parameters.
7. **Flexibility and efficiency of use:** Keyboard shortcuts (e.g. `Cmd+K`, hotkeys).
8. **Aesthetic and minimalist design:** High data-ink ratio; no redundant decorative noise.
9. **Help users recognize, diagnose, and recover from errors:** Plain-English recovery advice.
10. **Help and documentation:** Contextual tooltips and linked knowledge docs.

**Deliverable:** Usability scorecard in `docs/02-product/usability-audit.md`.  
**Gate:** Zero Severity 3 or 4 violations remaining in the proposed design.

### Stage 3 — End-to-end user journey mapping (PLAN)

Construct journey stages:
`Awareness` $\to$ `Intake` $\to$ `Analysis` $\to$ `Decision` $\to$ `Execution` $\to$ `Outcome`

For each stage, capture:
- User actions & thoughts
- Emotional dip / friction points
- Proposed design solutions

**Deliverable:** Markdown table journey map.  
**Gate:** All major friction dips addressed with concrete UI affordances.

### Stage 4 — Information architecture & scanpath layout (PLAN → EXECUTE)

1. Hierarchical navigation tree with depth $\le 3$ clicks from the home dashboard.
2. Structure page layout along natural visual scanpaths:
   - Primary action placed in top-right or sticky bottom-right (Fitts's Law).
   - High-priority summary metrics at top-left (Primary fixation point).

**Deliverable:** IA sitemap in `docs/03-architecture/information-architecture.md`.  
**Gate:** Max navigation path $\le 3$ clicks for any primary task.

### Stage 5 — Usability review gate (REVIEW)

- [ ] Hick's Law decision time for primary action $< 3.0\text{s}$.
- [ ] Touch / click targets $\ge 44\times 44\text{px}$ with $\ge 8\text{px}$ clearance.
- [ ] Task completion journey verified end-to-end without dead ends.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Audit interfaces against proven cognitive psychology principles | Base UX decisions on personal aesthetics without empirical heuristic rationale |
| Identify and eliminate friction points in user workflows | Add redundant confirmation modals to non-destructive actions |
| Map comprehensive user journeys with emotional touchpoints | Ignore accessibility and assistive navigation requirements |

---

## Related

- [soda-discovery](../soda-discovery/SKILL.md) — Product discovery & evidence capture
- [soda-design](../soda-design/SKILL.md) — UI/UX component specifications
- [soda-code-review](../soda-code-review/SKILL.md)
