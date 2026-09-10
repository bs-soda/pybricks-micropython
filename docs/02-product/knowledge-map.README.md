# Knowledge map — runtime graph (Phase 1 backend)

> **Knowledge Services** (capabilities) — skills use this. Storage: [knowledge-store.md](../03-architecture/knowledge-store.md) (implementers).
> Discovery: [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md)
> Learning: [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md)
> Schema: [knowledge-map.schema.json](knowledge-map.schema.json) (v1.1)

**Source vs runtime:** ADR/PDR/Goals stay in Git. High-churn graph data lives here until migration triggers fire.

## Full loop

```text
Conversation → Evidence → Knowledge → Decision → Execution
                                                    ↓
                                              Observation → Learning ↺
```

**Digest** = human scan · **Map** = agent query + evolution

---

## ID conventions

| Prefix | Entity |
|--------|--------|
| `E-xxx` | Evidence |
| `P-xxx` | Pain |
| `A-xxx` | Assumption |
| `C-xxx` | Constraint |
| `R-xxx` | Risk |
| `CF-xxx` | **Conflict** |
| `O-xxx` | **Observation** (post-ship) |
| `PDR-xxx` / `ADR-xxx` | Decision |
| `G-{EPIC}-{NNN}` / `G-NNN` | Goal (`G-PAY-001`; legacy `G-001` = epic CORE). Not `E-` — that is Evidence. |

---

## Temporal fields (knowledge decays)

Default TTL: `temporal_defaults.evidence_freshness_days` (**180**).

| Field | Meaning |
|-------|---------|
| `last_validated` | Last confirm or new supporting E-xxx |
| `expires_after` | ISO date — review after this |
| `needs_review` | `true` = stale or contradicted — **block promote** |

On new contradictory E-xxx → open `CF-xxx` or supersede node — do not silent overwrite.

---

## Confidence

| Level | When | Agent |
|-------|------|-------|
| **low** | 1 source, inferred | Ask; block `ready` |
| **medium** | 2+ E-xxx | Human sign-off |
| **high** | 3+ sources or strong analytics | Stable |

Bump when new evidence links; drop if superseded.

---

## Conflict graph (`conflicts[]`)

Detect when:

- Two pains same topic, opposite claims
- Interview vs analytics mismatch
- Assumption vs observation contradicts

**Open conflict → no promote.** Resolve via human + PDR or `evidence_wins`.

---

## Observations (`observations[]`)

Post-execution signals → `learning_actions` → map update.

See [learning-log.md](learning-log.md) · [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md)

---

## Discovery coverage & promote gates

Same as v1.0 plus:

- `block_on_open_conflicts: true`
- `block_on_needs_review: true`
- `spec_stability` (Extension): no `[NEEDS CLARIFICATION]`; spec checklist; analyze before execute — [goal-spec-guide.md](../06-workflows/goal-spec-guide.md)

---

## Agent queries

| Query | Map path |
|-------|----------|
| Pains without goals | `pain[]` goals empty |
| Decisions without evidence | `decisions[]` evidence empty |
| Goals without pain | `goals[]` pains empty |
| Open conflicts | `conflicts[]` status open |
| Stale knowledge | any `needs_review: true` |
| Unprocessed observations | `observations[]` status pending |
| Orphan evidence | E-xxx unreferenced |

Commands: **`knowledge audit`** · **`coverage`** · **`learn`** · **`trace G-xxx`**

---

## Traceability score

Measures **chain quality** per goal — not gut feel.

```text
Evidence → Pain → PDR → ADR → Goal → Observation
```

### Calculation

1. For goal `G-xxx`, resolve links from map + goal **Knowledge links**
2. Each chain link satisfied = 1 point (equal weight)
3. Links in `optional_skipped` (e.g. no ADR for doc-only goal) **excluded from denominator**
4. **`observation`** excluded until goal status is `approved` / `done`
5. `score = round(satisfied / applicable × 100)`

Store in `traceability.goals["G-xxx"]`:

```json
{
  "score": 63,
  "missing": ["observation"],
  "optional_skipped": ["adr"],
  "links": {
    "evidence": ["E-001", "E-002"],
    "pain": ["P-001"],
    "pdr": ["PDR-001"],
    "adr": [],
    "goal": "G-014",
    "observation": []
  },
  "calculated": "2026-06-27",
  "goal_status_at_calc": "in_progress"
}
```

### Report format (`trace G-xxx`)

```markdown
### Traceability — G-014

**Score:** 63% · **Gate ready:** 67% ✗ · **Gate done:** 83% ✗

| Link | Status |
|------|--------|
| Evidence | ✓ E-001, E-002 |
| Pain | ✓ P-001 |
| PDR | ✓ PDR-001 |
| ADR | — skipped (doc-only) |
| Goal | ✓ G-014 |
| Observation | ✗ missing |

**Missing:** observation
```

### Gates ([knowledge-governance.md](../06-workflows/knowledge-governance.md))

| Transition | Default min |
|------------|-------------|
| → `ready` | `traceability.min_score_ready` (67) |
| → `done` | `traceability.min_score_done` (83) |

Tech Lead may waive → [changelog.md](../07-backlog/changelog.md).

---

## Example — temporal supersede

**Jan 2026** — P-001 + E-001 (interview): "Users don't want dark mode"
**Jul 2026** — O-001 + E-010 (analytics): 90% dark mode usage

```json
{ "id": "P-001", "status": "superseded", "needs_review": false }
{ "id": "P-002", "title": "Users expect dark mode", "supersedes": "P-001", "evidence": ["E-010"], "confidence": "high" }
```

---

## Related

- [knowledge-governance.md](../06-workflows/knowledge-governance.md)
- [organizational-learning.md](../06-workflows/organizational-learning.md)
- [knowledge-digest.md](knowledge-digest.md)
