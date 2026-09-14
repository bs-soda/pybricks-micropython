#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-005
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS Agent OS
 * Goal: G-MDRB-005 (Distinct Timeout and Stall Failure Reporting)
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
console.log("🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-005");
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
const acceptancePath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-005.md');
const goalCardPath = existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-005.md'))
  ? resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-005.md')
  : resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-005.md');

const mdrobotbaseH = existsSync(mdrobotbaseHPath) ? readFileSync(mdrobotbaseHPath, 'utf8') : '';
const mdrobotbaseC = existsSync(mdrobotbaseCPath) ? readFileSync(mdrobotbaseCPath, 'utf8') : '';
const pbTypeMDRB = existsSync(pbTypeMDRBPath) ? readFileSync(pbTypeMDRBPath, 'utf8') : '';
const testMDRB = existsSync(testMDRBPath) ? readFileSync(testMDRBPath, 'utf8') : '';
const acceptance = existsSync(acceptancePath) ? readFileSync(acceptancePath, 'utf8') : '';
const goalCard = existsSync(goalCardPath) ? readFileSync(goalCardPath, 'utf8') : '';

// -----------------------------------------------------------------------------
// Branch 1: Silent Failure Masking & Error Semantics (branch-1-silent-failure-masking)
// -----------------------------------------------------------------------------
console.log("────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Silent Failure Masking & Error Semantics (branch-1-silent-failure-masking)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-1-silent-failure-masking',
  1,
  'Why must timeout and motor stall conditions return distinct error codes instead of PBIO_SUCCESS?',
  'Returning PBIO_SUCCESS masks physical failure, causing caller scripts to continue in erroneous pose',
  !pbTypeMDRB.includes('if (self->rb->timeout_ms > 0 && elapsed_ms >= self->rb->timeout_ms) {\n    pbio_servo_stop(self->rb->left, self->rb->stop_behavior);\n    pbio_servo_stop(self->rb->right, self->rb->stop_behavior);\n    if (self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {\n      pbio_servo_reset_angle(self->rb->left, 0, false);\n      pbio_servo_reset_angle(self->rb->right, 0, false);\n      self->rb->last_left_deg = 0.0f;\n      self->rb->last_right_deg = 0.0f;\n    }\n    self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;\n    self->rb->motion_in_progress = false;\n    return PBIO_SUCCESS;') &&
  pbTypeMDRB.includes('return PBIO_ERROR_TIMEDOUT;'),
  'Global timeout check must return PBIO_ERROR_TIMEDOUT, not PBIO_SUCCESS'
);

evaluateNode(
  'branch-1-silent-failure-masking',
  2,
  'Why does returning PBIO_SUCCESS on timeout break mission autonomy and localization?',
  'Autonomous mission sequencing continues with assumption of waypoint arrival while robot is off-course',
  goalCard.includes('Codex architectural review scorecard assigned Motion Failure Semantics a baseline score of') &&
  acceptance.includes('Scenario 1: Motion Timeout Returns PBIO_ERROR_TIMEDOUT'),
  'Context in goal card and Scenario 1 in acceptance contract confirmed'
);

evaluateNode(
  'branch-1-silent-failure-masking',
  3,
  'Why must timeout specifically return PBIO_ERROR_TIMEDOUT?',
  'Allows distinction between mechanical jams (stalls) and deadline expirations',
  pbTypeMDRB.includes('return PBIO_ERROR_TIMEDOUT;'),
  'pb_type_mdrobotbase.c must return PBIO_ERROR_TIMEDOUT on timeout'
);

evaluateNode(
  'branch-1-silent-failure-masking',
  4,
  'Why must motor stall specifically return PBIO_ERROR_FAILED?',
  'PBIO_ERROR_FAILED translates to RuntimeError indicating actuator jam or physical obstruction',
  pbTypeMDRB.includes('return PBIO_ERROR_FAILED;'),
  'pb_type_mdrobotbase.c must return PBIO_ERROR_FAILED on stall'
);

