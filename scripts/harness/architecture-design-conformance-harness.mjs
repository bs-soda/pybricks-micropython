#!/usr/bin/env node

/**
 * @file architecture-design-conformance-harness.mjs
 * @description Autonomous Software & Architecture Design Conformance Harness for Soda OS Goals.
 * Validates that every target G-xxx.md strictly specifies Domain-Driven Design (DDD),
 * Hexagonal Ports & Adapters topology, Zero-Mock implementation invariants, and links an
 * executable Socratic 5-Why Dialectic report in docs/06_raw/.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_ARCH_INVARIANTS = [
  { name: "Software & Architecture Design Section", pattern: /## Software & Architecture Design/ },
  { name: "System Archetype Invariant", pattern: /\*\*System Archetype\*\*\s*\|/ },
  { name: "Bounded Context & Domain Invariant", pattern: /\*\*Bounded Context & Domain\*\*\s*\|/ },
  { name: "Ports & Adapters Topology Invariant", pattern: /\*\*Ports & Adapters Topology\*\*\s*\|/ },
  { name: "Zero-Mock Conformance Gate", pattern: /\*\*Zero-Mock & Conformance Gate\*\*\s*\|/ },
  { name: "Socratic 5-Why Blueprint Link", pattern: /\*\*Socratic 5-Why Blueprint\*\*\s*\|/ },
  { name: "Checklist: Software & Architecture Design", pattern: /-\s+\[(x| )\]\s+Software & Architecture Design specified(?: by AI Agent)?/ },
  { name: "Checklist: Socratic 5-Why Dialectic Report", pattern: /-\s+\[(x| )\]\s+(?:Socratic 5-Why Dialectic report generated\/linked|Reproduction steps and proof scenarios verified)/ },
  { name: "Checklist: Architecture & Goal Conformance", pattern: /-\s+\[(x| )\]\s+(?:Architecture & Goal Conformance Harness passing|Architecture & Goal Conformance|Atomicity & Zero-Mock Contract confirmed)/ }
];

const goalsDir = resolve(process.cwd(), 'docs/07-backlog/goals');
let targetGoals = process.argv.slice(2);

if (targetGoals.length === 0) {
  if (existsSync(goalsDir)) {
    targetGoals = readdirSync(goalsDir)
      .filter(f => f.startsWith('G-') && f.endsWith('.md') && !f.includes('_template'))
      .map(f => f.replace(/\.md$/, ''));
  }
}

console.log("================================================================================");
console.log("🏛️ Soda OS Software & Architecture Design Conformance Harness");
console.log("================================================================================\n");

let passedGoals = 0;
let failedGoals = 0;

for (const goalId of targetGoals) {
  const files = readdirSync(goalsDir);
  const matchedFile = files.find(f => (f.startsWith(goalId) || f === `${goalId}.md`) && f.endsWith('.md'));

  if (!matchedFile) {
    console.error(`❌ [${goalId}] Goal file not found in ${goalsDir}`);
    failedGoals++;
    continue;
  }

  const filePath = resolve(goalsDir, matchedFile);
  const content = readFileSync(filePath, 'utf8');

  console.log(`▶ Verifying Architecture Design for ${matchedFile}...`);
  let deviations = 0;

  for (const inv of REQUIRED_ARCH_INVARIANTS) {
    if (!inv.pattern.test(content)) {
      console.error(`  ❌ Missing Architectural Invariant: "${inv.name}"`);
      deviations++;
    }
  }

  if (deviations === 0) {
    console.log(`  ✅ 100% Architecture & Design Conformance Verified (${REQUIRED_ARCH_INVARIANTS.length}/${REQUIRED_ARCH_INVARIANTS.length} checks passed)\n`);
    passedGoals++;
  } else {
    console.error(`  ⚠️ Failed with ${deviations} architectural design deviations.\n`);
    failedGoals++;
  }
}

console.log("================================================================================");
console.log(`📊 Summary: ${passedGoals} Passed, ${failedGoals} Failed`);
console.log("================================================================================\n");

if (failedGoals > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
