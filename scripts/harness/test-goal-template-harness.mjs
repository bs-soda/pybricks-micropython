#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS GOAL TEMPLATE HARNESS UNIT TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Zero-mock empirical test verification for the Goal Template Conformance
 *          and Auto-Repair Harness.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { validateGoalConformance, autoRepairGoal, REQUIRED_SECTIONS } from './goal-template-conformance-harness.mjs';

const TEST_DIR = path.join(process.cwd(), '.test-tmp-goals');
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

console.log("================================================================================");
console.log("🧪 Running Goal Template Conformance & Validation Unit Tests...");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`      ↳ ${err.message}`);
  }
}

const templatePath = fs.existsSync(path.join(process.cwd(), 'docs/07-backlog/goals/_template.md'))
  ? path.join(process.cwd(), 'docs/07-backlog/goals/_template.md')
  : path.join(process.cwd(), 'template/docs/07-backlog/goals/_template.md');

// Test 1: Canonical Template Conformance
runTest(`1. Canonical ${path.relative(process.cwd(), templatePath)} has 100% 31/31 conformance`, () => {
  const res = validateGoalConformance(templatePath);
  assert.strictEqual(res.valid, true, `Expected valid, got errors: ${res.errors.join(', ')}`);
  assert.strictEqual(res.passedCount, REQUIRED_SECTIONS.length, `Expected ${REQUIRED_SECTIONS.length} sections, got ${res.passedCount}`);
});

// Test 2: Incomplete Goal Detection
runTest("2. Detects missing required sections in broken goal", () => {
  const brokenGoalPath = path.join(TEST_DIR, 'G-999-broken.md');
  fs.writeFileSync(brokenGoalPath, "# G-999: Broken Goal\n\nSome unstructured content\n", 'utf8');
  const res = validateGoalConformance(brokenGoalPath);
  assert.strictEqual(res.valid, false, "Expected broken goal to be invalid");
  assert.ok(res.errors.length > 5, `Expected multiple errors, got ${res.errors.length}`);
});

// Test 3: Auto-Repair Engine
runTest("3. Auto-repair engine restores 100% canonical sections on broken goal", () => {
  const repairGoalPath = path.join(TEST_DIR, 'G-998-repair.md');
  fs.writeFileSync(repairGoalPath, "# G-998: Repairable Goal\n\nBare minimum text\n", 'utf8');
  
  const repaired = autoRepairGoal(repairGoalPath);
  assert.strictEqual(repaired, true, "Expected autoRepairGoal to return true");
  
  const res = validateGoalConformance(repairGoalPath);
  assert.strictEqual(res.valid, true, `Expected repaired goal to be valid, got errors: ${res.errors.join(', ')}`);
  assert.strictEqual(res.passedCount, REQUIRED_SECTIONS.length);
});

// Test 4: Anti-Solutioneering Warning Detection
runTest("4. Detects premature stack leakage in ## Intent", () => {
  const stackLeakGoalPath = path.join(TEST_DIR, 'G-997-leak.md');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const leakedContent = templateContent.replace(
    /## Intent[\s\S]*?(?=## How)/,
    "## Intent\n\n**Why:** Implement auth with Next.js and PostgreSQL in src/auth/\n\n**Done when:** Tokens work\n\n**Unblocks:** G-998\n\n"
  );
  fs.writeFileSync(stackLeakGoalPath, leakedContent, 'utf8');
  
  const res = validateGoalConformance(stackLeakGoalPath);
  assert.ok(res.warnings.length > 0, "Expected warnings for premature stack leakage in Intent");
  assert.ok(res.warnings.some(w => w.includes('premature stack/path solutioneering')), "Expected specific warning message");
});