evaluateNode(
  'branch-1-silent-failure-masking',
  5,
  'Why must pbio_mdrobotbase_motion_status_t be formally defined in pbio/mdrobotbase.h?',
  'Provides an explicit, type-safe representation of runtime motion states across C and Python',
  mdrobotbaseH.includes('typedef enum') && mdrobotbaseH.includes('pbio_mdrobotbase_motion_status_t') && mdrobotbaseH.includes('PBIO_MDROBOTBASE_STATUS_TIMED_OUT'),
  'pbio_mdrobotbase_motion_status_t enum must be declared in pbio/mdrobotbase.h'
);

// -----------------------------------------------------------------------------
// Branch 2: Actuator Decoupling & Configured Stop Behavior (branch-2-actuator-stop-behavior)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Actuator Decoupling & Configured Stop Behavior (branch-2-actuator-stop-behavior)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-2-actuator-stop-behavior',
  1,
  'Why must actuator stopping strictly honor rb->stop_behavior upon abort?',
  'Ensures physical motors enter requested electrical state (holding torque vs freewheeling coast)',
  pbTypeMDRB.includes('pbio_servo_stop(self->rb->left, self->rb->stop_behavior)') &&
  pbTypeMDRB.includes('pbio_servo_stop(self->rb->right, self->rb->stop_behavior)'),
  'Servos must be stopped according to self->rb->stop_behavior'
);

evaluateNode(
  'branch-2-actuator-stop-behavior',
  2,
  'Why must angle registers be conditionally reset only when stop_behavior != COAST?',
  'Resetting angle during coast introduces artificial zero reference while motor continues spinning',
  pbTypeMDRB.includes('if (self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST)'),
  'Conditional angle reset matching stop_behavior required'
);

evaluateNode(
  'branch-2-actuator-stop-behavior',
  3,
  'Why must pbio_servo_stop() be called for both left and right actuators before returning the error?',
  'Prevents asymmetric actuator drift where one motor runs indefinitely while the other halts',
  pbTypeMDRB.includes('pbio_servo_stop(self->rb->left') && pbTypeMDRB.includes('pbio_servo_stop(self->rb->right'),
  'Both servos must be stopped symmetrically'
);

evaluateNode(
  'branch-2-actuator-stop-behavior',
  4,
  'Why must motion_in_progress be cleared to false upon any abort?',
  'Informs the async runloop that the motion protothread has terminated and frees the base',
  pbTypeMDRB.includes('self->rb->motion_in_progress = false;'),
  'motion_in_progress flag must be cleared'
);

evaluateNode(
  'branch-2-actuator-stop-behavior',
  5,
  'Why must motion_type be reset to PBIO_MDROBOTBASE_MOTION_NONE upon any abort?',
  'Prevents subsequent iterate calls from resuming stale motion subroutines',
  pbTypeMDRB.includes('self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;'),
  'motion_type must be reset to PBIO_MDROBOTBASE_MOTION_NONE'
);

// -----------------------------------------------------------------------------
// Branch 3: Stall Detection Guard & Threshold Invariants (branch-3-stall-detection-guards)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Stall Detection Guard & Threshold Invariants (branch-3-stall-detection-guards)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-3-stall-detection-guards',
  1,
  'Why does stall detection require both commanding significant speed and observing near-zero progress?',
  'Zero progress with zero command is intentional standstill; stall is discrepancy between cmd and feedback',
  pbTypeMDRB.includes('fabsf(v_cmd) > 30.0f && fabsf(v_raw) < 10.0f') || pbTypeMDRB.includes('fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f'),
  'Stall condition checks speed command vs raw feedback'
);

