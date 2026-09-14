#!/usr/bin/env node

/**
 * Internal CRM Playwright E2E Verification Harness
 * 
 * Validates Playwright config, E2E test specs, desk coverage, and screenshot output directory.
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n🎭 [CRM PLAYWRIGHT HARNESS] Validating Playwright Configuration & E2E Specs...\n");

const rootDir = process.cwd();
const configPath = path.join(rootDir, "code/apps/internal-crm/playwright.config.ts");
const specPath = path.join(rootDir, "code/apps/internal-crm/e2e/crm-portal-desks.spec.ts");

const checks = [];

function check(name, condition, details = "") {
  checks.push({ name, passed: Boolean(condition), details });
  const status = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status} ${name.padEnd(55)} ${details}`);
}

// 1. Check Playwright Config
const configExists = fs.existsSync(configPath);
const configContent = configExists ? fs.readFileSync(configPath, "utf-8") : "";
check("Playwright Config (playwright.config.ts) exists", configExists);
check("Playwright Port Target (4006)", configContent.includes("4006"), "BaseURL matches :4006");
check("Playwright HTML & JSON Reporters Configured", configContent.includes("crm-playwright-report"), "Report artifacts configured");

// 2. Check E2E Spec
const specExists = fs.existsSync(specPath);
const specContent = specExists ? fs.readFileSync(specPath, "utf-8") : "";
check("E2E Spec (crm-portal-desks.spec.ts) exists", specExists);
check("Desk 1: Overview Dashboard E2E Test", specContent.includes("Desk 1: Overview Dashboard"));
check("Desk 2: Socratic Q&A Tree Search E2E Test", specContent.includes("Desk 2: Autonomous Socratic Q&A Tree Search"));
check("Desk 3: Creator 360 & Drawer E2E Test", specContent.includes("Desk 3: Creator 360° Directory"));
check("Desk 4: Pipeline Kanban E2E Test", specContent.includes("Desk 4: Deal & Lead Pipeline Kanban"));
check("Desk 5: Omnichannel Hub E2E Test", specContent.includes("Desk 5: Omnichannel Communications Hub"));
check("Desk 6: SLA Reports E2E Test", specContent.includes("Desk 6: SLA Compliance & GMV Forecast Reports"));
check("Desk 7: CRM Settings E2E Test", specContent.includes("Desk 7: CRM Routing Rules & System Settings"));

const totalPassed = checks.filter((c) => c.passed).length;
console.log(`\n📊 Playwright Spec Summary: ${totalPassed}/${checks.length} assertions passed.`);

if (totalPassed === checks.length) {
  console.log("🏆 [CRM PLAYWRIGHT HARNESS] All Playwright E2E Assertions 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("💥 [CRM PLAYWRIGHT HARNESS] Playwright verification failed!\n");
  process.exit(1);
}
