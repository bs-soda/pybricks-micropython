---
name: soda-event-driven-architecture
version: "1.0.0"
description: >-
  Event-Driven Architecture (EDA), Command Query Responsibility Segregation (CQRS),
  Event Sourcing, Saga distributed transactions with compensation rollbacks, transactional
  outbox pattern, idempotent consumers, and NATS JetStream / Kafka streaming topology.
  Use on goals designing asynchronous event streams, distributed state transitions, or
  multi-service workflows. Triggers: event driven, eda, cqrs, event sourcing, saga,
  outbox pattern, nats jetstream, kafka, idempotent consumer. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Event-driven architecture, CQRS & Saga orchestration

**Model:** Command Intake → **Domain Event Publication → Event Sourcing / Outbox Log → Asynchronous Projection (CQRS) → Distributed Saga & Compensation**

This skill architects **resilient, horizontally scalable, and event-driven distributed systems**, enforcing strict event schemas, transactional outbox patterns, idempotent processing, and distributed saga rollbacks.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-system-architecture](../soda-system-architecture/SKILL.md) and [soda-database-architecture](../soda-database-architecture/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Events as immutable facts** | Domain events represent things that have already happened in the past tense (`GoalCreated`, `GateApproved`). Events are strictly immutable and never updated. |
| **At-least-once delivery & idempotency** | Network messaging guarantees at-least-once delivery. Every event consumer MUST be strictly idempotent using unique deduplication IDs (`event_id`). |
| **Transactional outbox invariant** | Never publish network events directly in the middle of a database transaction. Write events to an `outbox` table in the same DB transaction, then relay asynchronously. |
| **Saga compensation over 2PC** | Distributed state mutations across microservices MUST implement compensating transactions ($C_1 \gets C_2$) rather than blocking Two-Phase Commit (2PC) locks. |
| **Human approves saga flows** | Saga compensation steps, dead-letter queue (DLQ) policies, and event schemas must be documented and signed off. |

## Where event artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Event schema catalog** | `docs/03-architecture/events/` + `docs/03-architecture/event-catalog.md` | product |
| **Saga workflow diagrams** | `docs/03-architecture/sagas/` | product |
| **Event handlers & publishers** | `code/**/events/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces messaging queues, async event streams, or multi-step distributed workflows | **Auto-run this skill during PLAN & EXECUTE.** Define event schemas, outbox tables, and saga compensations |
| User says **"event driven G-xxx"** / **"eda G-xxx"** | Produce or refine the event-driven architecture specification for that goal |
| User says **"cqrs"** / **"read projection"** | Stage 2 — separate write commands from read-optimized projection views |
| User says **"saga"** / **"distributed transaction"** | Stage 4 — design choreography/orchestration saga with automated rollback steps |
| User says **"outbox pattern"** / **"idempotency"** | Stage 3 — configure transactional outbox and consumer deduplication tables |
| User says **"event review"** / **"dlq check"** | Stage 5 — verify dead-letter queue handling and schema backward compatibility |

---

## The event-driven architecture lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Domain event schema definition (PLAN)

Define structured JSON / Protobuf schemas following standard CloudEvents specifications:

```json
{
  "specversion": "1.0",
  "id": "evt_01HXYZ987654321",
  "source": "soda.governance.service",
  "type": "soda.goal.status_changed.v1",
  "time": "2026-08-24T07:15:00Z",
  "datacontenttype": "application/json",
  "data": {
    "goal_id": "G-030",
    "previous_status": "in_progress",
    "new_status": "review",
    "actor": "antigravity-agent",
    "commit_hash": "a1b2c3d4"
  }
}
```

**Deliverable:** Event catalog schema in `docs/03-architecture/event-catalog.md`.  
**Gate:** Event subject follows standard hierarchy (`<domain>.<entity>.<action>.v<version>`).

### Stage 2 — CQRS write-side vs read-side projections (PLAN → EXECUTE)

1. **Command Side (Write):** Domain Aggregates enforce business invariants and emit domain events to an append-only event log.
2. **Query Side (Read):** Asynchronous event projectors ingest events to build denormalized, fast query models in PostgreSQL / Redis / Elasticsearch.

**Deliverable:** CQRS projection architecture diagram.  
**Gate:** Write models never queried directly for high-volume dashboard views.

### Stage 3 — Transactional outbox & idempotent consumer pipeline (EXECUTE)

```
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. APPLICATION TRANSACTION (PostgreSQL ACID)                │
  │    BEGIN;                                                   │
  │      INSERT INTO goals (...) VALUES (...);                  │
  │      INSERT INTO outbox_events (id, payload, status) ...;   │
  │    COMMIT;                                                  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ (Async Dequeue / Polling / CDC)
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 2. NATS JETSTREAM / KAFKA MESSAGE BROKER                    │
  │    Subject: soda.goal.created.v1 (At-least-once delivery)   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 3. IDEMPOTENT CONSUMER                                      │
  │    Check `processed_events(event_id)` ➔ If seen, skip ACK; │
  │    If new, execute handler ➔ Insert `event_id` ➔ ACK.       │
  └─────────────────────────────────────────────────────────────┘
```

**Deliverable:** Transactional outbox and idempotent worker implementation.  
**Gate:** Zero duplicate side-effects when an identical event is replayed $10\times$.

### Stage 4 — Distributed Saga orchestration & compensation (EXECUTE)

Design multi-step sagas with backward compensation:

| Step | Forward Action | Compensating Action (Rollback) |
| :--- | :--- | :--- |
| **1. Allocate Tokens** | Debit quota from workspace budget | Credit quota back to workspace budget |
| **2. Spawn Subagent** | Provision WASM container sandbox | Send `SIGKILL` and terminate container |
| **3. Execute Task** | Run automated unit test suite | Revert file changes from Git commit |
| **4. Stage-Gate Advance** | Advance goal state to `review` | Revert goal state to `in_progress` |

**Deliverable:** Saga orchestrator with automatic timeout and compensation triggers.  
**Gate:** Mid-sequence failure at Step 3 cleanly triggers compensations for Step 2 and Step 1.

### Stage 5 — Dead-Letter Queue (DLQ) & event schema evolution (REVIEW)

- [ ] Unprocessable malformed events routed to `DLQ` after 3 retries with exponential backoff.
- [ ] New event schema versions maintain backward compatibility (fields added are optional; zero renamed fields).
- [ ] OpenTelemetry distributed tracing context propagated across message headers (`traceparent`).

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Publish immutable domain events via transactional outbox patterns | Emit dual-write events without database transactional guarantees |
| Build idempotent consumers that safely handle network redelivery | Assume message broker FIFO order without tracking sequence numbers |
| Implement compensating sagas for distributed transactional workflows | Use blocking 2PC locks across asynchronous microservice boundaries |

---

## Related

- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries & DDD
- [soda-database-architecture](../soda-database-architecture/SKILL.md) — Database models & outbox tables
- [soda-incident-response](../soda-incident-response/SKILL.md) — DLQ triaging & recovery
