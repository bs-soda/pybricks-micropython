# Knowledge repository & storage

> **Implementers only** — agents/skills use [knowledge-services.md](knowledge-services.md) capabilities, not this file.
> **Status:** Phase 1 — JSON file backend behind services.

---

## Role in the stack

```text
Skills  →  Knowledge Services  →  Repository (this doc)  →  Storage backend
```

| Layer | Document |
|-------|----------|
| Business capabilities | [knowledge-services.md](knowledge-services.md) |
| Repository + storage | This file |

Skills **must not** call repository methods (`load`, `save`, `query`) — services do.

---

## Repository layer (Layer 2)

| Store | Responsibility | Phase 1 |
|-------|----------------|---------|
| **KnowledgeStore** | Graph: evidence, pain, assumptions, conflicts, observations, goals, decisions, coverage, traceability, os_health | [`knowledge-map.json`](../02-product/knowledge-map.json) |
| **PatternStore** | ORG patterns, reuse index | [`pattern-index.json`](../04-agents/org-patterns/pattern-index.json) |

Future splits: `EvidenceStore`, `EventStore` — TBD at Phase 2+.

---

## Storage backends (Layer 3)

| Phase | Backend | Repo role |
|-------|---------|-----------|
| **1 — Now** | `knowledge-map.json` in `docs/` | Git = DB + review |
| **2 — Scale** | `.os/knowledge.db` (SQLite, gitignored) | Git = source + projections |
| **3 — Org** | Knowledge API → Postgres / graph DB | Git = code + ADR/PDR only |

Default future runtime path:

```text
.os/
  knowledge.db
  events.db          # optional — pairs with event bus in knowledge-services.md
```

---

## Source vs runtime vs projection

| Kind | Git | Examples |
|------|-----|----------|
| **Source of intent** | Always | ADR, PDR, goals, brief, skills |
| **Runtime graph** | Phase 1 only | evidence[], pain[], os_health metrics |
| **Projection** | Human scan | digest, os-health.md, learning-log.md |

`knowledge-map.json` in Phase 1 is **runtime state**, not architecture.

---

## Repository operations (internal — not skill-facing)

Used by **services** when implementing capabilities:

| Operation | Used by service |
|-----------|-----------------|
| `load()` / `commit()` | All |
| `upsert_node(type, id)` | DiscoveryService, LearningService |
| `link(from, to)` | DecisionService, TraceabilityService |
| `open_conflict()` | DiscoveryService, LearningService |
| `aggregate_health()` | HealthService |
| `aggregate_roi()` | HealthService |

Phase 1: services read/write JSON per [schema](../02-product/knowledge-map.schema.json).
Phase 2: same interface, SQL backend — **services unchanged**.

---

## Migration triggers (evidence-driven)

Move to Phase 2 when **any** of:

- Merge conflicts on `knowledge-map.json` ≥ 2/month (studio-wide)
- Health/audit load > N seconds (define N from data)
- Concurrent agent writers on same project
- Map > ~500KB or 1000+ evidence rows

Until then: **stay on JSON** — optimize model and ROI, not engine.

---

## What stays in Git forever

```text
docs/05-decisions/     ADR, PDR
docs/07-backlog/goals/ G-xxx
docs/02-product/       brief, acceptance
.agents/skills/        soda-*
docs/04-agents/org-patterns/
```

---

## Related

- [knowledge-services.md](knowledge-services.md) — skill contract
- [knowledge-map.README.md](../02-product/knowledge-map.README.md)
- [os-health.md](../02-product/os-health.md)
