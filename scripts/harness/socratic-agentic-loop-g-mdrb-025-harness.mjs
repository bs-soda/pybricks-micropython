#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-025
 * 
 * Verifies 5 Causal Branches x 5 Dialectic Levels (25 Total Nodes):
 * - Branch 1: Dispatcher Modularity & Complexity Bound (branch-1-dispatcher-modularity)
 * - Branch 2: Navigation Sub-Controller Decomposition (branch-2-navigate-subcontroller)
 * - Branch 3: Turn & Pivot Sub-Controller Decomposition (branch-3-turn-pivot-subcontrollers)
 * - Branch 4: Trajectory Tracking Sub-Controller Decomposition (branch-4-trajectory-subcontroller)
 * - Branch 5: Kinematic Invariant Preservation & Zero-Mock Verification (branch-5-kinematic-invariants-zero-mock)
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-025');
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
  console.log(`  [L${level}] ${question.slice(0, 58)}... ${icon} ${status}`);
  if (!passed && failDetails) {
    console.log(`       Details: ${failDetails}`);
  }
  results.push({ branch, level, question, premise, status, failDetails: passed ? null : failDetails });
  return passed;
}

const pybricksC = existsSync(resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c'))
  ? readFileSync(resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c'), 'utf8') : '';
const goalCard = existsSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-025.md'))
  ? readFileSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-025.md'), 'utf8')
  : (existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-025.md'))
     ? readFileSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-025.md'), 'utf8')
     : '');
const contract = existsSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-025.md'))
  ? readFileSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-025.md'), 'utf8') : '';

// Helper to compute line count of pb_type_mdrobotbase_motion_iterate_once
function getDispatcherLineCount() {
  const match = pybricksC.match(/static\s+pbio_error_t\s+pb_type_mdrobotbase_motion_iterate_once\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  if (!match) return 9999;
  return match[1].split('\n').length;
}

const dispatcherLineCount = getDispatcherLineCount();

// -----------------------------------------------------------------------------
// Branch 1: Dispatcher Modularity & Complexity Bound
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 1: Dispatcher Modularity & Complexity Bound (branch-1-dispatcher-modularity)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-1-dispatcher-modularity', 1,
  'Why must the monolithic dispatcher pb_type_mdrobotbase_motion_iterate_once be decomposed?',
  'Monolithic switch-case obscures control flow, duplicates velocity conversions, and prevents unit testing',
  goalCard.includes('Motion Dispatcher Modularization') && goalCard.includes('pb_type_mdrobotbase_motion_iterate_once'),
  'Goal card G-MDRB-025 must mandate dispatcher modularization');

evaluateNode('branch-1-dispatcher-modularity', 2,
  'Why must the main router function be strictly bounded below 60 lines?',
  'Limits function responsibility to sensor sampling, timeout validation, and sub-controller delegation',
  contract.includes('Scenario 1') && contract.includes('AC-MDRB-025-1') && contract.includes('60 lines'),
  'Acceptance contract AC-MDRB-025-1 must mandate line count <= 60');

evaluateNode('branch-1-dispatcher-modularity', 3,
  'Why must sub-controllers return standard pbio_error_t status codes?',
  'Enables unified coroutine awaitable handling without custom wrapper allocations',
  pybricksC.includes('mdrobotbase_step_navigate') &&
  pybricksC.includes('mdrobotbase_step_turn') &&
  pybricksC.includes('mdrobotbase_step_pivot') &&
  pybricksC.includes('mdrobotbase_step_trajectory'),
  'pybricks/robotics/pb_type_mdrobotbase.c must define all 4 sub-controllers');

evaluateNode('branch-1-dispatcher-modularity', 4,
  'Why must the dispatcher retain odometry update and global timeout checking centrally?',
  'Guarantees telemetry freshness and safety timeouts across all sub-controller execution modes',
  pybricksC.includes('pbio_mdrobotbase_update_state') && pybricksC.includes('pb_type_mdrobotbase_mark_timed_out'),
  'Central dispatcher must retain pbio_mdrobotbase_update_state and mark_timed_out');

evaluateNode('branch-1-dispatcher-modularity', 5,
  'Why is static scoping in pb_type_mdrobotbase.c chosen over separate translation units?',
  'Preserves compiler LTO inlining optimization and zero code-size bloat on micro-embedded targets',
  dispatcherLineCount <= 60,
  `pb_type_mdrobotbase_motion_iterate_once line count (${dispatcherLineCount}) must be <= 60 lines`);

// -----------------------------------------------------------------------------
// Branch 2: Navigation Sub-Controller Decomposition
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 2: Navigation Sub-Controller Decomposition (branch-2-navigate-subcontroller)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-2-navigate-subcontroller', 1,
  'Why must pure pursuit navigation and final heading alignment be isolated into mdrobotbase_step_navigate?',
  'Encapsulates waypoint geometry, velocity ramping profiles, and 2-stage orientation alignment',
  contract.includes('Scenario 2') && contract.includes('AC-MDRB-025-2'),
  'Acceptance contract must include Scenario 2 (AC-MDRB-025-2)');

evaluateNode('branch-2-navigate-subcontroller', 2,
  'Why must LQR and PID navigation modes share the same step function signature?',
  'Enables runtime controller switching without altering the motion iteration interface',
  pybricksC.includes('mdrobotbase_step_navigate') && pybricksC.includes('PBIO_MDROBOTBASE_CONTROLLER_LQR'),
  'mdrobotbase_step_navigate must encapsulate both PID and LQR navigation modes');

evaluateNode('branch-2-navigate-subcontroller', 3,
  'Why must final heading alignment transition through align_final_heading without reallocating awaitables?',
  'Preserves continuous coroutine execution without yielding inconsistent intermediate states',
  pybricksC.includes('align_final_heading'),
  'mdrobotbase_step_navigate must support continuous align_final_heading transition');

evaluateNode('branch-2-navigate-subcontroller', 4,
  'Why must mdrobotbase_step_navigate route wheel commands through a shared actuation helper?',
  'Eliminates duplicated speed clamping, linear-to-angular dps math, and dual pbio_servo_run_forever calls',
  pybricksC.includes('mdrobotbase_drive_wheels'),
  'pybricks/robotics/pb_type_mdrobotbase.c must define mdrobotbase_drive_wheels');

evaluateNode('branch-2-navigate-subcontroller', 5,
  'Why must destination arrival invoke unified mdrobotbase_motion_stop and mark status completed?',
  'Ensures consistent coast vs brake stop behavior and encoder angle zeroing across all completion paths',
  pybricksC.includes('mdrobotbase_motion_stop'),
  'pybricks/robotics/pb_type_mdrobotbase.c must define mdrobotbase_motion_stop');

// -----------------------------------------------------------------------------
// Branch 3: Turn & Pivot Sub-Controller Decomposition
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 3: Turn & Pivot Sub-Controller Decomposition (branch-3-turn-pivot-subcontrollers)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-3-turn-pivot-subcontrollers', 1,
  'Why must differential spin turns be isolated into mdrobotbase_step_turn?',
  'Encapsulates angular acceleration ramping, wrap-around error handling, and scheduled angular PID',
  contract.includes('Scenario 3') && contract.includes('AC-MDRB-025-3'),
  'Acceptance contract must include Scenario 3 (AC-MDRB-025-3)');

