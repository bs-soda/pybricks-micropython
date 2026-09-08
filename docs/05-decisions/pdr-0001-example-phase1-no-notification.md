# PDR-0001: Phase 1 release excludes push notification

**Status:** example *(bootstrap sample — replace on bootstrap)*  
**Date:** 2026-06-27  
**Deciders:** PO, tech lead

> Example PDR format. Delete or replace when bootstrapping a real project.

## Context

Users need status updates when order state changes. Full notification stack (push + email + in-app) was requested but timeline is 4 weeks for first shippable release.

## Decision

Phase 1 release **does not** include push or email notification. Users refresh the order detail screen manually in v1.

## Reason

- Ship a working order flow within 4 weeks
- Push requires mobile cert setup, email requires provider + templates — both out of critical path for validating core order pain

## Dependency graph

| Relation | IDs |
|----------|-----|
| **Evidence** | E-001 *(PO interview)*, E-002 *(timeline constraint)* |
| **Pains addressed** | P-001 *(order status visibility)* |
| **Depends on** | C-001 *(4-week ship constraint)* |
| **Unblocks** | G-003 *(core order flow)*, ADR-002 *(defer push provider — if written)* |
| **Goals affected** | G-003 *(in scope)* · G-004 *(notification — deferred)* |

```text
E-001 → P-001 → PDR-001 → G-003 (Phase 1 order flow)
                      ↘ Out: G-004 notification deferred
```

## Alternatives considered

| Option | Why not |
|--------|---------|
| Push only | iOS/Android cert lead time; blocks store release |
| Email only | Still needs provider, templates, bounce handling |
| In-app polling | Deferred — adds background work not needed to validate core hypothesis |

## Tradeoffs

### Accepted

- Faster time-to-first-user-test
- Simpler ops in v1

### Deferred / rejected impact

- Users must open app to see status changes until G-0xx (notification goal) ships
- Support may get "why no alert?" questions — document in FAQ

## Assumptions touched

| Assumption ID | Effect |
|---------------|--------|
| A-001 *(example)* | Users check app at least once daily — needs validation |

## Scope impact

| Area | Change |
|------|--------|
| project-brief.md | Out: push notification, email notification |
| Goals | G-004 notification deferred |

## Links

- Map: [knowledge-map.json](../02-product/knowledge-map.json)
- Discovery: [knowledge-digest.md](../02-product/knowledge-digest.md)
- Brief: [project-brief.md](../02-product/project-brief.md)
- Related ADR: ADR-002 *(example — defer push provider)*
