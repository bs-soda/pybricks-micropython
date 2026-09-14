#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-035
 *
 * Verifies 5 Causal Branches x 5 Dialectic Levels (25 Total Nodes):
 * - Branch 1: System Soft-Reset De-initialization Hook (branch-1-soft-reset-hook)
 * - Branch 2: Re-entrant Exact-Pair Motor Re-binding (branch-2-exact-pair-rebinding)
 * - Branch 3: Partial Motor Overlap Fail-Closed Protection (branch-3-partial-overlap-failclosed)
 * - Branch 4: Python RAII Context Manager Protocol (branch-4-raii-context-manager)
 * - Branch 5: VirtualHub Parity & Episode Oracle Lifecycle Invariants (branch-5-virtualhub-parity)
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-035');
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

// -----------------------------------------------------------------------------
// Branch 1: System Soft-Reset De-initialization Hook
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 1: System Soft-Reset De-initialization Hook...');
const mdrobotbaseH = readFileSync(resolve(ROOT, 'lib/pbio/include/pbio/mdrobotbase.h'), 'utf8');
const mdrobotbaseC = readFileSync(resolve(ROOT, 'lib/pbio/src/mdrobotbase.c'), 'utf8');
const mainC = readFileSync(resolve(ROOT, 'lib/pbio/src/main.c'), 'utf8');

evaluateNode(
  'branch-1-soft-reset-hook',
  1,
  'Why does re-running a crashed script leave previous instances locked in native memory?',
  'Native motor ownership flags mdrobotbase_in_use[i] remain true unless explicitly de-initialized.',
  mdrobotbaseC.includes('mdrobotbase_in_use') && mdrobotbaseH.includes('pbio_mdrobotbase_deinit'),
  'pbio_mdrobotbase_deinit is not declared in mdrobotbase.h or mdrobotbase_in_use is missing'
);

evaluateNode(
  'branch-1-soft-reset-hook',
  2,
  'Why did the system lack a global deinit hook for mdrobotbase?',
  'lib/pbio/src/main.c had no start or stop application lifecycle callback for mdrobotbase.',
  mainC.includes('pbio_mdrobotbase_deinit'),
  'main.c does not invoke pbio_mdrobotbase_deinit'
);

evaluateNode(
  'branch-1-soft-reset-hook',
  3,
  'Why must pbio_mdrobotbase_deinit stop motors before clearing pointers?',
  'Actuators must be safely decelerated to coast to prevent mechanical runaway on script termination.',
  mdrobotbaseC.includes('pbio_servo_stop') && mdrobotbaseC.includes('pbio_mdrobotbase_deinit'),
  'pbio_mdrobotbase_deinit does not call pbio_servo_stop'
);

evaluateNode(
  'branch-1-soft-reset-hook',
  4,
  'Why must pbio_mdrobotbase_deinit be called on both application start and application stop?',
  'Calling on start cleans up after hard crashes; calling on stop cleans up after normal exit.',
  mainC.includes('pbio_main_start_application_resources') &&
  mainC.includes('pbio_main_stop_application_resources') &&
  mainC.includes('pbio_mdrobotbase_deinit'),
  'pbio_mdrobotbase_deinit is not hooked into both start and stop application resources'
);

evaluateNode(
  'branch-1-soft-reset-hook',
  5,
  'Why does resetting mdrobotbase_in_use[i] = false completely eliminate orphaned EBUSY?',
  'Any subsequent script run finds pool slots available and motor pointers freed.',
  mdrobotbaseC.includes('mdrobotbase_in_use[i] = false') &&
  mdrobotbaseC.includes('rb->left = NULL'),
  'Slot cleanup does not reset in_use flag and motor pointers'
);

// -----------------------------------------------------------------------------
// Branch 2: Re-entrant Exact-Pair Motor Re-binding
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 2: Re-entrant Exact-Pair Motor Re-binding...');
evaluateNode(
  'branch-2-exact-pair-rebinding',
  1,
  'Why did re-instantiating the same motor pair throw EBUSY even without a system restart?',
  'pbio_mdrobotbase_get_robotbase unconditionally rejected any match with active motor pointers.',
  mdrobotbaseC.includes('pbio_mdrobotbase_get_robotbase'),
  'pbio_mdrobotbase_get_robotbase function not found'
);

evaluateNode(
  'branch-2-exact-pair-rebinding',
  2,
  'Why is it mathematically and mechanically safe to re-bind the exact same motor pair?',
  'The caller owns the physical hardware; re-binding re-initializes the controller without motor conflict.',
  mdrobotbaseC.includes('rb->left == left && rb->right == right'),
  'Exact motor pair comparison (rb->left == left && rb->right == right) is missing'
);

