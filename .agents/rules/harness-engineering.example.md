---
description: Universal Test & Execution Harness Standard — Zero-Mock Sandboxes, Component Harness, Agent Eval, and Integration TestContainers
alwaysApply: false
---

# Universal Test & Execution Harness Engineering Standard

Copy to `.agents/rules/harness-engineering.md` and set `alwaysApply: true`.

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

---

## 1. The Dual-Tier Test Execution Model

In Soda OS, language-native in-process tests (`cargo test`, `vitest`, `pytest`) alone are **not sufficient**. Every production goal MUST be validated through a **Dual-Tier Test Execution Model**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           SODA OS DUAL-TIER HARNESS EXECUTION MODEL                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

 1. IN-PROCESS COMPILER TESTS (code/src/)            2. OUT-OF-PROCESS SCRIPT HARNESSES (scripts/)
 ────────────────────────────────────────            ─────────────────────────────────────────────
 • White-box memory tests (`cargo test`, `vitest`)   • Black-box network & socket tests (`scripts/http-smoke/`)
 • Fast local unit logic & pure functions            • End-to-end HTTP wire serialization & Bearer auth
 • Cannot test AST route trees or dead links         • AST-scans monorepo routes & dead links (`scripts/check-ui.mjs`)
 • Cannot guard against CSS class leakage            • AST-guards dark/light theme purity & contrast
 • Runs inside compiler context                      • Standalone, deterministic CI entrypoint (`scripts/ci/`)
```

---

## 2. Zero-Mock / Zero-Stub Invariant in Test Harnesses

A test harness MUST NOT use artificial in-memory mocks, stubbed returns (`todo!()`), or fake network responses:
1. **Frontend Component Harness:** Mounts components in isolated Storybook/Widgetbook runners with realistic mock-free state stores.
2. **Backend Integration Harness:** Launches ephemeral **Testcontainers** (Docker/Podman) with real PostgreSQL, Redis, and NATS instances on dynamic ephemeral ports, automatically torn down after test suites finish.
3. **Contract Harness:** Uses real schema parsers (`oasdiff`, `protoc`) to verify contract compliance.

---

## 3. The 5 Standard Script-Based Test Harness Archetypes (`scripts/`)

Every Soda OS project standardizes executable test harness scripts in the `scripts/` directory:

| Script Harness Archetype | Location | CLI Trigger | Verification Focus |
|:---|:---|:---|:---|
| **1. HTTP API Smoke Harness** | `scripts/http-smoke/*.mjs` | `node scripts/http-smoke/{feature}.mjs` | Black-box HTTP wire status codes, serialization, Bearer auth, and live endpoint verification against running server. |
| **2. UI Guardrail & Theme Harness** | `scripts/check-ui.mjs` | `node scripts/check-ui.mjs` | AST static analysis across routes, dead `<Link>` tag detection, dark/light theme purity, and a11y compliance. |
| **3. Headless Visual Regression** | `scripts/visual-check.mjs` | `node scripts/visual-check.mjs` | Headless Playwright / Patrol golden-file pixel diffs with $0.01\%$ threshold and background luminance validation. |
| **4. Agent Eval & Zero-Mock Linter** | `scripts/eval/*.mjs` | `node scripts/eval/lint-zero-mocks.mjs` | Regex-scans code diffs for forbidden `todo!()`, `unimplemented!()`, dummy objects, and JSON/YAML schema drift. |
| **5. CI Governance Gating Harness** | `scripts/ci/governance-check.sh` | `./scripts/ci/governance-check.sh` | Master CI entrypoint executing all harnesses, scanning secrets, and gating PR merges. |

---

## 4. The 4 Mandatory Test Harness Layers

### Layer 1: Frontend Component Isolation Harness
- **Purpose:** Automatically mount, render, and visually snapshot individual components across all 5 states (`Skeleton`, `Populated`, `Empty`, `Error`, `Disabled`).
- **Tooling:**
  - Web: Headless Storybook + Playwright Test Runner (`@storybook/test-runner`).
  - Mobile: Headless Widgetbook + Patrol Golden-File Runner (`patrol test -t integration_test`).

### Layer 2: Microservice & Database Integration Harness
- **Purpose:** Execute end-to-end repository queries, ACID transactions, and event streams against genuine containerized infrastructure.
- **Tooling:** `testcontainers-node` / `testcontainers-rs` / `testcontainers-python`.
- **Rule:** Every integration test must spin up its own isolated database schema or ephemeral container; tests must be completely deterministic and parallelizable.

### Layer 3: Agentic Evaluation & Skill Verification Harness (Agent Eval)
- **Purpose:** Verify that AI agents and subagents adhere to system prompts, output required Markdown artifacts into `docs/06_raw/`, maintain zero-mock standards, and satisfy BDD specifications.
- **Assertions:**
  - Schema validity of all output JSON/YAML deliverables.
  - Zero presence of `todo!()`, `unimplemented!()`, or placeholder comments.
  - 100% resolution of Socratic questions in `CLARIFICATION.md`.

### Layer 4: Chaos & Load Benchmark Harness
- **Purpose:** Inject failure modes (packet loss, SIGKILL, network partitions) under $3\times$ peak traffic ($10,000\text{ RPS}$).
- **Tooling:** k6, Chaos Mesh, LitmusChaos.

---

## 5. Mandatory CI Quality Gates

No Pull Request or Goal card may be marked as complete without passing the unified test harness:

```bash
# Unified In-Process + Out-of-Process Harness Verification
npm run test:harness    # runs unit/integration tests + scripts/check-ui.mjs + scripts/http-smoke/*.mjs
./scripts/ci/governance-check.sh
```

- [ ] 100% of Component Stories pass visual regression tests with 0 pixel drift.
- [ ] 100% of Integration Testcontainers pass with zero orphaned container leaks.
- [ ] 100% of HTTP Smoke Scripts pass against live endpoints with zero connection timeouts.
- [ ] UI Guardrail (`node scripts/check-ui.mjs`) passes with 0 theme violations, 0 dead links, and 0 a11y errors.
- [ ] Agent Eval passes with zero schema warnings and zero unverified assertions.
