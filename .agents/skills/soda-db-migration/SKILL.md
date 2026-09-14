---
name: soda-db-migration
version: "1.0.0"
description: >-
  Database schema migrations with up/down and ADR link. Use when a goal changes
  database schema, adds tables/columns/indexes, or requires migration scripts.
---

# Database migration

## Before writing migration

1. Read active goal and linked ADR (schema decisions)
2. Check [docs/03-architecture/data/](../../../docs/03-architecture/data/README.md) for domain rules affected
3. Confirm backward compatibility or planned maintenance window in goal **Notes for AI**

## Requirements

Every migration must have:

- [ ] **Up** migration — applies change
- [ ] **Down** migration — reverses change (or documented irreversible reason in ADR)
- [ ] **Idempotent-safe** apply where tooling allows
- [ ] **Data backfill** plan if transforming existing rows
- [ ] **Index strategy** — avoid locking production tables on large tables without plan

## Document

Update or add under `docs/03-architecture/data/` when migration encodes business rules:

```markdown
## {Rule name}
- Invariant: …
- Migration: G-xxx / {migration file}
```

Link migration goal to ADR if breaking or irreversible.

## Test plan

- [ ] Migration **up** on empty DB succeeds
- [ ] Migration **down** (if provided) restores prior schema
- [ ] Application tests pass against migrated schema
- [ ] Staging apply verified before production goal

Use [soda-deploy-staging](../soda-deploy-staging/SKILL.md) for staging apply order: migrate → deploy app.

## Agent boundaries

- No destructive `DROP` on production-critical data without ADR + human approval
- Touch map only — migration files + docs listed in goal

## Related

- [0000-template.md](../../../docs/05-decisions/0000-template.md)
- [soda-rest-api](../soda-rest-api/SKILL.md) — if API exposes new fields
