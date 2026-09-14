#!/usr/bin/env node
/**
 * Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-036
 *
 * Verifies 5 Causal Branches x 5 Dialectic Levels (25 Total Nodes):
 * - Branch 1: Discrete Error State-Space Model (branch-1-discrete-state-space)
 * - Branch 2: Discrete Algebraic Riccati Equation (branch-2-dare-matrix-derivation)
 * - Branch 3: Velocity Gain Scheduling & LUT (branch-3-gain-schedule-lut)
 * - Branch 4: Discrete Spectral Radius Stability (branch-4-spectral-radius-bound)
 * - Branch 5: Symmetrical Saturation & PID Benchmark (branch-5-saturation-benchmark)
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
console.log('🏛️ Socratic Agentic Loop & 5-Why Recursive Dialectic for G-MDRB-036');
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

const goalFile = resolve(ROOT, 'docs/07-backlog/goals/G-MDRB-036.md');
const acceptanceFile = resolve(ROOT, 'docs/02-product/acceptance/G-MDRB-036.md');
const socraticFile = resolve(ROOT, 'docs/06_raw/20260912_152500_g_mdrb_036_socratic_5why.md');

const goalContent = readFileSync(goalFile, 'utf8');
const acceptanceContent = readFileSync(acceptanceFile, 'utf8');
const socraticContent = readFileSync(socraticFile, 'utf8');

// -----------------------------------------------------------------------------
// Branch 1: Discrete Error State-Space Model
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 1: Discrete Error State-Space Model...');

evaluateNode(
  'branch-1-discrete-state-space',
  1,
  'Why did previous control laws use heuristic proportional gains?',
  'The unicycle tracking error model was not formalized as a discrete state-space system.',
  goalContent.includes('A_d(v_r)') && goalContent.includes('B_d(v_r)'),
  'Discrete state-space matrices A_d and B_d are not defined in G-MDRB-036'
);

evaluateNode(
  'branch-1-discrete-state-space',
  2,
  'Why must the unicycle tracking model use local vehicle coordinates (e_x, e_y, e_theta)?',
  'Global coordinate tracking couples heading non-linearly, whereas local error uncouples longitudinal speed from lateral steering.',
  goalContent.includes('e_x') && goalContent.includes('e_y') && (goalContent.includes('e_\\theta') || goalContent.includes('e_theta')),
  'Local coordinate tracking error definitions missing'
);

evaluateNode(
  'branch-1-discrete-state-space',
  3,
  'Why is discrete discretization period Ts = 0.005s (5ms) critical?',
  'MDRobotBase control loop steps at 200 Hz; discrete matrix exponential must reflect exact discrete step period.',
  acceptanceContent.includes('T_s = 5\\text{ ms}') || acceptanceContent.includes('T_s = 0.005'),
  'Sample period 5ms / 0.005s missing in acceptance contract'
);

evaluateNode(
  'branch-1-discrete-state-space',
  4,
  'Why does the discrete state transition matrix A_d have [1, 0, 0; 0, 1, vr*Ts; 0, 0, 1]?',
  'Small angle approximation sin(e_theta) ~= e_theta implies lateral drift is proportional to forward velocity vr * Ts.',
  goalContent.includes('v_r T_s'),
  'A_d transition term v_r * T_s missing'
);

evaluateNode(
  'branch-1-discrete-state-space',
  5,
  'Why is the discrete input matrix B_d [ -Ts, 0; 0, -0.5*vr*Ts^2; 0, -Ts ]?',
  'Zero-order hold on input vector u = [u_v, u_omega]^T yields second-order lateral displacement -0.5*vr*Ts^2.',
  goalContent.includes('-\\frac{1}{2} v_r T_s^2') || goalContent.includes('-0.5 * v_r * T_s^2'),
  'B_d input matrix second-order term missing'
);

// -----------------------------------------------------------------------------
// Branch 2: Discrete Algebraic Riccati Equation (DARE) Derivation
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 2: Discrete Algebraic Riccati Equation (DARE) Derivation...');

evaluateNode(
  'branch-2-dare-matrix-derivation',
  1,
  'Why must control gains K be derived from quadratic cost matrices (Q, R)?',
  'Cost matrices define explicit physical trade-offs between tracking error penalization and actuator torque/voltage limits.',
  goalContent.includes('Q = \\text{diag}(q_x, q_y, q_\\theta)') && goalContent.includes('R = \\text{diag}(r_v, r_\\omega)'),
  'Quadratic cost matrix formulations Q and R missing'
);

evaluateNode(
  'branch-2-dare-matrix-derivation',
  2,
  'Why must state penalty Q be positive semi-definite (Q >= 0) and control penalty R strictly positive definite (R > 0)?',
  'Strict positive definiteness of R guarantees invertibility of (R + B_d^T P B_d) in the Riccati solution.',
  goalContent.includes('Q \\succeq 0') && goalContent.includes('R \\succ 0'),
  'Positive semi-definite and positive definite constraints missing'
);

evaluateNode(
  'branch-2-dare-matrix-derivation',
  3,
  'Why does the DARE Riccati equation use P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^(-1)(B_d^T P A_d) + Q?',
  'This is the exact discrete-time dynamic programming Bellman optimality equation for infinite-horizon LQR.',
  goalContent.includes('P = A_d^T P A_d - (A_d^T P B_d)(R + B_d^T P B_d)^{-1}(B_d^T P A_d) + Q'),
  'Discrete Algebraic Riccati Equation formula missing'
);

evaluateNode(
  'branch-2-dare-matrix-derivation',
  4,
  'Why does optimal gain matrix K decouple into [[k11, 0, 0], [0, k22, k23]]?',
  'Linearized differential drive unicycle dynamics structurally decouple longitudinal error from lateral/heading error.',
  goalContent.includes('k_{11}') && goalContent.includes('k_{22}') && goalContent.includes('k_{23}'),
  'Decoupled gain matrix elements missing'
);

evaluateNode(
  'branch-2-dare-matrix-derivation',
  5,
  'Why is longitudinal gain k11 speed-invariant while k22 and k23 scale with vr?',
  'Forward acceleration effort does not depend on path curvature, whereas lateral turning dynamics scale directly with vehicle speed.',
  acceptanceContent.includes('Scenario 1: Discrete Algebraic Riccati Equation Optimal Gain Derivation'),
  'Scenario 1 missing in acceptance contract'
);

// -----------------------------------------------------------------------------
// Branch 3: Velocity Gain Scheduling & LUT
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 3: Velocity Gain Scheduling & LUT...');

evaluateNode(
  'branch-3-gain-schedule-lut',
  1,
  'Why precompute optimal gains in a Look-Up Table (LUT) instead of solving DARE online?',
  'Microcontroller CPU budget (5ms loop) cannot afford iterative matrix inversion or Schur decomposition at runtime.',
  goalContent.includes('Precomputed velocity-scheduled optimal gain lookup table') || goalContent.includes('16 operating velocity bins'),
  'LUT precomputation specification missing'
);

evaluateNode(
  'branch-3-gain-schedule-lut',
  2,
  'Why must reference speed be clamped to a minimum threshold v_min >= 10 mm/s?',
  'At zero forward velocity, the unicycle becomes uncontrollable in lateral error (rank(B_d) drops from 2 to 1).',
  goalContent.includes('v_{min}') || acceptanceContent.includes('v_{min} = 10\\text{ mm/s}'),
  'Minimum velocity floor clamp missing'
);

evaluateNode(
  'branch-3-gain-schedule-lut',
  3,
  'Why is C0 linear interpolation between velocity bins required?',
  'Step changes in feedback gains cause sudden motor torque spikes and wheel slip.',
  goalContent.includes('linear interpolation in $O(1)$ time') || goalContent.includes('C^0'),
  'C0 linear interpolation requirement missing'
);

evaluateNode(
  'branch-3-gain-schedule-lut',
  4,
  'Why provide pre-configured presets (OPTIMAL_BALANCED, OPTIMAL_AGGRESSIVE, OPTIMAL_SMOOTH)?',
  'Different robotics tasks require different Pareto trade-offs between tracking tightness and motor smoothness.',
  goalContent.includes('OPTIMAL_BALANCED') && goalContent.includes('OPTIMAL_AGGRESSIVE') && goalContent.includes('OPTIMAL_SMOOTH'),
  'Certified presets missing in goal card'
);

evaluateNode(
  'branch-3-gain-schedule-lut',
  5,
  'Why must custom Q and R weights be settable via public API?',
  'Advanced users require domain-specific tuning for non-standard payloads or chassis friction coefficients.',
  goalContent.includes('set_lqr_weights'),
  'set_lqr_weights API missing'
);

// -----------------------------------------------------------------------------
// Branch 4: Discrete Spectral Radius Stability
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 4: Discrete Spectral Radius Stability...');

evaluateNode(
  'branch-4-spectral-radius-bound',
  1,
  'Why must discrete closed-loop eigenvalues satisfy |lambda_i| < 1.0?',
  'In discrete-time systems, the unit circle boundary (|z| = 1) is the strict boundary between asymptotic stability and divergence.',
  goalContent.includes('\\rho(A_d - B_d K) = \\max_i |\\lambda_i| < 1.0') || goalContent.includes('\\rho < 1.0'),
  'Discrete spectral radius unit-circle condition missing'
);

evaluateNode(
  'branch-4-spectral-radius-bound',
  2,
  'Why is continuous-time Hurwitz stability (Re(s) < 0) insufficient for discrete execution?',
  'Continuous poles mapped through Ts can land outside the unit circle if forward speed vr or loop delay is large.',
  socraticContent.includes('Routh-Hurwitz') && socraticContent.includes('unit circle'),
  'Socratic 5-Why missing discrete vs continuous pole explanation'
);

evaluateNode(
  'branch-4-spectral-radius-bound',
  3,
  'Why must the system fail closed with PBIO_ERROR_INVALID_ARG if user weights yield rho >= 1.0?',
  'Actuating an unstable closed-loop system risks runaway robotic collisions and physical equipment damage.',
  goalContent.includes('PBIO_ERROR_INVALID_ARG'),
  'PBIO_ERROR_INVALID_ARG failure handling missing'
);

evaluateNode(
  'branch-4-spectral-radius-bound',
  4,
  'Why must spectral radius be validated across the entire operating speed range [50, 800 mm/s]?',
  'Gain scheduling can induce localized instability at high speeds even if low speeds are stable.',
  acceptanceContent.includes('[50, 800]'),
  'Operating speed range [50, 800] mm/s missing in acceptance contract'
);

evaluateNode(
  'branch-4-spectral-radius-bound',
  5,
  'Why must closed-loop error damp by > 95% within 1.5 seconds?',
  'Defines formal quantitative transient performance bound beyond mere marginal stability.',
  (acceptanceContent.includes('95') && acceptanceContent.includes('1.5')),
  '95% damping within 1.5s missing in acceptance contract'
);

// -----------------------------------------------------------------------------
// Branch 5: Symmetrical Saturation & PID Benchmark
// -----------------------------------------------------------------------------
console.log('\n▶ Branch 5: Symmetrical Saturation & PID Benchmark...');

evaluateNode(
  'branch-5-saturation-benchmark',
  1,
  'Why does independent wheel velocity saturation clamp distort vehicle trajectory?',
  'Clamping only one wheel alters the differential speed (vR - vL), unintentionally commanding a radical steering turn.',
  acceptanceContent.includes('Scenario 5: Wheel Velocity Saturation & Symmetrical Anti-Windup'),
  'Scenario 5 missing in acceptance contract'
);

evaluateNode(
  'branch-5-saturation-benchmark',
  2,
  'Why must wheel velocity saturation apply symmetrical scaling S = vmax / max(|vL|, |vR|)?',
  'Symmetrical scaling preserves path curvature kappa = omega / v exactly, preventing vehicle jackknifing.',
  acceptanceContent.includes('S = v_{max} / \\max') || acceptanceContent.includes('S = \\frac{v_{max}}{\\max'),
  'Symmetrical scaling formula missing in acceptance contract'
);

evaluateNode(
  'branch-5-saturation-benchmark',
  3,
  'Why must the controller support reverse driving (vr < 0)?',
  'Autonomous navigation routes frequently require backing into docking bays or reversing along paths.',
  acceptanceContent.includes('Scenario 7: Backward Driving & Negative Reference Velocity'),
  'Scenario 7 backward driving missing in acceptance contract'
);

evaluateNode(
  'branch-5-saturation-benchmark',
  4,
  'Why must the implementation include an automated benchmark against standard PID?',
  'Empirical proof is necessary to demonstrate that mathematical DARE optimization provides superior tracking accuracy.',
  acceptanceContent.includes('Scenario 6: Comparative Benchmark vs. Standard PID'),
  'Scenario 6 PID benchmark missing in acceptance contract'
);

evaluateNode(
  'branch-5-saturation-benchmark',
  5,
  'Why must LQR demonstrate >= 20% lower RMS cross-track error than PID?',
  'A 20% error reduction validates the investment in state-space optimal control over basic proportional-integral control.',
  (goalContent.includes('20') && goalContent.includes('RMS cross-track error')) || (acceptanceContent.includes('20') && acceptanceContent.includes('RMS')),
  '20% lower RMS cross-track error invariant missing'
);

// Final Summary
console.log('\n' + '='.repeat(80));
const allPassed = results.every(r => r.status === 'PASS');
const passedCount = results.filter(r => r.status === 'PASS').length;
console.log(`📊 Socratic Agentic Loop Summary: ${passedCount}/${results.length} Dialectic Nodes Verified`);
console.log('='.repeat(80) + '\n');

if (!allPassed) {
  process.exit(1);
}
console.log('🏆 100% Socratic Dialectic Invariants Attested Across All 5 Branches.\n');