// Test 5: Unresolved Clarification in Ready Goal Detection
runTest("5. Rejects goal marked 'ready' with unresolved [NEEDS CLARIFICATION]", () => {
  const unclarifiedGoalPath = path.join(TEST_DIR, 'G-996-unclarified.md');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const readyWithQuestionsContent = templateContent
    .replace(/\*\*Status:\*\*[^\n]+/, "**Status:** ready")
    .replace(/## Open questions[\s\S]*?(?=## Knowledge)/, "## Open questions\n\n- [ ] [NEEDS CLARIFICATION: Unspecified Auth Provider]\n\n");
  fs.writeFileSync(unclarifiedGoalPath, readyWithQuestionsContent, 'utf8');
  
  const res = validateGoalConformance(unclarifiedGoalPath);
  assert.strictEqual(res.valid, false, "Expected ready goal with [NEEDS CLARIFICATION] to be invalid");
  assert.ok(res.errors.some(e => e.includes('NEEDS CLARIFICATION')), "Expected error regarding unresolved clarification");
});

// Test 6: Work Steps Atomic Contract Validation
runTest("6. Rejects goal with incomplete work steps fields", () => {
  const incompleteStepsGoalPath = path.join(TEST_DIR, 'G-995-incomplete-steps.md');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const brokenStepsContent = templateContent.replace(
    /\*\*Stop condition:\*\*[^\n]+/i,
    "" // Remove stop condition on step 1
  );
  fs.writeFileSync(incompleteStepsGoalPath, brokenStepsContent, 'utf8');

  const res = validateGoalConformance(incompleteStepsGoalPath);
  assert.strictEqual(res.valid, false, "Expected goal with missing stop condition to be invalid");
  assert.ok(res.errors.some(e => e.includes('missing \'**Stop condition:**\'')), "Expected missing stop condition error");
});

// Test 7: Article I Zero-Mock Invariant Violation
runTest("7. Rejects goal that explicitly permits mocks or stubs", () => {
  const mockGoalPath = path.join(TEST_DIR, 'G-994-mock-leak.md');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const mockLeakContent = templateContent.replace(
    /## Atomicity & Zero-Mock Contract[\s\S]*?(?=## How)/,
    "## Atomicity & Zero-Mock Contract\n\n- **One outcome:** Test outcome\n- **Concrete execution:** Mocks allowed for external dependencies\n\n"
  );
  fs.writeFileSync(mockGoalPath, mockLeakContent, 'utf8');

  const res = validateGoalConformance(mockGoalPath);
  assert.strictEqual(res.valid, false, "Expected goal permitting mocks to be rejected");
  assert.ok(res.errors.some(e => e.includes('Article I Zero-Mock Invariant Violation')), "Expected Zero-Mock violation error");
});

// Test 8: Work Steps Numbered Actions & Canonical 6-Phase Standard
runTest("8. Enforces numbered action items in work steps contract", () => {
  const unnumberedGoalPath = path.join(TEST_DIR, 'G-993-unnumbered.md');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const unnumberedContent = templateContent.replace(
    /\*\*Actions:\*\*[\s\S]*?(?=\*\*Completion gate:\*\*)/i,
    "**Actions:**\n\nJust do the work without any numbered steps.\n\n"
  );
  fs.writeFileSync(unnumberedGoalPath, unnumberedContent, 'utf8');

  const res = validateGoalConformance(unnumberedGoalPath);
  assert.strictEqual(res.valid, false, "Expected goal with unnumbered actions to be rejected");
  assert.ok(res.errors.some(e => e.includes('must contain ordered numerical action items')), "Expected numbered action error");
});

// Cleanup
fs.rmSync(TEST_DIR, { recursive: true, force: true });

console.log("\n================================================================================");
console.log(`📊 Unit Test Result: ${passedTests} / ${totalTests} Passed`);
console.log("================================================================================\n");

if (passedTests === totalTests) {
  console.log("🏆 ALL GOAL TEMPLATE HARNESS UNIT TESTS PASSED 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("❌ Some unit tests failed!\n");
  process.exit(1);
}