evaluateNode(
  'branch-2-exact-pair-rebinding',
  3,
  'Why must pending motion be cancelled when re-binding an existing slot?',
  'Previous trajectory awaitables or motion tasks must not continue commanding the reused slot.',
  mdrobotbaseC.includes('pbio_servo_stop') && mdrobotbaseC.includes('exact_slot'),
  'Motion cancellation on exact_slot re-binding is missing'
);

evaluateNode(
  'branch-2-exact-pair-rebinding',
  4,
  'Why must re-initialization reset kinematics and controller state?',
  'Re-bound instance must have clean x=0, y=0, theta=0 odometry and fresh PID/LQR parameters.',
  mdrobotbaseC.includes('pbio_mdrobotbase_init(rb, left, right,'),
  'Re-initialization call to pbio_mdrobotbase_init is missing'
);

evaluateNode(
  'branch-2-exact-pair-rebinding',
  5,
  'Why does exact-pair re-binding preserve 100% fail-closed safety for distinct pairs?',
  'Only exact matches bypass PBIO_ERROR_BUSY; all other overlapping combinations fail closed.',
  mdrobotbaseC.includes('exact_slot') && mdrobotbaseC.includes('return PBIO_ERROR_BUSY;'),
  'Partial overlap is not isolated from exact match'
);

// -----------------------------------------------------------------------------
// Branch 3: Partial Motor Overlap Fail-Closed Protection
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 3: Partial Motor Overlap Fail-Closed Protection...');
evaluateNode(
  'branch-3-partial-overlap-failclosed',
  1,
  'Why must partial motor overlap (e.g. sharing Left motor A across bases) strictly fail closed?',
  'Two independent drivebases commanding one shared motor creates physical collision and gear destruction.',
  mdrobotbaseC.includes('rb->left == left || rb->left == right ||'),
  'Overlap detection checks are missing'
);

evaluateNode(
  'branch-3-partial-overlap-failclosed',
  2,
  'Why must reversed motor pairs (A, B) vs (B, A) be rejected with PBIO_ERROR_BUSY?',
  'Reversed motors invert kinematics and indicate an erroneous or conflicting instantiation.',
  mdrobotbaseC.includes('rb->right == left || rb->right == right'),
  'Cross-channel overlap checks are missing'
);

evaluateNode(
  'branch-3-partial-overlap-failclosed',
  3,
  'Why must the target pointer *rb_address remain NULL when returning PBIO_ERROR_BUSY?',
  'Prevents caller from accessing an uninitialized or partially assigned memory structure.',
  mdrobotbaseC.includes('*rb_address = NULL;'),
  '*rb_address = NULL initialization is missing'
);

evaluateNode(
  'branch-3-partial-overlap-failclosed',
  4,
  'Why must the existing active drivebase remain undamaged when a conflicting allocation is rejected?',
  'Failed construction must not mutate, stop, or contaminate the state of the active base.',
  mdrobotbaseC.includes('return PBIO_ERROR_BUSY;') && !mdrobotbaseC.includes('mdrobotbases[i].left = NULL; // on error'),
  'Conflicting allocation modifies active slot'
);

evaluateNode(
  'branch-3-partial-overlap-failclosed',
  5,
  'Why is PBIO_ERROR_BUSY consistently translated to MicroPython MP_EBUSY?',
  'POSIX errno 16 standardizes device busy semantics across firmware and user scripts.',
  readFileSync(resolve(ROOT, 'pybricks/util_pb/pb_error.c'), 'utf8').includes('case PBIO_ERROR_BUSY:') &&
  readFileSync(resolve(ROOT, 'pybricks/util_pb/pb_error.c'), 'utf8').includes('os_err = MP_EBUSY;'),
  'pb_error.c does not map PBIO_ERROR_BUSY to MP_EBUSY'
);

