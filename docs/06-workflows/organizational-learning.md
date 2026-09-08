# Organizational learning & intelligence (v5 → v6)

> **Knowledge OS for autonomous delivery** — patterns + outcomes + governed reuse.  
> Governance: [knowledge-governance.md](knowledge-governance.md)  
> Pattern library: [org-patterns/README.md](../04-agents/org-patterns/README.md)

---

## Maturity model (full)

| Level | Name | What ships |
|-------|------|------------|
| v1 | Prompt engineering | Ad-hoc AI |
| v2 | Goal engineering | G-xxx, acceptance |
| v3 | Knowledge engineering | Evidence, map, confidence, coverage |
| v4 | Decision engineering | PDR ↔ ADR ↔ Goal graph |
| v5 | **Organizational learning** | Export **patterns**, **playbooks**, **recipes** with outcomes |
| **v6** | **Organizational intelligence** | Ranked playbook + recipe recommend — human signs ADR/PDR |

```text
v5 Learning:     store lesson → ORG-xxx pattern → PB-xxx playbook → REC-xxx recipe stats
v6 Intelligence: match context → ranked PB + REC → draft IR — human accepts
```

**Selection stack:** Pattern (what) → Playbook (which recipes) → Recipe (how) → IR (compiled).

**Learning** = remember + analyze. **Intelligence** = apply analysis to **new** decisions with scored rationale.

---

## Governance layer (above the loop)

All knowledge artifacts have **owner / approver / agent limits**:

See [knowledge-governance.md](knowledge-governance.md) — authority matrix for Evidence, Knowledge, PDR, ADR, Goal, Learning, Pattern.

Multi-agent rule: agents **draft**; humans **accept** decisions and promotions.

---

## Traceability score (quality metric)

Per goal: chain **Evidence → Pain → PDR → ADR → Goal → Observation**

Command: **`trace G-xxx`** — score 0–100%, list `missing` links.

| Gate | Default min |
|------|-------------|
| Goal → `ready` | 67% (observation excluded until done) |
| Goal → `done` | 83% (observation required) |

PDR/ADR marked `optional_skipped` when N/A (doc-only goal) — excluded from denominator.

See [knowledge-map.README.md](../02-product/knowledge-map.README.md) § Traceability.

---

## Pattern library (v5 core)

Export **patterns**, not projects:

```text
ORG-001 Authentication B2B SaaS
  context, evidence types, outcome good, reusable 95%
  works_when / avoid_when
```

Machine index: [pattern-index.json](../04-agents/org-patterns/pattern-index.json)

---

## Closed loop (project)

```text
Conversation → Evidence → Knowledge → Decision → Execution
                                                    ↓
                                              Observation → Learning ↺
                                                    ↓
                                              Pattern export (v5)
                                                    ↓
                                              Pattern recommend (v6)
```

Skills: [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) · [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md)

---

## Phase shift (v5+)

**Stop adding layers.** Tune from 10–20 real projects:

- Threshold 67% / 83% / 180-day TTL
- Coverage weak spots
- Pattern reuse rates

See [os-core-invariants.md](os-core-invariants.md) · measure via [os-health.md](../02-product/os-health.md)

---

## v6 recommendation algorithm (spec — human gate remains)

On `discover` or ADR draft:

1. Load `pattern-index.json`
2. Match project tags + constraints from map
3. Filter `status: published`, `reusable_score` ≥ threshold
4. Rank by score × tag overlap
5. Present top 1–3 with **evidence from N projects** — draft ADR `proposed` only
6. Require local `E-xxx` + Architect accept

---

## Related

- [knowledge-loop.md](knowledge-loop.md)
- [knowledge-governance.md](knowledge-governance.md)
- [dev-roles.md](../04-agents/dev-roles.md)
