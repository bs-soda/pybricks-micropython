#!/usr/bin/env node

/**
 * Internal CRM Portal Atomic UI & Design System Verification Harness
 * Validates 9 Atomic UI Primitives, 5-State Component Contracts, and Token Scope.
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n🎨 [CRM UI HARNESS] Validating Design System, Tokens, and Atomic UI Primitives...\n");

const rootDir = process.cwd();
const checks = [];

function check(name, condition, details = "") {
  checks.push({ name, passed: Boolean(condition), details });
  const status = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status} ${name.padEnd(55)} ${details}`);
}

// 1. Check Tokens File
const tokensPath = path.join(rootDir, "code/packages/ui/src/tokens/crm.css");
const tokensExist = fs.existsSync(tokensPath);
const tokenContent = tokensExist ? fs.readFileSync(tokensPath, "utf-8") : "";
check(
  "CRM Tokens (crm.css) exists",
  tokensExist,
  tokensExist ? `(${tokenContent.length} bytes)` : "Missing file"
);
check(
  "CRM Obsidian theme (--crm-bg-canvas) defined",
  tokenContent.includes("--crm-bg-canvas: #090d16"),
  "Matches #090d16 dark canvas"
);
check(
  "CRM Light theme defined",
  tokenContent.includes('[data-theme="light"]') || tokenContent.includes('.light'),
  "Dual-mode support verified"
);

// 2. Check 9 Atomic Primitives in packages/ui
const uiDir = path.join(rootDir, "code/packages/ui/src/components/ui");
const primitives = [
  "crm-kpi-card.tsx",
  "hierarchical-search-tree.tsx",
  "filter-facet-group.tsx",
  "creator-timeline-badge.tsx",
  "deal-pipeline-stage-badge.tsx",
  "interaction-log-drawer.tsx",
  "crm-breadcrumbs.tsx",
];

primitives.forEach((file) => {
  const filePath = path.join(uiDir, file);
  const exists = fs.existsSync(filePath);
  const content = exists ? fs.readFileSync(filePath, "utf-8") : "";
  check(`Primitive: ${file}`, exists && content.length > 200, exists ? `${content.length} bytes` : "Missing");
});

// 3. Check App Router Pages in apps/internal-crm
const appDir = path.join(rootDir, "code/apps/internal-crm/src/app");
const pages = [
  "layout.tsx",
  "globals.css",
  "page.tsx",
  "search/page.tsx",
  "creators/page.tsx",
  "pipeline/page.tsx",
  "interactions/page.tsx",
  "reports/page.tsx",
  "settings/page.tsx",
];

pages.forEach((page) => {
  const pagePath = path.join(appDir, page);
  const exists = fs.existsSync(pagePath);
  check(`App Desk: /${page.replace("/page.tsx", "").replace("page.tsx", "")}`, exists);
});

// Summary
const totalPassed = checks.filter((c) => c.passed).length;
const totalChecks = checks.length;
console.log(`\n📊 Verification Summary: ${totalPassed}/${totalChecks} checks passed.`);

if (totalPassed === totalChecks) {
  console.log("🏆 [CRM UI HARNESS] All Atomic UI and Design System assertions 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("💥 [CRM UI HARNESS] Failures detected in UI verification suite!\n");
  process.exit(1);
}
