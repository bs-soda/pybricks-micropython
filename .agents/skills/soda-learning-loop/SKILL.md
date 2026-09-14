---
name: soda-learning-loop
version: "1.0.2"
description: >-
  Closed-loop learning after execution: observe deploy/metrics/support/feedback,
  register observations, update knowledge map (pains, assumptions, conflicts),
  propose new goals or PDRs. Use after goal done, SHIP/staging, observe, learn,
  post-deploy review, support patterns, or when metrics contradict discovery.
---

# Learning loop

**Model:** Execution → **Observation** → **Learning** → Knowledge update ↺

| Phase | Agent job | Artifacts |
|-------|-----------|-----------|
| Observe | Capture post-ship signals | `O-xxx`, new `E-xxx`, [learning-log.md](../../../docs/02-product/learning-log.md) |
| Learn | Apply `learning_actions` | LearningService → `applyLearningActions()` |
| Evolve | Promote or supersede knowledge | projections: digest, brief, assumptions, PDR, goal `draft` |

Discovery (upstream): [soda-discovery](../soda-discovery/SKILL.md)  
Execution (upstream): [soda-goal-workflow](../soda-goal-workflow/SKILL.md)

Full reference: [knowledge-loop.md](../../../docs/06-workflows/knowledge-loop.md) · **Services:** [knowledge-services.md](../../../docs/03-architecture/knowledge-services.md)

## Knowledge services

Use **LearningService** capabilities — not storage APIs:

| Capability | When |
|------------|------|
| `recordObservation()` | `observe` / `post-ship G-xxx` |
| `applyLearningActions()` | `learn` session |
| `supersedeKnowledge()` | metrics contradict active pain |

Phase 1 persists via KnowledgeStore (hidden). Sync [learning-log.md](../../../docs/02-product/learning-log.md) as projection.

**Future:** `GoalCompleted` event → LearningService listener — see [knowledge-services.md](../../../docs/03-architecture/knowledge-services.md#future--event-bus-do-not-implement-yet).

## Gate

| Rule | Agent must |
|------|------------|
| User says **`observe`** / **`learn`** / **`post-ship G-xxx`** | This skill — docs + map, no feature code unless new `ready` goal |
| Goal just marked **`done`** | Prompt human: run learning loop for G-xxx (do not skip silently) |
| Metrics contradict active pain | Create observation → may supersede pain or open conflict |
| No observation source | Ask human for metrics, ticket ref, or feedback — register as E-xxx |

---

## When to run

| Trigger | Example |
|---------|---------|
| Goal → `done` | G-004 shipped — UAT + metrics |
| Staging SHIP | Smoke test findings |
| Support pattern | 5 tickets same pain |
| Analytics delta | Dark mode 5% → 90% |
| Incident postmortem | [soda-incident-response](../soda-incident-response/SKILL.md) feeds O-xxx |
| Scheduled review | Quarterly `knowledge audit` + temporal review |

---

## Step 1 — Observe

Register observation `O-xxx` and evidence `E-xxx`:

```json
{
  "id": "O-001",
  "date": "2026-07-15",
  "source": "analytics",
  "title": "Dark mode adoption 90% post-launch",
  "finding": "Contradicts P-001 (users don't want dark mode, Jan 2026 interview)",
  "evidence_id": "E-010",
  "goals": ["G-004"],
  "status": "pending",
  "learning_actions": []
}
```

| source | Use when |
|--------|----------|
| `metrics` | Dashboard, KPI export |
| `analytics` | Product analytics event |
| `support` | Ticket cluster |
| `feedback` | User interview post-launch |
| `deploy` | Staging/prod deploy result |
| `uat` | Human UAT notes |
| `incident` | Outage / rollback |

Append row to [learning-log.md](../../../docs/02-product/learning-log.md).

---

## Step 2 — Learn (apply actions)

For each finding, choose actions:

| action | Effect |
|--------|--------|
| `supersede_pain` | Old P-xxx → `superseded`; new P-yyy with new E-xxx |
| `update_pain` | Revise title/confidence on P-xxx |
| `invalidate_assumption` | A-xxx → invalidated; may trigger PDR |
| `validate_assumption` | A-xxx → validated; promote |
| `new_pain` | Add P-xxx from observation |
| `new_conflict` | CF-xxx if sources disagree (see discovery skill) |
| `resolve_conflict` | Close CF-xxx with resolution |
| `new_pdr` | Scope pivot from learned outcome |
| `new_goal` | Draft G-xxx for follow-up work |
| `update_decision_review` | Mark PDR/ADR `needs_review` if outcome challenged decision |

**Temporal:** New evidence resets `last_validated`, recalculates `expires_after`. Stale nodes → `needs_review: true`.

**Invariant 4 (Core):** Do **not** set `status: processed` unless `learning_actions.length >= 1`. Observation-only = not learning.

Set observation `status: processed` when ≥1 action applied.

---

## Step 3 — Knowledge update

1. LearningService: `applyLearningActions()`; persist via service layer
2. Update [knowledge-digest.md](../../../docs/02-product/knowledge-digest.md) promotion/supersede log
3. Update brief / assumptions if stable
4. Draft new goals in `goals/G-xxx.md` + map `goals[]` — **`planned` only**
5. Link observation to decision `outcomes[]` when decision validated/challenged
6. Append [changelog.md](../../../docs/07-backlog/changelog.md) for significant learning
7. Draft exportable **ORG-xxx** `proposed` from reusable outcomes — Architect publishes ([org-patterns/](../../../docs/04-agents/org-patterns/README.md), [knowledge-governance.md](../../../docs/06-workflows/knowledge-governance.md))

---

## Temporal revalidation (also run on `learn` / `knowledge audit`)

Recalculate for every `E-xxx`, pain, assumption, decision:

```text
expires_after = last_validated (or date) + freshness_days
needs_review = today > expires_after OR conflicting new evidence
```

Default `freshness_days`: `temporal_defaults.evidence_freshness_days` (180).

| State | Agent |
|-------|-------|
| `needs_review: true` | Warn; block promote → `ready` until revalidated or superseded |
| Expired pain | `status: expired` or supersede via observation |
| Stale decision | Flag PDR/ADR for outcome review |

Human revalidates → bump `last_validated`, clear `needs_review`, adjust confidence.

---

## Conflict detection (learning-triggered)

When observation **contradicts** active pain/assumption/decision:

1. Do **not** auto-promote contradictory knowledge
2. Open or update `CF-xxx` in `conflicts[]`
3. Ask human to resolve → PDR, `evidence_wins`, or `supersede`
4. Block `promote digest` while `conflicts[].status === open`

See [soda-discovery](../soda-discovery/SKILL.md) § Conflict graph.

---

## Prompt triggers

| Human says | Action |
|------------|--------|
| observe / learn / post-ship G-xxx | Steps 1–3 for that goal |
| revalidate P-001 | Temporal update + ask for new E-xxx |
| learning audit | Unprocessed observations + stale `needs_review` |

---

## Checklist

- [ ] O-xxx + E-xxx registered
- [ ] learning_actions applied; observation `processed`
- [ ] Map + learning-log synced
- [ ] Conflicts resolved or explicitly deferred
- [ ] New goals `planned` only
- [ ] changelog if significant
- [ ] Invariant 4: ≥1 learning_action before `processed`
- [ ] **`os health`** if map changed ([soda-discovery](../soda-discovery/SKILL.md))

---

## Related

- [soda-discovery](../soda-discovery/SKILL.md)
- [soda-goal-workflow](../soda-goal-workflow/SKILL.md)
- [organizational-learning.md](../../../docs/06-workflows/organizational-learning.md)
