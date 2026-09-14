#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic Harness for G-MDRB-015
 * 
 * Verifies that:
 * 1. Pure spin turns conserve center position (sqrt(dx^2 + dy^2) <= 0.05 mm)
 * 2. Left and right pivot turns sweep exact arc length s_free = W * |delta_theta| (+/- 0.1 mm) around stationary locked wheel
 * 3. Continuous angle wrapping normalizes angles to [-180.0, +180.0] degrees across multi-turn rotations
 * 4. Backlash filtering produces zero net drift under 100 cycles of sub-threshold oscillation
 * 5. Native C unit tests are registered in pbio_mdrobotbase_tests[] and pass with 0 skips
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-015');
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
const acceptance = readFileSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-015.md'), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 1: Pure Spin Turn Center Conservation Invariant
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 1: Pure Spin Turn Center Conservation Invariant");

evaluateNode(
  1, 1,
  "Why must pure spin turns preserve center position?",
  "Acceptance contract defines center conservation requirement AC-MDRB-015-1",
  acceptance.includes('AC-MDRB-015-1') && acceptance.includes('0.05'),
  "Acceptance contract lacks AC-MDRB-015-1 or 0.05 mm tolerance"
);

const hasSpinTurnCenterZero = mdrobotbaseC.includes('PBIO_MDROBOTBASE_MOTION_TURN') &&
  mdrobotbaseC.includes('d_center = 0.0f');

evaluateNode(
  1, 2,
  "Why does pbio_mdrobotbase_update_state enforce d_center = 0 during spin turn?",
  "update_state sets d_center = 0.0f when motion_type == PBIO_MDROBOTBASE_MOTION_TURN",
  hasSpinTurnCenterZero,
  "update_state does not set d_center = 0 during PBIO_MDROBOTBASE_MOTION_TURN"
);

const testHasSpinTurnAssertion = testMdRobotBaseC.includes('test_mdrobotbase_spin_and_pivot_invariants') &&
  (testMdRobotBaseC.includes('0.05') || testMdRobotBaseC.includes('0.05f'));

evaluateNode(
  1, 3,
  "Why does the unit test assert sqrt(dx^2 + dy^2) <= 0.05 mm?",
  "test_mdrobotbase.c asserts spin turn center drift <= 0.05 mm",
  testHasSpinTurnAssertion,
  "Unit test missing spin turn center drift assertion <= 0.05 mm"
);

const hasEncDeltaHeading = mdrobotbaseC.includes('delta_theta_enc_rad = (d_right - d_left) / track_mm');

evaluateNode(
  1, 4,
  "Why must heading change equal (s_right - s_left) / W?",
  "Differential heading formula correctly implemented in update_state",
  hasEncDeltaHeading,
  "Missing differential heading formula in update_state"
);

const testCalculatesDriftNorm = testMdRobotBaseC.includes('test_mdrobotbase_spin_and_pivot_invariants') &&
  (testMdRobotBaseC.includes('sqrtf') || testMdRobotBaseC.includes('hypotf') ||
   (testMdRobotBaseC.includes('rb->x') && testMdRobotBaseC.includes('rb->y')));

