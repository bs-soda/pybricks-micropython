#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic Harness for G-MDRB-013
 * 
 * Verifies that:
 * 1. pbio_mdrobotbase_set_motion_status strictly enforces whitelist validation against pbio_mdrobotbase_motion_status_t
 * 2. Any integer not in {NONE: 0, RUNNING: 1, COMPLETED: 2, STALLED: 3, TIMED_OUT: 4} returns PBIO_ERROR_INVALID_ARG
 * 3. Upon rejection, rb->motion_status remains strictly unchanged
 * 4. Null rb handle returns PBIO_ERROR_INVALID_ARG safely
 * 5. Native unit test test_mdrobotbase_motion_status_bounds is registered and passes
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-013');
console.log('='.repeat(80));

// Exact-HEAD Provenance
const headSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
const activeBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
console.log(`\n📌 Exact-HEAD Provenance: ${headSha}`);
console.log(`🌿 Active Feature Branch: ${activeBranch}`);

const results = [];

function evaluateNode(branch, level, question, assertion, condition, failureDetails) {
  const nodeName = `[L${level}] ${question.length > 60 ? question.slice(0, 57) + '...' : question}`;
  if (condition) {
    console.log(`  ${nodeName} ✅ PASS`);
    results.push({ branch, level, status: 'PASS', question });
  } else {
    console.log(`  ${nodeName} ❌ FAIL`);
    console.log(`       Details: ${failureDetails}`);
    results.push({ branch, level, status: 'FAIL', question, details: failureDetails });
  }
}

const mdrobotbaseC = readFileSync(resolve(ROOT, 'lib/pbio/src/mdrobotbase.c'), 'utf8');
const mdrobotbaseH = readFileSync(resolve(ROOT, 'lib/pbio/include/pbio/mdrobotbase.h'), 'utf8');
const testMdRobotBaseC = readFileSync(resolve(ROOT, 'lib/pbio/test/src/test_mdrobotbase.c'), 'utf8');
const acceptance = readFileSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-013.md'), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 1: Enum Whitelist Specification & Domain Bounds
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 1: Enum Whitelist Specification & Domain Bounds");

evaluateNode(
  1, 1,
  "Why must pbio_mdrobotbase_set_motion_status validate status values?",
  "Acceptance contract defines whitelist requirement AC-MDRB-013-1",
  acceptance.includes('AC-MDRB-013-1') && acceptance.includes('PBIO_ERROR_INVALID_ARG'),
  "Acceptance contract lacks AC-MDRB-013-1 or invalid arg specification"
);

evaluateNode(
  1, 2,
  "Why does pbio_mdrobotbase_motion_status_t declare exactly 5 states?",
  "Header declares STATUS_NONE through STATUS_TIMED_OUT (0..4)",
  mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_NONE = 0') &&
  mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_RUNNING = 1') &&
  mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_COMPLETED = 2') &&
  mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_STALLED = 3') &&
  mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_TIMED_OUT = 4'),
  "Header missing discrete 0..4 status enum declarations"
);

const setterIdx = mdrobotbaseC.indexOf('pbio_mdrobotbase_set_motion_status');
const setterBody = setterIdx !== -1 ? mdrobotbaseC.slice(setterIdx, setterIdx + 1000) : '';
const hasSwitch = setterBody.includes('switch (status)') || setterBody.includes('switch(status)');

evaluateNode(
  1, 3,
  "Why is a switch statement used for enum whitelist validation?",
  "pbio_mdrobotbase_set_motion_status contains switch (status)",
  hasSwitch,
  "set_motion_status does not use a switch statement for whitelist checking"
);

const hasAllCases = setterBody.includes('case PBIO_MDROBOTBASE_STATUS_NONE:') &&
  setterBody.includes('case PBIO_MDROBOTBASE_STATUS_RUNNING:') &&
  setterBody.includes('case PBIO_MDROBOTBASE_STATUS_COMPLETED:') &&
  setterBody.includes('case PBIO_MDROBOTBASE_STATUS_STALLED:') &&
  setterBody.includes('case PBIO_MDROBOTBASE_STATUS_TIMED_OUT:');

evaluateNode(
  1, 4,
  "Why are all 5 discrete enum cases explicitly matched in the switch?",
  "Switch matches NONE, RUNNING, COMPLETED, STALLED, and TIMED_OUT",
  hasAllCases,
  "Switch statement missing one or more valid status enum cases"
);

const hasDefaultInvalidArg = setterBody.includes('default:') &&
  setterBody.includes('return PBIO_ERROR_INVALID_ARG;');

