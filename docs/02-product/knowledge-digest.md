# Knowledge digest

> **Distilled signal from discovery — not a transcript.**  
> Agent updates via [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — **IDs must match** [knowledge-map.json](knowledge-map.json).

**Rule:** If this file grows like meeting minutes, re-distill. Target ~20% of conversation volume.

Every row links to **Evidence** (`E-xxx`) — answer *"สรุปจากอะไร?"* six months later.

---

## Categories

| Category | ID prefix | Map key |
|----------|-----------|---------|
| **Pain** | P-xxx | `pain[]` |
| **Assumption** | A-xxx | `assumptions[]` + [assumptions.md](assumptions.md) |
| **Constraint** | C-xxx | `constraints[]` |
| **Decision needed** | — | → PDR/ADR when resolved |
| **Risk** | R-xxx | `risks[]` |

**Confidence:** `high` · `medium` · `low` — see [knowledge-map.README.md](knowledge-map.README.md)

---

## Discovery coverage (mirror)

> Agent maintains authoritative `%` in `knowledge-map.json` → `coverage`. Copy latest here for human scan.

| Area | % | Blockers |
|------|---|----------|
| Business | 0 | — |
| Users | 0 | — |
| Workflow | 0 | — |
| Pain | 0 | — |
| Dream | 0 | — |
| Scope | 0 | — |
| Boundary | 0 | — |
| Success | 0 | — |
| Constraints | 0 | — |

Command agent: **`coverage`**

---

## Conflicts (open)

Sync with `knowledge-map.json` → `conflicts[]` (`CF-xxx`). **Open conflict blocks promote.**

| ID | Topic | Summary | Status |
|----|-------|---------|--------|
| *(none)* | — | — | — |

---

## Evidence log

| ID | Type | Title | Date | Source |
|----|------|-------|------|--------|
| *(none)* | — | — | — | — |

---

## Sessions

### Session template

```markdown
### YYYY-MM-DD — {topic or step range}

**Evidence created:** E-001 (interview, human:PO)

| Category | ID | Insight | Evidence | Confidence | Step | Promoted to |
|----------|-----|---------|----------|------------|------|-------------|
| Pain | P-001 | … | E-001 | low | 3 | — |
```

---

### *(no sessions yet)*

Start: **`discover`** — [knowledge-loop.md](../06-workflows/knowledge-loop.md)

---

## Promotion log

| Date | ID | Insight | Destination |
|------|-----|---------|-------------|
| *(none)* | — | — | — |

---

## Related

- [knowledge-map.json](knowledge-map.json) · [knowledge-map.README.md](knowledge-map.README.md)
- [assumptions.md](assumptions.md)
- [project-brief.md](project-brief.md)
