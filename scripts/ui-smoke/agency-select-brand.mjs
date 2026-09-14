#!/usr/bin/env node
/**
 * G-028 + G-041 — Agency Admin Select Brand UI smoke (Playwright).
 * Maps to docs/02-product/acceptance/G-028.md (scenarios 1–4)
 * and G-041.md (copy invite + empty membership via stub).
 *
 * Hits an already-running Agency Admin app + API. Does not start servers.
 *
 * Prerequisites:
 *   Terminal A:  cd code && cargo run -p api          # http://127.0.0.1:8080
 *   Terminal B:  cd code && pnpm --filter admin-console dev   # http://localhost:4002/admin
 *
 * Run from repo root:
 *   node scripts/ui-smoke/agency-select-brand.mjs
 *
 * Demo (headed, slower so you can follow) — same switch as agency-login.mjs:
 *   $env:UI_SMOKE_HEADED="1"
 *   node scripts/ui-smoke/agency-select-brand.mjs
 *
 * DOM:
 *   Select Brand — URL `/admin/brands`; section “Brands”
 *   Empty copy — "No authorized brands for this Agency yet"
 *   Copy invite — button "Copy invite link"; URL path /brand/invite/welcome-2026
 *   Enter brand — button containing brand name
 *   Switch brand — topbar button opens a modal (stay on the current screen)
 *
 * Do not waitForURL with default `load` on Next client nav — wait for the heading
 * (or waitUntil: "commit"). See O-003 / E-008.
 */

const ORIGIN = (process.env.ADMIN_ORIGIN || "http://localhost:4002").replace(/\/$/, "");
const BASE_PATH = process.env.ADMIN_BASE_PATH || "/admin";
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const TOKEN_KEY = "agencyAccessToken";
const BRAND_KEY = "agencyBrandId";

const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const BRANDS = `${ORIGIN}${BASE_PATH}/brands`;
const DASHBOARD = `${ORIGIN}${BASE_PATH}/dashboard`;
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED === "1";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 2000 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 500 : 0));

const ACME = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Acme Smoke",
  logo_url: null,
};
const OTHER = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "OtherCo Smoke",
  logo_url: null,
};

function fail(message) {
  console.error(`  FAIL  ${message}`);
  process.exitCode = 1;
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

function onAuth(url) {
  return url.pathname.endsWith(`${BASE_PATH}/auth`);
}

function onBrands(url) {
  return url.pathname.endsWith(`${BASE_PATH}/brands`);
}

function brandsReady(page) {
  return page.getByText("Brands come from your Agency membership");
}

function isBrandsGet(url) {
  return url.includes("/agency/brands") && !url.includes("/campaigns");
}

async function newPage(browser) {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

async function assertCopyInvite(page) {
  const trigger = page.getByRole("button", { name: "Copy invite link" });
  await trigger.waitFor();
  await trigger.click();
  const urlInput = page.getByLabel("Creator Hub invite URL");
  await urlInput.waitFor();
  const value = await urlInput.inputValue();
  if (!value.includes("/invite/welcome-2026")) {
    fail(`invite URL missing /invite/welcome-2026: ${value}`);
  }
  if (!value.includes("/brand/invite/")) {
    fail(`invite URL missing Brand Portal /brand/invite/: ${value}`);
  }
  if (value.includes("seller.tiktokshop.com")) {
    fail(`TikTok Seller URL is Out: ${value}`);
  }
  await page.getByRole("button", { name: "Copy link" }).click();
  try {
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    if (!clip.includes("/invite/welcome-2026")) {
      fail(`clipboard missing /invite/welcome-2026: ${clip}`);
    }
    if (clip.includes("seller.tiktokshop.com")) {
      fail(`clipboard has TikTok Seller URL: ${clip}`);
    }
  } catch {
    ok("clipboard API blocked in this browser; readonly input fallback present");
  }
  if (!onBrands(new URL(page.url()))) {
    fail(`copy invite left Select Brand: ${page.url()}`);
  }
  await page.keyboard.press("Escape");
}

function isAgencyBrandsListUrl(url) {
  try {
    return /\/api\/v1\/agency\/brands\/?$/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

async function stubBrands(page, list) {
  await page.route(isAgencyBrandsListUrl, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(list),
    });
  });
}

async function abortBrandsGet(page) {
  await page.route(isAgencyBrandsListUrl, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.abort("failed");
  });
}

async function dumpBrandsWait(page, err) {
  const headings = await page.locator("h1").allTextContents().catch(() => []);
  const snippet = await page
    .locator("body")
    .innerText()
    .then((t) => t.slice(0, 800))
    .catch(() => "");
  console.error(
    `  debug url=${page.url()} h1=${JSON.stringify(headings)}\n  body=${snippet}`,
  );
  throw err;
}

async function loginToBrands(page) {
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
  try {
    // Cold Next compile of /brands can exceed the default 20s locator timeout.
    await page.waitForURL(onBrands, { timeout: 30_000 });
    await brandsReady(page).waitFor({ timeout: 30_000 });
  } catch (err) {
    await dumpBrandsWait(page, err);
  }
}

async function assertHasToken(page) {
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (!token) fail(`${TOKEN_KEY} missing`);
  return token;
}

async function assertNoBrandId(page) {
  const id = await page.evaluate((key) => localStorage.getItem(key), BRAND_KEY);
  if (id) fail(`${BRAND_KEY} still set: ${id}`);
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

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/agency-select-brand.mjs",
  );
  process.exit(1);
});

