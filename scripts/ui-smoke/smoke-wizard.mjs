#!/usr/bin/env node
/**
 * G-135 — one-off Playwright smoke for the six wizard fixes.
 * Hits already-running Agency Admin at http://localhost:4002/admin.
 * Stubs T1/T2/CP2/CS2/CP4 so Partner/live create is not required.
 */
import { createRequire } from "node:module";

const requireFromUiSmoke = createRequire(
  new URL("../../scripts/ui-smoke/package.json", import.meta.url),
);
let playwright;
try {
  playwright = requireFromUiSmoke("playwright");
} catch {
  console.error(
    "playwright is not installed.\n  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium",
  );
  process.exit(1);
}

const ORIGIN = (process.env.ADMIN_ORIGIN || "http://localhost:4002").replace(/\/$/, "");
const BASE_PATH = process.env.ADMIN_BASE_PATH || "/admin";
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const CAMPAIGNS = `${ORIGIN}${BASE_PATH}/campaigns`;
const REQUESTS = `${ORIGIN}${BASE_PATH}/requests`;
const PROJECT_ID = "g135-smoke-project";
const READY_REQUEST_ID = "76a8956b-00b5-4e9d-859a-8f828fbc676d";

const stats = { pass: 0, fail: 0 };
const failures = [];

function fail(message) {
  throw new Error(message);
}

function ok(message) {
  stats.pass += 1;
  console.log(`  ok    ${message}`);
}

function step(title) {
  console.log(`\n→ ${title}`);
}

async function caseRun(title, fn) {
  step(title);
  try {
    await fn();
    ok(title);
  } catch (err) {
    stats.fail += 1;
    failures.push(`${title}: ${err.message}`);
    console.error(`  FAIL  ${title}\n        ${err.message}`);
    try {
      await page.screenshot({
        path: new URL(`./fail-${stats.fail}.png`, import.meta.url),
        fullPage: true,
      });
    } catch {
      /* ignore */
    }
  }
}

function parseBody(req) {
  const raw = req.postData();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function stubCampaignApis(page, captured) {
  await page.route("**/tiktok/products/search", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          { id: "sku-lip", title: "Lip Glow" },
          { id: "sku-serum", title: "Night Serum" },
          { id: "sku-mist", title: "Face Mist" },
        ],
        partner: {},
      }),
    });
  });
  await page.route((url) => {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return /\/agency\/brands\/[^/]+\/requests\/[0-9a-f-]{36}$/i.test(path);
  }, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: READY_REQUEST_ID,
        brand_id: "11111111-1111-1111-1111-111111111111",
        mode: "managed",
        product_link: "https://www.tiktok.com/@g135-smoke",
        status: "ready",
        created_at: "2026-08-01T00:00:00Z",
        package: {
          package_id: "pkg-managed",
          name: "Managed 100",
          version: "1.0",
          price: 50000,
          creator_count: 100,
          review_required: true,
          submit_deadline_days: 10,
          duration_days: 45,
          published_at: "2026-08-01T00:00:00Z",
        },
      }),
    });
  });
  await page.route("**/tiktok/target-collaborations/search", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: "collab-1", title: "Summer Affiliate", commission: 20 }],
        partner: {},
      }),
    });
  });
  await page.route((url) => String(url).includes("campaign-projects"), async (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname.replace(/\/$/, "");
    if (method === "GET" && !path.includes("/sets")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 8,
          page_count: 1,
          facets: { status: [] },
        }),
      });
      return;
    }
    if (method === "POST" && /\/campaign-projects\/[^/]+\/sets$/.test(path)) {
      captured.setPosts.push(parseBody(req));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "g135-set",
          project_id: PROJECT_ID,
          name: "Set",
          mode: "broadcast",
        }),
      });
      return;
    }
    if (method === "POST" && /\/campaign-projects$/.test(path)) {
      const body = parseBody(req);
      captured.projectPosts.push(body);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: PROJECT_ID,
          brand_id: "brand",
          request_id: body?.request_id || "",
          name: "Smoke",
          status: "draft",
        }),
      });
      return;
    }
    if (method === "PATCH" && /\/campaign-projects\/[^/]+$/.test(path) && !path.includes("/sets")) {
      captured.projectPatches.push(parseBody(req));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: PROJECT_ID,
          brand_id: "brand",
          request_id: "req",
          name: "Smoke",
          status: "active",
        }),
      });
      return;
    }
    await route.fallback();
  });
}

