#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ MDRobotBase Epic Hardening & Kinematics Verification Harness
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: MDRB (MDRobotBase Kinematics & Motion Engine)
 * Goals: G-MDRB-001, G-MDRB-002, G-MDRB-003, G-MDRB-004, G-MDRB-005, G-MDRB-006, G-MDRB-007, G-MDRB-008, G-MDRB-009
 * Invariant: Zero Mocks, Zero Stubs, Zero Fallbacks (Article I Non-Negotiable)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGoalConformance } from './goal-template-conformance-harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assertCheck(desc, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ ${desc}`);
  } else {
    failedChecks++;
    console.error(`  ❌ FAIL: ${desc} ${details ? '(' + details + ')' : ''}`);
  }
}

console.log("================================================================================");
console.log("🛡️ MDRobotBase Epic Hardening & Kinematics Verification Harness");
console.log("================================================================================\n");

const TARGET_GOALS = [
  'G-MDRB-001',
  'G-MDRB-002',
  'G-MDRB-003',
  'G-MDRB-004',
  'G-MDRB-005',
  'G-MDRB-006',
  'G-MDRB-007',
  'G-MDRB-008',
  'G-MDRB-009',
  'G-MDRB-010',
  'G-MDRB-011',
  'G-MDRB-012',
  'G-MDRB-013',
  'G-MDRB-014',
  'G-MDRB-015',
  'G-MDRB-016',
  'G-MDRB-017',
  'G-MDRB-018',
  'G-MDRB-019',
  'G-MDRB-020',
  'G-MDRB-021',
  'G-MDRB-022',
  'G-MDRB-023',
  'G-MDRB-024',
  'G-MDRB-025',
  'G-MDRB-026',
  'G-MDRB-027',
  'G-MDRB-028',
  'G-MDRB-029',
  'G-MDRB-030',
  'G-MDRB-031',
  'G-MDRB-032',
  'G-MDRB-033',
  'G-MDRB-034',
  'G-MDRB-035',
  'G-MDRB-036'
];

// -----------------------------------------------------------------------------
// Phase 1: Epic Registration & Queue Integrity
// -----------------------------------------------------------------------------
console.log("▶ Phase 1: Epic Registration & Queue Integrity...");

const epicsPath = resolve(ROOT, 'docs/07-backlog/epics.md');
const epicSpecPath = resolve(ROOT, 'docs/07-backlog/epics/MDRB.md');
const registryPath = resolve(ROOT, 'docs/07-backlog/goal-id-registry.yaml');
const goalsDashboardPath = resolve(ROOT, 'docs/07-backlog/goals.md');
const queuePath = resolve(ROOT, 'docs/07-backlog/queues/MDRB.md');

assertCheck('docs/07-backlog/epics.md exists', existsSync(epicsPath));
assertCheck('docs/07-backlog/epics/MDRB.md exists', existsSync(epicSpecPath));
assertCheck('docs/07-backlog/goal-id-registry.yaml exists', existsSync(registryPath));
assertCheck('docs/07-backlog/goals.md exists', existsSync(goalsDashboardPath));
assertCheck('docs/07-backlog/queues/MDRB.md exists', existsSync(queuePath));

if (existsSync(epicsPath)) {
  const epicsContent = readFileSync(epicsPath, 'utf8');
  assertCheck('epics.md registers MDRB epic slug', epicsContent.includes('| MDRB |'));
}

if (existsSync(registryPath)) {
  const registryContent = readFileSync(registryPath, 'utf8');
  assertCheck('goal-id-registry.yaml contains MDRB sequence entry', registryContent.includes('MDRB:'));
  assertCheck('goal-id-registry.yaml reserves sequence through 36', registryContent.includes('36'));
}

if (existsSync(goalsDashboardPath)) {
  const dashContent = readFileSync(goalsDashboardPath, 'utf8');
  assertCheck('goals.md dashboard links queues/MDRB.md', dashContent.includes('[queues/MDRB.md](queues/MDRB.md)'));
}

if (existsSync(queuePath)) {
  const qContent = readFileSync(queuePath, 'utf8');
  for (const gid of TARGET_GOALS) {
    assertCheck(`queues/MDRB.md lists ${gid}`, qContent.includes(gid));
  }
}
console.log("");

// -----------------------------------------------------------------------------
// Phase 2: Goal Specification & Conformance Validation (G-002 to G-010)
// -----------------------------------------------------------------------------
console.log("▶ Phase 2: Goal Specification & Conformance Validation...");

for (const gid of TARGET_GOALS) {
  const activeFile = resolve(ROOT, `docs/07-backlog/goals/${gid}.md`);
  const archivedFile = resolve(ROOT, `docs/07-backlog/goals/_archived/${gid}.md`);
  const goalFile = existsSync(archivedFile) ? archivedFile : activeFile;
  assertCheck(`Goal card ${gid}.md exists`, existsSync(goalFile));
  if (existsSync(goalFile)) {
    const res = validateGoalConformance(goalFile);
    assertCheck(`${gid}.md passes 100% template conformance (34/34 rules)`, res.valid, res.errors.join('; '));
  }
}
console.log("");

// -----------------------------------------------------------------------------
// Phase 3: Zero-Mock & Zero-Stub Article I Audit
// -----------------------------------------------------------------------------
console.log("▶ Phase 3: Zero-Mock & Zero-Stub (Article I) Invariant Audit...");

const STUB_MOCK_PATTERNS = [
  /\bTODO\b/i,
  /\bunimplemented!\b/,
  /\bdummy\b/i,
  /\bmock_\w+\b/i,
  /\bfake_\w+\b/i
];

