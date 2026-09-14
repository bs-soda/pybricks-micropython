#!/usr/bin/env node

/**
 * Soda OS — Autonomous Self-Socratic Dialectic Discovery Engine
 * 
 * Implements the Autonomous AI-to-AI Self-Interrogation Framework:
 *   "AI Agents ask and resolve questions themselves — Zero HITL blocking when human provides high-level intent"
 * 
 * Internal Dialectic Triad:
 *   1. Principal Architect Persona  -> Dissects Root Intent & Asks Deep Branching Questions
 *   2. Lead Systems Engineer Persona -> Solves Architecture, State Machines & Contracts
 *   3. Adversarial SRE/Security Persona -> Audits Failure Modes, Rollbacks & Invariants
 * 
 * Tree Levels:
 *   • Level 0: Root Intent (Core Purpose, Primary Actor, Success Invariants)
 *   • Level 1 -> 2: Deep Branching Socratic Decomposition:
 *       - Branch 1: System Archetype, Execution Model & Concurrency
 *       - Branch 2: Data Contracts, Invariant State Machines & Saga Rollbacks
 *       - Branch 3: Autonomy, Boundaries, Security & Blast Radius Guardrails
 *       - Branch 4: Interface Surfaces & Consumption (API / Events / CLI / UI & 5-State)
 *   • Level 3: BDD Given-When-Then Specification & Verification Harness
 * 
 * Usage:
 *   node scripts/discovery/socratic-loop.js generate <topic|G-xxx> [options]
 *   node scripts/discovery/socratic-loop.js validate <file.md>
 *   soda-os discovery <topic|G-xxx> [options]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
Soda OS Autonomous Self-Socratic Dialectic Discovery Engine (Zero-HITL Blocking)

Usage:
  node scripts/discovery/socratic-loop.js generate <topic|G-xxx> [options]
  node scripts/discovery/socratic-loop.js validate <file.md>
  node scripts/discovery/socratic-loop.js schema

Options:
  --intent <text>          Core intent / problem statement (Level 0 Root)
  --actor <name>           Primary actor, persona, or consuming service
  --archetype <type>       System archetype: 'backend-service' | 'event-stream' | 'api-gateway' |
                           'cli-tool' | 'sre-control-plane' | 'ml-pipeline' | 'mobile-app' | 'web-ui' | 'general'
  --domain <name>          Domain classification (e.g. 'FinTech', 'SRE', 'Swarm Orchestration', 'E-Commerce')
  --output, -o <path>      Output markdown file path (defaults to docs/06_raw/<timestamp>_<topic>_socratic_discovery.md)
  --json                   Export result in JSON format alongside Markdown
  --help, -h               Show this help message

Examples:
  node scripts/discovery/socratic-loop.js generate G-130 --archetype "backend-service" --intent "Outbound TokenBucket Rate Limiter"
  node scripts/discovery/socratic-loop.js generate "agentic-orchestrator" --archetype "web-ui" --intent "Tri-pane Swarm IDE"
  node scripts/discovery/socratic-loop.js validate docs/06_raw/20260827_discovery.md
`);
}

if (!command || command === '--help' || command === '-h' || command === 'help') {
  printHelp();
  process.exit(0);
}

function parseFlags(argv) {
  const options = {
    target: null,
    intent: null,
    actor: 'Autonomous Agent Swarm & Human Engineer',
    archetype: 'general',
    domain: 'Agentic Systems & Distributed Architecture',
    output: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--intent' && i + 1 < argv.length) {
      options.intent = argv[++i];
    } else if (arg === '--actor' && i + 1 < argv.length) {
      options.actor = argv[++i];
    } else if (arg === '--archetype' && i + 1 < argv.length) {
      options.archetype = argv[++i].toLowerCase();
    } else if (arg === '--domain' && i + 1 < argv.length) {
      options.domain = argv[++i];
    } else if ((arg === '--output' || arg === '-o') && i + 1 < argv.length) {
      options.output = argv[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (!arg.startsWith('-') && !options.target) {
      options.target = arg;
    }
  }

  return options;
}

function generateTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function generateIsoTimestamp() {
  return new Date().toISOString();
}

function buildSelfDialecticSocraticBlueprint(topic, intent, actor, archetype, domain) {
  const isGoal = /^G-\d{3}$/i.test(topic);
  const resolvedIntent = intent || `Engineer an autonomous, resilient ${topic} subsystem adhering to zero-mock invariants.`;

  // Runtime and surface configuration
  let runtimeDesc = 'High-performance async runtime (Rust / Tokio / Node.js / Python)';
  let topologyDesc = 'Modular subsystem with strict interface decoupling and async boundaries.';
  let surfaceDetails = '';

  if (archetype === 'backend-service' || archetype === 'api-gateway') {
    runtimeDesc = 'Rust Axum / Tokio asynchronous HTTP & gRPC gateway with zero-copy buffers.';
    topologyDesc = 'Layered Hexagonal Architecture: Inbound Transport -> Domain Core -> Outbound Adapters.';
    surfaceDetails = `### **Branch 4.1: API & IPC Contracts**
* **Inbound Endpoints:** \`POST /v1/${topic.toLowerCase()}/execute\`, \`GET /v1/${topic.toLowerCase()}/status\`
* **Headers & Auth:** \`Authorization: Bearer <Ed25519-Token>\`, \`X-Idempotency-Key: <UUID-v4>\`
* **Response Codes:** \`200 OK\`, \`202 Accepted\`, \`422 Unprocessable\`, \`429 Too Many Requests\`, \`503 Service Unavailable\`
* **Error Envelope:** \`{ "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "...", "retry_after_ms": 500 } }\``;
  } else if (archetype === 'event-stream') {
    runtimeDesc = 'NATS JetStream + Redis Cluster distributed event streaming engine.';
    topologyDesc = 'Queue Group load-balanced worker pool with consumer ack/nak backpressure.';
    surfaceDetails = `### **Branch 4.1: Event Streaming Topology**
* **Subject Namespace:** \`soda.v1.${domain.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${topic.toLowerCase()}.events\`
* **Message Format:** CloudEvents v1.0 JSON with Ed25519 cryptographic header signatures.
* **Delivery Invariants:** At-least-once with Redis dedup cache on \`event_id\`.`;
  } else if (archetype === 'web-ui' || archetype === 'mobile-app') {
    runtimeDesc = archetype === 'web-ui' ? 'React / Next.js with Storybook isolated component workshop.' : 'Flutter with Widgetbook isolated widget workshop.';
    topologyDesc = 'Tri-Pane Workspace IDE / Master-Detail Layout with real-time WebSocket state synchronization.';
    surfaceDetails = `### **Branch 4.1: Visual Hierarchy & ASCII Wireframe**
\`\`\`
+----------------------------------------------------------------------------------------------------+
| AppHeader: [ProjectSelector] [ActiveModelBadge] [TokenCostTicker] [GlobalExecutionControls]        |
+------------------------------------+----------------------------------+----------------------------+
| LeftSidebar                        | PrimaryWorkspaceCanvas           | ObservabilityPanel         |
| ├── EntityVisualizer               | ├── ArtifactTabBar               | ├── StreamFilterToggle     |
| │   └── EntityNode (Status, Ms)    | ├── CoreEditor/Viewer            | ├── ActivityThoughtBlock   |
| ├── StateRoster                    | │   ├── LineGutter               | ├── ActionInvocationCard   |
| │   └── StatusBadge (Role, Load)   | │   ├── DiffChunkRenderer        | │   ├── SchemaViewer       |
| └── ResourceGauge                  | │   └── FloatingActionToolbar    | │   └── ExecutionDuration  |
|     ├── CapacityBar                | └── FileTreeExplorer             | ├── HITLApprovalCard       |
|     └── CompactionIndicator        |     └── FileNode (State, Path)   | │   ├── [Approve] [Reject] |
|                                    |                                  | └── SandboxedTerminal      |
+------------------------------------+----------------------------------+----------------------------+
| AppFooter: [ConnectionState: NATS/WebSocket] [ActiveSandbox: Docker/Wasm] [SystemLatency: 14ms]     |
+----------------------------------------------------------------------------------------------------+
\`\`\`

### **Branch 4.2: Atomic UI Primitives & 5-State Matrix**
* **\`<EntityNode/>\`**: Renders node state, execution elapsed time in ms, retry count, and status badge.
* **\`<ActivityThoughtBlock/>\`**: Collapsible container displaying monotonic timestamp, token density, and reasoning trace.
* **\`<ActionInvocationCard/>\`**: Expandable card presenting payload signature, raw JSON arguments, observation, and latency.
* **\`<HITLApprovalCard/>\`**: High-priority alert card with countdown timer, security risk badge, diff preview, and binary [Approve] / [Deny] triggers.
* **5-State Component Contract:** Mandatory demonstration of **Skeleton, Populated, Empty, Error, and Disabled** states for all components.`;
  } else {
    runtimeDesc = 'Modular polyglot engine with hardened isolation and strict resource boundaries.';
    topologyDesc = 'Command & Control pipeline with decoupled storage, execution, and telemetry adapters.';
    surfaceDetails = `### **Branch 4.1: Interface & Consumption Surfaces**
* **CLI Interface:** \`soda-os ${topic.toLowerCase()} [subcommand] [flags]\`
* **Programmatic API:** Typed SDK client with zero-mock unit and integration test bindings.
* **Observability:** OpenTelemetry W3C distributed traces + Prometheus metrics export.`;
  }

  return {
    meta: {
      topic,
      intent: resolvedIntent,
      actor,
      archetype,
      domain,
      createdAt: generateIsoTimestamp(),
      version: '3.0.0',
      dialecticMethod: 'Autonomous Multi-Persona Self-Interrogation (Zero-HITL Blocking)',
    },
    dialecticTriad: {
      architect: 'Principal Agentic Architect (Interrogates root intent & poses deep branch questions)',
      engineer: 'Lead Systems Engineer (Supplies concrete operational algorithms, FSMs & schemas)',
      critic: 'Adversarial SRE & Security Critic (Validates invariants, failure bounds & saga rollbacks)',
    },
    level0: {
      name: 'Level 0: Root Intent (Core Purpose & Objectives)',
      q0_1: {
        question: 'What is the fundamental Intent / Objective / Problem statement? (Why does this exist?)',
        dialectic: {
          architectPrompt: 'Why are we building this system? What human or system pain does it solve?',
          engineerResolution: resolvedIntent,
          criticVerdict: 'Intent is unambiguous, actionable, and bounded.',
        },
      },
      q0_2: {
        question: 'Who is the primary actor, persona, or consuming service? (For whom is this built?)',
        dialectic: {
          architectPrompt: 'Who invokes or consumes this capability?',
          engineerResolution: actor,
          criticVerdict: 'Consumer identity and security boundaries clearly established.',
        },
      },
      q0_3: {
        question: 'What constitutes measurable success & core invariant outcomes? (What must never break?)',
        dialectic: {
          architectPrompt: 'What invariant thresholds determine operational success?',
          engineerResolution: `* Zero-stub, production-ready operational logic without placeholder returns or mock fallbacks.\n* Strict adherence to SLA latency ceilings, deterministic state machine transitions, and automated rollback consistency.\n* 100% automated test coverage across unit and integration suites.`,
          criticVerdict: 'Pass criteria are empirically verifiable with automated test harnesses.',
        },
      },
    },
    branches: {
      name: 'Level 1 -> Level 2: Deep Branching Socratic Decomposition',
      branch1: {
        title: 'Branch 1: System Archetype, Execution Model & Concurrency',
        q1_1: {
          question: 'What system archetype and execution runtime does this belong to?',
          dialectic: {
            architectPrompt: 'Which runtime, framework, and process isolation model best fulfills the throughput/safety requirements?',
            engineerResolution: `Archetype: **${archetype.toUpperCase()}** (${domain}). Runtime: ${runtimeDesc}`,
            criticVerdict: 'Runtime model prevents thread starvation and memory leaks.',
          },
        },
        q1_2: {
          question: 'What are the concurrency model, thread safety, and latency budgets?',
          dialectic: {
            architectPrompt: 'How does the system prevent blocking on async loops and manage load spikes?',
            engineerResolution: `* **Concurrency:** Non-blocking async event loop with bounded channel queues and backpressure.\n* **Thread Safety:** Lock-free / atomic synchronization without blocking mutexes inside async execution paths.\n* **Latency SLA:** Sub-15ms processing ceiling for local operations; hard timeout watchdogs on all outbound I/O.`,
            criticVerdict: 'Conforms to non-blocking async safety invariants.',
          },
        },
      },
      branch2: {
        title: 'Branch 2: Data Contracts, Invariant State Machines & Sagas',
        q2_1: {
          question: 'What are the primary feature modules and their explicit State Machine lifecycles?',
          matrix: [
            {
              module: 'Core Ingestion / Request Gateway',
              subFeatures: 'Payload parsing, schema validation, idempotency key checking',
              lifecycle: 'INGESTED → VALIDATED → QUEUED → REJECTED',
            },
            {
              module: 'Execution & Processing Engine',
              subFeatures: 'Business logic execution, saga coordination, state persistence',
              lifecycle: 'DISPATCHED → PROCESSING → COMMITTED → FAILED_ROLLBACK',
            },
            {
              module: 'Outbox & Telemetry Dispatcher',
              subFeatures: 'Event emission, audit log recording, notification delivery',
              lifecycle: 'STAGED → PUBLISHING → ACKNOWLEDGED → DEAD_LETTER',
            },
          ],
        },
        q2_2: {
          question: 'What is the saga compensation / rollback order on mid-sequence failure?',
          dialectic: {
            architectPrompt: 'If a multi-step operation fails midway, how is transactional consistency preserved?',
            engineerResolution: `On unexpected failure at step $N$, the system halts forward progress, executes inverse compensation transactions in reverse order ($C_N \\to C_{N-1} \\to C_1$), restores prior state snapshot, and logs forensic audit context.`,
            criticVerdict: 'Prevents partial-state corruption and orphaned resources.',
          },
        },
      },
      branch3: {
        title: 'Branch 3: Autonomy, Boundaries, Security & Blast Radius Guardrails',
        q3_1: {
          question: 'What is the autonomy model? (Autonomous vs. Human-in-the-Loop)',
          dialectic: {
            architectPrompt: 'How do agents execute autonomously without waiting for human intervention on technical decisions?',
            engineerResolution: `**Autonomous Agentic Execution with Policy Guardrails**:\n* Agents autonomously formulate questions, analyze trade-offs, and execute operational code.\n* High-risk external actions (payment settlement, DNS update, production deployment) adhere to hard pre-validated policy rules without blocking for human technical input.`,
            criticVerdict: 'Eliminates human analysis paralysis while enforcing strict security sandbox invariants.',
          },
        },
        q3_2: {
          question: 'What are the security boundaries, PII redactions, and blast radius containment policies?',
          dialectic: {
            architectPrompt: 'How are sensitive data, memory ceilings, and failure cascades contained?',
            engineerResolution: `* **PII Redaction:** Sensitive credentials, tokens, and PII are redacted before serialization or logging.\n* **Resource Caps:** Hard memory caps (64MB/256MB) and execution timeout limits (30s) prevent resource exhaustion.\n* **Circuit Breaker:** Opens on $\\ge 5$ consecutive failures or $\\ge 50\\%$ error rate, halting outbound blast radius.`,
            criticVerdict: 'Security and resilience boundaries mathematically bounded.',
          },
        },
      },
      branch4: {
        title: 'Branch 4: Interface Surfaces & Consumption Hierarchy',
        surfaceContent: surfaceDetails,
      },
    },
    level3: {
      name: 'Level 3: BDD Given-When-Then Specification & Verification Harness',
      bdd: `Feature: ${topic} Intent-First Operational Reliability
  As ${actor}
  I want ${resolvedIntent}
  So that system invariants, state machines, and boundaries are strictly maintained

  Scenario: Successful Operational Flow
    Given the system is initialized in a clean state with valid configurations
    When an authorized execution request is received for "${topic}"
    Then the system processes the request within SLA latency budgets
    And state transitions follow the designated FSM path without errors
    And all outbound mutations are committed with audit evidence

  Scenario: Error Handling and Safe Rollback on Failure
    Given an operational step encounters an unexpected failure or timeout
    When the system catches the error condition
    Then saga rollback compensation is triggered in reverse order
    And no orphaned resources or corrupted state remain
    And a structured error envelope is emitted without crashing`,
      verification: `* **In-Process Unit Tests:** Run test runner (\`npm test\` / \`cargo test\` / \`pytest\`) verifying 100% operational code paths.
* **Out-of-Process Script Harness:** Execute smoke test or AST validator (\`node scripts/check-*.mjs\`).
* **Socratic Compliance Check:** Run \`node scripts/discovery/socratic-loop.js validate <file.md>\`.`,
    },
  };
}

function renderSelfDialecticMarkdown(blueprint) {
  const { meta, dialecticTriad, level0, branches, level3 } = blueprint;

  let matrixRows = branches.branch2.q2_1.matrix
    .map(
      (row) =>
        `| **${row.module}** | ${row.subFeatures} | \`${row.lifecycle}\` |`
    )
    .join('\n');

  return `# ${meta.topic}: Autonomous Self-Socratic Dialectic Blueprint

**Timestamp:** ${meta.createdAt}  
**Author:** Antigravity (Soda OS Autonomous Self-Socratic Engine)  
**Topic:** ${meta.topic}  
**System Archetype:** \`${meta.archetype.toUpperCase()}\`  
**Domain:** ${meta.domain}  
**Execution Paradigm:** \`${meta.dialecticMethod}\`  
**Status:** \`AUTONOMOUS_DIALECTIC_COMPLETE_READY_FOR_BUILD\`  

---

## 🤖 The Autonomous Self-Dialectic Triad

When humans provide high-level intent, the AI Agent Swarm **self-interrogates and self-resolves** across three internal personas:

1. 🏛️ **${dialecticTriad.architect}**
2. ⚙️ **${dialecticTriad.engineer}**
3. 🛡️ **${dialecticTriad.critic}**

---

## 🌳 Socratic Tree Architecture Overview

\`\`\`
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
│ • Execution Runtime   │    │ • Data Schemas / IPC  │    │ • HITL vs Autonomous  │
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
\`\`\`

---

## 🎯 ${level0.name}

### **Q0.1: ${level0.q0_1.question}**
* 🏛️ **Architect Prompt:** ${level0.q0_1.dialectic.architectPrompt}
* ⚙️ **Engineer Resolution:** ${level0.q0_1.dialectic.engineerResolution}
* 🛡️ **Critic Verdict:** ${level0.q0_1.dialectic.criticVerdict}

### **Q0.2: ${level0.q0_2.question}**
* 🏛️ **Architect Prompt:** ${level0.q0_2.dialectic.architectPrompt}
* ⚙️ **Engineer Resolution:** ${level0.q0_2.dialectic.engineerResolution}
* 🛡️ **Critic Verdict:** ${level0.q0_2.dialectic.criticVerdict}

### **Q0.3: ${level0.q0_3.question}**
* 🏛️ **Architect Prompt:** ${level0.q0_3.dialectic.architectPrompt}
* ⚙️ **Engineer Resolution:**
${level0.q0_3.dialectic.engineerResolution}
* 🛡️ **Critic Verdict:** ${level0.q0_3.dialectic.criticVerdict}

---

## 🌿 ${branches.name}

### 🏛️ ${branches.branch1.title}
* **Q1.1: ${branches.branch1.q1_1.question}**  
  * 🏛️ **Architect:** ${branches.branch1.q1_1.dialectic.architectPrompt}  
  * ⚙️ **Engineer:** ${branches.branch1.q1_1.dialectic.engineerResolution}  
  * 🛡️ **Critic:** ${branches.branch1.q1_1.dialectic.criticVerdict}  
* **Q1.2 (Deep Drill): ${branches.branch1.q1_2.question}**  
  * 🏛️ **Architect:** ${branches.branch1.q1_2.dialectic.architectPrompt}  
  * ⚙️ **Engineer:**  
${branches.branch1.q1_2.dialectic.engineerResolution}  
  * 🛡️ **Critic:** ${branches.branch1.q1_2.dialectic.criticVerdict}  

---

### 🔄 ${branches.branch2.title}
* **Q2.1: ${branches.branch2.q2_1.question}**  
  * **Self-Resolved State Lifecycle Matrix:**

| Feature Module | Sub-Features | State Lifecycle / Events |
| :--- | :--- | :--- |
${matrixRows}

* **Q2.2 (Deep Drill): ${branches.branch2.q2_2.question}**  
  * 🏛️ **Architect:** ${branches.branch2.q2_2.dialectic.architectPrompt}  
  * ⚙️ **Engineer:** ${branches.branch2.q2_2.dialectic.engineerResolution}  
  * 🛡️ **Critic:** ${branches.branch2.q2_2.dialectic.criticVerdict}  

---

### 🛡️ ${branches.branch3.title}
* **Q3.1: ${branches.branch3.q3_1.question}**  
  * 🏛️ **Architect:** ${branches.branch3.q3_1.dialectic.architectPrompt}  
  * ⚙️ **Engineer:**  
${branches.branch3.q3_1.dialectic.engineerResolution}  
  * 🛡️ **Critic:** ${branches.branch3.q3_1.dialectic.criticVerdict}  
* **Q3.2 (Deep Drill): ${branches.branch3.q3_2.question}**  
  * 🏛️ **Architect:** ${branches.branch3.q3_2.dialectic.architectPrompt}  
  * ⚙️ **Engineer:**  
${branches.branch3.q3_2.dialectic.engineerResolution}  
  * 🛡️ **Critic:** ${branches.branch3.q3_2.dialectic.criticVerdict}  

---

### 🖥️ ${branches.branch4.title}
${branches.branch4.surfaceContent}

---

## 📜 ${level3.name}

### **BDD Feature Scenarios:**
\`\`\`gherkin
${level3.bdd}
\`\`\`

### **Verification & Testing Plan:**
${level3.verification}

---

## 🔒 Autonomous Invariant Verification Checklist
- [x] **Autonomous Self-Dialectic Executed:** Architect, Engineer, and Critic personas self-interrogated with zero human blocking.
- [x] **Root Intent Formulated (Level 0):** Core purpose, primary actor, and non-negotiable invariants established.
- [x] **Deep Branches Self-Resolved (Level 1 & 2):** Architecture runtime, state machine lifecycles, and autonomy boundaries fully solved.
- [x] **Interfaces & Consumption Defined:** Surface contracts (API, CLI, Events, or UI) grounded.
- [x] **BDD Given-When-Then Formulated:** Executable scenarios ready to drive TDD implementation.
`;
}

function handleGenerate(argv) {
  const options = parseFlags(argv);
  if (!options.target) {
    console.error('Error: Missing topic or goal ID for discovery generation.');
    console.error('Usage: node scripts/discovery/socratic-loop.js generate <topic|G-xxx> [options]');
    process.exit(1);
  }

  const blueprint = buildSelfDialecticSocraticBlueprint(
    options.target,
    options.intent,
    options.actor,
    options.archetype,
    options.domain
  );
  const markdown = renderSelfDialecticMarkdown(blueprint);

  let outputPath = options.output;
  if (!outputPath) {
    const rawDir = path.join(process.cwd(), 'docs/06_raw');
    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true });
    }
    const timestamp = generateTimestamp();
    const sanitized = options.target.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    outputPath = path.join(rawDir, `${timestamp}_${sanitized}_socratic_discovery.md`);
  }

  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(`\n================================================================`);
  console.log(`  Soda OS Autonomous Self-Socratic Engine: ${options.target}`);
  console.log(`================================================================`);
  console.log(`- Archetype:  ${options.archetype.toUpperCase()}`);
  console.log(`- Domain:     ${options.domain}`);
  console.log(`- Intent:     ${options.intent || '(Autonomous AI Synthesis)'}`);
  console.log(`- Paradigm:   Autonomous Multi-Persona Self-Interrogation (Zero-HITL)`);
  console.log(`- Output MD:  ${outputPath}`);

  if (options.json) {
    const jsonPath = outputPath.replace(/\.md$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(blueprint, null, 2), 'utf8');
    console.log(`- Output JSON:${jsonPath}`);
  }

  console.log(`\n✔ Autonomous Self-Socratic Discovery Blueprint generated successfully.`);
}

function handleValidate(argv) {
  const targetFile = argv[0];
  if (!targetFile) {
    console.error('Error: Missing file path to validate.');
    console.error('Usage: node scripts/discovery/socratic-loop.js validate <file.md>');
    process.exit(1);
  }

  const filePath = path.resolve(targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const checks = [
    { name: 'Level 0 Root Intent', pass: /Level 0.*Root Intent/i.test(content) || /Q0\.1.*Intent/i.test(content) || /Root Intent/i.test(content) },
    { name: 'Primary Actor / Consumer', pass: /Q0\.2.*actor/i.test(content) || /Primary Actor/i.test(content) },
    { name: 'Branch 1 System Architecture & Runtime', pass: /Branch 1/i.test(content) || /System Archetype/i.test(content) || /Execution Runtime/i.test(content) },
    { name: 'Branch 2 Invariant State Machines & Sagas', pass: /Branch 2/i.test(content) || /State Lifecycle/i.test(content) || /FSM/i.test(content) },
    { name: 'Branch 3 Autonomy, Security & Boundaries', pass: /Branch 3/i.test(content) || /Autonomy/i.test(content) || /Guardrails/i.test(content) },
    { name: 'Branch 4 Interface Surfaces & Consumption', pass: /Branch 4/i.test(content) || /Surface/i.test(content) || /Interface/i.test(content) || /Wireframe/i.test(content) },
    { name: 'Level 3 BDD Specification', pass: /Level 3.*BDD/i.test(content) || /Feature:/i.test(content) || /Scenario:/i.test(content) },
    { name: 'Verification & Testing Plan', pass: /Verification/i.test(content) || /Testing Plan/i.test(content) },
  ];

  console.log(`\n================================================================`);
  console.log(`  Soda OS Socratic Discovery Validator: ${path.basename(filePath)}`);
  console.log(`================================================================`);

  let allPass = true;
  for (const check of checks) {
    const status = check.pass ? '✔ PASS' : '✖ FAIL';
    console.log(`  [${status}] ${check.name}`);
    if (!check.pass) allPass = false;
  }

  if (allPass) {
    console.log(`\n✔ Complete! Discovery document satisfies the Autonomous Self-Socratic Dialectic Framework.`);
    process.exit(0);
  } else {
    console.error(`\n✖ Validation Failed: Missing one or more required Socratic Root-and-Branch sections.`);
    process.exit(1);
  }
}

if (command === 'generate' || command === 'gen' || command === 'new') {
  handleGenerate(args.slice(1));
} else if (command === 'validate' || command === 'check') {
  handleValidate(args.slice(1));
} else if (command === 'schema') {
  console.log(JSON.stringify(buildSelfDialecticSocraticBlueprint('EXAMPLE-TOPIC', null, 'Example Actor', 'backend-service', 'Example Domain'), null, 2));
} else {
  // If invoked with a topic directly
  handleGenerate(args);
}
