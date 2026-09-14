---
name: soda-agentic-discovery
version: "2.1.0"
description: >-
  Autonomous Self-Socratic Dialectic Discovery (AI-to-AI Self-Interrogation — Zero-HITL Blocking).
  When humans provide high-level intent, the AI Agent Swarm self-interrogates and self-resolves across
  internal personas (Architect, Engineer, Critic) to deconstruct Root Intent down each architectural
  branch (Runtime, State Machines, Guardrails, Interfaces) without stalling for human technical answers.
  All generated backlog goals must pass the automated goal-template-conformance-harness.
  Triggers: socratic discovery, socratic loop, agentic discovery, discovery loop, self-socratic,
  self-dialectic, discover architecture, root intent, branch decomposition, zero-hitl discovery.
  Collaboration phase: DEFINE -> PLAN.
---

# Soda OS Autonomous Self-Socratic Dialectic Discovery

**Model:** Ingest Human Root Intent → **Internal Self-Dialectic Triad (Architect $\leftrightarrow$ Engineer $\leftrightarrow$ Critic)** → **Deep Branch Decomposition (Branches 1–4)** → **BDD Feature Specifications & Acceptance Contracts** → **Goal Template Conformance Harness Verification**.

---

## 1. The Autonomous Self-Dialectic Principle

When humans provide high-level requirements (e.g. *"add rate limiting"*, *"build agent swarm dashboard"*, *"make system fault-tolerant"*), they often do not know low-level implementation mechanics.

The AI Agent Swarm **MUST NOT block execution or ask humans complex technical multiple-choice questions**.

Instead, the agent executes an **Internal Multi-Persona Self-Dialectic**:
1. 🏛️ **Principal Agentic Architect:** Formulates the Level 0 Root Intent and interrogates all 4 architectural branches with rigorous technical questions.
2. ⚙️ **Lead Systems Engineer:** Solves candidate trade-offs, supplies concrete production algorithms, determines FSM lifecycles, and defines data schemas.
3. 🛡️ **Adversarial SRE & Security Critic:** Audits failure cascades, verifies zero-mock compliance, enforces PII/memory limits, and validates saga rollback consistency.

---

## 2. Universal Scope

Applicable across all 8 software archetypes:
* `backend-service`: Async daemons, worker pools, in-memory caches, thread safety.
* `event-stream`: NATS JetStream topics, CloudEvents schemas, queue groups, deduplication.
* `api-gateway`: REST/gRPC routes, idempotency keys, rate limit governors, error envelopes.
* `database-engine`: PostgreSQL RLS, migration scripts, WORM audit logs, transactional rollbacks.
* `sre-control-plane`: K8s controllers, health probes, circuit breakers, autoscaling metrics.
* `ml-pipeline`: Context compaction, KV-cache management, vector embeddings, token FinOps.
* `cli-tool`: Command verbs, flags, stdin/stdout PTY rendering, exit codes.
* `web-ui` / `mobile-app`: ASCII wireframes, 3-click navigation trees, atomic primitives, and **5-state component contracts** (Skeleton, Populated, Empty, Error, Disabled).

---

## 3. The 4-Tier Socratic Tree Structure

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

## 4. Operational Commands

```bash
# Autonomously generate a complete Self-Socratic Dialectic Blueprint:
soda-os discovery <topic|G-xxx> --archetype <archetype> --intent "<Intent>"

# Validate compliance of discovery document:
soda-os discovery validate docs/06_raw/<date_timestamp>_<topic>_socratic_discovery.md
```

---

## 5. Mandatory Architecture & Goal Conformance Harness Gate

When Socratic discovery produces one or more output backlog goals (`docs/07-backlog/goals/G-xxx.md`):

1. **Full Template Instantiation:** The Agent MUST copy all 26 sections from `docs/07-backlog/goals/_template.md` including `## Software & Architecture Design`.
2. **Automated Conformance Execution:** Run both validation harnesses:
   ```bash
   node scripts/harness/goal-template-conformance-harness.mjs G-xxx
   node scripts/harness/architecture-design-conformance-harness.mjs G-xxx
   ```
3. **Zero-Error Invariant:** If either harness exits with non-zero status (missing sections, broken plan tables, or invalid architectural metadata), the Agent MUST repair all deviations before presenting the goal to the user.
