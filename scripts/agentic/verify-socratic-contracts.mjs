#!/usr/bin/env node

/**
 * scripts/agentic/verify-socratic-contracts.mjs
 * 
 * Autonomous Socratic Invariant & Contract Verification Harness
 * Audits Goals G-160 through G-189 against Enterprise Microservice & Production Standards.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const GOALS_DIR = path.join(REPO_ROOT, 'docs/07-backlog/goals');
const ARCHIVED_GOALS_DIR = path.join(GOALS_DIR, '_archived');
const CONTEXT_OUTPUT_DIR = path.join(REPO_ROOT, '.agentic');

const TARGET_GOAL_RANGE = Array.from({ length: 33 }, (_, i) => 160 + i); // G-160 to G-192

console.log('🔍 \x1b[1m\x1b[36mStarting Socratic 5-Why Contract Verification for Goals G-160 to G-192...\x1b[0m\n');

if (!fs.existsSync(CONTEXT_OUTPUT_DIR)) {
  fs.mkdirSync(CONTEXT_OUTPUT_DIR, { recursive: true });
}

let totalAudited = 0;
let passedContracts = 0;
let failedContracts = 0;
const contextMatrix = {};

for (const goalNum of TARGET_GOAL_RANGE) {
  const goalId = `G-${goalNum}`;
  totalAudited++;

  // Locate goal file in active or archived directory
  const activeFiles = fs.existsSync(GOALS_DIR) ? fs.readdirSync(GOALS_DIR) : [];
  const archivedFiles = fs.existsSync(ARCHIVED_GOALS_DIR) ? fs.readdirSync(ARCHIVED_GOALS_DIR) : [];

  const matchedActive = activeFiles.find(f => f.startsWith(`${goalId}-`) || f.startsWith(`${goalId}.`));
  const matchedArchived = archivedFiles.find(f => f.startsWith(`${goalId}-`) || f.startsWith(`${goalId}.`));

  let filePath = null;
  let isArchived = false;

  if (matchedActive) {
    filePath = path.join(GOALS_DIR, matchedActive);
  } else if (matchedArchived) {
    filePath = path.join(ARCHIVED_GOALS_DIR, matchedArchived);
    isArchived = true;
  }

  if (!filePath) {
    console.log(`⚠️  \x1b[33m${goalId.padEnd(6)}\x1b[0m: File not found (Draft / Planned in goals.md)`);
    contextMatrix[goalId] = {
      status: 'pending_draft',
      goal_id: goalId,
      invariants_passed: false,
    };
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Audit Invariants
  const hasPlan = /#### Plan|## Plan/i.test(content);
  const hasIntent = /## Intent/i.test(content);
  const hasCriteriaOrScope = /## Acceptance criteria|## Scope/i.test(content);
  const hasTouchMapOrIn = /## Touch map|### In/i.test(content);
  const hasZeroMock = !/mock\s*=\s*true|todo!\(\)|unimplemented!\(\)/i.test(content);

  // Microservice specific checks
  const isMicroserviceGoal = (goalNum >= 184 && goalNum <= 189) || (goalNum >= 190 && goalNum <= 192);
  const hasDualTransport = !isMicroserviceGoal || /NATS|JetStream|HTTPS|Fallback/i.test(content);
  const hasPreemption = !isMicroserviceGoal || /P0|P1|P2|P3|preempt|cooperative/i.test(content);

  const diagnostics = [];
  if (!hasPlan) diagnostics.push('Missing Plan (#/Step/Status)');
  if (!hasIntent) diagnostics.push('Missing Intent (Why/Done when)');
  if (!hasCriteriaOrScope) diagnostics.push('Missing Acceptance criteria or Scope');
  if (!hasTouchMapOrIn) diagnostics.push('Missing Touch map or In scope');
  if (!hasZeroMock) diagnostics.push('Contains mock or stub markers');
  if (!hasDualTransport) diagnostics.push('Missing NATS/HTTPS Dual-Transport definition');
  if (!hasPreemption) diagnostics.push('Missing Preemption priority tier (P0-P3)');

  const passed = diagnostics.length === 0;

  if (passed) {
    passedContracts++;
    console.log(`✅ \x1b[32m${goalId.padEnd(6)}\x1b[0m: Passed Socratic Contracts ${isArchived ? '(Archived Done)' : '(Ready/Active Spec)'}`);
  } else {
    failedContracts++;
    console.log(`⚠️  \x1b[33m${goalId.padEnd(6)}\x1b[0m: Needs Elaboration [${diagnostics.join(', ')}]`);
  }

  contextMatrix[goalId] = {
    goal_id: goalId,
    file_path: path.relative(REPO_ROOT, filePath),
    is_archived: isArchived,
    invariants: {
      has_plan: hasPlan,
      has_intent: hasIntent,
      has_criteria_or_scope: hasCriteriaOrScope,
      has_touch_map_or_in: hasTouchMapOrIn,
      zero_mock_certified: hasZeroMock,
      dual_transport_certified: hasDualTransport,
      preemption_certified: hasPreemption,
    },
    diagnostics,
    passed,
  };
}

const contextPath = path.join(CONTEXT_OUTPUT_DIR, 'socratic-context-matrix.json');
fs.writeFileSync(contextPath, JSON.stringify(contextMatrix, null, 2), 'utf-8');

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`📊 \x1b[1mAudit Summary:\x1b[0m Audited: ${totalAudited} | Fully Formulated: \x1b[32m${passedContracts}\x1b[0m | Drafts/Pending: \x1b[33m${failedContracts}\x1b[0m`);
console.log(`💾 \x1b[36mAgentic Context Matrix Exported to:\x1b[0m ${path.relative(REPO_ROOT, contextPath)}`);
console.log('────────────────────────────────────────────────────────────────────────\n');
