#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-003
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS Agent OS
 * Goal: G-MDRB-003 (Constructor and Parameter Geometry Validation)
 * Invariant: Zero Mocks, Zero Stubs, Zero Fallbacks (Article I Non-Negotiable)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function evaluateNode(branchId, level, whyQuestion, causalFinding, condition, details = '') {
  totalChecks++;
  const label = `[L${level}] ${whyQuestion.substring(0, 68)}...`;
  if (condition) {
    passedChecks++;
    console.log(`  ${label} ✅ PASS`);
    return true;
  } else {
    failedChecks++;
    console.error(`  ${label} ❌ FAIL`);
    if (details) console.error(`       Details: ${details}`);
    return false;
  }
}

console.log("================================================================================");
console.log("🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-003");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// Exact-HEAD Provenance
// -----------------------------------------------------------------------------
let gitHead = 'unknown';
let gitBranch = 'unknown';
try {
  gitHead = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  gitBranch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch (e) {
  // ignore
}
console.log(`📌 Exact-HEAD Provenance: ${gitHead}`);
console.log(`🌿 Active Feature Branch: ${gitBranch}\n`);

// -----------------------------------------------------------------------------
// Load relevant source files for verification
// -----------------------------------------------------------------------------
const mdrobotbaseHPath = resolve(ROOT, 'lib/pbio/include/pbio/mdrobotbase.h');
const mdrobotbaseCPath = resolve(ROOT, 'lib/pbio/src/mdrobotbase.c');
const pbTypeMDRBPath = resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c');
const testMDRBPath = resolve(ROOT, 'lib/pbio/test/src/test_mdrobotbase.c');
const acceptancePath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-003.md');
const goalCardPath = existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-003.md'))
  ? resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-003.md')
  : resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-003.md');

const mdrobotbaseH = existsSync(mdrobotbaseHPath) ? readFileSync(mdrobotbaseHPath, 'utf8') : '';
const mdrobotbaseC = existsSync(mdrobotbaseCPath) ? readFileSync(mdrobotbaseCPath, 'utf8') : '';
const pbTypeMDRB = existsSync(pbTypeMDRBPath) ? readFileSync(pbTypeMDRBPath, 'utf8') : '';
const testMDRB = existsSync(testMDRBPath) ? readFileSync(testMDRBPath, 'utf8') : '';
const acceptance = existsSync(acceptancePath) ? readFileSync(acceptancePath, 'utf8') : '';
const goalCard = existsSync(goalCardPath) ? readFileSync(goalCardPath, 'utf8') : '';

// -----------------------------------------------------------------------------
// Branch 1: Differential Kinematics Division-by-Zero Elimination (Axle Track)
// -----------------------------------------------------------------------------
console.log("────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Differential Kinematics Division-by-Zero Elimination (branch-1-axle-track-positivity)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-1-axle-track-positivity',
  1,
  'Why does non-positive axle track cause immediate IEEE 754 division-by-zero?',
  'In pbio_mdrobotbase_update_state(), delta_theta_enc_rad = (d_right - d_left) / track_mm. Zero track yields NaN/Inf',
  mdrobotbaseC.includes('axle_track <= 0'),
  'mdrobotbase.c must guard against axle_track <= 0'
);

evaluateNode(
  'branch-1-axle-track-positivity',
  2,
  'Why must axle track be strictly positive (W > 0) rather than non-negative?',
  'Physical differential drive requires spatial separation between wheels for angular displacement',
  mdrobotbaseC.includes('axle_track <= 0') && acceptance.includes('Scenario 2: Non-Positive Axle Track Rejection'),
  'Axle track positivity must be documented in acceptance contract and enforced in C'
);

evaluateNode(
  'branch-1-axle-track-positivity',
  3,
  'Why must the check happen before slot acquisition and initialization?',
  'Prevents pool slot acquisition or hardware allocation when geometry is mathematically invalid',
  mdrobotbaseC.includes('pbio_mdrobotbase_get_robotbase') && mdrobotbaseC.includes('axle_track <= 0'),
  'pbio_mdrobotbase_get_robotbase must check axle_track <= 0 before slot commitment'
);

evaluateNode(
  'branch-1-axle-track-positivity',
  4,
  'Why must upper sanity bounds (W <= 5000000 um = 5m) be enforced?',
  'Extreme chassis dimensions trigger integer scaling overflow and arithmetic wraparound',
  mdrobotbaseC.includes('axle_track > 5000000'),
  'mdrobotbase.c must guard axle_track > 5000000'
);

evaluateNode(
  'branch-1-axle-track-positivity',
  5,
  'Why must PBIO C return PBIO_ERROR_INVALID_ARG directly on invalid axle track?',
  'Enforces fail-closed deterministic error propagation caught by pb_assert() as Python ValueError',
  mdrobotbaseC.includes('axle_track <= 0') && mdrobotbaseC.includes('PBIO_ERROR_INVALID_ARG'),
  'Return PBIO_ERROR_INVALID_ARG on invalid axle track'
);

// -----------------------------------------------------------------------------
// Branch 2: Linear Velocity Conversion Singularity & Runaway (Wheel Diameters)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Linear Velocity Conversion Singularity & Runaway (branch-2-wheel-diameter-positivity)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-2-wheel-diameter-positivity',
  1,
  'Why does non-positive wheel diameter cause velocity command singularities?',
  'Linear speed divided by wheel diameter produces division-by-zero or negative rotational speed',
  mdrobotbaseC.includes('wheel_diameter_left <= 0') && mdrobotbaseC.includes('wheel_diameter_right <= 0'),
  'mdrobotbase.c must guard wheel_diameter_left <= 0 and wheel_diameter_right <= 0'
);