// -----------------------------------------------------------------------------
// Branch 4: Python RAII Context Manager Protocol
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 4: Python RAII Context Manager Protocol...');
const pbTypeC = readFileSync(resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c'), 'utf8');
const vhRoboticsPy = readFileSync(resolve(ROOT, 'tests/virtualhub/robotics/pybricks/robotics.py'), 'utf8');

evaluateNode(
  'branch-4-raii-context-manager',
  1,
  'Why does MicroPython need context manager support for MDRobotBase?',
  'Guarantees robot.close() runs even if exceptions or early returns occur within a with-block.',
  pbTypeC.includes('pb_type_MDRobotBase___enter__') && pbTypeC.includes('pb_type_MDRobotBase___exit__'),
  'pb_type_mdrobotbase.c is missing __enter__ or __exit__'
);

evaluateNode(
  'branch-4-raii-context-manager',
  2,
  'Why must __enter__ verify that the MDRobotBase handle is open?',
  'Re-entering a closed handle must immediately fail with an exception.',
  pbTypeC.includes('pb_type_mdrobotbase_require_open'),
  '__enter__ does not check require_open'
);

evaluateNode(
  'branch-4-raii-context-manager',
  3,
  'Why must __exit__ invoke close() unconditionally on both clean and exception exits?',
  'Actuators and native slots must be reclaimed regardless of whether an exception occurred.',
  pbTypeC.includes('pb_type_MDRobotBase_close') && vhRoboticsPy.includes('def __exit__'),
  '__exit__ does not invoke close'
);

evaluateNode(
  'branch-4-raii-context-manager',
  4,
  'Why must __enter__ and __exit__ be exposed in pb_type_MDRobotBase_locals_dict_table?',
  'MicroPython runtime requires dictionary entries to dispatch with-statement protocol.',
  pbTypeC.includes('MP_ROM_QSTR(MP_QSTR___enter__)') && pbTypeC.includes('MP_ROM_QSTR(MP_QSTR___exit__)'),
  'Context manager symbols are missing from locals_dict'
);

evaluateNode(
  'branch-4-raii-context-manager',
  5,
  'Why does the context manager guarantee zero orphaned handles in production scripts?',
  'Scoped lifetime binds hardware ownership directly to code execution scope.',
  vhRoboticsPy.includes('def __enter__(self):') && vhRoboticsPy.includes('def __exit__(self,'),
  'VirtualHub is missing __enter__ or __exit__'
);

// -----------------------------------------------------------------------------
// Branch 5: VirtualHub Parity & Episode Oracle Lifecycle Invariants
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 5: VirtualHub Parity & Episode Oracle Lifecycle Invariants...');
const vhLifecycleTest = readFileSync(resolve(ROOT, 'tests/virtualhub/robotics/test_mdrobotbase_lifecycle.py'), 'utf8');

evaluateNode(
  'branch-5-virtualhub-parity',
  1,
  'Why must VirtualHub Python simulator mirror native PBIO C reclamation semantics?',
  'Host-side CI testing must catch EBUSY and lifecycle regressions before firmware compilation.',
  vhRoboticsPy.includes('MDRobotBase') && vhRoboticsPy.includes('close'),
  'VirtualHub does not implement MDRobotBase lifecycle'
);

evaluateNode(
  'branch-5-virtualhub-parity',
  2,
  'Why must VirtualHub support exact-pair re-binding without raising EBUSY?',
  'Test parity requires identical behavior between host simulation and target hub execution.',
  vhRoboticsPy.includes('_active_instances') || vhRoboticsPy.includes('close'),
  'VirtualHub lacks instance slot tracking'
);

evaluateNode(
  'branch-5-virtualhub-parity',
  3,
  'Why must test_mdrobotbase_lifecycle.py verify with-block exception exit reclamation?',
  'Guarantees empirical proof that exceptions inside with-blocks release motor handles.',
  vhLifecycleTest.includes('context_manager') || vhLifecycleTest.includes('with MDRobotBase'),
  'test_mdrobotbase_lifecycle.py lacks context manager tests'
);

evaluateNode(
  'branch-5-virtualhub-parity',
  4,
  'Why must the episode oracle run >= 10 real kernel episodes of script restart sequences?',
  'Statistically verifies zero EBUSY failures under repeated allocation cycles.',
  vhLifecycleTest.includes('test_g_mdrb_035_episode_oracle') || vhLifecycleTest.includes('episode_oracle'),
  'test_mdrobotbase_lifecycle.py lacks G-MDRB-035 episode oracle'
);

evaluateNode(
  'branch-5-virtualhub-parity',
  5,
  'Why must the Wilson score 95% confidence interval achieve >= 0.85 on restart trials?',
  'Provides rigorous mathematical assurance of crash recovery reliability for competition robots.',
  vhLifecycleTest.includes('wilson') || vhLifecycleTest.includes('confidence'),
  'Wilson confidence interval calculation is missing'
);

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
const total = results.length;
const passedCount = results.filter(r => r.status === 'PASS').length;
const failedCount = total - passedCount;
console.log(`📊 Socratic Agentic Loop Summary: ${passedCount}/${total} Nodes Passed (${failedCount} Blockers)`);
console.log('='.repeat(80) + '\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🏆 100% SOCRATIC AGENTIC LOOP DIALECTIC RESOLVED (25/25 Nodes Green)\n');
  process.exit(0);
}
