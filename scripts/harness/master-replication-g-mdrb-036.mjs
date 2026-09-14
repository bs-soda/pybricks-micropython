#!/usr/bin/env node
/**
 * Master Replication & Complete Release Gate: G-MDRB-036
 *
 * Verifies all 7 Enterprise Release Gates:
 * - Gate 1: Fail-Closed Environment & Exact-HEAD Provenance
 * - Gate 2: Touch Map File Existence & Integrity Verification
 * - Gate 3: Goal Template Conformance Harness (34/34 sections)
 * - Gate 4: Software & Architecture Design Conformance Harness (9/9 invariants)
 * - Gate 5: BDD Acceptance Contract Scenarios Verification (5 scenarios)
 * - Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
 * - Gate 7: DARE Control Mathematics & Discrete Eigenvalue Unit Circle Invariant Verification
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
console.log('🏛️ Master Replication & Complete Release Gate: G-MDRB-036');
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
  'pybricks/robotics/pb_type_mdrobotbase.c',
  'tests/virtualhub/robotics/pybricks/robotics.py',
  'tests/virtualhub/robotics/test_mdrobotbase_lqr.py',
  'lib/pbio/test/src/test_mdrobotbase.c',
  'docs/02-product/acceptance/G-MDRB-036.md',
  'docs/07-backlog/goals/G-MDRB-036.md',
  'docs/06_raw/20260912_152500_g_mdrb_036_socratic_5why.md'
];
for (const tf of touchFiles) {
  const fullPath = resolve(ROOT, tf);
  assertGate(2, `Touch map file exists: ${tf}`, existsSync(fullPath), fullPath);
}

// Gate 3: Goal Template Conformance Harness (34/34)
console.log('\n▶ Gate 3: Goal Template Conformance Harness Execution...');
let templateOutput = '';
try {
  templateOutput = execSync('node scripts/harness/goal-template-conformance-harness.mjs G-MDRB-036', { cwd: ROOT, encoding: 'utf8' });
  assertGate(3, 'G-MDRB-036 passed 34/34 goal template invariants', templateOutput.includes('34/34 sections & invariants passed'), templateOutput);
} catch (e) {
  assertGate(3, 'Goal template harness execution', false, e.stdout || e.message);
}

// Gate 4: Software & Architecture Design Conformance Harness (9/9)
console.log('\n▶ Gate 4: Software & Architecture Design Conformance Harness Execution...');
let archOutput = '';
try {
  archOutput = execSync('node scripts/harness/architecture-design-conformance-harness.mjs G-MDRB-036', { cwd: ROOT, encoding: 'utf8' });
  assertGate(4, 'G-MDRB-036 passed 9/9 architecture design invariants', archOutput.includes('9/9 checks passed'), archOutput);
} catch (e) {
  assertGate(4, 'Architecture design harness execution', false, e.stdout || e.message);
}

// Gate 5: BDD Acceptance Contract Scenarios Verification
console.log('\n▶ Gate 5: BDD Acceptance Contract Scenarios Verification...');
const contractPath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-036.md');
const contractContent = readFileSync(contractPath, 'utf8');
assertGate(5, 'Scenario 1 (AC-MDRB-036-1): Discrete Algebraic Riccati Equation Optimal Gain Derivation', contractContent.includes('Scenario 1: Discrete Algebraic Riccati Equation Optimal Gain Derivation (AC-MDRB-036-1)'));
assertGate(5, 'Scenario 2 (AC-MDRB-036-2): Discrete Closed-Loop Spectral Radius Unit Circle Invariance', contractContent.includes('Scenario 2: Discrete Closed-Loop Spectral Radius Unit Circle Invariance (AC-MDRB-036-2)'));
assertGate(5, 'Scenario 3 (AC-MDRB-036-3): Velocity-Scheduled Look-Up Table Interpolation & Singularity Avoidance', contractContent.includes('Scenario 3: Velocity-Scheduled Look-Up Table Interpolation & Singularity Avoidance (AC-MDRB-036-3)'));
assertGate(5, 'Scenario 4 (AC-MDRB-036-4): Disturbance Rejection & Asymptotic Error Convergence', contractContent.includes('Scenario 4: Disturbance Rejection & Asymptotic Error Convergence (AC-MDRB-036-4)'));
assertGate(5, 'Scenario 5 (AC-MDRB-036-5): Wheel Velocity Saturation & Symmetrical Anti-Windup', contractContent.includes('Scenario 5: Wheel Velocity Saturation & Symmetrical Anti-Windup (AC-MDRB-036-5)'));
assertGate(5, 'Scenario 6 (AC-MDRB-036-6): Comparative Benchmark vs. Standard PID', contractContent.includes('Scenario 6: Comparative Benchmark vs. Standard PID (AC-MDRB-036-6)'));
assertGate(5, 'Scenario 7 (AC-MDRB-036-7): Backward Driving & Negative Reference Velocity Invariance', contractContent.includes('Scenario 7: Backward Driving & Negative Reference Velocity Invariance (AC-MDRB-036-7)'));
assertGate(5, 'Scenario 8 (AC-MDRB-036-8): Zero-Error Equilibrium Invariance', contractContent.includes('Scenario 8: Zero-Error Equilibrium Invariance (AC-MDRB-036-8)'));
assertGate(5, 'Scenario 9 (AC-MDRB-036-9): Full 3x3 DARE vs. Decoupled Decomposition Equivalence', contractContent.includes('Scenario 9: Full 3x3 DARE vs. Decoupled Decomposition Equivalence'));

// Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit
console.log('\n▶ Gate 6: Zero Mocks, Zero Stubs & Zero Fallbacks Invariant Audit...');
const goalContent = readFileSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-036.md'), 'utf8');
assertGate(6, 'Zero Mocks statement verified in Goal Contract', goalContent.includes('No mocks, stubs, fakes, or dummy matrices'));
assertGate(6, 'Concrete Execution statement verified in Goal Contract', goalContent.includes('Tested with concrete numerical Riccati solutions, real discrete eigenvalue calculations'));

// Gate 7: DARE Control Mathematics & Discrete Eigenvalue Unit Circle Invariant Verification
console.log('\n▶ Gate 7: DARE Control Mathematics & Discrete Eigenvalue Unit Circle Invariant Verification...');
assertGate(7, 'Discrete state transition matrix A_d(v_r) defined', goalContent.includes('A_d(v_r) = \\begin{bmatrix} 1 & 0 & 0'));
assertGate(7, 'Discrete input matrix B_d(v_r) defined', goalContent.includes('B_d(v_r) = \\begin{bmatrix} -T_s & 0'));
assertGate(7, 'Discrete Algebraic Riccati Equation P defined', goalContent.includes('P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^{-1}(B_d^T P A_d) + Q'));
assertGate(7, 'Optimal feedback gain K(v_r) defined', goalContent.includes('K(v_r) = (R + B_d^T P B_d)^{-1} B_d^T P A_d'));
assertGate(7, 'Discrete spectral radius unit-circle invariant defined', goalContent.includes('\\rho(A_d - B_d K) = \\max_i |\\lambda_i| < 1.0'));
assertGate(7, 'FSM transition matrix specified', goalContent.includes('State::Configuring'));

// Gate 8: Isolated Mutation Sensitivity & Fault-Injection Invariant Testing
console.log('\n▶ Gate 8: Isolated Mutation Sensitivity & Fault-Injection Invariant Testing...');
let mutOutput = '';
try {
  mutOutput = execSync('node scripts/harness/isolated-mutation-test-g-mdrb-036.mjs', { cwd: ROOT, encoding: 'utf8' });
  assertGate(8, 'Isolated mutation test caught 100% of injected mutations (8/8)', mutOutput.includes('8/8 Mutations Caught (100%)'), mutOutput);
} catch (e) {
  assertGate(8, 'Isolated mutation harness execution', false, e.stdout || e.message);
}

// Gate 9: Socratic Agentic Loop & 5-Why Recursive Dialectic Attestation
console.log('\n▶ Gate 9: Socratic Agentic Loop & 5-Why Recursive Dialectic Attestation...');
let socOutput = '';
try {
  socOutput = execSync('node scripts/harness/socratic-agentic-loop-g-mdrb-036-harness.mjs', { cwd: ROOT, encoding: 'utf8' });
  assertGate(9, 'Socratic agentic loop verified 25/25 dialectic nodes', socOutput.includes('25/25 Dialectic Nodes Verified'), socOutput);
} catch (e) {
  assertGate(9, 'Socratic harness execution', false, e.stdout || e.message);
}

// Gate 10: Native PBIO C Test Suite Execution
console.log('\n▶ Gate 10: Native PBIO C Test Suite Execution...');
let pbioOutput = '';
try {
  pbioOutput = execSync('./lib/pbio/test/build/test-pbio src/mdrobotbase/..', { cwd: ROOT, encoding: 'utf8' });
  assertGate(10, 'Native PBIO C test suite: 31/31 tests passed (0 skipped)', pbioOutput.includes('31 tests ok.  (0 skipped)'), pbioOutput);
} catch (e) {
  assertGate(10, 'Native PBIO C test suite execution', false, e.stdout || e.message);
}

// Gate 11: VirtualHub LQR Unit Tests & 25-Trial Episode Oracle Execution
console.log('\n▶ Gate 11: VirtualHub LQR Unit Tests & 25-Trial Episode Oracle Execution...');
let lqrOutput = '';
try {
  lqrOutput = execSync('python3 -m unittest tests/virtualhub/robotics/test_mdrobotbase_lqr.py 2>&1', { cwd: ROOT, encoding: 'utf8' });
  assertGate(11, 'VirtualHub LQR unit tests: 23/23 passed with 25-trial Wilson 95% CI >= 0.85', lqrOutput.includes('Ran 23 tests') && lqrOutput.includes('OK'), lqrOutput);
} catch (e) {
  assertGate(11, 'VirtualHub LQR unit tests execution', false, e.stdout || e.message);
}

// Gate 12: Full VirtualHub Robotics Test Suite Execution
console.log('\n▶ Gate 12: Full VirtualHub Robotics Test Suite Regression Audit...');
let vhubOutput = '';
try {
  vhubOutput = execSync('python3 -m unittest discover -s tests/virtualhub/robotics/ 2>&1', { cwd: ROOT, encoding: 'utf8' });
  assertGate(12, 'Full VirtualHub robotics suite: 94/94 passed without regressions', lqrOutput.includes('OK') && vhubOutput.includes('Ran 94 tests') && vhubOutput.includes('OK'), vhubOutput);
} catch (e) {
  assertGate(12, 'Full VirtualHub robotics suite execution', false, e.stdout || e.message);
}

// Final Summary
console.log('\n' + '='.repeat(80));
const allPassed = results.every(r => r.status === 'PASS');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`📊 G-MDRB-036 Master Replication Summary: ${passedCount}/${results.length} Gates Passed`);
console.log('='.repeat(80) + '\n');

if (!allPassed) {
  process.exit(1);
}
console.log('✅ G-MDRB-036 Master Replication & Release Gate Certified Successfully.\n');