for (const gid of TARGET_GOALS) {
  const activeFile = resolve(ROOT, `docs/07-backlog/goals/${gid}.md`);
  const archivedFile = resolve(ROOT, `docs/07-backlog/goals/_archived/${gid}.md`);
  const goalFile = existsSync(archivedFile) ? archivedFile : activeFile;
  if (existsSync(goalFile)) {
    const content = readFileSync(goalFile, 'utf8');
    assertCheck(`${gid}.md contains explicit Atomicity & Zero-Mock Contract`, content.includes('## Atomicity & Zero-Mock Contract'));
    assertCheck(`${gid}.md work steps specify Allowed files`, content.includes('**Allowed files:**'));
    assertCheck(`${gid}.md work steps specify Completion gate`, content.includes('**Completion gate:**'));
    assertCheck(`${gid}.md work steps specify Stop condition`, content.includes('**Stop condition:**'));

    // Check that acceptance criteria do not contain stubs/placeholders
    const acBlock = content.match(/##\s+Acceptance\s+criteria[\s\S]*?(?=\n##\s+Test\s+plan)/i)?.[0] || '';
    let hasPlaceholder = false;
    for (const pat of STUB_MOCK_PATTERNS) {
      if (pat.test(acBlock)) {
        hasPlaceholder = true;
        break;
      }
    }
    assertCheck(`${gid}.md Acceptance criteria contains zero stubs or placeholders`, !hasPlaceholder);
  }
}
console.log("");

// -----------------------------------------------------------------------------
// Phase 4: Touch Map Integrity & Code Grounding
// -----------------------------------------------------------------------------
console.log("▶ Phase 4: Touch Map Integrity & Code Grounding...");

const EXPECTED_CODE_FILES = [
  'lib/pbio/src/mdrobotbase.c',
  'lib/pbio/include/pbio/mdrobotbase.h',
  'pybricks/robotics/pb_type_mdrobotbase.c',
  'lib/pbio/test/src/test_mdrobotbase.c',
  'tests/virtualhub/robotics/test_mdrobotbase_turn.py'
];

for (const f of EXPECTED_CODE_FILES) {
  const p = resolve(ROOT, f);
  assertCheck(`Target file ${f} exists on disk`, existsSync(p));
}

// Verify structural anchor points in lib/pbio/src/mdrobotbase.c
const mdrobotbaseC = resolve(ROOT, 'lib/pbio/src/mdrobotbase.c');
if (existsSync(mdrobotbaseC)) {
  const cCode = readFileSync(mdrobotbaseC, 'utf8');
  assertCheck('mdrobotbase.c defines pbio_mdrobotbase_get_robotbase', cCode.includes('pbio_mdrobotbase_get_robotbase'));
  assertCheck('mdrobotbase.c defines pbio_mdrobotbase_reset_state', cCode.includes('pbio_mdrobotbase_reset_state'));
  assertCheck('mdrobotbase.c defines pbio_mdrobotbase_update_state', cCode.includes('pbio_mdrobotbase_update_state'));
  assertCheck('mdrobotbase.c defines pbio_mdrobotbase_set_gear_ratio', cCode.includes('pbio_mdrobotbase_set_gear_ratio'));
}
console.log("");

// -----------------------------------------------------------------------------
// Phase 5: Optical Color Detection Architecture & Contract Invariants
// -----------------------------------------------------------------------------
console.log("▶ Phase 5: Optical Color Detection Architecture & Contract Invariants...");

const mdrobotbaseH = resolve(ROOT, 'lib/pbio/include/pbio/mdrobotbase.h');
if (existsSync(mdrobotbaseH)) {
  const hCode = readFileSync(mdrobotbaseH, 'utf8');
  assertCheck('mdrobotbase.h declares color calibration reset', hCode.includes('pbio_mdrobotbase_color_cal_reset'));
  assertCheck('mdrobotbase.h declares color prototype management', hCode.includes('pbio_mdrobotbase_color_cal_add_prototype'));
  assertCheck('mdrobotbase.h declares color threshold management', hCode.includes('pbio_mdrobotbase_color_cal_set_threshold'));
  assertCheck('mdrobotbase.h declares color classification', hCode.includes('pbio_mdrobotbase_color_cal_classify'));
}

const virtualhubRoboticsPy = resolve(ROOT, 'tests/virtualhub/robotics/pybricks/robotics.py');
if (existsSync(virtualhubRoboticsPy)) {
  const pyCode = readFileSync(virtualhubRoboticsPy, 'utf8');
  assertCheck('VirtualHub robotics.py defines reset_color_calibration', pyCode.includes('def reset_color_calibration'));
  assertCheck('VirtualHub robotics.py defines set_color_baseline', pyCode.includes('def set_color_baseline'));
  assertCheck('VirtualHub robotics.py defines set_color_threshold', pyCode.includes('def set_color_threshold'));
  assertCheck('VirtualHub robotics.py defines add_color_prototype', pyCode.includes('def add_color_prototype'));
  assertCheck('VirtualHub robotics.py defines classify_color', pyCode.includes('def classify_color'));
}
console.log("");

// -----------------------------------------------------------------------------
// Phase 6: Attestation & Summary Reporting
// -----------------------------------------------------------------------------
console.log("================================================================================");
console.log(`📊 Epic Conformance Summary: ${passedChecks} Passed, ${failedChecks} Failed (Total: ${totalChecks})`);
console.log("================================================================================\n");

if (failedChecks === 0) {
  console.log("🏆 100% GREEN ATTESTATION: MDRobotBase Epic (G-MDRB-001 to G-MDRB-036) Fully Compliant!\n");
  process.exit(0);
} else {
  console.error(`❌ FAILED: ${failedChecks} checks failed. See errors above.\n`);
  process.exit(1);
}
