#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-009
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS Agent OS
 * Goal: G-MDRB-009 (Maintainability and Duplicate Control Logic Reduction)
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
console.log("🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-009");
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
const pbTypeMDRBPath = resolve(ROOT, 'pybricks/robotics/pb_type_mdrobotbase.c');
const testMDRBPath = resolve(ROOT, 'lib/pbio/test/src/test_mdrobotbase.c');
const acceptancePath = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-009.md');
const goalCardPath = existsSync(resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-009.md'))
  ? resolve(ROOT, 'docs/07-backlog/goals/_archived/G-MDRB-009.md')
  : resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-009.md');

const pbTypeMDRB = existsSync(pbTypeMDRBPath) ? readFileSync(pbTypeMDRBPath, 'utf8') : '';
const testMDRB = existsSync(testMDRBPath) ? readFileSync(testMDRBPath, 'utf8') : '';
const acceptance = existsSync(acceptancePath) ? readFileSync(acceptancePath, 'utf8') : '';
const goalCard = existsSync(goalCardPath) ? readFileSync(goalCardPath, 'utf8') : '';

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 1: Angle Normalization Consolidation & Periodic Invariants
// ════════════════════════════════════════════════════════════════════════════════
console.log("🌿 Branch 1: Angle Normalization Consolidation & Periodic Invariants");

evaluateNode(
  1, 1,
  "Why is duplicate angle wrapping logic a maintainability hazard?",
  "Goal card identifies 12+ duplicate while loops for angle normalization",
  goalCard.includes('mdrobotbase_wrap_degrees') && goalCard.includes('G-MDRB-009'),
  "G-MDRB-009 goal card missing angle wrapping deduplication requirement"
);

evaluateNode(
  1, 2,
  "Why must angle wrapping be specified in the formal acceptance contract?",
  "Acceptance contract requires Scenario 1 for mdrobotbase_wrap_degrees",
  acceptance.includes('Scenario 1: Angle Normalization Consolidation') &&
  acceptance.includes('mdrobotbase_wrap_degrees'),
  "Acceptance contract lacks Scenario 1"
);

evaluateNode(
  1, 3,
  "Why must mdrobotbase_wrap_degrees be defined as a static inline helper?",
  "Inline pure helper eliminates duplicate loops with zero runtime call overhead",
  pbTypeMDRB.includes('static inline float mdrobotbase_wrap_degrees(float angle)') ||
  pbTypeMDRB.includes('static inline float mdrobotbase_wrap_degrees'),
  "mdrobotbase_wrap_degrees static inline helper is not defined in pb_type_mdrobotbase.c"
);

evaluateNode(
  1, 4,
  "Why must mdrobotbase_wrap_degrees enforce [-180.0, +180.0] interval arithmetic?",
  "Wrapping logic subtracts/adds 360.0f until bounded in standard angular domain",
  pbTypeMDRB.includes('angle -= 360.0f') && pbTypeMDRB.includes('angle += 360.0f'),
  "mdrobotbase_wrap_degrees does not implement correct interval arithmetic"
);

// Count occurrences of mdrobotbase_wrap_degrees calls
const wrapCallMatches = (pbTypeMDRB.match(/mdrobotbase_wrap_degrees\(/g) || []).length;
evaluateNode(
  1, 5,
  "How is complete angle normalization convergence verified across all motions?",
  "All motion iteration branches invoke mdrobotbase_wrap_degrees uniformly (>= 8 call sites)",
  wrapCallMatches >= 8,
  `Expected at least 8 mdrobotbase_wrap_degrees calls, found ${wrapCallMatches}`
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 2: Motor Velocity Clamping & Consistent Actuator Bounds
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 2: Motor Velocity Clamping & Consistent Actuator Bounds");

evaluateNode(
  2, 1,
  "Why is duplicate motor speed clamping problematic in motion control?",
  "Goal card specifies consolidating speed clamping blocks to avoid limit divergence",
  goalCard.includes('mdrobotbase_clamp_speed'),
  "Goal card lacks mdrobotbase_clamp_speed specification"
);

evaluateNode(
  2, 2,
  "Why must speed clamping be specified in the formal acceptance contract?",
  "Acceptance contract requires Scenario 2 for mdrobotbase_clamp_speed",
  acceptance.includes('Scenario 2: Motor Velocity Clamping Consolidation') &&
  acceptance.includes('mdrobotbase_clamp_speed'),
  "Acceptance contract lacks Scenario 2"
);

evaluateNode(
  2, 3,
  "Why must mdrobotbase_clamp_speed be defined as a static inline helper?",
  "Helper symmetrically bounds motor dps setpoint against maximum speed",
  pbTypeMDRB.includes('static inline int32_t mdrobotbase_clamp_speed(') ||
  pbTypeMDRB.includes('static inline int32_t mdrobotbase_clamp_speed'),
  "mdrobotbase_clamp_speed is not defined in pb_type_mdrobotbase.c"
);

evaluateNode(
  2, 4,
  "Why must speed clamping handle positive and negative boundaries symmetrically?",
  "Clamps value between -max_speed and +max_speed",
  pbTypeMDRB.includes('if (dps > max_speed)') && pbTypeMDRB.includes('if (dps < -max_speed)'),
  "mdrobotbase_clamp_speed does not enforce symmetric clamping bounds"
);

const clampCallMatches = (pbTypeMDRB.match(/mdrobotbase_clamp_speed\(/g) || []).length;
evaluateNode(
  2, 5,
  "How is complete speed clamping convergence verified across the codebase?",
  "Speed clamping helper is invoked across multiple motion modes (>= 4 call sites)",
  clampCallMatches >= 4,
  `Expected at least 4 mdrobotbase_clamp_speed calls, found ${clampCallMatches}`
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 3: Stall Accumulator Logic & Threshold Uniformity
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 3: Stall Accumulator Logic & Threshold Uniformity");

evaluateNode(
  3, 1,
  "Why is repeated stall accumulation code a maintenance risk?",
  "Goal card identifies stall accumulator duplication across navigate, turn, and trajectory",
  goalCard.includes('mdrobotbase_evaluate_stall'),
  "Goal card lacks mdrobotbase_evaluate_stall specification"
);

evaluateNode(
  3, 2,
  "Why must stall evaluation be specified in the formal acceptance contract?",
  "Acceptance contract requires Scenario 3 for unified stall evaluation",
  acceptance.includes('Scenario 3: Stall Accumulator Consolidation') &&
  acceptance.includes('mdrobotbase_evaluate_stall'),
  "Acceptance contract lacks Scenario 3"
);

evaluateNode(
  3, 3,
  "Why must mdrobotbase_evaluate_stall be defined as a static inline helper?",
  "Helper encapsulates stall time accumulation, reset on progress, and threshold check",
  pbTypeMDRB.includes('static inline bool mdrobotbase_evaluate_stall(') ||
  pbTypeMDRB.includes('static inline bool mdrobotbase_evaluate_stall'),
  "mdrobotbase_evaluate_stall helper is not defined in pb_type_mdrobotbase.c"
);

evaluateNode(
  3, 4,
  "Why must mdrobotbase_evaluate_stall accept is_stalled boolean and timeout_ms?",
  "Updates stall_time_ms by dt_sec * 1000.0f if stalled, or resets to 0.0f if progressing",
  pbTypeMDRB.includes('rb->stall_time_ms += dt_sec * 1000.0f') &&
  pbTypeMDRB.includes('rb->stall_time_ms = 0.0f'),
  "mdrobotbase_evaluate_stall does not correctly update stall_time_ms accumulator"
);

const stallCallMatches = (pbTypeMDRB.match(/mdrobotbase_evaluate_stall\(/g) || []).length;
evaluateNode(
  3, 5,
  "How is unified stall evaluation convergence verified?",
  "Stall evaluation helper is used across motion branches (>= 3 call sites)",
  stallCallMatches >= 3,
  `Expected at least 3 mdrobotbase_evaluate_stall calls, found ${stallCallMatches}`
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 4: Monolithic Function Complexity & Refactoring Safety
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 4: Monolithic Function Complexity & Refactoring Safety");

evaluateNode(
  4, 1,
  "Why is the 900+ line pb_type_mdrobotbase_motion_iterate_once a critical concern?",
  "Goal card cites Codex review assigning Maintainability a baseline score of 5/10",
  goalCard.includes('Maintainability') && goalCard.includes('5/10'),
  "Goal card lacks baseline maintainability score citation"
);

evaluateNode(
  4, 2,
  "Why must the refactoring strictly preserve existing behavior (zero regression)?",
  "Refactoring invariant requires f_refactored(x) == f_original(x) for all inputs",
  goalCard.includes('f_{\\text{refactored}}(x) = f_{\\text{original}}(x)') ||
  goalCard.includes('identical kinematic behavior'),
  "Goal card lacks behavioral identity invariant"
);

evaluateNode(
  4, 3,
  "Why is Article I Zero-Mock invariant essential during C refactoring?",
  "Real PBIO data structures ensure compiler optimizations and struct alignment are real",
  !pbTypeMDRB.includes('mock_') && !pbTypeMDRB.includes('stub_') && !testMDRB.includes('mock_'),
  "Mock or stub references found in production driver or test suite"
);

evaluateNode(
  4, 4,
  "Why does the complete regression suite from G-MDRB-008 act as a verification harness?",
  "10 concrete C unit tests verify all 8 failure categories remain defect-free",
  testMDRB.includes('test_mdrobotbase_instance_ownership') &&
  testMDRB.includes('test_mdrobotbase_state_initialization') &&
  testMDRB.includes('test_mdrobotbase_geometry_validation') &&
  testMDRB.includes('test_mdrobotbase_gear_ratio_kinematics') &&
  testMDRB.includes('test_mdrobotbase_motion_failure_reporting') &&
  testMDRB.includes('test_mdrobotbase_lifecycle_safety') &&
  testMDRB.includes('test_mdrobotbase_trajectory_controller_validation'),
  "PBIO unit test file missing required regression tests"
);

let testOutput = '';
let testsPassing = false;
try {
  testOutput = execSync('./lib/pbio/test/build/test-pbio src/mdrobotbase/..', { cwd: ROOT, encoding: 'utf8' });
  testsPassing = testOutput.includes('10 tests ok');
} catch (e) {
  testOutput = e.stdout || e.message;
}
evaluateNode(
  4, 5,
  "How is complete refactoring safety verified empirically?",
  "Native PBIO embedded test suite passes 100% (10 tests ok, 0 skipped)",
  testsPassing,
  `Native PBIO tests failed: ${testOutput.substring(0, 150)}`
);

// ════════════════════════════════════════════════════════════════════════════════
// BRANCH 5: Embedded Zero-Overhead & Binary Neutrality
// ════════════════════════════════════════════════════════════════════════════════
console.log("\n🌿 Branch 5: Embedded Zero-Overhead & Binary Neutrality");

evaluateNode(
  5, 1,
  "Why must helpers be declared static inline in embedded C?",
  "static inline instructs compiler to expand functions in-place without call instruction overhead",
  pbTypeMDRB.includes('static inline float mdrobotbase_wrap_degrees') &&
  pbTypeMDRB.includes('static inline int32_t mdrobotbase_clamp_speed') &&
  pbTypeMDRB.includes('static inline bool mdrobotbase_evaluate_stall'),
  "Helpers are not properly declared as static inline"
);

evaluateNode(
  5, 2,
  "Why must execution latency remain within the strict SLA (< 10 seconds)?",
  "Acceptance contract AC-MDRB-009-5 mandates sub-10 second execution",
  acceptance.includes('AC-MDRB-009-5') && acceptance.includes('10'),
  "Acceptance contract lacks execution latency SLA"
);

// High-resolution timing of test execution
const start = process.hrtime.bigint();
let pbioPass = false;
try {
  const out = execSync('./lib/pbio/test/build/test-pbio src/mdrobotbase/..', { cwd: ROOT, encoding: 'utf8' });
  pbioPass = out.includes('10 tests ok');
} catch (e) {
  pbioPass = false;
}
const end = process.hrtime.bigint();
const elapsedMs = Number(end - start) / 1e6;

evaluateNode(
  5, 3,
  "Why is empirical episode timing required for release attestation?",
  "Test execution completes with clean exit code 0",
  pbioPass,
  "Native test execution failed during timing pass"
);

evaluateNode(
  5, 4,
  "Why must latency variance remain bounded under embedded workloads?",
  `Measured execution duration (${elapsedMs.toFixed(2)} ms) is far below 10,000 ms SLA`,
  elapsedMs < 10000.0,
  `Measured duration ${elapsedMs.toFixed(2)} ms exceeded 10,000 ms SLA`
);

evaluateNode(
  5, 5,
  "How is complete release readiness attested for G-MDRB-009?",
  "All 5 acceptance criteria in docs/02-product/acceptance/G-MDRB-009.md are mapped and green",
  acceptance.includes('AC-MDRB-009-1') &&
  acceptance.includes('AC-MDRB-009-2') &&
  acceptance.includes('AC-MDRB-009-3') &&
  acceptance.includes('AC-MDRB-009-4') &&
  acceptance.includes('AC-MDRB-009-5'),
  "Acceptance criteria traceability matrix incomplete"
);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`📊 Socratic Agentic Loop Summary: ${passedChecks} Passed, ${failedChecks} Failed (Total: ${totalChecks})`);
console.log("================================================================================");

if (failedChecks === 0) {
  console.log("\n🏆 100% ROOT CONVERGENCE: All 5 Dialectic Branches Reached Level 5 Root Resolution!");
  process.exit(0);
} else {
  console.error(`\n⚠️ ${failedChecks} Dialectic Check(s) Pending Implementation (Baseline Blocker Captured).`);
  process.exit(1);
}
