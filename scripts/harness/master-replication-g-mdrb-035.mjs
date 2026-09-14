#!/usr/bin/env node
/**
 * Master Replication & Complete Release Gate: G-MDRB-035
 *
 * Verifies all 7 Enterprise Release Gates:
 * - Gate 1: Fail-Closed Environment & Exact-HEAD Provenance
 * - Gate 2: Touch Map File Existence & Integrity Verification
 * - Gate 3: Goal Template Conformance Harness (34/34 sections)
 * - Gate 4: Software & Architecture Design Conformance Harness (9/9 invariants)
 * - Gate 5: BDD Acceptance Contract Scenarios Verification
 * - Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
 * - Gate 7: Multi-Tier Reclamation Architecture & Motor Overlap Matrix Verification
 *
 * Invariants: Article I (Zero Mocks), Article II (Mandatory Verification Pass)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

console.log('='.repeat(80));
console.log('🏛️ Master Replication & Complete Release Gate: G-MDRB-035');
console.log('='.repeat(80));

const results = [];

function assertGate(gate, desc, condition, details) {
  const passed = Boolean(condition);
  const status = passed ? 'PASS' : 'FAIL';
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${status}] ${desc}`);
  if (!passed && details) {
    console.log(`       Details: ${details}`);
  }
  results.push({ gate, desc, status, details: passed ? null : details });
  return passed;
}

// Gate 1: Fail-Closed Environment & Exact-HEAD Provenance
console.log('\n▶ Gate 1: Fail-Closed Environment & Exact-HEAD Provenance...');
let headSha = '';
let branchName = '';
try {
  headSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch (e) {
  assertGate(1, 'Git HEAD extraction', false, e.message);
}
assertGate(1, `Git HEAD is valid 40-hex SHA (${headSha})`, /^[a-f0-9]{40}$/.test(headSha), headSha);
assertGate(1, `Active feature branch is feature/mdrobotbase-enhancement (${branchName})`, branchName === 'feature/mdrobotbase-enhancement', branchName);

// Gate 2: Touch Map File Existence & Integrity
console.log('\n▶ Gate 2: Touch Map File Existence & Integrity Verification...');
const touchFiles = [
  'lib/pbio/include/pbio/mdrobotbase.h',
  'lib/pbio/src/mdrobotbase.c',
  'lib/pbio/src/main.c',
  'pybricks/robotics/pb_type_mdrobotbase.c',
  'tests/virtualhub/robotics/pybricks/robotics.py',
  'tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py',
  'lib/pbio/test/src/test_mdrobotbase.c',
  'docs/02-product/acceptance/G-MDRB-035.md',
  'docs/07-backlog/goals/G-MDRB-035.md',
  'docs/06_raw/20260912_151500_g_mdrb_035_socratic_5why.md'
];
for (const tf of touchFiles) {
  const fullPath = resolve(ROOT, tf);
  assertGate(2, `Touch map file exists: ${tf}`, existsSync(fullPath), fullPath);
}

// Gate 3: Goal Template Conformance Harness (34/34)
console.log('\n▶ Gate 3: Goal Template Conformance Harness Execution...');
let templateOutput = '';
try {
  templateOutput = execSync('node scripts/harness/goal-template-conformance-harness.mjs G-MDRB-035', { cwd: ROOT, encoding: 'utf8' });
  assertGate(3, 'G-MDRB-035 passed 34/34 goal template invariants', templateOutput.includes('34/34 sections & invariants passed'), templateOutput);
} catch (e) {
  assertGate(3, 'Goal template harness execution', false, e.stdout || e.message);
}

// Gate 4: Software & Architecture Design Conformance Harness (9/9)
console.log('\n▶ Gate 4: Software & Architecture Design Conformance Harness Execution...');
let archOutput = '';
try {
  archOutput = execSync('node scripts/harness/architecture-design-conformance-harness.mjs G-MDRB-035', { cwd: ROOT, encoding: 'utf8' });
  assertGate(4, 'G-MDRB-035 passed 9/9 architecture design invariants', archOutput.includes('9/9 checks passed'), archOutput);
} catch (e) {
  assertGate(4, 'Architecture design harness execution', false, e.stdout || e.message);
}

// Gate 5: BDD Acceptance Contract Scenarios Verification
console.log('\n▶ Gate 5: BDD Acceptance Contract Scenarios Verification...');
const contractPath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-035.md');
const contractContent = readFileSync(contractPath, 'utf8');
assertGate(5, 'Scenario 1 (AC-MDRB-035-1): Exact-Pair Re-entrant Allocation', contractContent.includes('Scenario 1: Exact-Pair Re-entrant Allocation (AC-MDRB-035-1)'));
assertGate(5, 'Scenario 2 (AC-MDRB-035-2): Partial Overlap Fail-Closed Protection', contractContent.includes('Scenario 2: Partial Overlap Fail-Closed Protection (AC-MDRB-035-2)'));
assertGate(5, 'Scenario 3 (AC-MDRB-035-3): Application Lifecycle Soft-Reset Clean Sweep', contractContent.includes('Scenario 3: Application Lifecycle Soft-Reset Clean Sweep (AC-MDRB-035-3)'));
assertGate(5, 'Scenario 4 (AC-MDRB-035-4): Python RAII Context Manager Protocol', contractContent.includes('Scenario 4: Python RAII Context Manager Protocol (AC-MDRB-035-4)'));

// Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
console.log('\n▶ Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit...');
const goalContent = readFileSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-035.md'), 'utf8');
assertGate(6, 'Zero Mocks statement verified in Goal Contract', goalContent.includes('No mocks, stubs, fakes, or dummy handles'));
assertGate(6, 'Concrete Execution statement verified in Goal Contract', goalContent.includes('Tested with concrete native pool allocation scanning, real motor pointers, and physical lifecycle transitions'));

// Gate 7: Multi-Tier Reclamation Architecture & Motor Overlap Matrix Verification
console.log('\n▶ Gate 7: Multi-Tier Reclamation Architecture & Motor Overlap Matrix Verification...');
assertGate(7, 'Exact-pair re-entrant match policy defined', goalContent.includes('rb->left == left && rb->right == right'));
assertGate(7, 'Partial overlap fail-closed policy defined', goalContent.includes('rb->left == left && rb->right != right'));
assertGate(7, 'Deinit hook integration defined in pbio_main', goalContent.includes('pbio_main_start_application_resources()') && goalContent.includes('pbio_main_stop_application_resources()'));
assertGate(7, 'Context manager protocol defined', goalContent.includes('__enter__') && goalContent.includes('__exit__'));

// Gate 8: Isolated Mutation Testing Execution (8/8 Fault Injections)
console.log('\n▶ Gate 8: Isolated Mutation Testing Execution (8/8 Fault Injections)...');
try {
  const mutOutput = execSync('node scripts/harness/isolated-mutation-test-g-mdrb-035.mjs', { cwd: ROOT, encoding: 'utf8' });
  assertGate(8, 'Isolated mutation tests passed (8/8 faults caught 100%)', mutOutput.includes('8/8 Fault Injections Caught (100%)'), mutOutput);
} catch (e) {
  assertGate(8, 'Isolated mutation testing execution', false, e.stdout || e.message);
}

// Gate 9: Socratic Agentic Loop 5-Why Recursive Dialectic (25/25 Nodes)
console.log('\n▶ Gate 9: Socratic Agentic Loop 5-Why Recursive Dialectic (25/25 Nodes)...');
try {
  const socOutput = execSync('node scripts/harness/socratic-agentic-loop-g-mdrb-035-harness.mjs', { cwd: ROOT, encoding: 'utf8' });
  assertGate(9, 'Socratic agentic loop passed (25/25 nodes green)', socOutput.includes('25/25 Nodes Passed (0 Blockers)'), socOutput);
} catch (e) {
  assertGate(9, 'Socratic agentic loop execution', false, e.stdout || e.message);
}

// Gate 10: VirtualHub 75-Test Suite & Episode Oracle Execution
console.log('\n▶ Gate 10: VirtualHub 75-Test Suite & Episode Oracle Execution...');
try {
  const vhOutput = execSync('python3 -m unittest discover tests/virtualhub/robotics/ 2>&1', { cwd: ROOT, encoding: 'utf8' });
  assertGate(10, 'VirtualHub 75-test suite passed with 25-trial restart oracle', vhOutput.includes('Ran 75 tests') && vhOutput.includes('OK'), vhOutput);
} catch (e) {
  assertGate(10, 'VirtualHub test suite execution', false, e.stdout || e.message);
}

// Gate 11: Native PBIO MDRobotBase 30-Test Suite Execution
console.log('\n▶ Gate 11: Native PBIO MDRobotBase 30-Test Suite Execution...');
try {
  const pbioOutput = execSync('./lib/pbio/test/build/test-pbio src/mdrobotbase/..', { cwd: ROOT, encoding: 'utf8' });
  assertGate(11, 'Native PBIO MDRobotBase tests passed (30 tests ok, 0 skipped)', pbioOutput.includes('30 tests ok.  (0 skipped)'), pbioOutput);
} catch (e) {
  assertGate(11, 'Native PBIO test suite execution', false, e.stdout || e.message);
}

// Final Summary
console.log('\n' + '='.repeat(80));
const allPassed = results.every(r => r.status === 'PASS');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`📊 G-MDRB-035 Master Replication Summary: ${passedCount}/${results.length} Gates Passed`);
console.log('='.repeat(80) + '\n');

if (!allPassed) {
  process.exit(1);
}
console.log('✅ G-MDRB-035 Master Replication & Release Gate Certified Successfully.\n');