await requireAdmin();

const browser = await playwright.chromium.launch({
  headless: !SHOW_BROWSER,
  slowMo: SLOW_MS > 0 ? SLOW_MS : 0,
});

try {
  // --- Scenario 4: empty membership (stub [] — live G-041 seed must not be required) ---
  {
    step("S4 empty GET /brands — empty state, copy invite still visible");
    const { context, page } = await newPage(browser);
    await stubBrands(page, []);
    await loginToBrands(page);
    await page.getByText("No authorized brands for this Agency yet").waitFor();
    if (await page.getByRole("button", { name: /Enter brand/ }).count()) {
      fail("mock/API brand cards shown on empty membership");
    }
    await assertCopyInvite(page);
    await assertHasToken(page);
    await assertNoBrandId(page);
    ok("empty state; Copy invite on picker; JWT kept; no brand_id");
    await look();
    await context.close();
  }

  // --- Scenario 1 failure: brands API unreachable, no mock fallback ---
  {
    step("S1 API unreachable — error UX, no mock membership");
    const { context, page } = await newPage(browser);
    await abortBrandsGet(page);
    await loginToBrands(page);
    await page.getByRole("alert").filter({ hasText: "Cannot reach the brands service" }).waitFor();
    if (await page.getByRole("button", { name: /Enter brand/ }).count()) {
      fail("mock brands shown when GET /brands failed");
    }
    await assertHasToken(page);
    ok("error UX; no mock list");
    await look();
    await context.close();
  }

  // --- Scenario 1 + 2 + 3: stub membership, select, switch, re-select ---
  {
    step("S1 list — stub GET /brands cards (not mock seed names)");
    const { context, page } = await newPage(browser);
    await stubBrands(page, [ACME, OTHER]);
    const brandsGets = [];
    page.on("request", (req) => {
      if (req.method() === "GET" && isBrandsGet(req.url())) brandsGets.push(req.url());
      if (req.method() === "POST" && req.url().includes("/brands/select")) {
        fail("POST /brands/select must not be called");
      }
    });
    await loginToBrands(page);
    await page.getByRole("button", { name: /Acme Smoke/ }).waitFor();
    await page.getByRole("button", { name: /OtherCo Smoke/ }).waitFor();
    if (await page.getByText("No authorized brands for this Agency yet").count()) {
      fail("empty copy shown while stub returned two brands");
    }
    ok("membership cards from GET /brands");

    step("G-041 copy invite — Creator Hub /brand/invite/welcome-2026");
    await assertCopyInvite(page);
    await assertHasToken(page);
    ok("copied Creator Hub invite; stayed on Select Brand");

    step("S2 select — client-side brand_id scopes shell");
    await page.getByRole("button", { name: /Acme Smoke/ }).click();
    await page.getByRole("heading", { name: "Acme Smoke", level: 1 }).waitFor();
    const stored = await page.evaluate((key) => localStorage.getItem(key), BRAND_KEY);
    if (stored !== ACME.id) fail(`agencyBrandId expected ${ACME.id}, got ${stored}`);
    await assertHasToken(page);
    ok("shell scoped to Acme Smoke; JWT unchanged");
    await look();

    step("S2 persist — reload dashboard keeps brand, not login");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Acme Smoke", level: 1 }).waitFor();
    if (onAuth(new URL(page.url()))) fail("reload bounced to /auth");
    ok("reload kept Acme scope");
    await look();

    step("S3 switch brand — modal picker without re-login");
    await page.getByRole("button", { name: "Switch brand" }).click();
    await page.getByRole("dialog").waitFor();
    await assertHasToken(page);
    await page.getByRole("dialog").getByRole("button", { name: /OtherCo Smoke/ }).click();
    await page.getByRole("heading", { name: "OtherCo Smoke", level: 1 }).waitFor();
    const switched = await page.evaluate((key) => localStorage.getItem(key), BRAND_KEY);
    if (switched !== OTHER.id) fail(`agencyBrandId expected ${OTHER.id}, got ${switched}`);
    ok("switched to OtherCo Smoke without login");
    await look();
    await context.close();
  }

  // --- Scenario 2 edge: dangling brand_id vs GET /brands ---
  {
    step("S2 dangling — stored id not in GET /brands returns to picker");
    const { context, page } = await newPage(browser);
    await stubBrands(page, []);
    await loginToBrands(page);
    await page.evaluate(
      ({ brandKey, ghost }) => {
        localStorage.setItem(brandKey, ghost.id);
        localStorage.setItem("agencyBrand", JSON.stringify(ghost));
      },
      { brandKey: BRAND_KEY, ghost: { id: ACME.id, name: "Ghost", logo_url: null } },
    );
    await page.goto(DASHBOARD, { waitUntil: "commit" });
    await brandsReady(page).waitFor();
    await page.getByText("No authorized brands for this Agency yet").waitFor();
    await assertNoBrandId(page);
    await assertHasToken(page);
    ok("ghost brand_id cleared; stayed logged in on Select Brand");
    await look();
    await context.close();
  }

  console.log("\nG-028 + G-041 UI smoke passed (select/switch + Copy invite)");
} catch (err) {
  if (process.exitCode !== 1) {
    console.error(err);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}

process.exit(process.exitCode ?? 0);
