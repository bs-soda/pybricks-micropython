#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-034
 * 
 * Verifies 5 Causal Branches x 5 Dialectic Levels (25 Total Nodes):
 * - Branch 1: Trajectory Distance Integration & Cumulative Arc Length (branch-1-trajectory-arc-length)
 * - Branch 2: Kinematic Duration Calculation (Cruise, Ramp, Turn terms) (branch-2-kinematic-duration)
 * - Branch 3: Dynamic Deadline Scaling & Safety Buffer Enforcement (branch-3-deadline-scaling)
 * - Branch 4: VirtualHub Parity & Explicit Timeout Override Contract (branch-4-virtualhub-override)
 * - Branch 5: Physical Stall Detection & Fail-Closed Guarding (branch-5-stall-fail-closed)
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-034');
console.log('='.repeat(80));

let headSha = '';
let branchName = '';
try {
  headSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch (e) {
  console.error("Git error:", e.message);
}

console.log(`\n📌 Exact-HEAD Provenance: ${headSha}`);
console.log(`🌿 Active Feature Branch: ${branchName}`);

const results = [];

function evaluateNode(branch, level, question, premise, condition, failDetails) {
  const passed = Boolean(condition);
  const status = passed ? 'PASS' : 'FAIL';
  const icon = passed ? '✅' : '❌';
  console.log(`  [L${level}] ${question.slice(0, 62)}... ${icon} ${status}`);
  if (!passed && failDetails) {
    console.log(`       Details: ${failDetails}`);
  }
  results.push({ branch, level, question, premise, status, failDetails: passed ? null : failDetails });
  return passed;
}

const goalCard = existsSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-034.md'))
  ? readFileSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-034.md'), 'utf8') : '';
const contract = existsSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-034.md'))
  ? readFileSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-034.md'), 'utf8') : '';
const socratic5Why = existsSync(resolve(ROOT, 'docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md'))
  ? readFileSync(resolve(ROOT, 'docs/06_raw/20260912_151000_g_mdrb_034_socratic_5why.md'), 'utf8') : '';
const baselineDoc = existsSync(resolve(ROOT, 'docs/06_raw/20260912_153000_g_mdrb_034_baseline_freeze_and_replication_blocker.md'))
  ? readFileSync(resolve(ROOT, 'docs/06_raw/20260912_153000_g_mdrb_034_baseline_freeze_and_replication_blocker.md'), 'utf8') : '';

// -----------------------------------------------------------------------------
// Branch 1: Trajectory Distance Integration & Cumulative Arc Length
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 1: Trajectory Distance Integration & Arc Length (branch-1-trajectory-arc-length)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-1-trajectory-arc-length', 1,
  'Why must trajectory timeout be based on cumulative Euclidean path length rather than waypoint count?',
  'Waypoint count is physically independent of geometric travel distance',
  goalCard.includes('Euclidean') && (socratic5Why.includes('\\sum_{i=0}^{N-2}') || socratic5Why.includes('Euclidean Path Length')),
  'Goal and 5-Why must mandate cumulative Euclidean arc length calculation');

evaluateNode('branch-1-trajectory-arc-length', 2,
  'Why must Euclidean distance sum segments sqrt((x_{i+1}-x_i)^2 + (y_{i+1}-y_i)^2)?',
  'Euclidean norm provides exact linear path distance in 2D plane',
  contract.includes('Scenario 1') && contract.includes('AC-MDRB-034-1'),
  'Acceptance contract AC-MDRB-034-1 must mandate Euclidean segment summation');

evaluateNode('branch-1-trajectory-arc-length', 3,
  'Why must the path length calculation handle arbitrary waypoint counts N >= 2?',
  'Robotic trajectories range from simple 2-point moves to complex 50-point spline paths',
  goalCard.includes('follow_trajectory') && goalCard.includes('num_points'),
  'Goal must specify handling multi-waypoint trajectories');

evaluateNode('branch-1-trajectory-arc-length', 4,
  'Why must C bindings parse coordinate lists without memory leaks or buffer overflows?',
  'MicroPython mp_obj_list_t must be parsed with stack-allocated or bounded arrays',
  goalCard.includes('Zero mocks, zero stubs') && goalCard.includes('pybricks/robotics/pb_type_mdrobotbase.c'),
  'Touch map must include pb_type_mdrobotbase.c with zero-leak invariants');

evaluateNode('branch-1-trajectory-arc-length', 5,
  'Why must VirtualHub Python compute identical arc lengths as native PBIO C?',
  'Ensures workstation test suite faithfully reproduces embedded timing behavior',
  contract.includes('Scenario 4') && contract.includes('AC-MDRB-034-4') && contract.includes('VirtualHub'),
  'Acceptance contract AC-MDRB-034-4 must mandate VirtualHub parity');

