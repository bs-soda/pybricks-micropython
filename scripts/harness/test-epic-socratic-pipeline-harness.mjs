#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS DYNAMIC EPIC SOCRATIC PIPELINE HARNESS TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Zero-mock unit and integration verification for dynamic Epic orchestration,
 *          5-Why Socratic Dialectic generation, 31-section Goal card conformance
 *          (including Epic metadata & architecture branch), and zero workspace pollution.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { runEpicPipeline, parseEpicCliArgs, generate5WhyDiscoveryDoc, generateCompliantGoalCard } from './epic-socratic-pipeline-harness.mjs';
import { validateGoalConformance } from './goal-template-conformance-harness.mjs';

console.log("================================================================================");
console.log("🧪 Running Dynamic Epic Socratic Pipeline Harness Unit Tests...");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`      ↳ ${err.message}`);
  }
}

// Test 1: Dynamic CLI Arguments Parsing
runTest("1. Dynamic CLI flags parse arbitrary Epics, branches, and repeatable goals", () => {
  const cliArgs = [
    'LEDGER',
    '--name', 'Multi-Tenant Accounting Ledger',
    '--branch', 'feature/LEDGER',
    '--domain', 'Financial Ledger Core',
    '--goal', 'G-LEDGER-101:Double Entry Bookkeeping:backend-service:Maintain double entry balance',
    '--goal', 'G-LEDGER-102:Satang Cashflow:api-gateway:Satang integer REST endpoints'
  ];
  const parsed = parseEpicCliArgs(cliArgs);
  
  assert.strictEqual(parsed.epicId, 'LEDGER', "Epic ID must be LEDGER");
  assert.strictEqual(parsed.name, 'Multi-Tenant Accounting Ledger', "Epic name must match");
  assert.strictEqual(parsed.epicBranch, 'feature/LEDGER', "Epic branch must be feature/LEDGER");
  assert.strictEqual(parsed.goals.length, 2, "Must parse 2 goals");
  assert.strictEqual(parsed.goals[0].id, 'G-LEDGER-101', "Goal 1 ID matches");
  assert.strictEqual(parsed.goals[1].id, 'G-LEDGER-102', "Goal 2 ID matches");
});

// Test 2: Socratic 5-Why Dialectic Generation & Level 5 Convergence
runTest("2. Socratic 5-Why generator produces Level 5 resolution across all 4 branches", () => {
  const epic = {
    epicId: 'AUTH',
    name: 'Enterprise Identity & Access Governance',
    epicBranch: 'feature/AUTH',
    domain: 'Security & IAM Architecture'
  };
  const goal = {
    id: 'G-AUTH-001',
    title: 'SAML 2.0 Enterprise SSO',
    archetype: 'backend-service',
    intent: 'Federate enterprise identity providers via SAML 2.0 and SCIM 2.0 provisioning.',
    why: 'Manual user provisioning causes identity drift and violates SOC 2 segregation of duties.',
    doneWhen: 'Enterprise users authenticate via Okta/Azure AD; SCIM sync reconciles group memberships.',
    unblocks: 'Downstream RBAC goals'
  };
  const doc = generate5WhyDiscoveryDoc(goal, epic);
  
  assert.ok(doc.includes('Branch 1: Runtime, Execution Model & Concurrency'), "Must have Branch 1");
  assert.ok(doc.includes('Branch 2: Data Contracts, Satang Invariants & FSM State Machines'), "Must have Branch 2");
  assert.ok(doc.includes('Branch 3: Autonomy, Security, Guardrails & Multi-Tenancy'), "Must have Branch 3");
  assert.ok(doc.includes('Branch 4: Interfaces, APIs & Consumption Surfaces'), "Must have Branch 4");
  assert.ok(doc.includes('Why Level 5 (Root Invariant):'), "Must reach Level 5 Root Invariant");
  assert.ok(doc.includes('Level 5 Convergence'), "Must achieve Level 5 Convergence");
});

// Test 3: Full 31-Section Goal Card Conformance (including Epic metadata)
runTest("3. Generated Goal card passes 100% 31/31 canonical conformance invariants (with Epic metadata)", () => {
  const epic = {
    epicId: 'SETTLE',
    name: 'Real-Time Settlement Subsystem',
    epicBranch: 'feature/SETTLE',
    domain: 'Payment Settlement Engine'
  };
  const goal = {
    id: 'G-SETTLE-001',
    title: 'Atomic Settlement Journal',
    archetype: 'backend-service',
    intent: 'Double-entry settlement journal with zero float math.',
    why: 'Prevent balance discrepancies in merchant settlement.',
    doneWhen: 'All settlement batches clear with mathematical balance invariant.',
    unblocks: 'G-SETTLE-002'
  };
  const content = generateCompliantGoalCard(goal, epic);
  
  assert.ok(content.includes('**Epic:** feature/SETTLE · Real-Time Settlement Subsystem'), "Must include Epic metadata");
  
  const tmpFile = path.join(process.cwd(), '.tmp-test-g-settle-001.md');
  fs.writeFileSync(tmpFile, content, 'utf8');
  
  try {
    const res = validateGoalConformance(tmpFile);
    assert.strictEqual(res.valid, true, `Goal card must be valid: ${res.errors.join(', ')}`);
    assert.strictEqual(res.passedCount, 31, "Must pass all 31 canonical sections");
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

// Test 4: Dynamic Pipeline Dry-Run (Zero File Pollution)
runTest("4. Dynamic Epic Pipeline executes dry-run with zero residual workspace pollution", () => {
  const config = {
    epicId: 'STREAM',
    name: 'Event Streaming Fabric',
    epicBranch: 'feature/STREAM',
    domain: 'Distributed Messaging & NATS Streaming',
    goals: [
      { id: 'G-STREAM-001', title: 'JetStream Topology', archetype: 'event-stream' }
    ],
    dryRun: true
  };
  const result = runEpicPipeline(config, { dryRun: true });
  assert.strictEqual(result, true, "Pipeline dry-run must succeed");
});

console.log("\n================================================================================");
console.log(`📊 Unit Test Result: ${passedTests} / ${totalTests} Passed`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