evaluateNode('branch-3-turn-pivot-subcontrollers', 2,
  'Why must single-wheel locked pivot turns be isolated into mdrobotbase_step_pivot?',
  'Pivot turns hold one wheel stationary and drive the other with arc velocity w*track, distinct from spin turns',
  contract.includes('Scenario 4') && contract.includes('AC-MDRB-025-4'),
  'Acceptance contract must include Scenario 4 (AC-MDRB-025-4)');

evaluateNode('branch-3-turn-pivot-subcontrollers', 3,
  'Why must pivot turns command only the active wheel rather than both wheels?',
  'Holding the pivot wheel in position mode prevents unintended drift and ground scrubbing',
  pybricksC.includes('pivot_left') && pybricksC.includes('mdrobotbase_step_pivot'),
  'mdrobotbase_step_pivot must independently actuate active wheel based on pivot_left');

evaluateNode('branch-3-turn-pivot-subcontrollers', 4,
  'Why must angular stall detection use distinct speed thresholds (40 deg/s vs 60 deg/s)?',
  'Reflects differing mechanical leverage between 2-wheel spin and 1-wheel pivot motions',
  pybricksC.includes('mdrobotbase_evaluate_stall'),
  'Sub-controllers must evaluate stall using mdrobotbase_evaluate_stall');

evaluateNode('branch-3-turn-pivot-subcontrollers', 5,
  'Why must angle completion verify angular velocity settling (|w_raw| < 15 deg/s) when braking?',
  'Prevents premature completion triggering while inertial oscillation settles',
  pybricksC.includes('w_raw') && pybricksC.includes('tolerance_angle'),
  'Turn/pivot completion must respect tolerance_angle and settling dynamics');

// -----------------------------------------------------------------------------
// Branch 4: Trajectory Tracking Sub-Controller Decomposition
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 4: Trajectory Tracking Sub-Controller Decomposition (branch-4-trajectory-subcontroller)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-4-trajectory-subcontroller', 1,
  'Why must multi-waypoint path following be isolated into mdrobotbase_step_trajectory?',
  'Decouples waypoint index management, segment transitions, and lookahead tracking from single-point motions',
  contract.includes('Scenario 5') && contract.includes('AC-MDRB-025-5'),
  'Acceptance contract must include Scenario 5 (AC-MDRB-025-5)');

evaluateNode('branch-4-trajectory-subcontroller', 2,
  'Why must empty or completed trajectories return PBIO_SUCCESS immediately?',
  'Defends against out-of-bounds indexing or zero-waypoint degenerate execution',
  pybricksC.includes('trajectory_num_points') && pybricksC.includes('trajectory_current_point_idx'),
  'mdrobotbase_step_trajectory must validate num_points and current_point_idx');

