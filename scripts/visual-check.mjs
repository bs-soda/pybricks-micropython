#!/usr/bin/env node
/**
 * Visual check — screenshot every live route for side-by-side vs the mocks.
 * Local use only (needs a browser):
 *   1. Terminal A:  cd code && pnpm dev            # gateway on :4000
 *   2. Terminal B:  pnpm add -D playwright && npx playwright install chromium
 *                   node scripts/visual-check.mjs
 * Output: docs/assets/mockups/_shots/<route>.png — diff against the mock.
 * See docs/06-workflows/ui-definition-of-done.md and PARITY.md
 */
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/assets/mockups/_shots");
const BASE = process.env.BASE_URL || "http://localhost:4000";

const ROUTES = [
  "/",
  "/brand/auth", "/brand/dashboard", "/brand/creators", "/brand/logistics", "/brand/reports", "/brand/settings",
  "/admin/auth", "/admin/dashboard", "/admin/staging", "/admin/moderation", "/admin/logistics", "/admin/payouts", "/admin/vault",
  "/creator/auth", "/creator/briefing", "/creator/dashboard", "/creator/wallet",
];

const { chromium } = await import("playwright").catch(() => {
  console.error("playwright not installed. Run: pnpm add -D playwright && npx playwright install chromium");
  process.exit(1);
});

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const r of ROUTES) {
  const url = BASE + r;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(600);
    const name = (r === "/" ? "landing" : r.slice(1).replaceAll("/", "-")) + ".png";
    await page.screenshot({ path: join(OUT, name), fullPage: true });
    console.log("shot:", name);
  } catch (e) {
    console.log("FAILED:", url, "-", e.message);
  }
}

await browser.close();
console.log("\nDone → docs/assets/mockups/_shots/. Diff each against its mock in PARITY.md");
