---
name: soda-system-architecture
version: "1.0.0"
description: >-
  System architecture, Domain-Driven Design (DDD), C4 architectural models, Hexagonal/Clean
  architecture, service topology, and ADR decision drafting. Decompose systems into bounded
  contexts, ports & adapters, dependency inversion boundaries, and high-cohesion modules.
  Use on goals designing new systems, refactoring service boundaries, or making architectural
  decisions. Triggers: system architecture, software architecture, ddd, c4 model, clean architecture,
  hexagonal, bounded context, ports and adapters, adr. Collaboration phases PLAN → REVIEW.
---

# System architecture & Domain-Driven Design (DDD)

**Model:** Context Intake → **Bounded Context Decomposition → C4 Model Topology → Ports & Adapters Interfaces → Architecture Decision Record (ADR)**

This skill establishes the **macro structural blueprint and architectural integrity** of a Soda OS system, enforcing Domain-Driven Design (DDD), Clean Architecture, and clear service boundaries.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-discovery](../soda-discovery/SKILL.md) and [soda-code-review](../soda-code-review/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Bounded context isolation** | Separate domain models by explicit context boundaries; zero shared mutable state between distinct domains. |
| **Dependency inversion (DIP)** | High-level business logic must never depend on low-level I/O, database libraries, or third-party SDKs. Depend on domain abstractions (Ports). |
| **Document every major decision** | Architectural choices (frameworks, protocols, persistence engines) MUST be justified and recorded as an immutable ADR in `docs/05-decisions/`. |
| **High cohesion, loose coupling** | Modules grouping related business capabilities together while minimizing cross-boundary dependencies. |
| **Human approves architecture** | Architectural blueprints and ADRs require explicit human sign-off before implementation goals begin. |

## Where architectural artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **System architecture blueprint** | `docs/03-architecture/system-overview.md` | product |
| **C4 architecture diagrams** | `docs/03-architecture/c4-model.md` | product |
| **Domain model & aggregates** | `docs/03-architecture/domain-model.md` | product |
| **Architectural Decision Records** | `docs/05-decisions/ADR-xxx-<slug>.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces a new service, changes architectural layers, or selects key technologies | **Auto-run this skill during PLAN.** Draft ADR, update C4 diagram, and define Ports & Adapters |
| User says **"architecture G-xxx"** / **"architect G-xxx"** | Produce or refine the system architectural blueprint for that goal |
| User says **"c4 model"** / **"system diagram"** | Stage 2 — generate C4 Context, Container, Component Mermaid diagrams |
| User says **"ddd"** / **"bounded context"** | Stage 1 & 3 — define domain entities, aggregates, value objects, and domain events |
| User says **"adr"** / **"decision record"** | Stage 5 — draft formal ADR (Context, Decision, Consequences, Compliance) |
| User says **"architecture review"** | Run comprehensive architectural compliance audit |

---

## The software architecture lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Domain modeling & bounded contexts (PLAN)

1. Identify core subdomains: **Core Domain** (Competitive advantage), **Supporting Domain**, and **Generic Domain** (Auth, Billing).
2. Decompose into Bounded Contexts with explicit Ubiquitous Language glossaries.
3. Define Domain Aggregates, Root Entities, Value Objects, and Domain Events.

**Deliverable:** Domain model definitions in `docs/03-architecture/domain-model.md`.  
**Gate:** No aggregate root spans multiple bounded contexts.

### Stage 2 — C4 model diagramming (PLAN)

Generate Mermaid diagrams across the 4 C4 zoom levels:
1. **Level 1 (System Context):** External users, third-party APIs (ClickUp, Twilio, Stripe), and system perimeter.
2. **Level 2 (Containers):** Web App, Mobile App, API Gateway, NATS Message Broker, PostgreSQL DB.
3. **Level 3 (Components):** Controllers, Domain Services, Repositories, Adapters.
4. **Level 4 (Code):** Class / Trait / Interface diagrams for complex algorithms.

**Deliverable:** Visual C4 diagrams in `docs/03-architecture/c4-model.md`.  
**Gate:** Container communication protocols and data flows explicitly labeled.

### Stage 3 — Hexagonal ports & adapters topology (PLAN)

```
        ┌─────────────────────────────────────────────────────────────┐
        │                     DRIVING ADAPTERS                        │
        │           (REST Controllers, CLI, GraphQL, SSE)             │
        └──────────────────────────────┬──────────────────────────────┘
                                       │ (Inbound Port)
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                       DOMAIN CORE                           │
        │             (Use Cases, Entities, Domain Events)             │
        └──────────────────────────────┬──────────────────────────────┘
                                       │ (Outbound Port)
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                     DRIVEN ADAPTERS                         │
        │        (PostgreSQL Repo, Redis Cache, NATS Publisher)       │
        └─────────────────────────────────────────────────────────────┘
```

**Deliverable:** Interface and Port declarations in `docs/03-architecture/system-overview.md`.  
**Gate:** Domain Core imports zero external frameworks or DB client libraries.

### Stage 4 — Non-functional requirement (NFR) SLA budgets (PLAN)

Define hard quantitative service level agreements:
- **Latency budget:** p95 $< 100\text{ms}$, p99 $< 250\text{ms}$.
- **Throughput target:** $\ge 1,000\text{ req/sec}$ per node.
- **Availability:** $99.95\%$ uptime target ($< 21.9\text{ min/month}$ downtime).
- **Concurrency & scaling:** Horizontal stateless autoscaling ($N=2 \dots 10$).

**Deliverable:** NFR matrix in `docs/03-architecture/system-overview.md`.  
**Gate:** Latency and memory ceilings empirically verifiable via automated benchmarks.

### Stage 5 — Architectural Decision Record (ADR) authoring (PLAN → approval)

Draft formal ADR in `docs/05-decisions/ADR-xxx-<topic>.md`:
- **Title:** `ADR-xxx: [Short title of decision]`
- **Status:** `proposed` | `accepted` | `deprecated` | `superseded`
- **Context:** The problem, business drivers, and technical constraints.
- **Decision:** The chosen architectural pattern or technology.
- **Consequences:** Positive benefits, negative trade-offs, and mitigation strategies.

**Gate (human approval):** Human signs off on ADR **before** implementation goals advance to `ready`.

### Stage 6 — Autonomous Architecture Design Loop & Conformance Harness (PLAN → ready)

1. Execute the **Autonomous Socratic 5-Why Dialectic Engine** across 4–6 architectural branches to resolve Level 0 Root Intent down to Level 5.
2. Populate the `## Software & Architecture Design` table in the active goal file (`docs/07-backlog/goals/G-xxx.md`).
3. Run the automated architecture conformance harness to verify DDD, Hexagonal Ports, and Zero-Mock invariants:
   ```bash
   node scripts/harness/architecture-design-conformance-harness.mjs G-xxx
   ```

**Gate (automated conformance):** The goal MUST pass `architecture-design-conformance-harness.mjs` with 100% green exit code before advancing to `ready`.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Design clean hexagonal architectures with strong domain encapsulation | Introduce cyclic dependencies between domain packages |
| Propose technology choices backed by formal ADR trade-off analyses | Implement breaking architectural refactors without an approved ADR |
| Define clear C4 diagrams and quantitative SLA latency budgets | Couple core business logic directly to infrastructure/database SDKs |
| Autonomously execute the Socratic 5-Why Architecture Loop and validation harness | Promote goals to `ready` without a verified `## Software & Architecture Design` section |

---

## Related

- [soda-event-driven-architecture](../soda-event-driven-architecture/SKILL.md) — CQRS & Event Sourcing
- [soda-api-gateway-contracts](../soda-api-gateway-contracts/SKILL.md) — API contracts & schemas
- [soda-database-architecture](../soda-database-architecture/SKILL.md) — Database topology & persistence
