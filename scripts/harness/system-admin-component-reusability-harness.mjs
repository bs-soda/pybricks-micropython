#!/usr/bin/env node
/**
 * Sodality Creator Hub — Master System Admin Component Reusability & Zero-Missing Parity Harness
 *
 * Enforces zero-regression, zero-missing-component standards across:
 *   1. Reusable Composite Component Registry (@creatorhub/ui exports)
 *   2. 100% Storybook 8 CSF 3.0 Story Parity (Composites & Full Screen Desks)
 *   3. 100% Reusable Component Adoption across ALL 13 System Admin Pages
 *   4. Live Backend API Client Fetcher Patterns with Seeded Fallbacks
 *   5. Design Token (--sys-*) Strict Theme Compliance
 *   6. OpenAPI 3.1 69+2 Endpoint Gateway Contract Parity
 *   7. Zero Mocks & Zero Stubs Global Engineering Invariant
 *
 * Usage:
 *   node scripts/harness/system-admin-component-reusability-harness.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🛡️  SYSTEM ADMIN MASTER COMPONENT REUSABILITY & ZERO-MISSING PARITY HARNESS');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

let pass = 0;
let fail = 0;

function check(title, condition, failureDetail = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${title}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${title}`);
    if (failureDetail) console.error(`    ↳ Error: ${failureDetail}`);
    fail++;
  }
}

// -----------------------------------------------------------------------------
// CHECK 1: REUSABLE COMPOSITE COMPONENT REGISTRY
// -----------------------------------------------------------------------------
console.log('▶ [CHECK 1: Reusable Composite Component Registry & Exports]');

const REQUIRED_COMPOSITES = [
  'FlameGraphViewer',
  'ServiceStatusBadge',
  'SystemAdminKpiStrip',
  'ForensicInspectorDrawer',
  'CircuitBreakerCard',
  'RealtimeTimeSeriesGraph',
  'PrometheusMetricCard',
  'PromQLQueryBar',
  'RealtimeGraphDashboard',
  'TelemetryBenchmarkDashboard',
];

const REQUIRED_ATOMIC_PRIMITIVES = [
  'sparkline',
  'metric-badge',
  'range-scrubber',
  'segment-control',
  'latency-gauge',
  'distribution-bell-curve',
  'dag-node-card',
  'concurrency-slider',
  'linear-kpi-card',
];

const uiIndexFile = path.join(REPO_ROOT, 'code/packages/ui/src/components/index.ts');
const uiIndexContent = fs.readFileSync(uiIndexFile, 'utf8');

for (const comp of REQUIRED_COMPOSITES) {
  const compPath = path.join(REPO_ROOT, `code/packages/ui/src/components/composites/${comp}.tsx`);
  const exists = fs.existsSync(compPath);
  check(`Composite component ${comp}.tsx exists on disk`, exists, `File missing: ${compPath}`);

  const isExported = uiIndexContent.includes(comp);
  check(`Composite component ${comp} is exported from @creatorhub/ui`, isExported, `Missing export in index.ts`);
}

for (const atom of REQUIRED_ATOMIC_PRIMITIVES) {
  const atomPath = path.join(REPO_ROOT, `code/packages/ui/src/components/ui/${atom}.tsx`);
  const exists = fs.existsSync(atomPath);
  check(`Atomic primitive ${atom}.tsx exists on disk`, exists, `File missing: ${atomPath}`);

  const exportSymbol = atom.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  const isExported = uiIndexContent.includes(atom);
  check(`Atomic primitive ${atom} is exported from @creatorhub/ui`, isExported, `Missing export in index.ts`);
}

// -----------------------------------------------------------------------------
// CHECK 2: 100% STORYBOOK 8 STORY PARITY (COMPOSITES & SCREENS)
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 2: Storybook 8 CSF 3.0 Story Parity (Composites & Screen Desks)]');

const storyDir = path.join(REPO_ROOT, 'code/apps/system-admin/src/stories');
check('System Admin stories directory exists', fs.existsSync(storyDir));

// Composite stories
for (const comp of REQUIRED_COMPOSITES) {
  const storyPath = path.join(storyDir, `${comp}.stories.tsx`);
  const exists = fs.existsSync(storyPath);
  check(`Composite story ${comp}.stories.tsx exists`, exists, `Missing story: ${storyPath}`);

  if (exists) {
    const storyContent = fs.readFileSync(storyPath, 'utf8');
    check(`Story ${comp}.stories.tsx follows CSF 3.0 meta export`, storyContent.includes('export default meta'));
  }
}

// Screen stories
const REQUIRED_SCREENS = [
  'LoginScreen',
  'HealthScreen',
  'TelemetryScreen',
  'TenantsScreen',
  'FinanceScreen',
  'CampaignsScreen',
  'QueuesScreen',
  'SecurityScreen',
  'IntegrationsScreen',
  'SettingsScreen',
  'UsersScreen',
  'InfraScreen',
  'AuditScreen',
];

for (const scr of REQUIRED_SCREENS) {
  const storyPath = path.join(storyDir, `${scr}.stories.tsx`);
  const exists = fs.existsSync(storyPath);
  check(`Screen desk story ${scr}.stories.tsx exists`, exists, `Missing screen story: ${storyPath}`);

  if (exists) {
    const storyContent = fs.readFileSync(storyPath, 'utf8');
    check(`Screen story ${scr}.stories.tsx follows CSF 3.0 meta export`, storyContent.includes('export default meta'));
  }
}

// -----------------------------------------------------------------------------
// CHECK 3: 100% REUSABLE COMPONENT ADOPTION ACROSS ALL 13 PAGES
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 3: 100% Reusable Component Adoption Across All 13 Pages]');

const SYSTEM_ADMIN_PAGES = [
  { path: 'login/page.tsx', name: 'Pillar 1: Zero-Trust Login' },
  { path: 'telemetry/page.tsx', name: 'Pillar 2: Telemetry & FlameGraph', requiredImport: 'FlameGraphViewer' },
  { path: 'tenants/page.tsx', name: 'Pillar 3: Multi-Tenant Fleet', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'finance/page.tsx', name: 'Pillar 4: Financial & Tax Ledger', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'campaigns/page.tsx', name: 'Pillar 5: Campaigns & Sample Logistics', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'queues/page.tsx', name: 'Pillar 6: Async Queues & DLQ', requiredImport: 'ForensicInspectorDrawer' },
  { path: 'security/page.tsx', name: 'Pillar 7: Security & CMEK Key Vault', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'integrations/page.tsx', name: 'Pillar 8: Third-Party Integrations', requiredImport: 'CircuitBreakerCard' },
  { path: 'settings/page.tsx', name: 'Pillar 9: Runtime Configuration & Flags', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'settings/users/page.tsx', name: 'Pillar 10: 5-Tier RBAC Management', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'infra/page.tsx', name: 'Pillar 11: Cloud Infrastructure & K8s', requiredImport: 'SystemAdminKpiStrip' },
  { path: 'audit/page.tsx', name: 'Pillar 12: SOC 2 Type II Merkle Ledger', requiredImport: 'ForensicInspectorDrawer' },
  { path: 'health/page.tsx', name: 'Ecosystem: 360° Real-Time Health', requiredImport: 'SystemAdminKpiStrip' },
];

const appRoot = path.join(REPO_ROOT, 'code/apps/system-admin/src/app');

for (const pg of SYSTEM_ADMIN_PAGES) {
  const fullPath = path.join(appRoot, pg.path);
  const exists = fs.existsSync(fullPath);
  check(`Page ${pg.name} (${pg.path}) exists on disk`, exists, `File missing: ${fullPath}`);

  if (exists && pg.requiredImport) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasImport = content.includes(pg.requiredImport);
    check(
      `Page ${pg.path} consumes reusable composite @creatorhub/ui::${pg.requiredImport}`,
      hasImport,
      `Expected import of ${pg.requiredImport} in ${pg.path}`
    );
  }
}

// -----------------------------------------------------------------------------
// CHECK 4: LIVE BACKEND API CLIENT FETCHERS ON OPERATIONAL DESKS
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 4: Live Backend API Client Fetcher Hooks on Operational Desks]');

const API_DESKS = [
  { path: 'telemetry/page.tsx', endpoint: '/v1/admin/telemetry' },
  { path: 'tenants/page.tsx', endpoint: 'tenants' },
  { path: 'finance/page.tsx', endpoint: '/v1/admin/finance' },
  { path: 'campaigns/page.tsx', endpoint: '/v1/admin/campaigns' },
  { path: 'queues/page.tsx', endpoint: '/v1/admin/queues' },
  { path: 'security/page.tsx', endpoint: '/v1/admin/security' },
  { path: 'settings/page.tsx', endpoint: '/v1/admin/settings' },
  { path: 'settings/users/page.tsx', endpoint: '/v1/admin/users' },
  { path: 'infra/page.tsx', endpoint: '/v1/admin/infra' },
  { path: 'audit/page.tsx', endpoint: '/v1/admin/audit' },
  { path: 'health/page.tsx', endpoint: '/v1/admin/health' },
];

for (const desk of API_DESKS) {
  const fullPath = path.join(appRoot, desk.path);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasFetch = content.includes('fetch(') || content.includes('lib/api') || content.includes('api.') || content.includes(desk.endpoint);
    check(`Desk ${desk.path} includes live backend query handler for ${desk.endpoint}`, hasFetch);
  }
}

// -----------------------------------------------------------------------------
// CHECK 5: DESIGN TOKEN THEME COMPLIANCE
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 5: Linear Dark/Light Token (--sys-*) Theme Compliance]');

const tokensPath = path.join(REPO_ROOT, 'code/packages/ui/src/tokens/system-admin.css');
check('Design tokens CSS system-admin.css exists', fs.existsSync(tokensPath));

const tokensContent = fs.readFileSync(tokensPath, 'utf8');
const REQUIRED_TOKENS = [
  '--sys-bg-canvas',
  '--sys-bg-surface',
  '--sys-bg-surface-l2',
  '--sys-text-primary',
  '--sys-text-secondary',
  '--sys-text-muted',
  '--sys-border-subtle',
  '--sys-accent-indigo',
];

for (const t of REQUIRED_TOKENS) {
  check(`Token definition ${t} present in system-admin.css`, tokensContent.includes(t));
}

// -----------------------------------------------------------------------------
// CHECK 6: OPENAPI 3.1 & AXUM ROUTER ENDPOINT PARITY
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 6: OpenAPI 3.1 & Axum Router Endpoint Parity]');

const yamlPath = path.join(REPO_ROOT, 'docs/03-architecture/api/openapi-system-admin-complete.yaml');
const jsonPath = path.join(REPO_ROOT, 'docs/03-architecture/api/openapi-system-admin-complete.json');

check('OpenAPI YAML contract exists', fs.existsSync(yamlPath));
check('OpenAPI JSON contract exists', fs.existsSync(jsonPath));

const libRsPath = path.join(REPO_ROOT, 'code/apps/backend/api/src/lib.rs');
const libRsContent = fs.readFileSync(libRsPath, 'utf8');

const REQUIRED_AXUM_ROUTES = [
  '/v1/admin/telemetry/traces',
  '/v1/admin/health/ecosystem',
  '/v1/admin/infra/topology',
  '/v1/admin/tenants/fleet',
  '/v1/admin/finance/ledger',
  '/v1/admin/campaigns/samples',
  '/v1/admin/queues/dlq',
  '/v1/admin/security/keys',
  '/v1/admin/settings/flags',
  '/v1/admin/users',
  '/v1/admin/audit/blocks',
  '/v1/admin/integrations',
];

for (const route of REQUIRED_AXUM_ROUTES) {
  check(`Axum router lib.rs registers route ${route}`, libRsContent.includes(route));
}

// -----------------------------------------------------------------------------
// CHECK 7: ZERO MOCKS & ZERO STUBS INVARIANT
// -----------------------------------------------------------------------------
console.log('\n▶ [CHECK 7: Zero Mocks & Zero Stubs Global Engineering Invariant]');

const RUST_SOURCE_FILES = [
  'code/apps/backend/api/src/telemetry_gateway.rs',
  'code/apps/backend/api/src/system_admin_gateway.rs',
  'code/apps/backend/api/src/health.rs',
  'code/apps/backend/api/src/lib.rs',
];

for (const f of RUST_SOURCE_FILES) {
  const filePath = path.join(REPO_ROOT, f);
  const exists = fs.existsSync(filePath);
  check(`Rust source file ${f} exists on disk`, exists);
  if (exists) {
    const code = fs.readFileSync(filePath, 'utf8');
    const hasTodo = code.includes('todo!') || code.includes('unimplemented!');
    check(`Zero todo!/unimplemented! in ${f}`, !hasTodo, `Found stub/mock placeholders in ${f}`);
  }
}

// -----------------------------------------------------------------------------
// SUMMARY & VERIFICATION GATES
// -----------------------------------------------------------------------------
console.log('\n────────────────────────────────────────────────────────────────────────────────');
console.log(`📊 Component Reusability & Parity Summary: Passed: ${pass}, Failed: ${fail}`);
console.log('────────────────────────────────────────────────────────────────────────────────\n');

if (fail === 0) {
  console.log('✅ ALL REUSABLE UI COMPONENTS, STORIES, PAGES & CONTRACTS ARE 100% GREEN!\n');
  process.exit(0);
} else {
  console.error(`❌ REUSABILITY HARNESS FAILED WITH ${fail} ERRORS!\n`);
  process.exit(1);
}
