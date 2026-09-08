# Organizational patterns — Pattern Library (v5)

> **Distilled cross-project knowledge** — not whole project exports.  
> Index: [pattern-index.json](pattern-index.json) · Template: [_template.md](_template.md)  
> Governance: [knowledge-governance.md](../../06-workflows/knowledge-governance.md)  
> Vision: [organizational-learning.md](../../06-workflows/organizational-learning.md)

Agents search **patterns**, not Project A's folder.

---

## What is a pattern?

| Not a pattern | Pattern |
|---------------|---------|
| Full project brief copy | Generalized context + decision + outcome |
| "We used PostgreSQL in Project X" | ORG-003: PostgreSQL for transactional core — 95% reusable when … |
| Raw learning-log paste | Anonymized, tagged, scored |

Each pattern: **Context → Evidence types → Decision → Outcome → Works when / Avoid when → Reusable score**

---

## File layout

```text
docs/04-agents/org-patterns/
  pattern-index.json      ← agent query (v5 search, v6 rank)
  pattern-index.schema.json
  _template.md
  ORG-001-{slug}.md
  ORG-002-{slug}.md
```

---

## Export workflow (project → org)

After goals `done` + **`post-ship`** learning:

1. Agent drafts ORG-xxx from [learning-log.md](../../02-product/learning-log.md) — **proposed** only
2. Remove PII, customer names, secrets
3. Architect + PO review → **published**
4. Register in `pattern-index.json` (`tags`, `reusable_score`, `outcome_rating`)
5. Log export in studio [changelog.md](../../07-backlog/changelog.md) or org repo

**Never** auto-publish without human approver per [knowledge-governance.md](../../06-workflows/knowledge-governance.md).

---

## Agent use by maturity

| Maturity | Behavior |
|----------|----------|
| **v5 Learning** | Search patterns; cite ORG-xxx as **hypothesis** (`confidence: low`); require local `E-xxx` before ADR accept |
| **v6 Intelligence** | Rank patterns where `reusable_score` ≥ `recommend_threshold` + context tags match; still human ADR/PDR sign-off |

```text
Wrong:  "We always use PostgreSQL."
Right:  "ORG-003 (95% reusable, 12 similar contexts): PostgreSQL under [constraints].
         Your C-001 matches. Draft ADR for Architect review."
```

---

## pattern-index.json fields

| Field | Purpose |
|-------|---------|
| `reusable_score` | 0–100 — human-maintained from outcomes |
| `outcome_rating` | good / mixed / poor |
| `tags` | Match project context on discover |
| `works_when` / `avoid_when` | Agent filter |
| `recommend_threshold` | Min score for v6 ranked recommend (default 80) |

Command: **`pattern search {tags}`** · **`pattern recommend`** (v6 — during discover / ADR draft)

---

## Examples

- [ORG-001-example-authentication-b2b-saas.md](ORG-001-example-authentication-b2b-saas.md) — replace on bootstrap

---

## Related

- [knowledge-map.json](../../02-product/knowledge-map.json) — project graph
- [soda-discovery](../../../.agents/skills/soda-discovery/SKILL.md)
- [soda-learning-loop](../../../.agents/skills/soda-learning-loop/SKILL.md)
