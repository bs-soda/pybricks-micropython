---
name: soda-database-architecture
version: "1.0.0"
description: >-
  Database architecture, polyglot persistence, schema migrations, Row-Level Security (RLS),
  read replicas, sharding strategies, indexing & EXPLAIN ANALYZE performance tuning,
  ACID vs BASE invariants, connection pooling, and Point-in-Time Recovery (PITR).
  Use on goals designing data models, tuning database queries, configuring database clusters,
  or managing high-throughput persistence. Triggers: database architecture, postgresql,
  sharding, rls, row level security, explain analyze, database index, connection pool, pitr.
  Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Database architecture, polyglot persistence & query tuning

**Model:** Data Domain Model → **Relational/Document Schema Design → Indexing & EXPLAIN Tuning → Replication & Sharding Strategy → Backup & PITR Verification**

This skill guarantees that all persistent state in Soda OS is **transactionally sound, cryptographically isolated per tenant (RLS), horizontally scalable, and optimized for sub-millisecond query execution**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-db-migration](../soda-db-migration/SKILL.md) and [soda-system-architecture](../soda-system-architecture/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Multi-tenant Row-Level Security (RLS)** | PostgreSQL multi-tenancy MUST enforce tenant isolation at the database kernel level (`USING (tenant_id = current_setting('app.current_tenant_id'))`). |
| **No un-indexed sequential scans** | Foreign keys, lookup filters, and time-series columns MUST have supporting indexes (B-Tree, BRIN, GIN/GiST). |
| **Zero-downtime schema migrations** | Migrations must be backward-compatible (expand-contract pattern). Adding columns with defaults must use `DEFAULT ...` without table locks. |
| **Polyglot persistence by access pattern** | Match the database engine to the workload: Relational ACID (PostgreSQL), Key-Value Cache (Redis), Time-Series (TimescaleDB), Vector Search (pgvector). |
| **Human approves destructive data operations** | Dropping tables, altering column types, or backfilling millions of rows requires human approval. |

## Where database artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Database schema & entity relationships** | `docs/03-architecture/database-schema.md` | product |
| **Migration scripts** | `code/**/migrations/` | product |
| **Query performance benchmarks** | `docs/03-architecture/query-benchmarks.md` | product |
| **Data backup & recovery SOP** | `docs/03-architecture/disaster-recovery.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal creates or modifies tables, indexes, database topology, or persistence layers | **Auto-run this skill during PLAN & EXECUTE.** Write schema DDL, RLS policies, indexes, and benchmark queries |
| User says **"database architecture G-xxx"** / **"data model G-xxx"** | Produce or refine the database specification for that goal |
| User says **"rls"** / **"tenant isolation"** | Stage 2 — design PostgreSQL Row-Level Security policies |
| User says **"explain analyze"** / **"query tuning"** | Stage 3 — inspect execution plans, eliminate sequential scans, and add composite indexes |
| User says **"sharding"** / **"read replicas"** | Stage 4 — configure write-leader / read-replica routing and partition keys |
| User says **"pitr"** / **"backup verification"** | Stage 5 — verify continuous WAL archiving and automated point-in-time recovery |

---

## The database architecture lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Relational data modeling & schema DDL (PLAN)

Design normalized (3NF) relational tables with strict foreign key constraints:

```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    goal_code VARCHAR(16) NOT NULL, -- e.g. 'G-030'
    title TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_goal UNIQUE (tenant_id, goal_code)
);
```

**Deliverable:** DDL schema in `docs/03-architecture/database-schema.md`.  
**Gate:** All foreign keys indexed and primary keys use UUIDv7 or BIGSERIAL.

### Stage 2 — Cryptographic Row-Level Security (RLS) policies (PLAN → EXECUTE)

Enforce hard tenant isolation:

```sql
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON goals
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

**Deliverable:** RLS migration script.  
**Gate:** Automated unit test verifies tenant A cannot read or mutate tenant B records even via raw SQL.

### Stage 3 — Indexing & EXPLAIN ANALYZE query optimization (EXECUTE)

1. Run `EXPLAIN (ANALYZE, BUFFERS)` on all high-frequency query paths.
2. Select appropriate index types:
   - **B-Tree:** Equality and range lookups (`WHERE tenant_id = ... AND created_at > ...`).
   - **GIN:** JSONB containment and full-text search (`WHERE metadata @> '{"tags": ["ui"]}'`).
   - **BRIN:** Multi-million row append-only audit logs.

**Deliverable:** Query execution plan report in `docs/03-architecture/query-benchmarks.md`.  
**Gate:** Query execution time $< 5\text{ms}$ at p95 on a $1,000,000$-row table.

### Stage 4 — Read replicas & connection pool configuration (EXECUTE)

1. Deploy PgBouncer / native connection pooler (Transaction pooling mode).
2. Direct write mutations (`INSERT/UPDATE/DELETE`) to Primary Leader; route read queries (`SELECT`) to Read Replicas.

**Deliverable:** Connection string routing and pool configuration.  
**Gate:** Connection pool handles 5,000 concurrent client connections without connection starvation.

### Stage 5 — WAL archiving, backup & Point-in-Time Recovery (PITR) (REVIEW)

- [ ] Write-Ahead Log (WAL) streaming enabled with continuous backup to S3 / Object Storage.
- [ ] Recovery Time Objective (RTO) $< 15\text{ minutes}$.
- [ ] Recovery Point Objective (RPO) $< 1\text{ minute}$.
- [ ] Automated recovery test verifies restoration to any arbitrary timestamp.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Design normalized schemas with mandatory Row-Level Security policies | Run queries without tenant isolation filters in multi-tenant environments |
| Add non-blocking concurrent indexes (`CREATE INDEX CONCURRENTLY`) | Execute locking table alterations on large production tables during peak hours |
| Tune query execution plans to eliminate sequential scans | Store un-encrypted plaintext credentials or secrets in database tables |

---

## Related

- [soda-db-migration](../soda-db-migration/SKILL.md) — Schema migration procedures
- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Data encryption & isolation
