---
name: soda-test-harness
version: "1.0.0"
description: >-
  Automated test & execution harnesses, component sandboxes (Storybook/Widgetbook headless runners),
  agentic evaluation (Agent Eval benchmarks & schema validators), microservice integration Testcontainers,
  and chaos/load generation harnesses. Use on goals implementing end-to-end test infrastructure,
  evaluating agent skill outputs, orchestrating mock-free integration containers, or load benchmarking.
  Triggers: test harness, harness, component harness, agent eval, testcontainers, integration harness,
  benchmark harness, chaos harness, eval suite. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Automated Test & Execution Harness Engineering

**Model:** Target Scope Discovery → **Harness Scaffolding → Isolated Component Sandbox → Integration Testcontainers → Agent Eval & Chaos Benchmarks**

This skill engineers **deterministic, mock-free test and execution harnesses** across frontend components, backend microservices, and autonomous AI agents, ensuring 100% operational verification with zero stubs.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-testing](../soda-testing/SKILL.md) and [soda-production-readiness-review](../soda-production-readiness-review/SKILL.md).

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 SODA OS 4-LAYER TEST HARNESS                │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. COMPONENT    │     │ 2. INTEGRATION  │     │ 3. AGENT EVAL   │
│    HARNESS      │     │    TESTCONTAINER│     │    BENCHMARK    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Headless      │     │ • Real Postgres │     │ • Skill Output  │
│   Storybook / WB│     │   Container     │     │   Schema Lint   │
│ • 5-State Auto- │     │ • Real NATS /   │     │ • Zero-Mock Rule│
│   Injection     │     │   Redis Broker  │     │   Verifier      │
│ • Playwright    │     │ • Ephemeral Port│     │ • BDD Invariant │
│   Pixel Diff    │     │   Lifecycle     │     │   Evaluation    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ 4. CHAOS & LOAD │
                        │    HARNESS      │
                        ├─────────────────┤
                        │ • 3x Peak Load  │
                        │ • Fault Inject  │
                        │ • SLA Gating    │
                        └─────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Zero mocks in integration harness** | Integration harnesses MUST run real database engines (PostgreSQL) and real brokers (NATS/Redis) via ephemeral Testcontainers. |
| **Component isolation verification** | Frontend components MUST be mounted in isolated test harnesses running all 5 lifecycle states before page assembly. |
| **Deterministic Agent Evals** | Agentic outputs (code, markdown specs, schemas) MUST be evaluated by automated linter harnesses with pass/fail quantitative scoring. |
| **Ephemeral lifecycle cleanup** | Every harness execution MUST cleanly tear down all spawned containers, mock-free sandboxes, and temp ports. |
| **Human reviews harness failure reports** | Flaky tests, harness timeouts, or unverified agent outputs require human inspection. |

## Where test harness artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Universal Contract Harness** | `scripts/harness/universal-contract-harness.mjs` | framework |
| **Microservices Preemption Harness** | `scripts/harness/microservices-preemption-harness.mjs` | framework |
| **Dual-Transport Chaos Simulator** | `scripts/harness/dual-transport-chaos-harness.mjs` | framework |
| **Socratic 5-Why Dialectic Engine** | `scripts/agentic/5why-socratic-dialectic-engine.mjs` | framework |
| **Goal Standardizer & Auditor** | `scripts/agentic/audit-and-standardize-goals.mjs` | framework |
| **Master Socratic Suite Runner** | `scripts/run-all-soda-harnesses.sh` | framework |
| **Harness architecture spec** | `docs/03-architecture/test-harness.md` | product |
| **HTTP Smoke scripts (Black-box)** | `scripts/http-smoke/*.mjs` | product |
| **UI Guardrail & Theme linter** | `scripts/check-ui.mjs` | framework |
| **Component test runners** | `code/**/tests/harness/components/*` | product |
| **Integration Testcontainers** | `code/**/tests/harness/integration/*` | product |
| **Agent Eval test suites** | `scripts/eval/*` / `code/**/tests/harness/agent-eval/*` | product |
| **CI Governance Gating** | `scripts/ci/governance-check.sh` | framework |