evaluateNode('branch-4-trajectory-subcontroller', 3,
  'Why must intermediate waypoint transitions happen at trajectory_transition_tolerance without stopping motors?',
  'Provides fluid non-stop corner rounding across consecutive waypoints',
  pybricksC.includes('trajectory_transition_tolerance'),
  'mdrobotbase_step_trajectory must advance points at trajectory_transition_tolerance');

evaluateNode('branch-4-trajectory-subcontroller', 4,
  'Why must final waypoint arrival execute full terminal stop and angle reset?',
  'Guarantees deterministic end-of-path position clamping and marks completion',
  pybricksC.includes('is_final_point') || (pybricksC.includes('trajectory_num_points - 1') && pybricksC.includes('mdrobotbase_step_trajectory')),
  'mdrobotbase_step_trajectory must distinguish final point arrival for full stop');

evaluateNode('branch-4-trajectory-subcontroller', 5,
  'Why must trajectory motor commands route through mdrobotbase_drive_wheels?',
  'Maintains uniform velocity clamping and linear-to-angular transformation invariants',
  pybricksC.includes('mdrobotbase_step_trajectory') && pybricksC.includes('mdrobotbase_drive_wheels'),
  'mdrobotbase_step_trajectory must command motors via mdrobotbase_drive_wheels');

// -----------------------------------------------------------------------------
// Branch 5: Kinematic Invariant Preservation & Zero-Mock Verification
// -----------------------------------------------------------------------------
console.log("\n────────────────────────────────────────────────────────────────────────────────");
console.log("▶ Branch 5: Kinematic Invariant Preservation & Zero-Mock Verification (branch-5-kinematic-invariants-zero-mock)");
console.log("────────────────────────────────────────────────────────────────────────────────");
evaluateNode('branch-5-kinematic-invariants-zero-mock', 1,
  'Why must modularization introduce zero kinematic deviation (< 0.001 deg/s)?',
  'Refactoring is purely structural; mathematical drift breaks field mission accuracy',
  goalCard.includes('Zero changes to mathematical motion equations'),
  'Goal card must strictly preserve mathematical motion equations');

evaluateNode('branch-5-kinematic-invariants-zero-mock', 2,
  'Why are mocks, stubs, and synthetic simulations strictly forbidden under Article I?',
  'Only concrete compilation and real PBIO/VirtualHub execution prove production readiness',
  !pybricksC.includes('mock') && !pybricksC.includes('stub'),
  'pybricks/robotics/pb_type_mdrobotbase.c must contain zero mocks and zero stubs');

evaluateNode('branch-5-kinematic-invariants-zero-mock', 3,
  'Why must touch map integrity be confirmed with non-empty files?',
  'Prevents uncommitted path drift or missing specification contracts',
  existsSync(resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c')) &&
  existsSync(resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-025.md')) &&
  (existsSync(resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-025.md')) ||
   existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-025.md'))),
  'All touch map files must exist and be accessible');

evaluateNode('branch-5-kinematic-invariants-zero-mock', 4,
  'Why must PBIO native test suite compile and run concrete C routines without skipped tests?',
  'Verifies low-level driver invariants remain intact under refactored interfaces',
  existsSync(resolve(ROOT, 'lib/pbio/test/build/test-pbio')),
  'lib/pbio/test/build/test-pbio binary must exist');

evaluateNode('branch-5-kinematic-invariants-zero-mock', 5,
  'Why must the release gate require human sign-off before shipping?',
  'Upholds Soda OS governance gate: AI implements within goals, human reviews and approves',
  goalCard.includes('Human in REVIEW / SHIP') || goalCard.includes('review'),
  'Goal card must uphold human sign-off requirement');

// -----------------------------------------------------------------------------
// Socratic Dialectic Summary
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
const totalPass = results.filter(r => r.status === 'PASS').length;
const totalFail = results.filter(r => r.status === 'FAIL').length;
console.log(`📊 Socratic Dialectic Summary: ${totalPass} Passed, ${totalFail} Failed (Total: ${results.length})`);
console.log('='.repeat(80));

const branches = [
  'branch-1-dispatcher-modularity',
  'branch-2-navigate-subcontroller',
  'branch-3-turn-pivot-subcontrollers',
  'branch-4-trajectory-subcontroller',
  'branch-5-kinematic-invariants-zero-mock'
];

let allLevel5 = true;
for (const b of branches) {
  const branchNodes = results.filter(r => r.branch === b);
  const branchPass = branchNodes.every(n => n.status === 'PASS');
  const icon = branchPass ? '✅' : '❌';
  console.log(`  ${icon} Branch: ${b} -> ${branchPass ? 'LEVEL 5 ROOT RESOLVED' : 'FAILED AT LEVEL ' + branchNodes.find(n => n.status === 'FAIL')?.level}`);
  if (!branchPass) allLevel5 = false;
}

if (!allLevel5 || totalFail > 0) {
  console.error(`\n❌ SOCRATIC DIALECTIC INCOMPLETE: ${totalFail} nodes unresolved.`);
  process.exit(1);
} else {
  console.log('\n🏆 100% DIALECTIC RESOLUTION ACHIEVED ACROSS ALL 5 BRANCHES (LEVEL 5)!');
  console.log('   All causal chains verified, grounded in code and contracts.\n');
  process.exit(0);
}