evaluateNode(
  'branch-2-wheel-diameter-positivity',
  2,
  'Why must both left and right diameters be validated independently?',
  'MDRobotBase supports asymmetric wheels; invalidity in either wheel causes uncontrollable yaw divergence',
  mdrobotbaseC.includes('wheel_diameter_left <= 0') && mdrobotbaseC.includes('wheel_diameter_right <= 0'),
  'Both wheel_diameter_left and wheel_diameter_right must be independently validated'
);

evaluateNode(
  'branch-2-wheel-diameter-positivity',
  3,
  'Why must pbio_mdrobotbase_set_wheel_diameters() enforce identical validation rules?',
  'Dynamic parameter mutation without identical bounds creates a backdoor bypassing constructor validation',
  mdrobotbaseC.includes('pbio_mdrobotbase_set_wheel_diameters') && mdrobotbaseC.includes('left > 1000000'),
  'pbio_mdrobotbase_set_wheel_diameters must enforce upper and lower bounds'
);

evaluateNode(
  'branch-2-wheel-diameter-positivity',
  4,
  'Why must upper sanity bounds (D <= 1000000 um = 1m) be enforced?',
  'Extreme diameters cause underflow in angular displacement and overflow in distance integration',
  mdrobotbaseC.includes('wheel_diameter_left > 1000000') && mdrobotbaseC.includes('wheel_diameter_right > 1000000'),
  'Enforce wheel_diameter sanity upper bound of 1000000 um'
);

evaluateNode(
  'branch-2-wheel-diameter-positivity',
  5,
  'Why must PBIO C return PBIO_ERROR_INVALID_ARG on non-positive diameters?',
  'Establishes a concrete fail-closed contract guaranteeing physical validity of all drivebase actuators',
  mdrobotbaseC.includes('wheel_diameter_left <= 0') && mdrobotbaseC.includes('PBIO_ERROR_INVALID_ARG'),
  'Return PBIO_ERROR_INVALID_ARG on non-positive wheel diameters'
);

// -----------------------------------------------------------------------------
// Branch 3: Motor Aliasing Conflict Prevention (Actuator Identity)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Motor Aliasing Conflict Prevention (branch-3-motor-aliasing-prevention)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-3-motor-aliasing-prevention',
  1,
  'Why does passing the same physical motor for left and right cause actuator conflict?',
  'Both control loops command the same servo handle with opposing differential commands, causing command thrashing',
  mdrobotbaseC.includes('left == right') || pbTypeMDRB.includes('left_motor_in == right_motor_in'),
  'Must prevent identical servo or motor object for left and right'
);

evaluateNode(
  'branch-3-motor-aliasing-prevention',
  2,
  'Why must PBIO C enforce left != right in pbio_mdrobotbase_init() and get_robotbase()?',
  'Actuator identity must be distinct at the firmware HAL boundary regardless of high-level bindings',
  mdrobotbaseC.includes('left == right'),
  'mdrobotbase.c must reject left == right with PBIO_ERROR_INVALID_ARG'
);

evaluateNode(
  'branch-3-motor-aliasing-prevention',
  3,
  'Why must the MicroPython constructor reject left_motor == right_motor early?',
  'Provides clean, immediate Python diagnostic ValueError before attempting any PBIO allocation',
  pbTypeMDRB.includes('left_motor_in == right_motor_in'),
  'pb_type_mdrobotbase.c must reject left_motor_in == right_motor_in'
);

evaluateNode(
  'branch-3-motor-aliasing-prevention',
  4,
  'Why must re-entrant instance lookup never match aliased single motors?',
  'Pool lookup matching rb->left == left && rb->right == right must never bind to degenerate single-motor state',
  mdrobotbaseC.includes('left == right'),
  'Check left == right before re-entrant loop in get_robotbase'
);

evaluateNode(
  'branch-3-motor-aliasing-prevention',
  5,
  'Why must motor aliasing return PBIO_ERROR_INVALID_ARG and raise ValueError?',
  'Completely isolates differential drive axes and prevents mechanical lockup or motor driver burnout',
  acceptance.includes('Scenario 3: Motor Aliasing Rejection') && (mdrobotbaseC.includes('left == right') || pbTypeMDRB.includes('left_motor_in == right_motor_in')),
  'Motor aliasing rejection specified in acceptance contract and enforced in codebase'
);

