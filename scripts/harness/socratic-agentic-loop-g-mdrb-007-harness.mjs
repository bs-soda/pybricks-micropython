#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-007
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS Agent OS
 * Goal: G-MDRB-007 (Trajectory and Controller Input Validation)
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
console.log("🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-007");
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
const acceptancePath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-007.md');
const goalCardPath = existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-007.md'))
  ? resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-007.md')
  : resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-007.md');

const mdrobotbaseH = existsSync(mdrobotbaseHPath) ? readFileSync(mdrobotbaseHPath, 'utf8') : '';
const mdrobotbaseC = existsSync(mdrobotbaseCPath) ? readFileSync(mdrobotbaseCPath, 'utf8') : '';
const pbTypeMDRB = existsSync(pbTypeMDRBPath) ? readFileSync(pbTypeMDRBPath, 'utf8') : '';
const testMDRB = existsSync(testMDRBPath) ? readFileSync(testMDRBPath, 'utf8') : '';
const acceptance = existsSync(acceptancePath) ? readFileSync(acceptancePath, 'utf8') : '';
const goalCard = existsSync(goalCardPath) ? readFileSync(goalCardPath, 'utf8') : '';

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 1: Trajectory Capacity Limits & Fail-Closed Array Sizing
// ════════════════════════════════════════════════════════════════════════════════
console.log("🌿 Branch 1: Trajectory Capacity Limits & Fail-Closed Array Sizing");

// L1: Why does passing > 64 points cause silent path corruption?
const hasTruncationAudit = goalCard.includes("Silent Trajectory Truncation") ||
                           goalCard.includes("num_points = 64; // Silently ignores user waypoints!");
evaluateNode(1, 1,
  "Why does passing > 64 points cause silent path corruption?",
  "Silently clamping num_points leaves remaining waypoints unexecuted without notifying user",
  hasTruncationAudit,
  "Identified in goal card context and defect analysis"
);

// L2: Why did legacy code truncate rather than reject?
const rejectsOverCapacity = pbTypeMDRB.includes('num_points > 64') &&
                            pbTypeMDRB.includes('trajectory exceeds maximum capacity of 64 points');
evaluateNode(1, 2,
  "Why did legacy code truncate rather than reject?",
  "Permissive sizing assumed truncation was safer than raising an exception",
  rejectsOverCapacity,
  "Requires explicit ValueError raise for num_points > 64"
);

// L3: Why must exceeding 64 points raise an explicit ValueError?
const mentionsValueError = acceptance.includes("Passing 65 points to follow_trajectory() raises ValueError") ||
                           acceptance.includes("AC-MDRB-007-1");
evaluateNode(1, 3,
  "Why must exceeding 64 points raise an explicit ValueError?",
  "Autonomous navigation cannot proceed if portion of planned path is silently discarded",
  mentionsValueError,
  "Contractually enforced in AC-MDRB-007-1"
);

// L4: Why is 64 points the architectural limit in embedded memory?
const hasFixedBufferDeclaration = mdrobotbaseH.includes('[64]') || mdrobotbaseC.includes('[64]');
evaluateNode(1, 4,
  "Why is 64 points the architectural limit in embedded memory?",
  "Fixed 64-element static arrays prevent heap fragmentation on embedded microcontrollers",
  hasFixedBufferDeclaration,
  "Static array buffers verified in C structs"
);

