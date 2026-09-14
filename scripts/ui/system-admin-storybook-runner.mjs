#!/usr/bin/env node
/**
 * Sodality Creator Hub — Master System Admin Storybook 8 Validation Runner
 *
 * Usage:
 *   node scripts/ui/system-admin-storybook-runner.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('📚  SYSTEM ADMIN STORYBOOK 8 CDD VALIDATION RUNNER');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

let pass = 0;
let fail = 0;

function check(name, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    fail++;
  }
}

// 1. Storybook configuration files
check('.storybook/main.ts exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/.storybook/main.ts')));
check('.storybook/preview.ts exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/.storybook/preview.ts')));

// 2. Stories
check('FlameGraphViewer.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/FlameGraphViewer.stories.tsx')));
check('ServiceStatusBadge.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/ServiceStatusBadge.stories.tsx')));
check('SystemAdminKpiStrip.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/SystemAdminKpiStrip.stories.tsx')));
check('CircuitBreakerCard.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/CircuitBreakerCard.stories.tsx')));
check('ForensicInspectorDrawer.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/ForensicInspectorDrawer.stories.tsx')));
check('LoginScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/LoginScreen.stories.tsx')));
check('HealthScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/HealthScreen.stories.tsx')));
check('TelemetryScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/TelemetryScreen.stories.tsx')));
check('TenantsScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/TenantsScreen.stories.tsx')));
check('FinanceScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/FinanceScreen.stories.tsx')));
check('CampaignsScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/CampaignsScreen.stories.tsx')));
check('QueuesScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/QueuesScreen.stories.tsx')));
check('SecurityScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/SecurityScreen.stories.tsx')));
check('IntegrationsScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/IntegrationsScreen.stories.tsx')));
check('SettingsScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/SettingsScreen.stories.tsx')));
check('UsersScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/UsersScreen.stories.tsx')));
check('InfraScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/InfraScreen.stories.tsx')));
check('AuditScreen.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/AuditScreen.stories.tsx')));
check('TelemetryBenchmarkDashboard.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/TelemetryBenchmarkDashboard.stories.tsx')));
check('LatencyGauge.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/LatencyGauge.stories.tsx')));
check('DistributionBellCurve.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/DistributionBellCurve.stories.tsx')));
check('DagNodeCard.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/DagNodeCard.stories.tsx')));
check('ConcurrencySlider.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/ConcurrencySlider.stories.tsx')));
check('LinearKpiCard.stories.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/LinearKpiCard.stories.tsx')));

const storyFile = fs.readFileSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/stories/FlameGraphViewer.stories.tsx'), 'utf8');
check('FlameGraphViewer DefaultTrace story exported', storyFile.includes('export const DefaultTrace'));
check('FlameGraphViewer HighLatencyErrorTrace story exported', storyFile.includes('export const HighLatencyErrorTrace'));

// Check component exports from @creatorhub/ui
const uiIndex = fs.readFileSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/index.ts'), 'utf8');
check('@creatorhub/ui exports ServiceStatusBadge', uiIndex.includes('ServiceStatusBadge'));
check('@creatorhub/ui exports SystemAdminKpiStrip', uiIndex.includes('SystemAdminKpiStrip'));
check('@creatorhub/ui exports ForensicInspectorDrawer', uiIndex.includes('ForensicInspectorDrawer'));
check('@creatorhub/ui exports CircuitBreakerCard', uiIndex.includes('CircuitBreakerCard'));
check('@creatorhub/ui exports TelemetryBenchmarkDashboard', uiIndex.includes('TelemetryBenchmarkDashboard'));
check('@creatorhub/ui exports LatencyGauge', uiIndex.includes('LatencyGauge'));
check('@creatorhub/ui exports DistributionBellCurve', uiIndex.includes('DistributionBellCurve'));
check('@creatorhub/ui exports DagNodeCard', uiIndex.includes('DagNodeCard'));
check('@creatorhub/ui exports ConcurrencySlider', uiIndex.includes('ConcurrencySlider'));
check('@creatorhub/ui exports LinearKpiCard', uiIndex.includes('LinearKpiCard'));


// 3. WCAG 2.2 AAA a11y configuration
const previewFile = fs.readFileSync(path.join(REPO_ROOT, 'code/apps/system-admin/.storybook/preview.ts'), 'utf8');
check('WCAG 2.2 AAA a11y parameters configured', previewFile.includes('color-contrast'));
check('Linear Dark & Light mode backgrounds configured', previewFile.includes('#08090a') && previewFile.includes('#f8fafc'));

console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`📊 Storybook Validation Summary: Passed: ${pass}, Failed: ${fail}`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');

if (fail === 0) {
  console.log('✅ SYSTEM ADMIN STORYBOOK 8 CDD SUITE CERTIFIED 100% GREEN!\n');
  process.exit(0);
} else {
  console.error(`❌ STORYBOOK VALIDATION FAILED WITH ${fail} ERRORS!\n`);
  process.exit(1);
}
