# PDR-0000: [Product decision title]

**Status:** proposed | accepted | superseded  
**Date:** YYYY-MM-DD  
**Deciders:** [names or roles — PO, lead, stakeholder]

> **PDR** = Product Decision Record — scope, persona, timeline, feature tradeoffs.  
> **ADR** = Architecture Decision Record — stack, auth, data model. Use [0000-template.md](0000-template.md) for technical choices.

## Context

What forced this product choice? Link pain from [knowledge-digest.md](../02-product/knowledge-digest.md) and map IDs (`P-xxx`, `E-xxx`).

## Decision

What we chose (one clear statement).

## Reason

Why this option — tie to constraints, timeline, or validated pain.

## Dependency graph

> Sync to [knowledge-map.json](../02-product/knowledge-map.json) → `decisions[]` on accept.

| Relation | IDs |
|----------|-----|
| **Evidence** | E-xxx, E-yyy |
| **Pains addressed** | P-xxx |
| **Depends on** | PDR-xxx / ADR-xxx / P-xxx / A-xxx *(upstream)* |
| **Unblocks** | ADR-xxx, G-xxx *(downstream)* |
| **Goals affected** | G-xxx |

```text
E-xxx → P-xxx → this PDR → ADR-xxx → G-xxx
```

## Alternatives considered

| Option | Why not |
|--------|---------|
| A | … |
| B | … |

## Tradeoffs

### Accepted

- …

### Deferred / rejected impact

- …

## Assumptions touched

| Assumption ID | Effect |
|---------------|--------|
| A-xxx | validated / invalidated / new |

## Scope impact

| Area | Change |
|------|--------|
| project-brief.md | Scope In / Out delta |
| Goals | G-xxx affected |

## Links

- Map: [knowledge-map.json](../02-product/knowledge-map.json)
- Discovery: [knowledge-digest.md](../02-product/knowledge-digest.md)
- Brief: [project-brief.md](../02-product/project-brief.md)
- Goals: G-xxx
- Related ADR: ADR-xxx (if any)
