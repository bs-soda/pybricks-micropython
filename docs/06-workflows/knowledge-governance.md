# Knowledge governance

> **Layer above the knowledge loop** — who owns, who approves, what agents may change without human sign-off.
> **Core invariants (immutable):** [os-core-invariants.md](os-core-invariants.md)
> Complements [.agents/rules/governance.md](../../.agents/rules/governance.md) (code/ship gates).

When multiple agents or humans edit the same graph, this table is the **authority matrix** for `docs/02-product/` and `docs/05-decisions/`.

Framework loop: [knowledge-loop.md](knowledge-loop.md)

---

## Why this layer exists

```text
Evidence → who validates?
Knowledge → who approves promotion?
Decision → who sign-off?
Learning → who accepts evolution?
```

Without it: agents overwrite source of truth, PDR accepted without PO, stale pain promoted after conflict.

---

## Authority matrix

| Artifact | Owner | Approver | Agent may (autonomous) | Agent must stop for human |
|----------|-------|----------|------------------------|---------------------------|
| **Evidence** (`E-xxx`) | Human or Agent | — | ✅ Register, link, set temporal fields | ❌ Fabricate sources; commit secrets in `ref` |
| **Knowledge** (P/A/C/R in map) | Agent drafts | **Product Owner** | ⚠️ Draft, distill, set confidence `low`/`medium` | Promote to brief; set confidence `high`; resolve conflicts alone |
| **Assumption** (`A-xxx`) | Agent drafts | **Product Owner** | ⚠️ Register `open` | `validated` / `invalidated` — human confirms |
| **Conflict** (`CF-xxx`) | Agent detects | **Product Lead** | ⚠️ Open, document both sides | Close (`resolved`) — human chooses resolution |
| **PDR** | Product | **Product Lead** | ⚠️ Draft `proposed` only | Status → `accepted` / `superseded` |
| **ADR** | Tech Lead | **Architect** | ⚠️ Draft `proposed` only | Status → `accepted` / `deprecated` |
| **Goal** (`G-xxx`) | Agent drafts | **Tech Lead** (+ PO for user-facing) | ⚠️ `draft` / `planned`; edit in `in_progress` within touch map | `ready`, `approved`, `done`; scope change |
| **Acceptance contract** | Agent drafts | **Product Owner** | ⚠️ Draft scenarios | Sign-off before `ready` |
| **Learning** (`O-xxx`, map updates) | Agent | **Human review** | ⚠️ Register observation; propose `learning_actions` | Apply supersede/invalidate/new PDR without review |
| **Pattern** (`ORG-xxx`) | Studio / Architect | **Architect + PO** | ⚠️ Propose export draft from learning-log | Publish to `org-patterns/`; bump `reusable` score |

**Legend:** ✅ autonomous · ⚠️ draft / propose only · ❌ human required

---

## Role definitions (default — customize per studio)

| Role | Typical hat | Approves |
|------|-------------|----------|
| **Product Owner (PO)** | Scope, user value | Knowledge → brief; assumptions; acceptance |
| **Product Lead** | Priority, tradeoffs | PDR `accepted`; conflict resolution |
| **Tech Lead** | Delivery, goals | Goal `ready` / `approved`; touch map |
| **Architect** | Stack, boundaries | ADR `accepted`; pattern library |
| **Human reviewer** | Post-ship | Learning actions applied to map |

Same person may hold multiple roles — document in project snapshot or goal **Deciders** field.

---

## Agent rules (mandatory)

1. **Never** set PDR/ADR to `accepted` — only `proposed` until human says approve.
2. **Never** promote knowledge to `project-brief.md` without explicit human **`promote digest`** or written approval in chat.
3. **Never** close `CF-xxx` without human resolution type.
4. **Never** apply learning `supersede_pain` / `invalidate_assumption` / `new_pdr` without **`learn`** session + human ack (or post-ship review).
5. **May** register evidence, draft nodes, run audits, print traceability scores, propose patterns.
6. On multi-agent conflict: last writer does **not** win — open `CF-xxx` and stop.

---

## Status gates × governance

| Transition | Human required | Governance check |
|------------|----------------|------------------|
| Map node → brief | PO | No open CF-xxx on that node |
| PDR `proposed` → `accepted` | Product Lead | Evidence linked; dependency graph filled |
| ADR `proposed` → `accepted` | Architect | Same |
| Goal `planned` → `ready` | Tech Lead (+ PO if user-facing) | Traceability ≥ min; coverage gates; spec stability (clarify, spec check); acceptance contract |
| Goal `review` → `approved` | Tech Lead | DoD + code review |
| Goal `approved` → `done` | Tech Lead | Human explicit |
| Observation → learning applied | Reviewer | learning_actions logged |
| Export → `ORG-xxx` | Architect | Anonymized; no PII/secrets |

---

## Traceability × governance

Before goal → `ready`, agent runs **`trace G-xxx`** — see [knowledge-map.README.md](../02-product/knowledge-map.README.md) § Traceability score.

Also: **`clarify G-xxx`** + **`spec check G-xxx`** — no `[NEEDS CLARIFICATION]` left; Intent is WHAT/WHY only. See [goal-spec-guide.md](goal-spec-guide.md) § Spec stability.

If score < `traceability.min_score_ready` → agent **stops**; Tech Lead may waive → log [changelog.md](../07-backlog/changelog.md).

---

## Pattern library governance

Patterns in [org-patterns/](../04-agents/org-patterns/) are **org-owned**, not project-owned.

| Action | Who |
|--------|-----|
| Propose pattern from project | Agent drafts from learning-log |
| Publish `ORG-xxx` | Architect approves |
| Use pattern on new project | Agent cites as hypothesis (`confidence: low`) |
| Auto-recommend (v6) | Only when pattern `reusable_score` ≥ threshold + context match — still requires local E-xxx for ADR accept |

See [organizational-learning.md](organizational-learning.md) · [pattern-index.json](../04-agents/org-patterns/pattern-index.json)

---

## Audit

Significant governance overrides (waived traceability, forced promote, conflict defer) → append [changelog.md](../07-backlog/changelog.md):

```markdown
| YYYY-MM-DD | Governance | G-014 traceability waived @ 58% — Tech Lead @name |
```

---

## Related

- [governance.md](../../.agents/rules/governance.md) — code, merge, prod
- [security.md](../../.agents/rules/security.md)
- [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md)
- [team-workflow.md](team-workflow.md)
