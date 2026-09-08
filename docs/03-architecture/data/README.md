# Business rules & domain data

> **Single source of truth** for domain invariants, entities, and data policies — not API transport details (see [api/](../api/README.md)).

Use this folder when a goal encodes or changes business logic that must stay consistent across features.

## What belongs here

- Entity definitions and relationships (conceptual)
- Business invariants ("order cannot ship without payment")
- Validation rules shared across API and jobs
- Data retention / privacy rules referenced by multiple modules
- Notes linking schema migrations to domain meaning

## Conventions

- One file per domain area: `{domain}.md` (e.g. `users.md`, `billing.md`)
- Link **Goal:** G-xxx and migration files when rules change
- Do not duplicate full API schemas — link to `api/` instead

## Template

```markdown
# {Domain name}

## Entities
- **{Entity}**: {description}

## Invariants
1. {Rule — must always hold}

## State transitions
{optional diagram or table}

## Links
- API: [../api/{resource}.md](../api/{resource}.md)
- ADR: …
- Goal: G-xxx
```

## Index

| Domain doc | Status | Goal |
|------------|--------|------|
| *(none yet — add when first domain goal ships)* | — | — |

## Related

- [soda-db-migration skill](../../../.agents/skills/soda-db-migration/SKILL.md)
- [design-spec.md](../design-spec.md)