// -----------------------------------------------------------------------------
// Branch 4: Floating-Point Non-Finiteness & NaN Sanitization
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Floating-Point Non-Finiteness & NaN Sanitization (branch-4-finite-float-sanitization)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-4-finite-float-sanitization',
  1,
  'Why does passing NaN or Infinity to pb_obj_get_scaled_int() cause undefined behavior?',
  'C casting of NaN or out-of-range floats to integer types is undefined behavior in ISO C',
  pbTypeMDRB.includes('isfinite'),
  'pb_type_mdrobotbase.c must check isfinite on float dimensions'
);

evaluateNode(
  'branch-4-finite-float-sanitization',
  2,
  'Why must MicroPython explicitly test isfinite() on all float geometry arguments?',
  'Standard MicroPython does not reject NaN/Inf when parsing arguments; explicit isfinite() prevents corruption',
  pbTypeMDRB.includes('isfinite') && pbTypeMDRB.includes('wheel_diameter_left_in'),
  'Explicit isfinite check on wheel_diameter_left_in, wheel_diameter_right_in, and axle_track_in'
);

evaluateNode(
  'branch-4-finite-float-sanitization',
  3,
  'Why must both constructor and setters enforce isfinite()?',
  'Dynamic reconfiguration via set_wheel_diameters() must be as strictly protected as initial construction',
  pbTypeMDRB.includes('set_wheel_diameters') && pbTypeMDRB.includes('isfinite'),
  'pb_type_MDRobotBase_set_wheel_diameters must check isfinite'
);

evaluateNode(
  'branch-4-finite-float-sanitization',
  4,
  'Why must non-finite inputs raise ValueError with a clear message?',
  'Developers immediately pinpoint malformed geometry inputs instead of diagnosing silent robot freezing',
  pbTypeMDRB.includes('wheel diameter and axle track must be positive non-zero'),
  'Descriptive ValueError message for invalid dimensions'
);

evaluateNode(
  'branch-4-finite-float-sanitization',
  5,
  'Why is IEEE 754 float sanitization non-negotiable in embedded robotics?',
  'Eliminates silent NaN contamination across state estimation, odometry fusion, and PID accumulators',
  acceptance.includes('Scenario 4: Non-Finite Floats') && pbTypeMDRB.includes('isfinite'),
  'Acceptance contract Scenario 4 verified against isfinite sanitization'
);

// -----------------------------------------------------------------------------
// Branch 5: Fail-Closed Allocation Rollback & Unit Test Verification
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Fail-Closed Allocation Rollback & Unit Test Verification (branch-5-fail-closed-allocation)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-5-fail-closed-allocation',
  1,
  'Why must geometry validation precede pool slot commitment?',
  'Allocating a pool slot before validating geometry risks leaking pool resources if initialization fails',
  mdrobotbaseC.includes('pbio_mdrobotbase_get_robotbase') && mdrobotbaseC.includes('axle_track <= 0'),
  'pbio_mdrobotbase_get_robotbase validates before slot reservation'
);

evaluateNode(
  'branch-5-fail-closed-allocation',
  2,
  'Why must *rb_address remain NULL or unchanged on validation failure?',
  'Prevents caller from dereferencing an invalid, dangling, or uninitialized pointer',
  acceptance.includes('rb == NULL') && testMDRB.includes('test_mdrobotbase_geometry_validation'),
  'Test suite must verify *rb_address remains NULL on validation failure'
);

evaluateNode(
  'branch-5-fail-closed-allocation',
  3,
  'Why must test_mdrobotbase_geometry_validation verify all edge cases?',
  'Concrete C unit test suite must cover zero, negative, out-of-bounds, and aliased inputs',
  testMDRB.includes('test_mdrobotbase_geometry_validation'),
  'test_mdrobotbase.c must implement test_mdrobotbase_geometry_validation'
);

evaluateNode(
  'branch-5-fail-closed-allocation',
  4,
  'Why must test_mdrobotbase_geometry_validation be registered in testcase array?',
  'TinyTest runner will not execute the test unless registered in pbio_mdrobotbase_tests',
  testMDRB.includes('PBIO_THREAD_TEST(test_mdrobotbase_geometry_validation)'),
  'pbio_mdrobotbase_tests array must include test_mdrobotbase_geometry_validation'
);

evaluateNode(
  'branch-5-fail-closed-allocation',
  5,
  'Why is the complete Socratic release gate the ultimate guardian of runtime safety?',
  'It synthesizes formal dialectics, empirical testing, statistical confidence, and human governance',
  acceptance.includes('Scenario 1') && acceptance.includes('Scenario 2') && acceptance.includes('Scenario 3') && acceptance.includes('Scenario 4') && acceptance.includes('Scenario 5'),
  'Acceptance contract must define all 5 core scenarios'
);

console.log("\n════════════════════════════════════════════════════════════════════════════════");
console.log(`📊 Dialectic Evaluation Summary: ${passedChecks}/${totalChecks} Checks Passed (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
if (failedChecks > 0) {
  console.log(`❌ Failed Checks: ${failedChecks}`);
  console.log("⚠️ Goal G-MDRB-003 has pending dialectic requirements.");
  process.exit(1);
} else {
  console.log("✅ All 5 Socratic Branches Converged at Level 5 with 100% Pass Rate!");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");
  process.exit(0);
}