async function loginAndSelectBrand(page) {
  await page.goto(AUTH, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.includes("/brands") || url.pathname.includes("/dashboard"), {
    timeout: 30_000,
  });
  if (page.url().includes("/brands")) {
    const enter = page.getByRole("button", { name: /Enter brand|Continue/i });
    await enter.first().waitFor({ timeout: 20_000 });
    await enter.first().click();
  }
  await page.waitForURL((url) => !url.pathname.endsWith("/brands") && !url.pathname.endsWith("/auth"), {
    timeout: 20_000,
  });
}

async function openWizard(page) {
  await page.goto(CAMPAIGNS, { waitUntil: "domcontentloaded" });
  const newBtn = page.getByRole("button", { name: "+ New campaign" });
  await newBtn.waitFor({ timeout: 20_000 });
  if (await newBtn.isDisabled()) {
    fail(`+ New campaign is disabled (title=${await newBtn.getAttribute("title")})`);
  }
  await newBtn.click();
  await page.getByRole("dialog").waitFor();
}

async function pickFirstRequest(page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Choose a Ready to start request").waitFor({ timeout: 10_000 });
  const empty = dialog.getByText("No ready requests for this brand.");
  if (await empty.count()) fail("no mock ready request to pick on Campaigns wizard");
  await dialog.locator("button.w-full.rounded-lg.border").first().click();
}

async function next(page) {
  const btn = page.getByRole("dialog").getByRole("button", { name: /^Next/ });
  if (await btn.isDisabled()) fail("Next is disabled — previous step not filled");
  await btn.click();
}

async function waitSubmit(page, captured, { expectPatch }) {
  const started = Date.now();
  while (Date.now() - started < 12_000) {
    const err = page.getByRole("dialog").locator(".text-red-300");
    if (await err.count()) {
      const text = (await err.first().innerText()).trim();
      if (text) fail(`wizard error: ${text}`);
    }
    if (captured.projectPosts.length && captured.setPosts.length) {
      if (!expectPatch || captured.projectPatches.length) return;
    }
    await page.waitForTimeout(200);
  }
  fail(
    `timed out waiting for create. posts=${captured.projectPosts.length} sets=${captured.setPosts.length} patches=${captured.projectPatches.length}`,
  );
}

async function fillThroughStep3(page) {
  await pickFirstRequest(page);
  await next(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Lip Glow").waitFor();
  await dialog.getByText("Lip Glow").click();
  await dialog.getByText("Night Serum").click();
  await next(page);
  await dialog.getByText("Targeted Collaboration Plan").waitFor();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Summer Affiliate" }).click();
  await next(page);
}

const captured = { projectPosts: [], setPosts: [], projectPatches: [] };
const debugLogs = [];

const browser = await playwright.chromium.launch({ headless: process.env.UI_SMOKE_HEADED !== "1" });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20_000);
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("DEBUG:")) debugLogs.push(text);
});

