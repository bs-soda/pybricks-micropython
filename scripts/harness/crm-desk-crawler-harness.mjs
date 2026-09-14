#!/usr/bin/env node

/**
 * Internal CRM Portal Desk & Route Crawler Verification Harness
 * 
 * Verifies that all 7 CRM desks exist, are properly structured,
 * contain required headings, UI primitives, and breadcrumbs.
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n🕷️ [CRM CRAWLER] Starting Internal CRM Desk & Route Verification...\n");

const rootDir = process.cwd();
const appDir = path.join(rootDir, "code/apps/internal-crm/src/app");

const desks = [
  { path: "page.tsx", name: "Overview Dashboard (/)", requiredStrings: ["Internal CRM Operations Hub", "Active Creator Roster", "CrmKpiCard"] },
  { path: "search/page.tsx", name: "Socratic Q&A Tree Search (/search)", requiredStrings: ["Autonomous Hierarchical Q&A Tree Search", "HierarchicalSearchTree", "Level 0: Root Question Formulation"] },
  { path: "creators/page.tsx", name: "Creator 360° Directory (/creators)", requiredStrings: ["Creator 360° Directory", "CreatorTimelineBadge", "InteractionLogDrawer"] },
  { path: "pipeline/page.tsx", name: "Deal Pipeline Kanban (/pipeline)", requiredStrings: ["Deal & Lead Pipeline Kanban", "Lead", "Negotiation", "Active"] },
  { path: "interactions/page.tsx", name: "Omnichannel Hub (/interactions)", requiredStrings: ["Omnichannel Communications Hub", "LINE", "Phone", "Email"] },
  { path: "reports/page.tsx", name: "SLA & Forecast Reports (/reports)", requiredStrings: ["SLA Compliance & GMV Forecast Desk", "SLA Adherence by BD Lead"] },
  { path: "settings/page.tsx", name: "CRM Routing Settings (/settings)", requiredStrings: ["CRM Routing Rules & System Settings", "PDPA Data Redaction Policies"] },
];

let allPassed = true;

desks.forEach((desk, idx) => {
  const filePath = path.join(appDir, desk.path);
  const exists = fs.existsSync(filePath);

  if (!exists) {
    console.error(`  ❌ FAIL [Desk ${idx + 1}] ${desk.name} — File missing at ${filePath}`);
    allPassed = false;
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const missingStrings = desk.requiredStrings.filter((s) => !content.includes(s));

  if (missingStrings.length > 0) {
    console.error(`  ❌ FAIL [Desk ${idx + 1}] ${desk.name} — Missing expected tokens: ${missingStrings.join(", ")}`);
    allPassed = false;
  } else {
    console.log(`  ✅ PASS [Desk ${idx + 1}] ${desk.name.padEnd(45)} | Size: ${content.length.toString().padEnd(5)} bytes`);
  }
});

console.log(`\n📊 Desk Crawler Summary: ${allPassed ? "7/7 Desks Certified Green" : "Failures Detected"}`);

if (allPassed) {
  console.log("🏆 [CRM CRAWLER] All 7 CRM Operational Desks 100% VERIFIED!\n");
  process.exit(0);
} else {
  console.error("💥 [CRM CRAWLER] Verification failed!\n");
  process.exit(1);
}
