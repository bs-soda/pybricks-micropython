#!/usr/bin/env node
/**
 * G-063 — Brand checkout UI smoke (Playwright + Chromium).
 * Maps to docs/02-product/acceptance/G-063.md Scenario 2 (QR) + Scenario 3
 * (no client-side mark-paid) + Scenario 1's "GET after return" rule.
 *
 * Opens a real Chromium window (headed by default) against the live Brand
 * Portal + Hub. Drives: create request (API) → agency uploads contract (API)
 * → brand accepts (API) → **browser**: open checkout, pick PromptPay QR or
 * Credit card (`UI_SMOKE_METHOD=card`, default `qr` — G-063 is NOPS-only, both
 * hit the same vendor with a different `payType`), hit
 * Continue, watch the real `POST /pay-sessions` fire, then fire the S2S
 * `/payment/callback` from the script (standing in for INET) and watch the
 * page's own 3s poll flip it to the success screen — no manual mark-paid.
 *
 * No INET_OPS_KEY / INET_NOPS_KEY needed — this exercises the fixture-mode
 * live path (same code path `payments_live_vendor.rs` exercises against mock
 * vendors). Live vendor sandbox is a separate, still-owed pass — see G-063
 * Test plan.
 *
 * Prerequisites:
 *   cd code && cargo run -p api                                  # :8080
 *   cd code && BRAND_API_ORIGIN=http://127.0.0.1:8080 pnpm --filter brand-portal dev   # :4001/brand
 *
 * Install (once):
 *   cd scripts/ui-smoke && npm install && npx playwright install chromium && cd ../..
 *
 * Run from repo root (Chromium window opens):
 *   API_BASE=http://127.0.0.1:8080 node scripts/ui-smoke/brand-checkout.mjs
 *
 * Headless:
 *   UI_SMOKE_HEADED=0 API_BASE=http://127.0.0.1:8080 node scripts/ui-smoke/brand-checkout.mjs
 */
process.env.API_BASE ||= "http://127.0.0.1:8080";

const { ACME_ID, BASE, SEED_MANAGED_100, mintBrandJwt, pdfMultipart, request, requireApi } =
  await import("../http-smoke/lib.mjs");

const ORIGIN = (process.env.BRAND_ORIGIN || "http://localhost:4001").replace(/\/$/, "");
const BASE_PATH = process.env.BRAND_BASE_PATH || "/brand";
const BRAND_TOKEN_KEY = "brandToken";
const BRAND_PORTAL_BRAND_KEY = "brandPortalBrandId";
const AGENCY_EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const AGENCY_PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED !== "0";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 1600 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 400 : 0));

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
  if (DELAY_MS > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
}
async function dump(page) {
  const snippet = await page.locator("body").innerText().then((t) => t.slice(0, 600)).catch(() => "");
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

async function requireBrandPortal() {
  step(`check Brand Portal at ${ORIGIN}${BASE_PATH}`);
  try {
    const res = await fetch(`${ORIGIN}${BASE_PATH}/dashboard`, { redirect: "manual" });
    if (res.status >= 500) fail(`GET ${BASE_PATH}/dashboard → ${res.status}`);
  } catch (err) {
    fail(
      `cannot reach ${ORIGIN}${BASE_PATH} (${err.cause?.code || err.message}). Start it:\n` +
        `  cd code\n  BRAND_API_ORIGIN=${BASE} pnpm --filter brand-portal dev`,
    );
  }
  ok("Brand Portal reachable");
}

async function loginAgency() {
  const res = await request("POST", "/agency/auth/login", { body: { email: AGENCY_EMAIL, password: AGENCY_PASSWORD } });
  if (res.status !== 200) fail(`agency login expected 200, got ${res.status}`);
  return res.body.access_token;
}

async function seedAcceptedRequest(brandToken, agencyToken) {
  const created = await request("POST", "/brand/requests", {
    token: brandToken,
    body: { mode: "managed", product_link: `https://shop.example/g063-ui-${Date.now()}`, package_id: SEED_MANAGED_100 },
  });
  if (created.status !== 201) fail(`create request expected 201, got ${created.status} ${JSON.stringify(created.body)}`);
  const id = created.body.id;

  const { contentType, body } = pdfMultipart();
  const uploaded = await request("POST", `/agency/brands/${ACME_ID}/requests/${id}/contract`, {
    token: agencyToken,
    raw: body,
    contentType,
  });
  if (uploaded.status !== 200) fail(`contract upload expected 200, got ${uploaded.status} ${JSON.stringify(uploaded.body)}`);

  const accepted = await request("POST", `/brand/requests/${id}/accept`, { token: brandToken, body: { accepted: true } });
  if (accepted.status !== 200 || accepted.body.status !== "accepted") {
    fail(`accept expected 200 status=accepted, got ${accepted.status} ${JSON.stringify(accepted.body)}`);
  }
  return id;
}

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/brand-checkout.mjs",
  );
  process.exit(1);
});

