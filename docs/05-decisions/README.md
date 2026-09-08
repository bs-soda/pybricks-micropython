# Decision records

Two complementary types — both live in this folder.

| Type | Prefix | Template | When |
|------|--------|----------|------|
| **ADR** — Architecture | `0001-slug.md` | [0000-template.md](0000-template.md) | Stack, auth, data model, integration, infra pattern |
| **PDR** — Product | `pdr-0001-slug.md` | [pdr-0000-template.md](pdr-0000-template.md) | Scope, persona, timeline, feature in/out, pivot |

## Examples

**ADR:** "Use PostgreSQL" — transaction needs, team expertise, tradeoff vs MongoDB write scale.

**PDR:** "Initial release excludes push notification" — ship in 4 weeks; users refresh manually in v1.

## Workflow

Decisions emerge from [knowledge-digest.md](../02-product/knowledge-digest.md) and [knowledge-map.json](../02-product/knowledge-map.json) during discovery:

```text
Evidence (E-xxx) → Pain (P-xxx) → PDR → ADR → Goal (G-xxx)
```

Each record includes a **Dependency graph** section synced to map `decisions[]`.

Log significant decisions in [changelog.md](../07-backlog/changelog.md).

## Related

- [0001-example-postgresql.md](0001-example-postgresql.md) — ADR format example
- [pdr-0001-example-phase1-no-notification.md](pdr-0001-example-phase1-no-notification.md) — PDR format example (replace on bootstrap)
- [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md)
