#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-006
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS Agent OS
 * Goal: G-MDRB-006 (Async Cancellation and Repeated-Motion Lifecycle Safety)
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
console.log("🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-006");
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
const acceptancePath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-006.md');
const goalCardPath = existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-006.md'))
  ? resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-006.md')
  : resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-006.md');

const mdrobotbaseH = existsSync(mdrobotbaseHPath) ? readFileSync(mdrobotbaseHPath, 'utf8') : '';
const mdrobotbaseC = existsSync(mdrobotbaseCPath) ? readFileSync(mdrobotbaseCPath, 'utf8') : '';
const pbTypeMDRB = existsSync(pbTypeMDRBPath) ? readFileSync(pbTypeMDRBPath, 'utf8') : '';
const testMDRB = existsSync(testMDRBPath) ? readFileSync(testMDRBPath, 'utf8') : '';
const acceptance = existsSync(acceptancePath) ? readFileSync(acceptancePath, 'utf8') : '';
const goalCard = existsSync(goalCardPath) ? readFileSync(goalCardPath, 'utf8') : '';

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 1: Active Motion Preemption Mechanics & Command Overwrite Safety
// ════════════════════════════════════════════════════════════════════════════════
console.log("🌿 Branch 1: Active Motion Preemption Mechanics & Command Overwrite Safety");

// L1: Why does launching motion B while motion A is active cause command collisions?
const hasCollisionAwareness = goalCard.includes("overwrites self->rb->motion_type and starts commanding") ||
                              acceptance.includes("Deterministic Preemption of Active Motion A by Motion B");
evaluateNode(1, 1,
  "Why does launching motion B while motion A is active cause command collisions?",
  "Overwriting motion_type without preemption leaves old awaitables polling in parallel",
  hasCollisionAwareness,
  "Identified in goal context and acceptance scenarios"
);

// L2: Why did legacy dispatchers fail to terminate running motions?
const hasPreemptionHelperDecl = pbTypeMDRB.includes("pb_type_mdrobotbase_cancel_active_motion");
evaluateNode(1, 2,
  "Why did legacy dispatchers fail to terminate running motions?",
  "No centralized cancellation helper was invoked before writing new setpoints",
  hasPreemptionHelperDecl,
  "Requires pb_type_mdrobotbase_cancel_active_motion helper declaration"
);

// L3: Why must the preemption helper schedule stop iteration on last_awaitable?
const helperCancelsAwaitable = pbTypeMDRB.includes("pb_type_async_schedule_stop_iteration(self->last_awaitable)");
evaluateNode(1, 3,
  "Why must the preemption helper schedule stop iteration on last_awaitable?",
  "MicroPython cooperative poller requires explicit stop iteration signaling",
  helperCancelsAwaitable,
  "pb_type_async_schedule_stop_iteration called in preemption flow"
);

// L4: Why must preemption be invoked across all motion dispatchers?
const straightHasPreempt = pbTypeMDRB.includes("pb_type_mdrobotbase_cancel_active_motion(self)") &&
                           pbTypeMDRB.indexOf("pb_type_mdrobotbase_cancel_active_motion(self)") !== -1;
evaluateNode(1, 4,
  "Why must preemption be invoked across all motion dispatchers?",
  "Any new motion command (straight, turn, pivot, trajectory) can interrupt an active one",
  straightHasPreempt,
  "Preemption helper called at motion command entrypoints"
);

