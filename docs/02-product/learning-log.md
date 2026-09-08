# Learning log

> **Closed-loop learning** — what we observed after execution and how knowledge evolved.  
> Agent maintains via [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md).  
> Map sync: `knowledge-map.json` → `observations[]`

**Principle:** Execution is not the end — deploy, metrics, support, and feedback feed back into pain, assumptions, and new goals.

---

## Loop

```text
Execution (G-xxx done / SHIP)
    ↓ Observe — register O-xxx + E-xxx
    ↓ Learn — apply learning_actions
    ↓ Knowledge update — map + digest + brief/scope/goals
    ↺
```

---

## Observations

| ID | Date | Source | Title | Goal | Status |
|----|------|--------|-------|------|--------|
| *(none)* | — | — | — | — | — |

**Source:** `metrics` · `support` · `feedback` · `deploy` · `analytics` · `uat` · `incident`

---

## Learning outcomes (human scan)

| Date | Observation | What changed | IDs |
|------|-------------|--------------|-----|
| *(none)* | — | — | — |

---

## Session template

```markdown
### YYYY-MM-DD — Post G-xxx / staging deploy

**Observation:** O-001 (metrics — dark mode adoption 90%)

| Learning action | Target | Result |
|-----------------|--------|--------|
| supersede_pain | P-001 → P-002 | Users now prefer dark mode |
| invalidate_assumption | A-003 | — |
| new_goal | G-012 draft | Theme system v2 |
```

---

## Related

- [knowledge-map.json](knowledge-map.json)
- [knowledge-loop.md](../06-workflows/knowledge-loop.md)
- [organizational-learning.md](../06-workflows/organizational-learning.md) — v5 cross-project patterns