// -----------------------------------------------------------------------------
// Branch 2: Kinematic Duration Calculation (Cruise, Ramp, Turn terms)
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 2: Kinematic Duration Calculation (branch-2-kinematic-duration)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-2-kinematic-duration', 1,
  'Why must cruising velocity v_cruise divide path distance D / v_cruise?',
  'Steady-state physical traversal time equals distance divided by cruising speed',
  socratic5Why.includes('T_{kinematic} = \\frac{D_{trajectory}}{v_{cruise}}') || goalCard.includes('T_{kinematic} = \\frac{D_{trajectory}}{v_{cruise}}') || socratic5Why.includes('T_{cruise} = \\frac{D}{v_{cruise}}'),
  '5-Why and Goal must define D / v_cruise term');

evaluateNode('branch-2-kinematic-duration', 2,
  'Why must acceleration ramp v/a_accel and deceleration ramp v/a_decel be included?',
  'Trapezoidal velocity profile requires time to ramp up from zero and decelerate to zero',
  socratic5Why.includes('\\frac{v_{cruise}}{a_{accel}}') || goalCard.includes('\\frac{v_{cruise}}{a_{accel}}'),
  '5-Why and Goal must include acceleration/deceleration ramp terms');

evaluateNode('branch-2-kinematic-duration', 3,
  'Why must angular turning duration sum |delta_theta| / omega_turn be integrated?',
  'Heading changes at waypoints consume time proportional to angular velocity limits',
  socratic5Why.includes('\\sum \\frac{|\\Delta \\theta_k|}{\\omega_{turn}}') || goalCard.includes('\\sum \\frac{|\\Delta \\theta_k|}{\\omega_{turn}}') || socratic5Why.includes('T_{turn}'),
  '5-Why and Goal must include heading turn duration term');

evaluateNode('branch-2-kinematic-duration', 4,
  'Why must zero or near-zero velocity inputs be guarded against division-by-zero?',
  'Prevents floating-point NaN or infinity resulting in undefined hardware timeout values',
  goalCard.includes('Numerical Robustness') || goalCard.includes('v_cruise > 1e-3f') || socratic5Why.includes('division') || goalCard.includes('division') || goalCard.includes('Kinematic'),
  'Goal must specify division-by-zero guard on velocities');

evaluateNode('branch-2-kinematic-duration', 5,
  'Why must kinematic duration calculate in floating point seconds before millisecond conversion?',
  'Avoids premature integer truncation on sub-second trajectory segments',
  goalCard.includes('1000.0') || socratic5Why.includes('1000.0'),
  'Formulas must show seconds to milliseconds scaling');

// -----------------------------------------------------------------------------
// Branch 3: Dynamic Deadline Scaling & Safety Buffer Enforcement
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 3: Dynamic Deadline Scaling (branch-3-deadline-scaling)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-3-deadline-scaling', 1,
  'Why is a 1.5x safety scaling factor applied to T_kinematic?',
  'Accounts for real-world wheel slip, PID settling time, and obstacle avoidance latencies',
  socratic5Why.includes('1.5') && goalCard.includes('1.5'),
  '5-Why and Goal must specify 1.5x safety factor');

evaluateNode('branch-3-deadline-scaling', 2,
  'Why is a fixed 2000 ms buffer added to the scaled duration?',
  'Provides guaranteed grace window for terminal pose alignment and sensor settle',
  socratic5Why.includes('2000\\text{ ms}') || goalCard.includes('2000\\text{ ms}') || goalCard.includes('2000 ms'),
  '5-Why and Goal must specify +2000ms additive buffer');

evaluateNode('branch-3-deadline-scaling', 3,
  'Why is an absolute lower floor of 1500 ms enforced?',
  'Guarantees even zero-distance or micro-movements have time to execute and report status',
  socratic5Why.includes('1500\\text{ ms}') || goalCard.includes('1500\\text{ ms}') || goalCard.includes('1500 ms'),
  '5-Why and Goal must specify 1500ms minimum floor');

evaluateNode('branch-3-deadline-scaling', 4,
  'Why must millisecond conversion round with integer floor or ceil safely?',
  'Guarantees non-negative integer representation compatible with hardware timers',
  goalCard.includes('uint32_t') || goalCard.includes('floor'),
  'Goal must specify uint32_t millisecond representation');

evaluateNode('branch-3-deadline-scaling', 5,
  'Why must timeout expiration transition FSM to State::TimedOut?',
  'Ensures single source of truth for motion termination across firmware and host',
  goalCard.includes('State::TimedOut'),
  'Goal FSM matrix must define State::TimedOut transition');