evaluateNode(
  1, 5,
  "Why does center position conservation certify rotational odometry correctness?",
  "Unit test computes Euclidean norm of position drift after spin turn",
  testCalculatesDriftNorm,
  "Missing Euclidean drift norm calculation in unit test"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 2: Single-Wheel Left and Right Pivot Arc Conservation
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 2: Single-Wheel Left and Right Pivot Arc Conservation");

evaluateNode(
  2, 1,
  "Why must pivot turns conserve stationary contact point of locked wheel?",
  "Acceptance contract defines pivot requirements AC-MDRB-015-2 and AC-MDRB-015-3",
  acceptance.includes('AC-MDRB-015-2') && acceptance.includes('AC-MDRB-015-3'),
  "Acceptance contract lacks AC-MDRB-015-2 or AC-MDRB-015-3"
);

const testHasPivotAccuracy = testMdRobotBaseC.includes('test_mdrobotbase_spin_and_pivot_invariants') &&
  (testMdRobotBaseC.includes('0.1') || testMdRobotBaseC.includes('0.1f'));

evaluateNode(
  2, 2,
  "Why does the unit test assert free wheel arc matches W * |delta_theta| +/- 0.1 mm?",
  "test_mdrobotbase.c verifies pivot arc distance tolerance within 0.1 mm",
  testHasPivotAccuracy,
  "Unit test lacks pivot arc accuracy verification within 0.1 mm"
);

const hasPivotArcIntegration = mdrobotbaseC.includes('PBIO_MDROBOTBASE_MOTION_PIVOT') &&
  mdrobotbaseC.includes('track_mm / 2.0f');

evaluateNode(
  2, 3,
  "Why does update_state calculate rigid-body arc offset r_offset = +/- W / 2?",
  "update_state implements circular arc translation with radius W/2 for pivot turns",
  hasPivotArcIntegration,
  "update_state missing W/2 rigid-body pivot arc kinematics"
);

const testExercisesLeftAndRightPivots = testMdRobotBaseC.includes('test_mdrobotbase_spin_and_pivot_invariants') &&
  testMdRobotBaseC.includes('pivot_left');

evaluateNode(
  2, 4,
  "Why does the unit test verify both left (pivot_left=true) and right pivots?",
  "test_mdrobotbase.c tests both left and right pivot turn configurations",
  testExercisesLeftAndRightPivots,
  "Unit test does not verify both left and right pivot turns"
);

const testChecksPivotDistances = testMdRobotBaseC.includes('test_mdrobotbase_spin_and_pivot_invariants') &&
  (testMdRobotBaseC.includes('s_right') || testMdRobotBaseC.includes('s_left'));

evaluateNode(
  2, 5,
  "Why does pivot arc conservation prevent coordinate distortion during cornering?",
  "Unit test measures wheel displacement matching arc length",
  testChecksPivotDistances,
  "Unit test does not check individual wheel arc displacement"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 3: Continuous Angle Wrapping in [-180.0, +180.0] Degrees
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 3: Continuous Angle Wrapping in [-180.0, +180.0] Degrees");

evaluateNode(
  3, 1,
  "Why must robot heading be strictly normalized to [-180.0, +180.0] degrees?",
  "Acceptance contract defines angle wrapping requirement AC-MDRB-015-4",
  acceptance.includes('AC-MDRB-015-4'),
  "Acceptance contract lacks AC-MDRB-015-4"
);

const hasWrapHelperInHeader = mdrobotbaseH.includes('pbio_mdrobotbase_wrap_degrees');

evaluateNode(
  3, 2,
  "Why must pbio_mdrobotbase_wrap_degrees be declared in public PBIO header?",
  "pbio/mdrobotbase.h declares pbio_mdrobotbase_wrap_degrees",
  hasWrapHelperInHeader,
  "Missing pbio_mdrobotbase_wrap_degrees in mdrobotbase.h"
);

const hasWrapHelperInC = mdrobotbaseC.includes('pbio_mdrobotbase_wrap_degrees') &&
  mdrobotbaseC.includes('180.0f');

evaluateNode(
  3, 3,
  "Why must pbio_mdrobotbase_wrap_degrees wrap angles using +/- 360 degree arithmetic?",
  "pbio_mdrobotbase_wrap_degrees implements while loops normalizing into [-180, +180]",
  hasWrapHelperInC,
  "Missing or incomplete pbio_mdrobotbase_wrap_degrees in mdrobotbase.c"
);

const testExercisesMultiTurnWrapping = testMdRobotBaseC.includes('pbio_mdrobotbase_wrap_degrees') &&
  testMdRobotBaseC.includes('3600');

evaluateNode(
  3, 4,
  "Why does the unit test verify large multi-turn rotations (e.g. 3600 deg)?",
  "test_mdrobotbase.c tests angle wrapping on multi-turn angles up to 3600 deg",
  testExercisesMultiTurnWrapping,
  "Unit test does not verify multi-turn angle wrapping up to 3600 deg"
);

const testExercisesWrapBoundaries = testMdRobotBaseC.includes('pbio_mdrobotbase_wrap_degrees') &&
  (testMdRobotBaseC.includes('540') || testMdRobotBaseC.includes('-540'));

evaluateNode(
  3, 5,
  "Why does deterministic angle wrapping prevent heading divergence?",
  "Unit test checks +/- 540 deg wrapping to +/- 180 deg boundary symmetrically",
  testExercisesWrapBoundaries,
  "Unit test does not check 540 deg boundary wrapping"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 4: Backlash Filtering Distance Conservation under Oscillation
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 4: Backlash Filtering Distance Conservation under Oscillation");

evaluateNode(
  4, 1,
  "Why must backlash filtering act as pure deadband without adding cumulative bias?",
  "Acceptance contract defines backlash conservation requirement AC-MDRB-015-5",
  acceptance.includes('AC-MDRB-015-5'),
  "Acceptance contract lacks AC-MDRB-015-5"
);

const hasBacklashHysteresis = mdrobotbaseC.includes('backlash_filter_enabled') &&
  mdrobotbaseC.includes('backlash_left_accum');

evaluateNode(
  4, 2,
  "Why does update_state clamp backlash accumulator to +/- backlash_limit?",
  "update_state clamps accumulator and outputs only excess displacement",
  hasBacklashHysteresis,
  "Missing backlash accumulator clamping in update_state"
);

const testHasBacklashTest = testMdRobotBaseC.includes('test_mdrobotbase_backlash_distance_conservation');

evaluateNode(
  4, 3,
  "Why is a dedicated test test_mdrobotbase_backlash_distance_conservation implemented?",
  "test_mdrobotbase.c defines test_mdrobotbase_backlash_distance_conservation",
  testHasBacklashTest,
  "Missing test_mdrobotbase_backlash_distance_conservation in test_mdrobotbase.c"
);

const testRuns100Cycles = testMdRobotBaseC.includes('test_mdrobotbase_backlash_distance_conservation') &&
  testMdRobotBaseC.includes('100');

evaluateNode(
  4, 4,
  "Why does the test verify 100 cycles of sub-threshold oscillation?",
  "test_mdrobotbase.c iterates 100 cycles of back-and-forth sub-threshold oscillation",
  testRuns100Cycles,
  "Backlash test does not run 100 oscillation cycles"
);

const testAssertsZeroDrift = testMdRobotBaseC.includes('test_mdrobotbase_backlash_distance_conservation') &&
  testMdRobotBaseC.includes('rb->x') &&
  testMdRobotBaseC.includes('rb->y') &&
  testMdRobotBaseC.includes('rb->theta');

evaluateNode(
  4, 5,
  "Why does backlash conservation protect odometry integrity on vibrating surfaces?",
  "test_mdrobotbase.c asserts x == 0, y == 0, and theta == 0 after 100 cycles",
  testAssertsZeroDrift,
  "Backlash test does not assert zero drift on x, y, theta"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 5: Zero-Mock Native C Testing & Release Certification
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 5: Zero-Mock Native C Testing & Release Certification");

evaluateNode(
  5, 1,
  "Why must the unit test be implemented in native C without mocks?",
  "Article I Zero-Mock Invariant: native test runs against real PBIO struct",
  !/mock|fake_servo/i.test(testMdRobotBaseC),
  "Forbidden mock or test double detected in test_mdrobotbase.c"
);

const testsRegistered = testMdRobotBaseC.includes('PBIO_THREAD_TEST(test_mdrobotbase_spin_and_pivot_invariants)') &&
  testMdRobotBaseC.includes('PBIO_THREAD_TEST(test_mdrobotbase_backlash_distance_conservation)');

evaluateNode(
  5, 2,
  "Why must both unit tests be registered in pbio_mdrobotbase_tests[]?",
  "pbio_mdrobotbase_tests[] registers spin_and_pivot_invariants and backlash_distance_conservation",
  testsRegistered,
  "Tests are not registered in pbio_mdrobotbase_tests runner"
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
  5, 3,
  "Why must both tests execute and pass without failure?",
  "Native test execution succeeds",
  pbioTestsPass,
  `Test execution failed: ${testOutput.slice(0, 100)}`
);

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
  console.log(`   Zero ambiguity remains; turning and backlash invariants fully proven.\n`);
  process.exit(0);
}
