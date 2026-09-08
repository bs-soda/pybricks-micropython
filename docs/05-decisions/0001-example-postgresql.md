# ADR-0001: Example — choose PostgreSQL over MySQL

> **Example reference only.** Demonstrates expected ADR format from Soda Agent OS.  
> **Delete or replace** when bootstrapping a real project with your first actual decision.

**Status:** example  
**Date:** 2024-05-20  
**Deciders:** Tech Lead, Backend Lead

## Context

The product needs relational storage with:

- JSON document fields for flexible metadata
- Full-text search on user-generated content
- Room to extend with custom types and extensions later

MySQL and PostgreSQL were both viable for the expected load.

## Decision

Use **PostgreSQL 15** as the primary database.

## Consequences

### Positive

- Native JSONB and strong indexing options
- Mature full-text search (`tsvector`)
- Team familiarity with PostgreSQL tooling

### Negative / tradeoffs

- Slightly different operational tooling vs MySQL-only teams
- Managed PostgreSQL may cost more at small scale

## Alternatives considered

| Option | Why not |
|--------|---------|
| MySQL 8 | Weaker JSON ergonomics for our metadata model |
| SQLite | Not suitable for multi-user concurrent production workload |

## Links

- Goals: G-001 (bootstrap)
- Docs: [../03-architecture/overview.md](../03-architecture/overview.md)
- Data: [../03-architecture/data/README.md](../03-architecture/data/README.md)