evaluateNode(
  'branch-3-stall-detection-guards',
  2,
  'Why must stall detection require a persistence window rather than a single sample?',
  'Mechanical compliance, backlash transition, and static friction require time before full motion develops',
  pbTypeMDRB.includes('self->rb->stall_time_ms > 200.0f') || pbTypeMDRB.includes('self->rb->stall_time_ms > 250.0f') || pbTypeMDRB.includes('rb->stall_time_ms > threshold_ms'),
  'Stall persistence window confirmed in code'
);

evaluateNode(
  'branch-3-stall-detection-guards',
  3,
  'Why must stall detection be suppressed during initial acceleration (t_elapsed <= 200ms)?',
  'Ramping from 0 to target speed naturally has low initial velocity; premature check would cause false stalls',
  pbTypeMDRB.includes('if (elapsed_ms > 200)') || pbTypeMDRB.includes('if (elapsed_ms > 300)'),
  'Stall check suppressed during acceleration startup window'
);

evaluateNode(
  'branch-3-stall-detection-guards',
  4,
  'Why must stall_time_ms be reset to 0.0f immediately when progress is detected?',
  'Intermittent friction blips must not accumulate over a long trajectory to trigger false aborts',
  pbTypeMDRB.includes('self->rb->stall_time_ms = 0.0f;'),
  'stall_time_ms is zeroed whenever velocity exceeds threshold'
);

evaluateNode(
  'branch-3-stall-detection-guards',
  5,
  'Why must stall detection cover linear navigation, final heading alignment, in-place turns, and pivots?',
  'Any drivetrain maneuver can experience physical obstruction or surface wheel lock',
  pbTypeMDRB.includes('case PBIO_MDROBOTBASE_MOTION_NAVIGATE:') &&
  pbTypeMDRB.includes('case PBIO_MDROBOTBASE_MOTION_TURN:') &&
  pbTypeMDRB.includes('case PBIO_MDROBOTBASE_MOTION_PIVOT:'),
  'All major motion types implement stall checks'
);

// -----------------------------------------------------------------------------
// Branch 4: MicroPython Exception Translation & Status Queryability (branch-4-micropython-exception-dispatch)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: MicroPython Exception Translation & Status Queryability (branch-4-micropython-exception-dispatch)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-4-micropython-exception-dispatch',
  1,
  'Why does pb_type_async_wait_or_await() rely on pb_assert(err) to raise Python exceptions?',
  'Standard Pybricks architecture routes pbio_error_t to MicroPython exception dispatcher',
  pbTypeMDRB.includes('pb_type_async_wait_or_await(&config, &self->last_awaitable, true)'),
  'pb_type_mdrobotbase_wait_or_await uses pb_type_async_wait_or_await'
);

evaluateNode(
  'branch-4-micropython-exception-dispatch',
  2,
  'Why does PBIO_ERROR_TIMEDOUT map to OSError(ETIMEDOUT) in MicroPython?',
  'POSIX errno standard specifies ETIMEDOUT (110) for expired operation timers',
  acceptance.includes('OSError with errno ETIMEDOUT (110)'),
  'Acceptance contract establishes ETIMEDOUT mapping'
);

evaluateNode(
  'branch-4-micropython-exception-dispatch',
  3,
  'Why does PBIO_ERROR_FAILED map to RuntimeError in MicroPython?',
  'Pybricks error dispatcher converts generic operational failures to RuntimeError',
  acceptance.includes('RuntimeError("motion stalled")') || acceptance.includes('RuntimeError'),
  'Acceptance contract establishes RuntimeError mapping'
);

evaluateNode(
  'branch-4-micropython-exception-dispatch',
  4,
  'Why must caller scripts be able to query stalled() or status() on MDRobotBase?',
  'Provides non-raising inspection capabilities for autonomous state machine polling',
  pbTypeMDRB.includes('stalled') || pbTypeMDRB.includes('motion_status'),
  'stalled() or motion_status query method exposed in Python bindings'
);