try {
  await caseRun("Admin is reachable", async () => {
    const res = await fetch(AUTH, { redirect: "manual" });
    if (res.status >= 500) fail(`GET ${AUTH} → ${res.status}`);
  });

  await stubCampaignApis(page, captured);
  try {
    await loginAndSelectBrand(page);
    ok("signed in and selected a brand");
  } catch (err) {
    console.error(`  FAIL  login: ${err.message}`);
    try {
      await page.screenshot({
        path: new URL("./fail-login.png", import.meta.url),
        fullPage: true,
      });
      console.error("        screenshot fail-login.png");
      console.error((await page.locator("body").innerText()).slice(0, 800));
    } catch {
      /* ignore */
    }
    throw err;
  }

  await caseRun("1. Campaigns + New campaign is enabled (not a silent no-op gate)", async () => {
    await page.goto(CAMPAIGNS, { waitUntil: "domcontentloaded" });
    const btn = page.getByRole("button", { name: "+ New campaign" });
    await btn.waitFor();
    if (await btn.isDisabled()) fail("trigger disabled — no liveBrandId / unverified");
  });

  await caseRun("6. Carrier + fake All/Name/Price sort gone; no DEBUG console", async () => {
    await openWizard(page);
    await pickFirstRequest(page);
    await next(page);
    const dialog = page.getByRole("dialog");
    if (await dialog.getByText("Fulfillment Carrier").count()) fail("Carrier still visible");
    if (await dialog.getByRole("combobox").filter({ hasText: /^(All|Name|Price)$/ }).count()) {
      fail("fake product sort Select still visible");
    }
    await dialog.getByPlaceholder("Search products...").waitFor();
    await dialog.getByText("Lip Glow").waitFor();
    await dialog.getByText("Lip Glow").click();
    await next(page);
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Summer Affiliate" }).click();
    await next(page);
    if (await dialog.getByText("Fulfillment Carrier").count()) fail("Carrier on rules step");
    await page.keyboard.press("Escape");
    if (debugLogs.length) fail(`DEBUG console.log still fired: ${debugLogs.join(" | ")}`);
  });

  await caseRun("2+4+5. Multi-select, Broadcast flags, Managed min length (payloads)", async () => {
    captured.projectPosts.length = 0;
    captured.setPosts.length = 0;
    captured.projectPatches.length = 0;
    await openWizard(page);
    await fillThroughStep3(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Affiliate Broadcast").click();
    if (await dialog.getByText("Require Sample Approval").count()) {
      fail("Managed labels still shown on Broadcast");
    }
    await dialog.getByLabel("Optional Sample Check").click();
    await dialog.getByRole("button", { name: "Save as Draft" }).click();
    await waitSubmit(page, captured, { expectPatch: false });
    const project = captured.projectPosts.at(-1);
    const set = captured.setPosts.at(-1);
    if (!project) fail("no CP2 POST");
    const ids = project.product_ids || [];
    if (!(ids.includes("sku-lip") && ids.includes("sku-serum"))) {
      fail(`product_ids expected sku-lip+sku-serum, got ${JSON.stringify(ids)}`);
    }
    if (!set) fail("no CS2 POST");
    const rules = set.rules || {};
    if (rules.require_sample_clip_approval !== undefined) {
      fail("Broadcast still sent Managed require_sample_clip_approval");
    }
    if (rules.auto_approve_applications !== true) fail("missing auto_approve_applications");
    if (rules.optional_sample_check !== true) fail("optional_sample_check not true");
    if (captured.projectPatches.length) fail("Save as Draft must not PATCH CP4");
  });

  await caseRun("3. Create Campaign PATCHes status active", async () => {
    captured.projectPosts.length = 0;
    captured.setPosts.length = 0;
    captured.projectPatches.length = 0;
    await openWizard(page);
    await fillThroughStep3(page);
    await page.getByRole("dialog").getByRole("button", { name: "Create Campaign" }).click();
    await waitSubmit(page, captured, { expectPatch: true });
    if (!captured.projectPosts.length) fail("no CP2 on Create Campaign");
    if (!captured.setPosts.length) fail("no CS2 on Create Campaign");
    const patch = captured.projectPatches.at(-1);
    if (!patch || patch.status !== "active") {
      fail(`expected CP4 { status: active }, got ${JSON.stringify(patch)}`);
    }
  });

  await caseRun("5. Managed CS2 sends min_video_length_sec", async () => {
    captured.projectPosts.length = 0;
    captured.setPosts.length = 0;
    captured.projectPatches.length = 0;
    await openWizard(page);
    await fillThroughStep3(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Managed Campaign").click();
    await dialog.getByPlaceholder("No minimum").fill("45");
    await dialog.getByRole("button", { name: "Save as Draft" }).click();
    await waitSubmit(page, captured, { expectPatch: false });
    const set = captured.setPosts.at(-1);
    if (!set) fail("no CS2 POST");
    if (set.mode !== "managed") fail(`expected managed, got ${set.mode}`);
    if (set.rules?.min_video_length_sec !== 45) {
      fail(`min_video_length_sec expected 45, got ${JSON.stringify(set.rules)}`);
    }
  });

  await caseRun("1. DoneStep Create campaign locks live request (no mock picker)", async () => {
    await page.goto(`${REQUESTS}/${READY_REQUEST_ID}`, { waitUntil: "domcontentloaded" });
    const create = page.getByRole("button", { name: "Create campaign" });
    await create.waitFor({ timeout: 15_000 });
    if (await create.isDisabled()) {
      fail(`Create campaign disabled (title=${await create.getAttribute("title")})`);
    }
    await create.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    if (await dialog.getByText("Choose a Ready to start request").count()) {
      fail("DoneStep still shows mock request picker");
    }
    await dialog.getByText(READY_REQUEST_ID).waitFor();
    await page.keyboard.press("Escape");
  });
} finally {
  await browser.close();
}

console.log(`\nG-135 smoke: ${stats.pass} passed, ${stats.fail} failed`);
if (failures.length) {
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
