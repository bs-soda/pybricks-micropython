#!/usr/bin/env node
/**
 * G-060 — Agency Requests desk UI smoke (Playwright + Chromium).
 * Maps 1:1 to docs/02-product/acceptance/G-060.md scenarios 1–5.
 *
 * Opens a real Chromium window (headed by default) so you can watch the desk.
 * Hits an already-running Agency Admin app. Does not start servers.
 *
 * Prerequisites:
 *   cd code && pnpm --filter admin-console dev     # http://localhost:4002/admin
 *   AGENCY_API_ORIGIN in admin-console .env = the same /v1 door as API_BASE
 *
 * Install (once):
 *   cd scripts/ui-smoke && npm install && npx playwright install chromium && cd ../..
 *
 * Run from repo root (Chromium window opens):
 *   node scripts/ui-smoke/agency-requests-desk.mjs
 *
 * Headless:
 *   $env:UI_SMOKE_HEADED="0"
 *   node scripts/ui-smoke/agency-requests-desk.mjs
 *
 * UAT API (if .env is not already that origin):
 *   $env:API_BASE="https://uat-api-creatorhub.sodality.co.th/v1"
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
if (!process.env.API_BASE) {
  try {
    const env = readFileSync(join(ROOT, "code/apps/admin-console/.env"), "utf8");
    const m = env.match(/^AGENCY_API_ORIGIN=(.+)$/m);
    if (m) process.env.API_BASE = m[1].trim();
  } catch {
    /* use http-smoke default */
  }
}

const {
  ACME_ID,
  BASE,
  SEED_MANAGED_100,
  mintBrandJwt,
  request,
  requireApi,
} = await import("../http-smoke/lib.mjs");

const ORIGIN = (process.env.ADMIN_ORIGIN || "http://localhost:4002").replace(/\/$/, "");
const BASE_PATH = process.env.ADMIN_BASE_PATH || "/admin";
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const TOKEN_KEY = "agencyAccessToken";
const BRAND_KEY = "agencyBrandId";

const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const BRANDS = `${ORIGIN}${BASE_PATH}/brands`;
const REQUESTS = `${ORIGIN}${BASE_PATH}/requests`;
const PACKAGES = `${ORIGIN}${BASE_PATH}/packages`;
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED !== "0";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 1600 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 400 : 0));

