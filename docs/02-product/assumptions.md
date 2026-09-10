# Assumptions register

> Agent maintains via [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — sync with `knowledge-map.json` → `assumptions[]`.
> **Rule:** Open + **low** confidence assumptions block goals → `ready`.

## How to use

| Status | Meaning | Next action |
|--------|---------|-------------|
| `open` | Believed but unproven | Add evidence or run **Validation needed** |
| `validated` | Confirmed with evidence | Promote to brief/goal — remove row; update map |
| `invalidated` | Evidence contradicts | PDR + brief Out of Scope — remove row |

## Confidence

| Level | Meaning | Agent |
|-------|---------|-------|
| **low** | 0–1 evidence, inferred | Must ask; block critical-path `ready` |
| **medium** | 2+ evidence or partial check | Human sign-off for `ready` |
| **high** | Validated — ready to promote | Move to brief/goal |

---

## Active assumptions

| ID | Assumption | Confidence | Evidence | Validation needed | Status |
|----|------------|------------|----------|-------------------|--------|
| *(none)* | — | — | — | — | — |

---

## Closed (archive)

| ID | Assumption | Outcome | Evidence | Date | Promoted to |
|----|------------|---------|----------|------|-------------|
| *(none)* | — | — | — | — | — |

---

## Related

- [knowledge-map.json](knowledge-map.json)
- [knowledge-digest.md](knowledge-digest.md)
- [knowledge-loop.md](../06-workflows/knowledge-loop.md)