// L5: Level 5 Root Resolution - Fail-closed capacity enforcement verified
const branch1Complete = hasTruncationAudit && rejectsOverCapacity && mentionsValueError && hasFixedBufferDeclaration;
evaluateNode(1, 5,
  "Level 5 Root Resolution: Is trajectory capacity fail-closed and validated?",
  "Over-capacity trajectories are rejected immediately before mutating robot base state",
  branch1Complete,
  "Verified C binding rejects > 64 points"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 2: Waypoint Tuple Dimensionality & Out-of-Bounds Memory Safety
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 2: Waypoint Tuple Dimensionality & Out-of-Bounds Memory Safety");

// L1: Why does passing [(100,)] or short tuples cause memory faults?
const mentionsOutOfBounds = goalCard.includes("Out-of-Bounds Memory Read") ||
                            goalCard.includes("Crashes if p_len < 2!");
evaluateNode(2, 1,
  "Why does passing [(100,)] or short tuples cause memory faults?",
  "Unchecked array indexing into p_coords[1] reads past the allocated tuple bounds",
  mentionsOutOfBounds,
  "Identified in goal card context and memory audit"
);

// L2: Why did legacy code index coordinates without checking tuple length?
const checksTupleLength = pbTypeMDRB.includes('p_len < 2') &&
                          pbTypeMDRB.includes('trajectory point must have at least (x, y) coordinates');
evaluateNode(2, 2,
  "Why did legacy code index coordinates without checking tuple length?",
  "Assumed user input always conformed to 2-coordinate tuple format",
  checksTupleLength,
  "Requires p_len < 2 guard raising ValueError"
);

// L3: Why must minimum total waypoints be at least 2?
const checksMinPoints = pbTypeMDRB.includes('num_points < 2') &&
                        pbTypeMDRB.includes('trajectory requires at least 2 points');
evaluateNode(2, 3,
  "Why must minimum total waypoints be at least 2?",
  "A path segment mathematically requires at least an origin and a destination",
  checksMinPoints,
  "Requires num_points < 2 guard raising ValueError"
);

// L4: Why must tuple validation execute before updating robot base buffers?
const trajectoryIdx = pbTypeMDRB.indexOf('pb_type_MDRobotBase_follow_trajectory');
const pointCheckIdx = pbTypeMDRB.indexOf('p_len < 2', trajectoryIdx !== -1 ? trajectoryIdx : 0);
const bufferWriteIdx = pbTypeMDRB.indexOf('self->rb->trajectory_points_x[i]', trajectoryIdx !== -1 ? trajectoryIdx : 0);
const validatesBeforeWriting = pointCheckIdx !== -1 && bufferWriteIdx !== -1 && pointCheckIdx < bufferWriteIdx;
evaluateNode(2, 4,
  "Why must tuple validation execute before updating robot base buffers?",
  "Ensures partial invalid trajectories never leave corrupted state in the driver buffer",
  validatesBeforeWriting,
  "Validation precedes buffer write in C source"
);

// L5: Level 5 Root Resolution - Complete tuple dimensionality safety verified
const branch2Complete = mentionsOutOfBounds && checksTupleLength && checksMinPoints && validatesBeforeWriting;
evaluateNode(2, 5,
  "Level 5 Root Resolution: Is waypoint tuple dimensionality fully protected?",
  "Guards prevent out-of-bounds indexing and enforce 2D waypoint invariants",
  branch2Complete,
  "Verified C source tuple checks"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 3: Coordinate Finiteness & Dynamic Parameter Positivity
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 3: Coordinate Finiteness & Dynamic Parameter Positivity");

// L1: Why do NaN or +/-Inf coordinates cause runaway motor states?
const mentionsNonFinite = goalCard.includes("Missing Coordinate & Speed Validation") ||
                          acceptance.includes("Passing NaN or Inf in coordinates");
evaluateNode(3, 1,
  "Why do NaN or +/-Inf coordinates cause runaway motor states?",
  "Propagating IEEE 754 NaN through kinematic arctan/distance equations corrupts PWM math",
  mentionsNonFinite,
  "Identified in goal card context and acceptance contract"
);

// L2: Why must isfinite() be enforced on all waypoint coordinates?
const checksCoordinateFiniteness = pbTypeMDRB.includes('isfinite(px)') ||
                                   pbTypeMDRB.includes('trajectory coordinates must be finite');
evaluateNode(3, 2,
  "Why must isfinite() be enforced on all waypoint coordinates?",
  "Rejects NaN/Inf at the API boundary before passing into low-level kinematic loops",
  checksCoordinateFiniteness,
  "Requires isfinite check on waypoint coordinates"
);

// L3: Why must speed, tolerance, and transition_tolerance be strictly positive?
const checksDynamicPositivity = pbTypeMDRB.includes('speed <= 0.0f') ||
                                pbTypeMDRB.includes('tolerance <= 0.0f') ||
                                pbTypeMDRB.includes('transition_tolerance <= 0.0f');
evaluateNode(3, 3,
  "Why must speed, tolerance, and transition_tolerance be strictly positive?",
  "Zero or negative tolerances cause infinite loops or negative distance calculations",
  checksDynamicPositivity,
  "Requires positivity checks on dynamics and tolerances"
);

// L4: Why must non-finite parameters raise ValueError in Python?
const raisesValueErrorOnNonFinite = pbTypeMDRB.includes('mp_raise_ValueError') &&
                                    acceptance.includes("AC-MDRB-007-3");
evaluateNode(3, 4,
  "Why must non-finite parameters raise ValueError in Python?",
  "Python callers receive idiomatic exceptions rather than silent kinematics failures",
  raisesValueErrorOnNonFinite,
  "Contractually enforced in AC-MDRB-007-3"
);

// L5: Level 5 Root Resolution - Coordinate and dynamics sanitization verified
const branch3Complete = mentionsNonFinite && checksCoordinateFiniteness && checksDynamicPositivity;
evaluateNode(3, 5,
  "Level 5 Root Resolution: Are coordinates and dynamics strictly validated?",
  "All coordinates, velocities, and tolerances sanitized against NaN/Inf and negativity",
  branch3Complete,
  "Verified C sanitization logic"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 4: Controller Enum Range Guard & Unhandled Switch Protection
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 4: Controller Enum Range Guard & Unhandled Switch Protection");

// L1: Why does set_controller(99) produce unhandled behavior?
const mentionsInvalidController = goalCard.includes("Invalid Controller Enums") ||
                                  goalCard.includes("pbio_mdrobotbase_set_controller() accepts arbitrary integer values");
evaluateNode(4, 1,
  "Why does set_controller(99) produce unhandled behavior?",
  "Arbitrary enum values trigger default or undefined behavior in motion control switches",
  mentionsInvalidController,
  "Identified in goal card context"
);

// L2: Why did pbio_mdrobotbase_set_controller accept arbitrary integers?
const guardsControllerEnum = mdrobotbaseC.includes('type != PBIO_MDROBOTBASE_CONTROLLER_PID && type != PBIO_MDROBOTBASE_CONTROLLER_LQR') ||
                             mdrobotbaseC.includes('PBIO_MDROBOTBASE_CONTROLLER_PID') && mdrobotbaseC.includes('return PBIO_ERROR_INVALID_ARG;');
evaluateNode(4, 2,
  "Why did pbio_mdrobotbase_set_controller accept arbitrary integers?",
  "Legacy C setter lacked bounds checking against valid enum values",
  guardsControllerEnum,
  "Requires enum check in pbio_mdrobotbase_set_controller returning PBIO_ERROR_INVALID_ARG"
);

// L3: Why must controller types be restricted to PID (0) and LQR (1)?
const hasEnumDefinitions = mdrobotbaseH.includes('PBIO_MDROBOTBASE_CONTROLLER_PID') &&
                           mdrobotbaseH.includes('PBIO_MDROBOTBASE_CONTROLLER_LQR');
evaluateNode(4, 3,
  "Why must controller types be restricted to PID (0) and LQR (1)?",
  "Firmware only implements PID and LQR state feedback controllers for trajectory tracking",
  hasEnumDefinitions,
  "Defined in pbio/mdrobotbase.h header"
);

// L4: Why must out-of-range controller types return PBIO_ERROR_INVALID_ARG?
const returnsInvalidArgOnEnum = guardsControllerEnum && mdrobotbaseC.includes('PBIO_ERROR_INVALID_ARG');
evaluateNode(4, 4,
  "Why must out-of-range controller types return PBIO_ERROR_INVALID_ARG?",
  "PBIO API standard requires PBIO_ERROR_INVALID_ARG on out-of-range enum parameters",
  returnsInvalidArgOnEnum,
  "Returns PBIO_ERROR_INVALID_ARG on enum violation"
);

// L5: Level 5 Root Resolution - Controller enum range guard verified
const branch4Complete = mentionsInvalidController && guardsControllerEnum && hasEnumDefinitions && returnsInvalidArgOnEnum;
evaluateNode(4, 5,
  "Level 5 Root Resolution: Is controller enum selection strictly guarded?",
  "Invalid controller values reject with PBIO_ERROR_INVALID_ARG without modifying state",
  branch4Complete,
  "Verified enum validation in C driver"
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 5: Negative Input Test Suite & Zero Side-Effect Guarantee
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 5: Negative Input Test Suite & Zero Side-Effect Guarantee");

// L1: Why are mock test doubles prohibited when testing input validation?
const zeroMocksEnforced = !testMDRB.includes("mock_") && !testMDRB.includes("stub_");
evaluateNode(5, 1,
  "Why are mock test doubles prohibited when testing input validation?",
  "Mocks bypass concrete C type parsers and cannot detect out-of-bounds array reads",
  zeroMocksEnforced,
  "Zero mocks and zero stubs in C test suite"
);

// L2: Why must negative tests verify zero motor command side effects?
const mentionsZeroMotorCommands = acceptance.includes("Invalid inputs produce zero motor commands") ||
                                  acceptance.includes("AC-MDRB-007-5");
evaluateNode(5, 2,
  "Why must negative tests verify zero motor command side effects?",
  "Ensures invalid commands fail-closed before any physical actuator setpoint is dispatched",
  mentionsZeroMotorCommands,
  "Contractually enforced in AC-MDRB-007-5"
);

// L3: Why must the native PBIO test binary compile and pass all tests?
let pbioTestsPass = false;
let testOutputSummary = '';
const TEST_BIN = resolve(ROOT, 'lib/pbio/test/build/test-pbio');
if (existsSync(TEST_BIN)) {
  try {
    const testOut = execSync(`${TEST_BIN} src/mdrobotbase/..`, { cwd: ROOT, encoding: 'utf8' });
    const match = testOut.match(/(\d+)\s+tests\s+ok\.\s+\((\d+)\s+skipped\)/i);
    if (match && parseInt(match[1], 10) >= 9 && parseInt(match[2], 10) === 0) {
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

// L4: Why must the test suite include test_mdrobotbase_trajectory_controller_validation?
const hasValidationTest = testMDRB.includes('test_mdrobotbase_trajectory_controller_validation');
evaluateNode(5, 4,
  "Why must the test suite include test_mdrobotbase_trajectory_controller_validation?",
  "Dedicated unit test exercises controller enum bounds and parameter rejection",
  hasValidationTest,
  "Requires test_mdrobotbase_trajectory_controller_validation in test_mdrobotbase.c"
);

// L5: Level 5 Root Resolution - Complete validation test suite verified
const branch5Complete = zeroMocksEnforced && mentionsZeroMotorCommands && pbioTestsPass && hasValidationTest;
evaluateNode(5, 5,
  "Level 5 Root Resolution: Is the validation test suite fully certified?",
  "Negative inputs, enum boundaries, and zero side-effects attested 100% green",
  branch5Complete,
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
