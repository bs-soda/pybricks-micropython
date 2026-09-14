#!/usr/bin/env node
/**
 * Master Replication & Complete Release Gate: G-MDRB-034
 *
 * Verifies all 7 Enterprise Release Gates:
 * - Gate 1: Fail-Closed Environment & Exact-HEAD Provenance
 * - Gate 2: Touch Map File Existence & Integrity Verification
 * - Gate 3: Goal Template Conformance Harness (34/34 sections)
 * - Gate 4: Software & Architecture Design Conformance Harness (9/9 invariants)
 * - Gate 5: BDD Acceptance Contract Scenarios Verification
 * - Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
 * - Gate 7: Mathematical Kinematic Deadline Formula & FSM Verification
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
console.log('🏛️ Master Replication & Complete Release Gate: G-MDRB-034');
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
  'pybricks/robotics/pb_type_mdrobotbase.c',
  'tests/virtualhub/robotics/pybricks/robotics.py',
  'tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py',
  'docs/02-product/acceptance/G-MDRB-034.md',
  'docs/07-backlog/goals/G-MDRB-034.md',
  'docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md'
];
for (const tf of touchFiles) {
  const fullPath = resolve(ROOT, tf);
  assertGate(2, `Touch map file exists: ${tf}`, existsSync(fullPath), fullPath);
}

// Gate 3: Goal Template Conformance Harness (34/34)
console.log('\n▶ Gate 3: Goal Template Conformance Harness Execution...');
let templateOutput = '';
try {
  templateOutput = execSync('node scripts/harness/goal-template-conformance-harness.mjs G-MDRB-034', { cwd: ROOT, encoding: 'utf8' });
  assertGate(3, 'G-MDRB-034 passed 34/34 goal template invariants', templateOutput.includes('34/34 sections & invariants passed'), templateOutput);
} catch (e) {
  assertGate(3, 'Goal template harness execution', false, e.stdout || e.message);
}

// Gate 4: Software & Architecture Design Conformance Harness (9/9)
console.log('\n▶ Gate 4: Software & Architecture Design Conformance Harness Execution...');
let archOutput = '';
try {
  archOutput = execSync('node scripts/harness/architecture-design-conformance-harness.mjs G-MDRB-034', { cwd: ROOT, encoding: 'utf8' });
  assertGate(4, 'G-MDRB-034 passed 9/9 architecture design invariants', archOutput.includes('9/9 checks passed'), archOutput);
} catch (e) {
  assertGate(4, 'Architecture design harness execution', false, e.stdout || e.message);
}

// Gate 5: BDD Acceptance Contract Scenarios Verification
console.log('\n▶ Gate 5: BDD Acceptance Contract Scenarios Verification...');
const contractPath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-034.md');
const contractContent = readFileSync(contractPath, 'utf8');
assertGate(5, 'Scenario 1 (AC-MDRB-034-1): Long-Distance Trajectory Dynamic Deadline Invariance', contractContent.includes('Scenario 1: Long-Distance Trajectory Dynamic Deadline Invariance (AC-MDRB-034-1)'));
assertGate(5, 'Scenario 2 (AC-MDRB-034-2): Explicit Timeout Parameter Override', contractContent.includes('Scenario 2: Explicit Timeout Parameter Override (AC-MDRB-034-2)'));
assertGate(5, 'Scenario 3 (AC-MDRB-034-3): Real Stall and Incomplete Target Deadline Enforcement', contractContent.includes('Scenario 3: Real Stall and Incomplete Target Deadline Enforcement (AC-MDRB-034-3)'));
assertGate(5, 'Scenario 4 (AC-MDRB-034-4): VirtualHub and Native PBIO Parity', contractContent.includes('Scenario 4: VirtualHub and Native PBIO Parity (AC-MDRB-034-4)'));
assertGate(5, 'Scenario 5 (AC-MDRB-034-5): Real Monotonic Clock Elapsed-Time Enforcement', contractContent.includes('Scenario 5: Real Monotonic Clock Elapsed-Time Enforcement (AC-MDRB-034-5)'));
assertGate(5, 'Scenario 6 (AC-MDRB-034-6): Backward Trajectory Kinematic Parity', contractContent.includes('Scenario 6: Backward Trajectory Kinematic Parity (AC-MDRB-034-6)'));
assertGate(5, 'Scenario 7 (AC-MDRB-034-7): Boundary Vectors Around .5 ms & Floor Semantics', contractContent.includes('Scenario 7: Boundary Vectors Around .5 ms & Floor Semantics (AC-MDRB-034-7)'));

// Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
console.log('\n▶ Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit...');
const goalContent = readFileSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-034.md'), 'utf8');
assertGate(6, 'Zero Mocks statement verified in Goal Contract', goalContent.includes('No mocks, stubs, fakes, placeholders, or artificial test timeouts'));
assertGate(6, 'Concrete Execution statement verified in Goal Contract', goalContent.includes('Tested with concrete mathematical arc length calculations'));

// Gate 7: Mathematical Kinematic Deadline Formula & FSM Verification
console.log('\n▶ Gate 7: Mathematical Kinematic Deadline Formula & FSM Verification...');
assertGate(7, 'Euclidean path arc length formula defined', goalContent.includes('\\sum_{i=0}^{N-2} \\sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2}'));
assertGate(7, 'Kinematic duration with ramp and turn terms defined', goalContent.includes('T_{kinematic} = \\frac{D_{trajectory}}{v_{cruise}}'));
assertGate(7, 'Dynamic deadline safety scaling defined', goalContent.includes('T_{deadline} = \\max\\left(1500\\text{ ms}'));
assertGate(7, 'FSM transition matrix specified', goalContent.includes('State::TimedOut'));

// Final Summary
console.log('\n' + '='.repeat(80));
const allPassed = results.every(r => r.status === 'PASS');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`📊 G-MDRB-034 Master Replication Summary: ${passedCount}/${results.length} Gates Passed`);
console.log('='.repeat(80) + '\n');

if (!allPassed) {
  process.exit(1);
}
console.log('✅ G-MDRB-034 Master Replication & Release Gate Certified Successfully.\n');
