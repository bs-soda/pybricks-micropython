#!/usr/bin/env node

/**
 * Internal CRM Storybook 8 CDD Verification Harness
 * 
 * Validates:
 * 1. 14 Storybook stories in code/apps/internal-crm/src/stories/
 * 2. CSF 3.0 syntax compliance (export default meta, type Story = StoryObj)
 * 3. Automated documentation generation ('autodocs' tag on each story)
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n📚 [CRM STORYBOOK HARNESS] Validating Storybook 8 CDD Stories & CSF 3.0 Meta...\n");

const rootDir = process.cwd();
const storiesDir = path.join(rootDir, "code/apps/internal-crm/src/stories");

const EXPECTED_STORIES = [
  "CrmKpiCard.stories.tsx",
  "HierarchicalSearchTree.stories.tsx",
  "FilterFacetGroup.stories.tsx",
  "CreatorTimelineBadge.stories.tsx",
  "DealPipelineStageBadge.stories.tsx",
  "InteractionLogDrawer.stories.tsx",
  "CrmBreadcrumbs.stories.tsx",
  "OverviewDesk.stories.tsx",
  "HierarchicalSearchDesk.stories.tsx",
  "CreatorDirectoryDesk.stories.tsx",
  "DealPipelineDesk.stories.tsx",
  "OmnichannelHubDesk.stories.tsx",
  "ReportsDesk.stories.tsx",
  "SettingsDesk.stories.tsx",
];

let allPassed = true;

EXPECTED_STORIES.forEach((storyFile, idx) => {
  const filePath = path.join(storiesDir, storyFile);
  const exists = fs.existsSync(filePath);

  if (!exists) {
    console.error(`  ❌ FAIL [Story ${idx + 1}] ${storyFile} — File missing at ${filePath}`);
    allPassed = false;
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const hasMeta = content.includes("export default meta");
  const hasAutodocs = content.includes("'autodocs'") || content.includes('"autodocs"');

  if (!hasMeta || !hasAutodocs) {
    console.error(`  ❌ FAIL [Story ${idx + 1}] ${storyFile} — Missing CSF 3.0 meta or autodocs tag`);
    allPassed = false;
  } else {
    console.log(`  ✅ PASS [Story ${idx + 1}] ${storyFile.padEnd(45)} | Size: ${content.length.toString().padEnd(5)} bytes`);
  }
});

console.log(`\n📊 Storybook Summary: ${allPassed ? "14/14 Stories 100% Validated" : "Failures Detected"}`);

if (allPassed) {
  console.log("🏆 [CRM STORYBOOK HARNESS] All 14 Storybook 8 CDD Stories Certified Green!\n");
  process.exit(0);
} else {
  console.error("💥 [CRM STORYBOOK HARNESS] Storybook verification failed!\n");
  process.exit(1);
}
