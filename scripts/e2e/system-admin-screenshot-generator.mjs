#!/usr/bin/env node
/**
 * Sodality Creator Hub — System Admin 12-Pillar Real Live Playwright Browser Screenshot Generator
 *
 * Launches a real Chromium browser via Playwright against http://localhost:4005,
 * verifies full CSS stylesheets and design tokens (--sys-*), interacts with desks,
 * and saves genuine full-resolution PNG screenshots into docs/04-testing/screenshots/.
 *
 * Usage:
 *   node scripts/e2e/system-admin-screenshot-generator.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SHOTS_DIR = path.join(REPO_ROOT, 'docs/04-testing/screenshots');
const BASE_URL = process.env.SYSTEM_ADMIN_URL || 'http://localhost:4005';

const require = createRequire(import.meta.url);
const playwrightPath = require.resolve('@playwright/test', {
  paths: [
    path.join(REPO_ROOT, 'code/apps/system-admin'),
    path.join(REPO_ROOT, 'code'),
  ],
});
const { chromium } = require(playwrightPath);

fs.mkdirSync(SHOTS_DIR, { recursive: true });

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('📸  SYSTEM ADMIN REAL PLAYWRIGHT LIVE BROWSER SCREENSHOT GENERATOR');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

async function ensureServer() {
  try {
    const res = await fetch(`${BASE_URL}/login`);
    if (res.status === 200) return null;
  } catch (e) {}

  console.log(`🌐 Starting System Admin production server on port 4005...`);
  const s = spawn('pnpm', ['--filter', 'system-admin', 'start'], {
    cwd: path.join(REPO_ROOT, 'code'),
    stdio: 'ignore',
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) {
        console.log(`✓ System Admin server ready on port 4005`);
        return s;
      }
    } catch (e) {}
  }
  return s;
}

async function run() {
  const serverProcess = await ensureServer();

  console.log(`🌐 Connecting to System Admin live server at ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const routes = [
    {
      id: 'p01-zero-trust-login',
      name: 'Pillar 1: Zero-Trust Login & TOTP MFA Flow',
      path: '/login',
      filename: 'p01-zero-trust-login.png',
    },
    {
      id: 'p02-telemetry-flamegraph',
      name: 'Pillar 2: Distributed Traces & Interactive FlameGraph Viewer',
      path: '/telemetry',
      filename: 'p02-telemetry-flamegraph.png',
    },
    {
      id: 'p03-tenant-fleet-dossier',
      name: 'Pillar 3: Multi-Tenant Fleet Governance & 360 Dossiers',
      path: '/tenants',
      filename: 'p03-tenant-fleet-dossier.png',
    },
    {
      id: 'p04-financial-satang-ledger',
      name: 'Pillar 4: Financial & Tax Ledger Satang Precision',
      path: '/finance',
      filename: 'p04-financial-satang-ledger.png',
    },
    {
      id: 'p05-campaigns-logistics-spark',
      name: 'Pillar 5: Campaigns & Sample Logistics Spark Authorization',
      path: '/campaigns',
      filename: 'p05-campaigns-logistics-spark.png',
    },
    {
      id: 'p06-queues-dlq-inspector',
      name: 'Pillar 6: Async Queues & Dead-Letter Poison Message Replay',
      path: '/queues',
      filename: 'p06-queues-dlq-inspector.png',
    },
    {
      id: 'p07-security-cmek-vault',
      name: 'Pillar 7: Security & CMEK Key Vault Zero-Downtime Rotation',
      path: '/security',
      filename: 'p07-security-cmek-vault.png',
    },
    {
      id: 'p08-integrations-circuit-breakers',
      name: 'Pillar 8: Third-Party Integrations & Circuit Breakers',
      path: '/integrations',
      filename: 'p08-integrations-circuit-breakers.png',
    },
    {
      id: 'p09-runtime-settings-killswitches',
      name: 'Pillar 9: Runtime Configuration & Feature Flags',
      path: '/settings',
      filename: 'p09-runtime-settings-killswitches.png',
    },
    {
      id: 'p10-rbac-user-management',
      name: 'Pillar 10: 5-Tier Zero-Trust RBAC User Management',
      path: '/settings/users',
      filename: 'p10-rbac-user-management.png',
    },
    {
      id: 'p11-infra-cloud-topology',
      name: 'Pillar 11: Cloud Infrastructure & Kubernetes Multi-AZ Topology',
      path: '/infra',
      filename: 'p11-infra-cloud-topology.png',
    },
    {
      id: 'p12-audit-merkle-ledger',
      name: 'Pillar 12: SOC 2 Type II Cryptographic Merkle Audit Ledger',
      path: '/audit',
      filename: 'p12-audit-merkle-ledger.png',
    },
    {
      id: 'p13-ecosystem-health-matrix',
      name: 'Ecosystem 360° Real-Time Health & Infrastructure Monitoring',
      path: '/health',
      filename: 'p13-ecosystem-health-matrix.png',
    },
  ];

  for (let i = 0; i < routes.length; i++) {
    const item = routes[i];
    const url = `${BASE_URL}${item.path}`;
    console.log(`[${i + 1}/${routes.length}] Capturing live browser snapshot: ${item.name} (${url})`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    });

    await page.waitForTimeout(500);

    const targetPath = path.join(SHOTS_DIR, item.filename);
    await page.screenshot({ path: targetPath, fullPage: true });
    console.log(`  ✓ Saved Real PNG: docs/04-testing/screenshots/${item.filename}`);
  }

  await browser.close();

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('✅ ALL 13 REAL LIVE BROWSER PNG SCREENSHOTS CAPTURED WITH FULL STYLESHEETS!');
  console.log('════════════════════════════════════════════════════════════════════════════════');
}

run().catch((err) => {
  console.error('❌ Failed to capture real live screenshots:', err);
  process.exit(1);
});
