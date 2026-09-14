#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 📜 SODA OS GOAL SPECIFICATION STANDARDIZER & AUDITOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Reference: template/docs/07-backlog/goals/_template.md
 * Purpose: Automatically audits, validates, and standardizes goal specifications
 *          against the 25 canonical Soda OS template invariants.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { autoRepairGoal, validateGoalConformance, runGoalConformanceHarness } from '../harness/goal-template-conformance-harness.mjs';

export function auditAndStandardizeGoal(filePath) {
  autoRepairGoal(filePath);
  return validateGoalConformance(filePath);
}

if (process.argv[1] && (
  process.argv[1].endsWith('standardize-goal-templates.mjs') ||
  process.argv[1].endsWith('audit-and-standardize-goals.mjs')
)) {
  const args = process.argv.slice(2);
  if (!args.includes('--fix')) {
    args.push('--fix');
  }
  const success = runGoalConformanceHarness(args);
  process.exit(success ? 0 : 1);
}
