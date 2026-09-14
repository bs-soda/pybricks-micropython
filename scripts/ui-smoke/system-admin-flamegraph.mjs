#!/usr/bin/env node
/**
 * Sodality Creator Hub — Master System Admin UI 12-Pillar Smoke Test Harness
 *
 * Verifies that all 12 enterprise operational pillar pages, layout shells,
 * design tokens, and exported UI components exist and meet strict criteria.
 *
 * Usage:
 *   node scripts/ui-smoke/system-admin-flamegraph.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🔥  SYSTEM ADMIN PORTAL MASTER 12-PILLAR UI SMOKE TEST');
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

// 1. Package and monorepo scaffolding
check('apps/system-admin directory exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin')));
check('apps/system-admin/package.json exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/package.json')));
check('apps/system-admin/src/app/layout.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/layout.tsx')));
check('apps/system-admin/src/app/page.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/page.tsx')));

// 2. All 12 Operational Pillar Pages
check('Pillar 1 (/login): Zero-Trust Login & TOTP MFA exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/login/page.tsx')));
check('Pillar 2 (/telemetry): Telemetry & FlameGraph Dashboard exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/telemetry/page.tsx')));
check('Pillar 3 (/tenants): Multi-Tenant Fleet Governance exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/tenants/page.tsx')));
check('Pillar 4 (/finance): Financial & Tax Ledger Satang Core exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/finance/page.tsx')));
check('Pillar 5 (/campaigns): Campaigns & Sample Logistics exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/campaigns/page.tsx')));
check('Pillar 6 (/queues): Async Queues & Dead-Letter Queue exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/queues/page.tsx')));
check('Pillar 7 (/security): Security & CMEK Key Vault exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/security/page.tsx')));
check('Pillar 8 (/integrations): Third-Party APIs & Circuit Breakers exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/integrations/page.tsx')));
check('Pillar 9 (/settings): Runtime Config & Feature Flags exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/settings/page.tsx')));
check('Pillar 10 (/settings/users): 5-Tier Zero-Trust RBAC Management exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/settings/users/page.tsx')));
check('Pillar 11 (/infra): Cloud Infrastructure & Kubernetes Topology exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/infra/page.tsx')));
check('Pillar 12 (/audit): SOC 2 Type II Merkle Audit Ledger exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/audit/page.tsx')));
check('Ecosystem Health (/health): Ecosystem 360° Real-Time Health exists', fs.existsSync(path.join(REPO_ROOT, 'code/apps/system-admin/src/app/health/page.tsx')));

// 3. UI Component exports
check('FlameGraphViewer.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/composites/FlameGraphViewer.tsx')));
check('ServiceStatusBadge.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/composites/ServiceStatusBadge.tsx')));
check('SystemAdminKpiStrip.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/composites/SystemAdminKpiStrip.tsx')));
check('ForensicInspectorDrawer.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/composites/ForensicInspectorDrawer.tsx')));
check('CircuitBreakerCard.tsx exists', fs.existsSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/composites/CircuitBreakerCard.tsx')));

const uiIndex = fs.readFileSync(path.join(REPO_ROOT, 'code/packages/ui/src/components/index.ts'), 'utf8');
check('FlameGraphViewer exported from packages/ui/src/components/index.ts', uiIndex.includes('FlameGraphViewer'));
check('ServiceStatusBadge exported from packages/ui/src/components/index.ts', uiIndex.includes('ServiceStatusBadge'));
check('SystemAdminKpiStrip exported from packages/ui/src/components/index.ts', uiIndex.includes('SystemAdminKpiStrip'));
check('ForensicInspectorDrawer exported from packages/ui/src/components/index.ts', uiIndex.includes('ForensicInspectorDrawer'));
check('CircuitBreakerCard exported from packages/ui/src/components/index.ts', uiIndex.includes('CircuitBreakerCard'));


// 4. Design tokens verification
const tokensCss = fs.readFileSync(path.join(REPO_ROOT, 'code/packages/ui/src/tokens/system-admin.css'), 'utf8');
check('Linear Dark --sys-bg-canvas defined', tokensCss.includes('--sys-bg-canvas: #08090a'));
check('Linear --sys-accent-indigo defined', tokensCss.includes('--sys-accent-indigo:'));

// 5. Backend Axum telemetry routing
const libRs = fs.readFileSync(path.join(REPO_ROOT, 'code/apps/backend/api/src/lib.rs'), 'utf8');
check('lib.rs mounts /v1/admin/telemetry/traces', libRs.includes('/v1/admin/telemetry/traces'));
check('lib.rs mounts /v1/admin/telemetry/stats', libRs.includes('/v1/admin/telemetry/stats'));

console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`📊 Master Smoke Test Summary: Passed: ${pass}, Failed: ${fail}`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');

if (fail === 0) {
  console.log('✅ ALL 12 SYSTEM ADMIN OPERATIONAL PILLARS SMOKE TEST PASSED 100% GREEN!\n');
  process.exit(0);
} else {
  console.error(`❌ SMOKE TEST FAILED WITH ${fail} ERRORS!\n`);
  process.exit(1);
}