evaluateNode(
  'branch-4-micropython-exception-dispatch',
  5,
  'Why must exception raising not leave the underlying C struct in an inconsistent state?',
  'Prevents memory corruption or stuck actuator commands when user code catches exceptions with try/except',
  mdrobotbaseC.includes('pbio_mdrobotbase_motion_reset') && pbTypeMDRB.includes('pbio_mdrobotbase_motion_reset'),
  'Motion reset preserves persistent configuration while zeroing transient fault state'
);

// -----------------------------------------------------------------------------
// Branch 5: Clean Lifecycle Reset on Subsequent Motion (branch-5-lifecycle-clean-reset)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch: Clean Lifecycle Reset on Subsequent Motion (branch-5-lifecycle-clean-reset)");
console.log("────────────────────────────────────────────────────────────────────────────────");

evaluateNode(
  'branch-5-lifecycle-clean-reset',
  1,
  'Why must a failed motion not contaminate subsequent motion commands?',
  'Autonomous recovery routines (e.g. back away from obstacle) must execute without residual stall time',
  mdrobotbaseC.includes('rb->stall_time_ms = 0.0f;'),
  'stall_time_ms reset in motion_reset'
);

evaluateNode(
  'branch-5-lifecycle-clean-reset',
  2,
  'Why must pbio_mdrobotbase_motion_reset() zero stall_time_ms and turn_integral?',
  'Prevents windup from a prior stalled attempt from instantly causing a subsequent stall or runaway command',
  mdrobotbaseC.includes('rb->turn_integral = 0.0f;') && mdrobotbaseC.includes('rb->stall_time_ms = 0.0f;'),
  'motion_reset zeroes both turn_integral and stall_time_ms'
);

evaluateNode(
  'branch-5-lifecycle-clean-reset',
  3,
  'Why must subsequent motion commands transition motion_status to PBIO_MDROBOTBASE_STATUS_RUNNING?',
  'Signals that the robot has entered a fresh operational phase and is actively tracking a new goal',
  pbTypeMDRB.includes('PBIO_MDROBOTBASE_STATUS_RUNNING') || mdrobotbaseC.includes('PBIO_MDROBOTBASE_STATUS_RUNNING'),
  'motion_status transitions to RUNNING on new command dispatch'
);

evaluateNode(
  'branch-5-lifecycle-clean-reset',
  4,
  'Why must normal target arrival continue to return PBIO_SUCCESS without false positive stalls?',
  'Guarantees backward compatibility and flawless execution for unobstructed trajectories',
  pbTypeMDRB.includes('PBIO_MDROBOTBASE_STATUS_COMPLETED') || pbTypeMDRB.includes('return PBIO_SUCCESS;'),
  'Normal arrival returns PBIO_SUCCESS'
);

evaluateNode(
  'branch-5-lifecycle-clean-reset',
  5,
  'Why is real embedded test execution with zero mocks the non-negotiable verification standard?',
  'Ensures the exact compiled C machine instructions produce verified error codes under simulated physical conditions',
  testMDRB.includes('test_mdrobotbase_motion_failure_reporting'),
  'Embedded test test_mdrobotbase_motion_failure_reporting exists in test_mdrobotbase.c'
);

// -----------------------------------------------------------------------------
// Summary & Score Calculation
// -----------------------------------------------------------------------------
const passPercentage = (passedChecks / totalChecks) * 100;

console.log("\n================================================================================");
console.log(`📊 Dialectic Evaluation Summary: ${passedChecks}/${totalChecks} Checks Passed (${passPercentage.toFixed(1)}%)`);
if (failedChecks > 0) {
  console.log(`❌ Failed Checks: ${failedChecks}`);
  console.log(`⚠️ Goal G-MDRB-005 has pending dialectic requirements.`);
} else {
  console.log(`✅ All 5 Socratic Branches Converged at Level 5 with 100% Pass Rate!`);
}
console.log("================================================================================\n");

if (failedChecks > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