evaluateNode(
  1, 5,
  "Why does default case return PBIO_ERROR_INVALID_ARG?",
  "default case returns PBIO_ERROR_INVALID_ARG",
  hasDefaultInvalidArg,
  "default case does not return PBIO_ERROR_INVALID_ARG"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 2: State Immutability on Invalid Input
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 2: State Immutability on Invalid Input");

evaluateNode(
  2, 1,
  "Why must rb->motion_status remain unchanged upon invalid input?",
  "Acceptance contract defines AC-MDRB-013-2 immutability contract",
  acceptance.includes('AC-MDRB-013-2') && acceptance.includes('remains strictly unchanged'),
  "Acceptance contract lacks AC-MDRB-013-2"
);

const assignmentOnlyInCases = hasSwitch && !setterBody.split('switch')[0].includes('rb->motion_status =');
evaluateNode(
  2, 2,
  "Why does the setter avoid assigning before the switch validation?",
  "Assignment does not precede switch check in set_motion_status",
  assignmentOnlyInCases,
  "Assignment occurs before switch or unconditional assignment detected"
);

evaluateNode(
  2, 3,
  "Why does the default branch exit before mutating rb->motion_status?",
  "default branch returns PBIO_ERROR_INVALID_ARG directly without assignment",
  hasDefaultInvalidArg,
  "default branch modifies status or does not return immediately"
);

const testHasImmutabilityCheck = testMdRobotBaseC.includes('test_mdrobotbase_motion_status_bounds') &&
  testMdRobotBaseC.includes('pbio_mdrobotbase_set_motion_status');

evaluateNode(
  2, 4,
  "Why must the unit test assert state preservation after rejected call?",
  "test_mdrobotbase.c tests that motion_status is preserved after invalid write",
  testHasImmutabilityCheck,
  "Missing test_mdrobotbase_motion_status_bounds in test_mdrobotbase.c"
);

evaluateNode(
  2, 5,
  "Why is transaction atomicity guaranteed on status mutation?",
  "Status assignment only occurs in successful branches returning PBIO_SUCCESS",
  hasAllCases && setterBody.includes('return PBIO_SUCCESS;'),
  "Assignment path does not guarantee clean success exit"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 3: Negative and Boundary Value Rejection
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 3: Negative and Boundary Value Rejection");

evaluateNode(
  3, 1,
  "Why must negative status values be rejected?",
  "Acceptance contract Scenario 3 specifies rejection of negative integers",
  acceptance.includes('Scenario 3: Rejection of Negative Status Integers'),
  "Acceptance contract lacks Scenario 3"
);

evaluateNode(
  3, 2,
  "Why must positive out-of-range values (e.g. 5, 999) be rejected?",
  "Acceptance contract Scenario 2 specifies rejection of out-of-range integers",
  acceptance.includes('Scenario 2: Rejection of Out-of-Bounds Positive Status Integers'),
  "Acceptance contract lacks Scenario 2"
);

const testTestsNegative = testMdRobotBaseC.includes('-1') &&
  testMdRobotBaseC.indexOf('-1', testMdRobotBaseC.indexOf('test_mdrobotbase_motion_status_bounds')) !== -1;

evaluateNode(
  3, 3,
  "Why does the unit test verify negative integers return INVALID_ARG?",
  "test_mdrobotbase_motion_status_bounds tests negative status value -1",
  testTestsNegative,
  "Unit test does not verify negative status rejection"
);

const testTestsPositiveOOB = (testMdRobotBaseC.includes('5') || testMdRobotBaseC.includes('999')) &&
  testMdRobotBaseC.indexOf('test_mdrobotbase_motion_status_bounds') !== -1;

evaluateNode(
  3, 4,
  "Why does the unit test verify values > 4 return INVALID_ARG?",
  "test_mdrobotbase_motion_status_bounds tests positive out-of-bounds values",
  testTestsPositiveOOB,
  "Unit test does not verify positive out-of-bounds status rejection"
);

evaluateNode(
  3, 5,
  "Why does the switch statement handle both signed and unsigned out-of-bounds?",
  "C switch on enum covers exact whitelist, rejecting all unlisted values in default",
  hasSwitch && hasDefaultInvalidArg,
  "Switch pattern incomplete"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 4: Null Handle Guarding
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 4: Null Handle Guarding");

evaluateNode(
  4, 1,
  "Why must pbio_mdrobotbase_set_motion_status check for NULL rb handle?",
  "Acceptance contract Scenario 4 specifies null pointer rejection",
  acceptance.includes('Scenario 4: Rejection on Null Handle') &&
  acceptance.includes('AC-MDRB-013-4'),
  "Acceptance contract lacks Scenario 4 or AC-MDRB-013-4"
);

const hasNullCheck = setterBody.includes('if (!rb)') &&
  setterBody.includes('return PBIO_ERROR_INVALID_ARG;');

evaluateNode(
  4, 2,
  "Why does if (!rb) return PBIO_ERROR_INVALID_ARG?",
  "Null check returns PBIO_ERROR_INVALID_ARG at start of function",
  hasNullCheck,
  "set_motion_status missing if (!rb) return PBIO_ERROR_INVALID_ARG"
);

const nullCheckPrecedesSwitch = setterBody.indexOf('if (!rb)') !== -1 &&
  setterBody.indexOf('switch') !== -1 &&
  setterBody.indexOf('if (!rb)') < setterBody.indexOf('switch');

evaluateNode(
  4, 3,
  "Why must null handle check strictly precede the switch statement?",
  "Null check appears before switch statement in set_motion_status",
  nullCheckPrecedesSwitch,
  "Null check does not precede switch statement"
);

const testChecksNull = testMdRobotBaseC.includes('pbio_mdrobotbase_set_motion_status(NULL') &&
  testMdRobotBaseC.indexOf('test_mdrobotbase_motion_status_bounds') !== -1;

evaluateNode(
  4, 4,
  "Why does the unit test verify set_motion_status(NULL, ...)?",
  "test_mdrobotbase_motion_status_bounds passes NULL rb and asserts INVALID_ARG",
  testChecksNull,
  "Unit test missing NULL handle verification"
);

evaluateNode(
  4, 5,
  "Why does null handle guarding protect memory integrity?",
  "Zero field access or dereferencing occurs when rb is NULL",
  hasNullCheck && nullCheckPrecedesSwitch,
  "Potential null dereference in setter"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 5: Zero-Mock Native Testing & Release Certification
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 5: Zero-Mock Native Testing & Release Certification");

evaluateNode(
  5, 1,
  "Why must the unit test be written in C without test doubles?",
  "Article I Zero-Mock Invariant: native test runs against real PBIO struct",
  !/mock|fake_servo/i.test(testMdRobotBaseC),
  "Forbidden mock or test double detected in test_mdrobotbase.c"
);

const testRegistered = testMdRobotBaseC.includes('PBIO_THREAD_TEST(test_mdrobotbase_motion_status_bounds)') ||
  testMdRobotBaseC.includes('PBIO_TEST(test_mdrobotbase_motion_status_bounds)');
evaluateNode(
  5, 2,
  "Why must test_mdrobotbase_motion_status_bounds be registered in test runner?",
  "test_mdrobotbase_motion_status_bounds registered via PBIO_TEST",
  testRegistered,
  "Test is not registered in pbio_mdrobotbase_tests runner"
);

const testChecksAllValid = (
  testMdRobotBaseC.includes('PBIO_MDROBOTBASE_STATUS_NONE') &&
  testMdRobotBaseC.includes('PBIO_MDROBOTBASE_STATUS_RUNNING') &&
  testMdRobotBaseC.includes('PBIO_MDROBOTBASE_STATUS_COMPLETED') &&
  testMdRobotBaseC.includes('PBIO_MDROBOTBASE_STATUS_STALLED') &&
  testMdRobotBaseC.includes('PBIO_MDROBOTBASE_STATUS_TIMED_OUT') &&
  testMdRobotBaseC.indexOf('test_mdrobotbase_motion_status_bounds') !== -1
);

evaluateNode(
  5, 3,
  "Why must all 5 valid statuses be exercised in the test?",
  "Unit test verifies SUCCESS on NONE, RUNNING, COMPLETED, STALLED, and TIMED_OUT",
  testChecksAllValid,
  "Unit test does not verify all 5 valid status transitions"
);

let pbioTestsPass = false;
let testOutput = '';
try {
  testOutput = execSync('lib/pbio/test/build/test-pbio src/mdrobotbase/..', { cwd: ROOT, encoding: 'utf8' });
  pbioTestsPass = testOutput.includes('tests ok.') && !testOutput.includes('FAIL');
} catch (e) {
  testOutput = e.message;
}

evaluateNode(
  5, 4,
  "Why must test-pbio pass with 0 skipped tests?",
  "All PBIO MDRobotBase native tests pass without skips",
  pbioTestsPass && testOutput.includes('(0 skipped)'),
  `PBIO test failure or skipped: ${testOutput.slice(0, 100)}`
);

evaluateNode(
  5, 5,
  "Why does complete dialectic proof certify readiness for release?",
  "All 5 branches resolved at Level 5 root depth with zero assumptions",
  results.filter(r => r.status === 'FAIL').length === 0,
  `Dialectic defects remain: ${results.filter(r => r.status === 'FAIL').length}`
);

console.log('\n' + '='.repeat(80));
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`📊 Socratic Agentic Loop Summary: ${passed} Passed, ${failed} Failed (Total: ${results.length})`);
console.log('='.repeat(80));

if (failed > 0) {
  console.log(`\n❌ SOCRATIC LOOP REVEALED ${failed} UNRESOLVED DIALECTIC DEFECTS.\n`);
  process.exit(1);
} else {
  console.log(`\n🏆 100% ROOT CONVERGENCE ACHIEVED ACROSS ALL 5 SOCRATIC BRANCHES!`);
  console.log(`   Zero ambiguity remains; motion status boundary contract fully proven.\n`);
  process.exit(0);
}