These are **product-owned** — `soda-os upgrade` never overwrites project-specific test scripts.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal configures test infrastructure, testcontainers, agent benchmarking, or load tests | **Auto-run this skill during PLAN & EXECUTE.** Author test harnesses and eval scripts |
| User says **"test harness G-xxx"** / **"eval harness G-xxx"** | Scaffold or refine the test harness suite for that goal |
| User says **"smoke test"** / **"http smoke"** | Scaffold out-of-process HTTP black-box verification script in `scripts/http-smoke/` |
| User says **"ui guardrail"** / **"theme check"** | Configure and run AST UI guardrail harness in `scripts/check-ui.mjs` |
| User says **"component harness"** / **"storybook runner"** | Stage 2 — configure headless component mounting & visual snapshot harness |
| User says **"testcontainers"** / **"integration harness"** | Stage 3 — configure ephemeral Docker/Podman Testcontainers |
| User says **"agent eval"** / **"benchmark harness"** | Stage 4 — build automated agent output and prompt evaluation harness |
| User says **"chaos harness"** / **"load harness"** | Stage 5 — author k6 load scripts and fault injection tests |

---

## The Test Harness Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Harness architecture & topology planning (PLAN)

Define the harness configuration across the 4 layers:
- Component Runner: Storybook Test Runner (Web) / Patrol Runner (Mobile) + `scripts/check-ui.mjs`.
- Out-of-Process HTTP Smoke: `scripts/http-smoke/{feature}.mjs` for black-box endpoint validation.
- Microservice Testcontainers: PostgreSQL 16-Alpine + NATS JetStream container specs.
- Agent Eval Metrics: Schema accuracy, BDD scenario pass rate, zero-mock invariants.

**Deliverable:** Harness topology in `docs/03-architecture/test-harness.md`.  
**Gate:** Test ports, container life-cycles, and execution commands explicitly defined.

### Stage 2 — Frontend Component & AST UI Guardrail Harness (PLAN → EXECUTE)

1. Scaffold automated AST UI Guardrail and Storybook / Widgetbook test runner:
   - Run `node scripts/check-ui.mjs` to assert 0 theme contaminations and 0 dead links.
   - Programmatically inject all 5 states (`Skeleton`, `Populated`, `Empty`, `Error`, `Disabled`).
   - Run Playwright pixel diff tests against base golden snapshots.

**Deliverable:** Component harness runner in `code/**/tests/harness/components/` and `scripts/check-ui.mjs`.  
**Gate:** $100\%$ of component states render without unhandled exceptions or console errors.

### Stage 3 — Real Microservice Integration & HTTP Smoke Harness (EXECUTE)

1. Launch ephemeral Testcontainers:
   ```typescript
   // Deterministic Integration Harness
   const container = await new PostgreSqlContainer("postgres:16-alpine")
     .withDatabase("soda_test")
     .withUsername("test_user")
     .withPassword("test_pass")
     .start();
   ```
2. Scaffold Out-of-Process HTTP Smoke script:
   ```bash
   node scripts/http-smoke/{feature}.mjs
   ```
3. Execute full SQL migrations, run ACID transactions, verify saga rollbacks, and validate HTTP status codes.
4. Automatically stop and remove container on test suite completion.

**Deliverable:** Integration harness runner in `code/**/tests/harness/integration/` and `scripts/http-smoke/*.mjs`.  
**Gate:** Zero dependency on external shared test databases; HTTP smoke passes with 0 connection errors.

### Stage 4 — Agentic Evaluation & Skill Verification Harness (EXECUTE)

Scaffold Agent Eval test suites:
- **Schema Linter:** Validates that agent-generated JSON/YAML files match canonical schemas.
- **Zero-Mock Linter:** Scans PR code changes for prohibited keywords (`todo!()`, `unimplemented!()`, dummy fallback objects).
- **BDD Evaluator:** Automatically compiles and runs unit tests derived from Socratic alignment scenarios.

**Deliverable:** Agent Eval runner in `scripts/eval/` and `code/**/tests/harness/agent-eval/`.  
**Gate:** Agent outputs score $100\%$ on schema compliance and $0\text{ mock violations}$.

### Stage 5 — Chaos & Load Benchmark Harness (REVIEW)

- [ ] Execute k6 load harness at $3\times$ peak traffic ($10,000\text{ RPS}$) for 30 minutes.
- [ ] Inject container SIGKILL and network latency ($+200\text{ms}$) during active test runs.
- [ ] Verify zero data corruption and $100\%$ clean recovery.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Scaffold real Testcontainers and isolated component harnesses | Use mock return objects or fake in-memory stubs in integration tests |
| Run automated Agent Eval benchmarks against BDD specifications | Mark a test harness as passing if ephemeral containers fail to clean up |
| Inject chaos fault modes to empirically verify system resilience | Hardcode fixed database ports that cause race conditions during parallel CI runs |

---

## Related

- [soda-testing](../soda-testing/SKILL.md) — Testing standards & checklists
- [soda-production-readiness-review](../soda-production-readiness-review/SKILL.md) — PRR & launch gates
- [soda-design](../soda-design/SKILL.md) — Component-First UI design