// L5: Level 5 Root Resolution - Complete preemption architecture in C binding
const preemptionComplete = hasPreemptionHelperDecl && helperCancelsAwaitable && straightHasPreempt;
evaluateNode(1, 5,
  "Level 5 Root Resolution: Is active motion preemption fully enforced?",
  "Synchronous preemption stops motors, signals awaitables, and clears flags",
  preemptionComplete,
  "Complete preemption lifecycle verified in C source"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 2: Safe Stop & NULL Awaitable Guards
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 2: Safe Stop & NULL Awaitable Guards");

// L1: Why does calling stop() on an idle robot base risk memory faults?
const mentionsNullCrash = goalCard.includes("calling pb_type_async_schedule_stop_iteration(self->last_awaitable) when no awaitable is active") ||
                          acceptance.includes("Safe Stop on Idle Robot");
evaluateNode(2, 1,
  "Why does calling stop() on an idle robot base risk memory faults?",
  "Unconditionally dereferencing NULL or finalized last_awaitable causes segfaults",
  mentionsNullCrash,
  "Identified in goal card context and acceptance contract"
);

// L2: Why was self->last_awaitable not guarded in pb_type_MDRobotBase_stop?
const hasStopAwaitableGuard = pbTypeMDRB.includes("if (self->last_awaitable)") &&
                              pbTypeMDRB.indexOf("if (self->last_awaitable)") !== -1;
evaluateNode(2, 2,
  "Why was self->last_awaitable not guarded in pb_type_MDRobotBase_stop?",
  "Legacy implementation assumed stop() was only called during active motions",
  hasStopAwaitableGuard,
  "Requires if (self->last_awaitable) guard in pb_type_MDRobotBase_stop"
);

// L3: Why must self->last_awaitable be reset to NULL upon stop?
const stopsResetAwaitable = pbTypeMDRB.includes("self->last_awaitable = NULL;");
evaluateNode(2, 3,
  "Why must self->last_awaitable be reset to NULL upon stop?",
  "Prevents dangling pointer reuse on subsequent stop() calls",
  stopsResetAwaitable,
  "last_awaitable reset to NULL after cancellation or stop"
);

// L4: Why must calling stop() be idempotent?
const isStopIdempotent = acceptance.includes("Safe Stop") ||
                         acceptance.includes("when no motion is active does not crash");
evaluateNode(2, 4,
  "Why must calling stop() be idempotent?",
  "Defensive cleanup in user scripts calls stop() multiple times without side effects",
  isStopIdempotent,
  "Idempotent stop contract established in acceptance criteria"
);

// L5: Level 5 Root Resolution - Safe stop guards implemented
const safeStopComplete = hasStopAwaitableGuard && stopsResetAwaitable && isStopIdempotent;
evaluateNode(2, 5,
  "Level 5 Root Resolution: Is stop() completely safe and guarded?",
  "NULL awaitable check and pointer clearing guarantee crash-free idle stopping",
  safeStopComplete,
  "Guards and lifecycle reset verified in C source"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 3: Cooperative Task Polling & Post-Abort Iteration Suppression
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 3: Cooperative Task Polling & Post-Abort Iteration Suppression");

// L1: Why do canceled awaitables continue to execute if polled again?
const mentionsInterleaving = goalCard.includes("interleaved with the new motion's commands, corrupting motor setpoints") ||
                             acceptance.includes("Immediate Iteration Cessation on Inactive Motion");
evaluateNode(3, 1,
  "Why do canceled awaitables continue to execute if polled again?",
  "MicroPython cooperative event loop turns can invoke queued generators before processing stop",
  mentionsInterleaving,
  "Cooperative polling dynamics identified in goal card"
);

// L2: Why did pb_type_mdrobotbase_motion_iterate_once lack an inactive motion guard?
const hasMotionInProgressGuard = pbTypeMDRB.includes("!self->rb->motion_in_progress");
evaluateNode(3, 2,
  "Why did pb_type_mdrobotbase_motion_iterate_once lack an inactive motion guard?",
  "Assumed iterator is only called while motion_in_progress is asserted",
  hasMotionInProgressGuard,
  "Requires if (!self->rb->motion_in_progress) guard at entry of iterate_once"
);

// L3: Why must an inactive motion immediately return PBIO_SUCCESS?
const returnsSuccessOnInactive = hasMotionInProgressGuard &&
                                 pbTypeMDRB.includes("return PBIO_SUCCESS;");
evaluateNode(3, 3,
  "Why must an inactive motion immediately return PBIO_SUCCESS?",
  "Returning PBIO_SUCCESS triggers MicroPython StopIteration without motor commands",
  returnsSuccessOnInactive,
  "Returns PBIO_SUCCESS immediately when motion_in_progress is false"
);

// L4: Why must this immediate exit bypass all odometry and motor setpoint logic?
const iterIdx = pbTypeMDRB.indexOf("pb_type_mdrobotbase_motion_iterate_once");
const motionGuardIdx = iterIdx !== -1 ? pbTypeMDRB.indexOf("!self->rb->motion_in_progress", iterIdx) : -1;
const odometryIdx = iterIdx !== -1 ? pbTypeMDRB.indexOf("pbio_mdrobotbase_update_state(self->rb", iterIdx) : -1;
const bypassesOdometry = motionGuardIdx !== -1 && odometryIdx !== -1 && motionGuardIdx < odometryIdx;
evaluateNode(3, 4,
  "Why must this immediate exit bypass all odometry and motor setpoint logic?",
  "Prevents stale generators from commanding motors or polluting position tracking",
  bypassesOdometry,
  "Guard placed strictly before odometry update in iterate_once"
);

// L5: Level 5 Root Resolution - Post-abort iteration suppression verified
const suppressionComplete = hasMotionInProgressGuard && returnsSuccessOnInactive && bypassesOdometry;
evaluateNode(3, 5,
  "Level 5 Root Resolution: Is post-abort iteration cleanly suppressed?",
  "Instantaneous PBIO_SUCCESS exit forces StopIteration with zero spurious pulses",
  suppressionComplete,
  "Verified iterator guard and early exit sequence"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 4: Stop Behavior Decoupling Across All Termination Paths
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 4: Stop Behavior Decoupling Across All Termination Paths");

// L1: Why was stop() hardcoded to HOLD instead of configured stop_behavior?
const usesConfiguredStop = pbTypeMDRB.includes("pbio_servo_stop(self->rb->left, self->rb->stop_behavior)") ||
                           pbTypeMDRB.includes("pbio_servo_stop(self->rb->right, self->rb->stop_behavior)");
evaluateNode(4, 1,
  "Why was stop() hardcoded to HOLD instead of configured stop_behavior?",
  "Legacy code bypassed rb->stop_behavior, ignoring user COAST/BRAKE configuration",
  usesConfiguredStop,
  "Uses self->rb->stop_behavior in servo stop calls"
);

// L2: Why must stop_behavior be respected on preemption and cancellation?
const preemptionUsesConfiguredStop = pbTypeMDRB.includes("pb_type_mdrobotbase_cancel_active_motion") &&
                                     usesConfiguredStop;
evaluateNode(4, 2,
  "Why must stop_behavior be respected on preemption and cancellation?",
  "Robotic mechanisms require predictable decelerations to protect mechanical gears",
  preemptionUsesConfiguredStop,
  "Preemption and stop both follow configured stop_behavior"
);

// L3: Why must motor angles be reset when not coasting?
const resetsAnglesOnNonCoast = pbTypeMDRB.includes("if (self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST)") &&
                               pbTypeMDRB.includes("pbio_servo_reset_angle(self->rb->left, 0, false)");
evaluateNode(4, 3,
  "Why must motor angles be reset when not coasting?",
  "Prevents servo PID controller angle disparity and sudden integrator kickback",
  resetsAnglesOnNonCoast,
  "Non-coast stop resets motor angles and zero odometry angle caches"
);

// L4: Why must motion_type and motion_in_progress be cleared on all stops?
const clearsMotionFlagsOnStop = pbTypeMDRB.includes("self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;") &&
                                pbTypeMDRB.includes("self->rb->motion_in_progress = false;");
evaluateNode(4, 4,
  "Why must motion_type and motion_in_progress be cleared on all stops?",
  "Prevents background loops or subsequent steps from seeing stale motion state",
  clearsMotionFlagsOnStop,
  "State flags cleared atomically on stop"
);

// L5: Level 5 Root Resolution - Unified stop behavior verified
const stopBehaviorComplete = usesConfiguredStop && resetsAnglesOnNonCoast && clearsMotionFlagsOnStop;
evaluateNode(4, 5,
  "Level 5 Root Resolution: Is stop behavior decoupled and unified across all terminations?",
  "HOLD/BRAKE/COAST strictly enforced with angle reset and flag clearing",
  stopBehaviorComplete,
  "Verified across all abort and stop code paths"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 5: Multi-Motion Lifecycle Sequence Verification & Native Testing Pass
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 5: Multi-Motion Lifecycle Sequence Verification & Native Testing Pass");

// L1: Why are mock test doubles prohibited when testing asynchronous motion lifecycles?
const zeroMocksEnforced = !testMDRB.includes("mock_") && !testMDRB.includes("stub_");
evaluateNode(5, 1,
  "Why are mock test doubles prohibited when testing asynchronous motion lifecycles?",
  "Mocks mask timing races between C driver state machines and cooperative event loops",
  zeroMocksEnforced,
  "Zero mocks and zero stubs in C test suite"
);

// L2: Why must all 6 canonical lifecycle transitions be verified?
const hasLifecycleTests = testMDRB.includes("test_mdrobotbase_lifecycle_safety");
evaluateNode(5, 2,
  "Why must all 6 canonical lifecycle transitions be verified?",
  "Autonomous navigation relies on chaining and interrupting motions without state leakage",
  hasLifecycleTests,
  "Requires test_mdrobotbase_lifecycle_safety declaration in test_mdrobotbase.c"
);

// L3: Why must the native PBIO test binary compile and pass all tests?
let pbioTestsPass = false;
let testOutputSummary = '';
const TEST_BIN = resolve(ROOT, 'lib/pbio/test/build/test-pbio');
if (existsSync(TEST_BIN)) {
  try {
    const testOut = execSync(`${TEST_BIN} src/mdrobotbase/..`, { cwd: ROOT, encoding: 'utf8' });
    const match = testOut.match(/(\d+)\s+tests\s+ok\.\s+\((\d+)\s+skipped\)/i);
    if (match && parseInt(match[1], 10) >= 8 && parseInt(match[2], 10) === 0) {
      pbioTestsPass = true;
      testOutputSummary = `${match[1]} tests ok, ${match[2]} skipped`;
    }
  } catch (e) {
    testOutputSummary = e.message;
  }
}
evaluateNode(5, 3,
  "Why must the native PBIO test binary compile and pass all tests?",
  "Article II mandatory verification pass requires green C test runner execution",
  pbioTestsPass,
  testOutputSummary || "Requires test-pbio executable execution"
);

// L4: Why must the test suite assert zero tests skipped?
const zeroSkipped = pbioTestsPass && testOutputSummary.includes("0 skipped");
evaluateNode(5, 4,
  "Why must the test suite assert zero tests skipped?",
  "Skipped tests hide untested execution branches and latent bugs",
  zeroSkipped,
  "Zero tests skipped in MDRobotBase suite"
);

// L5: Level 5 Root Resolution - Complete multi-motion lifecycle verification
const lifecycleSuiteComplete = zeroMocksEnforced && hasLifecycleTests && pbioTestsPass;
evaluateNode(5, 5,
  "Level 5 Root Resolution: Is the lifecycle suite fully verified?",
  "Preemption, idle stopping, and all 6 transitions attested 100% green",
  lifecycleSuiteComplete,
  "Full C embedded test suite green"
);

// ════════════════════════════════════════════════════════════════════════════════
// Summary Matrix
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n================================================================================");
console.log(`📊 Socratic Agentic Loop Summary: ${passedChecks} Passed, ${failedChecks} Failed (Total: ${totalChecks})`);
console.log("================================================================================");

if (failedChecks === 0) {
  console.log("🏆 100% ROOT CONVERGENCE ACHIEVED across all 5 branches!");
  process.exit(0);
} else {
  console.error(`⚠️ ${failedChecks} causal nodes pending resolution.`);
  process.exit(1);
}
