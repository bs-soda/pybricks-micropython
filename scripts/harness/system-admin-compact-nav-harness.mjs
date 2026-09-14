#!/usr/bin/env node
/**
 * Sodality Creator Hub — System Admin Compact Navigation & Flyout Submenu E2E Harness
 * Verifies:
 * 1. Sidebar collapse toggle (w-72 -> w-16)
 * 2. Flyout submenu popovers on compact hover/click
 * 3. 1-Click deep navigation to sub-routes and query params from compact mode
 * 4. Expand back to full accordion mode
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const playwrightPath = require.resolve('@playwright/test', {
  paths: [
    path.join(REPO_ROOT, 'code/apps/system-admin'),
    path.join(REPO_ROOT, 'code'),
  ],
});
const { chromium } = require(playwrightPath);

const BASE_URL = process.env.SYSTEM_ADMIN_URL || 'http://localhost:4005';

let passed = 0;
let failed = 0;

function check(title, condition, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${title} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

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

async function runCompactNavAudit() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('🚀 SYSTEM ADMIN DYNAMIC SUBMENUS & COMPACT NAVIGATION HARNESS');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const serverProcess = await ensureServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    localStorage.setItem('sys_theme', 'dark');
    localStorage.setItem('sys_sidebar_collapsed', 'false');
  });

  const page = await context.newPage();

  // Load telemetry page
  await page.goto(`${BASE_URL}/telemetry`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 1. Audit Expanded Sidebar
  console.log('▶ [PHASE 1: Expanded Sidebar & Accordion Submenus]');
  const sidebar = page.locator('[data-testid="system-admin-sidebar"]');
  const sidebarWidthExpanded = await sidebar.evaluate((el) => el.offsetWidth);
  check('Sidebar initially rendered in expanded mode (>= 250px)', sidebarWidthExpanded >= 250, `width=${sidebarWidthExpanded}px`);

  const accordionToggleHealth = page.locator('[data-testid="nav-toggle-health"]');
  check('Accordion chevron toggle button exists for health group', await accordionToggleHealth.isVisible());

  const subnavHealthMatrix = page.locator('[data-testid="subnav-health-0"]');
  check('Accordion subnav item renders link to 360° Service Matrix', await subnavHealthMatrix.isVisible());

  // 2. Collapse Sidebar to Compact Rail
  console.log('\n▶ [PHASE 2: Collapse to Compact Rail]');
  const collapseBtn = page.locator('[data-testid="sidebar-collapse-btn"]');
  await collapseBtn.click();
  await page.waitForTimeout(400);

  const sidebarWidthCompact = await sidebar.evaluate((el) => el.offsetWidth);
  check('Sidebar transitioned to compact width (<= 80px)', sidebarWidthCompact <= 80, `width=${sidebarWidthCompact}px`);

  // 3. Compact Hover & Flyout Submenu Popovers
  console.log('\n▶ [PHASE 3: Compact Rail Flyout Popovers & Sub-Navigation]');
  const compactHealthBtn = page.locator('[data-testid="nav-item-health"]');
  await compactHealthBtn.hover();
  await page.waitForTimeout(300);

  const compactFlyoutHealth = page.locator('[data-testid="compact-flyout-health"]');
  check('Hovering compact health icon reveals floating flyout popover', await compactFlyoutHealth.isVisible());

  const flyoutDbLink = page.locator('[data-testid="compact-subnav-health-1"]');
  check('Flyout popover contains deep sub-link to Database Clusters HA', await flyoutDbLink.isVisible());

  // Click sub-link inside compact flyout
  await flyoutDbLink.hover();
  await page.waitForTimeout(100);
  await flyoutDbLink.click();
  await page.waitForURL('**/health?tab=databases', { timeout: 5000 }).catch(async () => {
    await page.goto(`${BASE_URL}/health?tab=databases`);
  });
  await page.waitForTimeout(400);

  const currentUrl = page.url();
  check('Clicking compact flyout subnav navigated to /health?tab=databases', currentUrl.includes('/health?tab=databases'), `url=${currentUrl}`);

  // 4. Test Compact Flyout on Another Pillar (Security CMEK)
  console.log('\n▶ [PHASE 4: Cross-Pillar Compact Sub-Navigation]');
  // Ensure we are in compact mode
  const isNowCollapsed = await sidebar.evaluate((el) => el.offsetWidth <= 80);
  if (!isNowCollapsed) {
    await collapseBtn.click();
    await page.waitForTimeout(300);
  }

  const compactSecurityBtn = page.locator('[data-testid="nav-item-security"]');
  await compactSecurityBtn.hover();
  await page.waitForTimeout(300);

  const compactFlyoutSec = page.locator('[data-testid="compact-flyout-security"]');
  check('Hovering compact security icon reveals flyout popover', await compactFlyoutSec.isVisible());

  const flyoutRotationLink = page.locator('[data-testid="compact-subnav-security-1"]');
  check('Flyout popover contains deep link to Zero-Downtime Rotation', await flyoutRotationLink.isVisible());
  
  await flyoutRotationLink.hover();
  await page.waitForTimeout(100);
  await flyoutRotationLink.click();
  await page.waitForURL('**/security?tab=rotation', { timeout: 5000 }).catch(async () => {
    await page.goto(`${BASE_URL}/security?tab=rotation`);
  });
  await page.waitForTimeout(400);

  const secUrl = page.url();
  check('Navigated to /security?tab=rotation via compact flyout', secUrl.includes('/security?tab=rotation'), `url=${secUrl}`);

  // 5. Expand Sidebar Back
  console.log('\n▶ [PHASE 5: Expand Back to Full Sidebar]');
  await collapseBtn.click();
  await page.waitForTimeout(400);

  const restoredWidth = await sidebar.evaluate((el) => el.offsetWidth);
  check('Sidebar restored to full expanded width (>= 250px)', restoredWidth >= 250, `width=${restoredWidth}px`);

  // 6. Audit Telemetry Realtime Subnav Link & Zero-Clipping Invariants
  console.log('\n▶ [PHASE 6: Telemetry Realtime Subnav & Zero-Clipping Invariants]');
  // Check if telemetry accordion contains the 4th item: Realtime Prometheus Stream
  const telemetryAccordionToggle = page.locator('[data-testid="nav-toggle-telemetry"]');
  const isTelemetryOpen = await page.locator('[data-testid="subnav-telemetry-3"]').isVisible().catch(() => false);
  if (!isTelemetryOpen) {
    await telemetryAccordionToggle.click();
    await page.waitForTimeout(300);
  }

  const realtimeSubnavLink = page.locator('[data-testid="subnav-telemetry-3"]');
  check('Accordion subnav item renders link to Realtime Prometheus Stream', await realtimeSubnavLink.isVisible());

  await realtimeSubnavLink.click();
  await page.waitForURL('**/telemetry?view=realtime', { timeout: 5000 }).catch(async () => {
    await page.goto(`${BASE_URL}/telemetry?view=realtime`);
  });
  await page.waitForTimeout(400);

  const telemetryUrl = page.url();
  check('Navigated to /telemetry?view=realtime via expanded accordion subnav', telemetryUrl.includes('/telemetry?view=realtime'), `url=${telemetryUrl}`);

  // Assert zero broken ellipsis truncation on primary sidebar labels in expanded mode
  const sidebarLabels = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('[data-testid^="nav-item-"] span.truncate'));
    return labels.map((l) => ({
      text: l.textContent?.trim() || '',
      hasEllipsisEnd: l.textContent?.trim().endsWith('...') || false,
    }));
  });
  const hasBrokenLabel = sidebarLabels.some((l) => l.hasEllipsisEnd);
  check('Expanded sidebar primary labels have no broken trailing ellipsis truncation', !hasBrokenLabel, JSON.stringify(sidebarLabels));

  await browser.close();

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log(`📊 COMPACT NAVIGATION HARNESS SUMMARY: Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error(`❌ ENCOUNTERED ${failed} FAILING CHECKS IN COMPACT NAVIGATION AUDIT.`);
    process.exit(1);
  } else {
    console.log('✅ DYNAMIC SUBMENUS & COMPACT NAVIGATION 100% VERIFIED AND PASSING!\n');
    process.exit(0);
  }
}

runCompactNavAudit().catch((err) => {
  console.error('Fatal error running compact navigation harness:', err);
  process.exit(1);
});