const TINY_PDF = {
  name: "g060-quote.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};
const HUGE_PDF = {
  name: "too-big.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * 1024 * 1024 + 1)]),
};

const stats = { pass: 0, fail: 0 };
const failures = [];

function fail(message) {
  throw new Error(message);
}

function ok(message) {
  console.log(`  ok    ${message}`);
}

function step(title) {
  console.log(`\n→ ${title}`);
}

async function look() {
  if (!DELAY_MS || DELAY_MS <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

async function dump(page) {
  const snippet = await page
    .locator("body")
    .innerText()
    .then((t) => t.slice(0, 600))
    .catch(() => "");
  console.error(`  debug url=${page.url()}\n  body=${snippet}`);
}

async function run(id, title, page, fn) {
  step(`${id} — ${title}`);
  try {
    await fn();
    stats.pass += 1;
    ok(`PASS ${id}`);
    await look();
  } catch (err) {
    stats.fail += 1;
    const msg = err?.message || String(err);
    failures.push(`${id}: ${msg}`);
    console.error(`  FAIL  ${id}: ${msg}`);
    await dump(page);
    await look();
  }
}

async function requireAdmin() {
  step(`check Agency Admin at ${AUTH}`);
  try {
    const res = await fetch(AUTH, { redirect: "manual" });
    if (res.status >= 500) fail(`GET ${AUTH} → ${res.status}`);
  } catch (err) {
    fail(
      `cannot reach ${AUTH} (${err.cause?.code || err.message}). Start Agency Admin:\n` +
        `  cd code\n  pnpm --filter admin-console dev\n` +
        `Login URL is ${AUTH}`,
    );
  }
  ok("Agency Admin reachable");
}

async function login(page) {
  await page.goto(AUTH, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/auth/login") && res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginRes = await loginResponse;
  if (loginRes.status() !== 200) fail(`login POST expected 200, got ${loginRes.status()}`);
  await page.waitForURL((url) => url.pathname.endsWith(`${BASE_PATH}/brands`), { timeout: 30_000 });
  await page.getByRole("heading", { name: "Brands" }).waitFor({ timeout: 30_000 });
}

async function createRequest(brand, body) {
  const res = await request("POST", "/brand/requests", { token: brand, body });
  if (res.status !== 201) {
    fail(`R1 expected 201, got ${res.status} ${JSON.stringify(res.body)?.slice(0, 240)}`);
  }
  return res.body;
}

async function waitForRow(page, id) {
  const search = page.getByPlaceholder("Search by package or ID…");
  await search.fill(id);
  await page.getByText(id, { exact: true }).waitFor({ timeout: 25_000 });
}

async function goRequests(page) {
  await page.locator("aside nav").getByRole("link", { name: /Requests/ }).click();
  await page.getByRole("heading", { name: "Requests" }).waitFor({ timeout: 30_000 });
}

async function openRequest(page, id) {
  await waitForRow(page, id);
  await page.getByRole("row").filter({ hasText: id }).getByRole("link", { name: "Open" }).click();
  await page.waitForURL((url) => url.pathname.includes(`/requests/${id}`), { timeout: 30_000 });
}

async function dropPdf(page, file) {
  await page.locator('input[type="file"]').setInputFiles(file);
}

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/agency-requests-desk.mjs",
  );
  process.exit(1);
});

await requireAdmin();
await requireApi();
ok(`API ${BASE} · Chromium ${SHOW_BROWSER ? "headed" : "headless"}`);

const brand = mintBrandJwt(ACME_ID);
const stamp = Date.now();

const browser = await playwright.chromium.launch({
  headless: !SHOW_BROWSER,
  slowMo: SLOW_MS > 0 ? SLOW_MS : 0,
});

let page;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.setDefaultTimeout(25_000);

  step("sign in → Select Brand");
  await login(page);
  ok(`landed on ${page.url()}`);
  await look();

  await run("G060-S1-no-brand", "no Select Brand → empty copy on /requests", page, async () => {
    await page.goto(REQUESTS, { waitUntil: "domcontentloaded" });
    await page.getByText("Select a brand to see its requests.").waitFor();
  });

  await run("G060-S1-live-list", "Select Acme → live R4 table, no Copy / Open Overview", page, async () => {
    await page.goto(BRANDS, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Search authorized brands").fill("Acme");
    await page.getByRole("button", { name: /Acme/ }).first().click();
    await page.getByRole("heading", { name: /Acme/, level: 1 }).waitFor({ timeout: 30_000 });
    const stored = await page.evaluate((key) => localStorage.getItem(key), BRAND_KEY);
    if (stored !== ACME_ID) {
      fail(`agencyBrandId expected live Acme ${ACME_ID}, got ${stored} — pick the membership Acme UUID`);
    }
    await goRequests(page);
    if (await page.getByRole("button", { name: "Copy link" }).count()) {
      fail("Copy Brand request link is still on the row");
    }
    if (await page.getByRole("button", { name: "Open Overview" }).count()) {
      fail("Open Overview is offered on the desk");
    }
    await page.getByPlaceholder("Search by package or ID…").waitFor();
    await page.getByRole("combobox").filter({ hasText: /All status|Needs Agency|Waiting/ }).first().waitFor();
  });

  let packageId;
  await run("G060-S2-e1", "R1 create appears on the open desk without a manual reload", page, async () => {
    const created = await createRequest(brand, {
      mode: "managed",
      product_link: `https://shop.example/g060-ui-pkg-${stamp}`,
      package_id: SEED_MANAGED_100,
    });
    packageId = created.id;
    await waitForRow(page, packageId);
    await page.getByText("Waiting for PDF").first().waitFor();
  });

  await run("G060-S1-owed", "Needs Agency filter keeps only owed rows", page, async () => {
    await page.getByRole("combobox").filter({ hasText: /All status|Needs Agency|Waiting/ }).first().click();
    await page.getByRole("option", { name: "Needs Agency" }).click();
    await page.getByText(packageId, { exact: true }).waitFor();
    if (await page.getByText("Waiting on Brand").count()) {
      fail("owed filter showed Waiting on Brand");
    }
  });

  await run("G060-S4-picker", "picker blocks PDF > 10 MiB", page, async () => {
    await page.getByRole("combobox").filter({ hasText: "Needs Agency" }).click();
    await page.getByRole("option", { name: "All status" }).click();
    await openRequest(page, packageId);
    await page.getByRole("heading", { name: "Review this request" }).waitFor();
    if (await page.getByText("Quoted price (THB)").count()) {
      fail("package upload showed a quote field");
    }
    if (await page.getByRole("button", { name: /Decline|Reject/i }).count()) {
      fail("decline/reject is offered");
    }
    await dropPdf(page, HUGE_PDF);
    await page.getByText("PDF must be 10 MiB or smaller.").waitFor();
  });

  await run("G060-S3-upload", "package PDF → contract_ready, row leaves owed", page, async () => {
    await dropPdf(page, TINY_PDF);
    await page.getByText(/Sent v1\.0 to the Brand/).waitFor();
    await page.getByRole("heading", { name: "Waiting for Brand to review" }).waitFor({ timeout: 30_000 });
    await goRequests(page);
    await page.getByPlaceholder("Search by package or ID…").fill(packageId);
    await page.getByText("Waiting on Brand").first().waitFor({ timeout: 20_000 });
  });

  await run("G060-S4-custom", "Custom quote required, then PDF → contract_ready", page, async () => {
    const created = await createRequest(brand, {
      mode: "custom",
      product_link: `https://shop.example/g060-ui-custom-${stamp}`,
      custom_spec: {
        creator_count: 5,
        duration_days: 14,
        review_required: true,
        submit_deadline_days: 3,
      },
    });
    await goRequests(page);
    await openRequest(page, created.id);
    await page.getByRole("heading", { name: "Quote this Custom Brief" }).waitFor();
    await page.getByText("Quoted price (THB)").waitFor();
    await dropPdf(page, TINY_PDF);
    await page.getByText("Set the quoted price first.").waitFor();
    await page.getByPlaceholder("e.g. 180000").fill("9000");
    await dropPdf(page, TINY_PDF);
    await page.getByText(/Sent v1\.0 to the Brand/).waitFor();
    await page.getByRole("heading", { name: "Waiting for Brand to review" }).waitFor({ timeout: 30_000 });
  });

  await run("G060-S5-neighbours", "Packages and Brands still open after the desk", page, async () => {
    await page.goto(PACKAGES, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Packages" }).waitFor({ timeout: 30_000 });
    await page.goto(BRANDS, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Brands" }).waitFor({ timeout: 30_000 });
    await page.getByText("Live membership plus brands").waitFor();
  });

  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (!token) fail("session JWT missing at end of run");
} catch (err) {
  stats.fail += 1;
  const msg = err?.message || String(err);
  failures.push(`setup: ${msg}`);
  console.error(`  FAIL  setup: ${msg}`);
  if (page) await dump(page);
} finally {
  if (SHOW_BROWSER && DELAY_MS > 0) await look();
  await browser.close();
}

console.log(`\nG-060 UI smoke: ${stats.pass} passed, ${stats.fail} failed`);
if (failures.length) {
  console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
ok("all G-060 UI scenarios passed");
process.exit(0);