await requireApi();
await requireBrandPortal();

const brandToken = mintBrandJwt(ACME_ID);
const agencyToken = await loginAgency();
ok(`API ${BASE} · Brand Portal ${ORIGIN}${BASE_PATH} · Chromium ${SHOW_BROWSER ? "headed" : "headless"}`);

step("seed an `accepted` request (API — create → agency contract → brand accept)");
const requestId = await seedAcceptedRequest(brandToken, agencyToken);
ok(`request ${requestId} is accepted`);
await look();

const browser = await playwright.chromium.launch({ headless: !SHOW_BROWSER, slowMo: SLOW_MS > 0 ? SLOW_MS : 0 });
let page;
try {
  const context = await browser.newContext({
    viewport: {
      width: Number(process.env.UI_SMOKE_WIDTH ?? 1440),
      height: Number(process.env.UI_SMOKE_HEIGHT ?? 900),
    },
  });
  await context.addInitScript(
    ([tokenKey, token, brandKey, brandId]) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(brandKey, brandId);
    },
    [BRAND_TOKEN_KEY, brandToken, BRAND_PORTAL_BRAND_KEY, ACME_ID],
  );
  page = await context.newPage();
  page.setDefaultTimeout(20_000);

  const CHECKOUT = `${ORIGIN}${BASE_PATH}/request/${requestId}/checkout`;
  const METHOD = process.env.UI_SMOKE_METHOD === "card" ? "card" : "qr";
  const METHOD_RADIO_NAME = METHOD === "card" ? /Credit card/ : /PromptPay QR/;

  await run("G063-open", "open checkout — amount + method picker", page, async () => {
    await page.goto(CHECKOUT, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Pay", exact: true }).waitFor();
    await page.getByText("Amount due").waitFor();
    await page.getByRole("radio", { name: METHOD_RADIO_NAME }).waitFor();
    if (METHOD === "card") {
      await page.getByRole("radio", { name: METHOD_RADIO_NAME }).click();
    }
    if (process.env.UI_SMOKE_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.UI_SMOKE_SCREENSHOT_DIR}/1-choose.png` });
    }
  });

  let orderId;
  await run(`G063-S2-create-session-${METHOD}`, `pick ${METHOD} → Continue → real POST /pay-sessions fires`, page, async () => {
    const sessionResponse = page.waitForResponse(
      (res) => res.url().includes("/pay-sessions") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Continue to INET/ }).click();
    const res = await sessionResponse;
    if (res.status() !== 201) fail(`pay-sessions expected 201, got ${res.status()}`);
    const json = await res.json();
    orderId = json.order_id;
    if (json.method !== METHOD) fail(`expected method ${METHOD}, got ${json.method}`);
    if (!json.qr_image_url) fail(`expected a real qr_image_url for method=${METHOD}, got ${JSON.stringify(json.qr_image_url)}`);
    await page.getByText(/Cancel — back to payment method/).waitFor();
    await page.getByText(new RegExp(`Order ${orderId}`)).waitFor();
    if (process.env.UI_SMOKE_SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.UI_SMOKE_SCREENSHOT_DIR}/2-qr-wait.png` });
    }
  });

  await run(
    "G063-S3-no-client-mark-paid",
    "still on the QR wait screen — nothing marked this paid client-side",
    page,
    async () => {
      await page.getByRole("heading", { name: "Payment successful" }).waitFor({ state: "hidden", timeout: 500 }).catch(() => {});
      const stillWaiting = await page.getByText(/Cancel — back to payment method/).isVisible();
      if (!stillWaiting) fail("left the QR wait screen before any callback landed");
    },
  );

  await run(
    "G063-S1-callback-then-poll",
    "fire the S2S callback (stands in for INET) — page's own poll flips to success, no reload",
    page,
    async () => {
      const cb = await request("POST", "/payment/callback", {
        body: {
          merchant_id: "SODALITY-TEST-MERCHANT",
          detail: { response_code: 0, order_id: orderId, receive_amount: 250000, payment_reference_id: "UI-SMOKE-REF" },
        },
      });
      if (cb.status !== 200) fail(`callback expected 200, got ${cb.status}`);
      await page.getByRole("heading", { name: "Payment successful" }).waitFor({ timeout: 15_000 });
      await page.getByText(METHOD === "card" ? "Credit card" : "PromptPay QR").waitFor();
      if (process.env.UI_SMOKE_SCREENSHOT_DIR) {
        await page.screenshot({ path: `${process.env.UI_SMOKE_SCREENSHOT_DIR}/3-success.png` });
      }
    },
  );

  const storedToken = await page.evaluate((k) => localStorage.getItem(k), BRAND_TOKEN_KEY);
  if (!storedToken) fail("brand session token missing at end of run");
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

console.log(`\nG-063 UI smoke: ${stats.pass} passed, ${stats.fail} failed`);
if (failures.length) {
  console.error(failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
ok("all G-063 checkout scenarios passed");
process.exit(0);