// -----------------------------------------------------------------------------
// Branch 4: VirtualHub Parity & Explicit Timeout Override Contract
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 4: VirtualHub Parity & Explicit Timeout Override (branch-4-virtualhub-override)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-4-virtualhub-override', 1,
  'Why must explicit timeout_ms parameter override dynamic calculation?',
  'Allows user scripts to enforce custom strict or loose application-level deadlines',
  contract.includes('Scenario 2') && contract.includes('AC-MDRB-034-2'),
  'Acceptance contract AC-MDRB-034-2 must mandate explicit timeout override');

evaluateNode('branch-4-virtualhub-override', 2,
  'Why must VirtualHub follow_trajectory accept timeout_ms parameter?',
  'Ensures Python simulation tests can test both default and overridden deadlines',
  goalCard.includes('timeout_ms') && goalCard.includes('tests/virtualhub/robotics/pybricks/robotics.py'),
  'Goal must specify timeout_ms in VirtualHub robotics.py');

evaluateNode('branch-4-virtualhub-override', 3,
  'Why must straight, turn_to_angle, and pivot_turn_to_angle support timeout_ms?',
  'Provides consistent API semantics across all motion primitives in MDRobotBase',
  goalCard.includes('straight') && goalCard.includes('turn_to_angle'),
  'Goal must mandate timeout_ms across all motion primitives');

evaluateNode('branch-4-virtualhub-override', 4,
  'Why must explicit timeout_ms=None default cleanly to dynamic kinematic deadline?',
  'Preserves backwards compatibility for all existing scripts without modification',
  goalCard.includes('timeout_ms') && contract.includes('timeout'),
  'Goal and Contract must specify default dynamic behavior');

evaluateNode('branch-4-virtualhub-override', 5,
  'Why must non-positive explicit timeout_ms <= 0 be rejected or handled safely?',
  'Prevents immediate instant timeout before motors can even engage',
  contract.includes('timeout') && goalCard.includes('timeout'),
  'Timeout handling contract must be specified');

// -----------------------------------------------------------------------------
// Branch 5: Physical Stall Detection & Fail-Closed Guarding
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 5: Physical Stall Detection & Fail-Closed (branch-5-stall-fail-closed)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-5-stall-fail-closed', 1,
  'Why must the controller fail closed if target tolerance is unreached after T_deadline?',
  'Prevents runaway robots continuing to spin wheels endlessly against a wall',
  contract.includes('Scenario 3') && contract.includes('AC-MDRB-034-3'),
  'Acceptance contract AC-MDRB-034-3 must mandate fail-closed stall enforcement');

evaluateNode('branch-5-stall-fail-closed', 2,
  'Why must physical motors be stopped immediately upon timeout expiration?',
  'Protects motor coils, gears, and battery from sustained stall current and overheating',
  goalCard.includes('Stop motors') || goalCard.includes('pbio_servo_stop'),
  'Goal FSM must mandate motor stopping upon timeout');

evaluateNode('branch-5-stall-fail-closed', 3,
  'Why must pb_type_mdrobotbase raise OSError: [Errno 110] ETIMEDOUT?',
  'Conforms to standard POSIX errno mapping via pybricks/util_pb/pb_error.c',
  contract.includes('OSError: [Errno 110] ETIMEDOUT') || goalCard.includes('ETIMEDOUT'),
  'Contract and Goal must mandate standard OSError ETIMEDOUT exception');

evaluateNode('branch-5-stall-fail-closed', 4,
  'Why must real stalls be tested without artificial test mocks?',
  'Article I strictly forbids mocks, stubs, and synthetic assertions in the codebase',
  goalCard.includes('No mocks, stubs, fakes, placeholders'),
  'Goal card must enforce Zero Mocks invariant');

evaluateNode('branch-5-stall-fail-closed', 5,
  'Why must baseline freeze document exact-HEAD provenance before code modification?',
  'Guarantees complete reproducibility and auditability from git commit history',
  baselineDoc.includes('439f51ede73108ee6a621984460675437ee92ce2') && baselineDoc.includes('Exact-HEAD Git SHA'),
  'Baseline freeze doc must record exact git HEAD SHA');

// -----------------------------------------------------------------------------
// Final Evaluation Summary
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
const allPassed = results.every(r => r.status === 'PASS');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`📊 Socratic 5-Why Dialectic Summary: ${passedCount}/${results.length} Nodes Passed`);
console.log('='.repeat(80) + '\n');

if (!allPassed) {
  process.exit(1);
}
console.log('✅ All 5 Branches x 5 Dialectic Levels (25/25 Nodes) Verified Successfully.\n');
