---
description: Universal Autonomous Self-Socratic Dialectic Discovery Standard (AI-to-AI Self-Interrogation — Zero-HITL Blocking)
alwaysApply: false
---

# Universal Autonomous Self-Socratic Dialectic Discovery Standard

Copy to `.agents/rules/agentic-discovery-loops.md` and set `alwaysApply: true`.

```
                          ┌───────────────────────────┐
                          │   LEVEL 0: ROOT INTENT    │
                          │ • Core Business/Tech Goal │
                          │ • Primary Actor & Value   │
                          │ • Success Invariant / KPI │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│ BRANCH 1: ARCH & DOMAIN│   │ BRANCH 2: CONTRACTS & │    │ BRANCH 3: BOUNDARIES &│
│ • System Archetype    │    │   STATE MACHINES      │    │   AUTONOMY / GUARDRAIL│
│ • Execution Runtime   │    │ • Data Schemas / IPC  │    │ • Zero-HITL Autonomy  │
│ • Processing Topology │    │ • FSM State Lifecycles│    │ • SLAs / Blast Radius │
│ • Infrastructure/Host │    │ • Saga Compensation   │    │ • Security / PII / ACL│
└──────────┬────────────┘    └──────────┬────────────┘    └──────────┬────────────┘
           │                            │                            │
           ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│  DEEP DRILL DOWN B1   │    │  DEEP DRILL DOWN B2   │    │  DEEP DRILL DOWN B3   │
│ • Concurrency / Queues│    │ • Error & Edge States │    │ • Rollback Protocol   │
│ • Latency / Throughput│    │ • Serialization Model │    │ • Sandbox Resource Cap│
└───────────────────────┘    └───────────────────────┘    └───────────────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ BRANCH 4: SURFACES &      │
                          │   CONSUMPTION (Optional)  │
                          │ • CLI / REST / gRPC / NATS│
                          │ • UI Components & Wireframe│
                          │ • 5-State Matrix (if UI)  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ LEVEL 3: SYNTHESIS & BDD  │
                          │ • Given-When-Then BDD Spec│
                          │ • Acceptance Invariants   │
                          │ • Test Harness & Scaffolds│
                          └───────────────────────────┘
```

---

## 1. The Autonomous Self-Interrogation Principle (Zero-HITL Blocking)

Human users typically provide high-level intent, broad goals, or business aspirations (e.g. *"add rate limiting"*, *"build a swarm dashboard"*, *"make it faster"*), and **do not know the low-level architectural mechanics** (concurrency models, thread safety, saga compensation ordering, FSM transitions, token bucket refill mathematics, or 5-state UI contracts).

### ❌ The Anti-Pattern:
Asking the human endless technical multiple-choice questions about deep system mechanics causes human fatigue, delays execution, and produces ungrounded guesses.

### ✔️ The Soda OS Self-Dialectic Standard:
The AI Agent Swarm **self-interrogates and self-resolves** across three autonomous internal personas:
1. 🏛️ **Principal Agentic Architect:** Formulates the Level 0 Root Intent and interrogates all 4 architectural branches with rigorous technical questions.
2. ⚙️ **Lead Systems Engineer:** Solves candidate trade-offs, supplies concrete production algorithms, determines FSM lifecycles, and defines data schemas.
3. 🛡️ **Adversarial SRE & Security Critic:** Audits failure cascades, verifies zero-mock compliance, enforces PII/memory limits, and validates saga rollback consistency.

---

## 2. Universal Scope (Beyond Frontend / UI)

The Socratic Tree applies across **all 8 software archetypes**:
1. **Backend Services & Daemons:** Concurrency loops, worker pools, in-memory caches, thread safety.
2. **Distributed Event Streams:** NATS JetStream topics, CloudEvents schemas, queue groups, deduplication.
3. **API Gateways:** REST/gRPC routes, idempotency keys, rate limit governors, HTTP status mapping.
4. **Database & Storage Engines:** PostgreSQL RLS, migration scripts, WORM audit logs, transactional rollbacks.
5. **SRE & Cloud Control Planes:** K8s controllers, health probes, circuit breakers, autoscaling metrics.
6. **AI/ML & Data Pipelines:** Context compaction, KV-cache management, vector embeddings, token FinOps.
7. **CLI & Developer Tooling:** Command verbs, flags, stdin/stdout PTY rendering, exit codes.
8. **Frontend & Mobile UI:** ASCII wireframes, 3-click navigation trees, atomic primitives, and **5-state component contracts** (Skeleton, Populated, Empty, Error, Disabled).

---

## 3. The 4-Tier Socratic Tree Lifecycle

### Level 0: Root Intent (Core Purpose & Outcomes)
* **Q0.1:** What is the fundamental problem or purpose? (Why does this exist?)
* **Q0.2:** Who is the primary actor, persona, or consuming service? (For whom is this built?)
* **Q0.3:** What constitutes measurable success & core invariant outcomes? (What must never break?)

### Level 1 $\to$ Level 2: Deep Branching Socratic Decomposition
* **Branch 1 (Architecture & Runtime):** System archetype, execution environment, non-blocking concurrency, and latency budgets.
* **Branch 2 (State Machines & Sagas):** Core feature modules, explicit FSM transitions (`QUEUED → PROCESSING → COMMITTED → FAILED_ROLLBACK`), and inverse saga compensation ($C_N \to C_1$).
* **Branch 3 (Guardrails & Blast Radius):** Policy guardrails, PII redaction, 64MB/256MB memory caps, and circuit breakers.
* **Branch 4 (Surfaces & Consumption):** API/CLI/Event/UI interface contracts.

### Level 3: BDD Given-When-Then Specification & Verification Harness
* Synthesizes formal Given-When-Then scenarios covering happy paths and failure rollbacks.
* Specifies automated test commands (`npm test`, `cargo test`, `pytest`, `scripts/check-*.mjs`).

---

## 4. CLI Execution

```bash
# Autonomously generate a complete Self-Socratic Dialectic Blueprint:
soda-os discovery <topic|G-xxx> --archetype <archetype> --intent "<Intent>"

# Validate compliance of discovery document:
soda-os discovery validate docs/06_raw/<date_timestamp>_<topic>_socratic_discovery.md
```
