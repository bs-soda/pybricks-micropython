#!/usr/bin/env node
/**
 * G-110 — Agency Admin session refresh + dead-session bounce (Playwright + Chromium).
 * Maps 1:1 to docs/02-product/acceptance/G-110.md (scenarios 1–2 and every edge/failure case).
 *
 * Hits an already-running Agency Admin app + API. Does not start servers.
 *
 * Prerequisites:
 *   Terminal A:  cd code && cargo run -p api          # http://127.0.0.1:8080
 *   Terminal B:  cd code && pnpm --filter admin-console dev   # http://localhost:4002/admin
 *   Admin rewrite must hit that Hub (not KrakenD :9090/v1):
 *     code/apps/admin-console/.env  AGENCY_API_ORIGIN=http://127.0.0.1:8080
 *     then restart admin-console so next.config.ts picks it up.
 *
 * Install (once):
 *   cd scripts/ui-smoke && npm install && npx playwright install chromium && cd ../..
 *
 * Run from repo root:
 *   node scripts/ui-smoke/agency-session-refresh.mjs
 *
 * Demo (headed, slower so you can follow):
 *   $env:UI_SMOKE_HEADED="1"
 *   node scripts/ui-smoke/agency-session-refresh.mjs
 *
 * Cookie policy (Q7 / Q8):
 *   agency_refresh_token=…; Secure; HttpOnly; SameSite=Lax; Path=/
 *
 * Next.js App Router client nav does not fire window `load`. Do not use
 * waitForURL's default waitUntil: "load" — use "commit" and wait for copy.
 */

const ORIGIN = (process.env.ADMIN_ORIGIN || "http://localhost:4002").replace(/\/$/, "");
const BASE_PATH = process.env.ADMIN_BASE_PATH || "/admin";
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const TOKEN_KEY = "agencyAccessToken";
const COOKIE_NAME = "agency_refresh_token";
const COOKIE_ATTRS = ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"];

const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const BRANDS = `${ORIGIN}${BASE_PATH}/brands`;
const DASHBOARD = `${ORIGIN}${BASE_PATH}/dashboard`;
const REFRESH_PATH = `${BASE_PATH}/agency/auth/refresh`;
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED === "1";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 2000 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 500 : 0));

const UNAUTHORIZED_JSON = JSON.stringify({
  error: "UNAUTHORIZED",
  message: "Session expired. Sign in again.",
});

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

function brandsDesk(page) {
  return page.getByText("Brands in your Agency catalog");
}

function signInHeading(page) {
  return page.getByRole("heading", { name: "Agency Admin" });
}

async function waitForPath(page, match, timeout = 20_000) {
  await page.waitForURL(match, { timeout, waitUntil: "commit" });
}

async function dumpWait(page, err) {
  const headings = await page.locator("h1, h2").allTextContents().catch(() => []);
  const alert = await page
    .locator("[role='alert']")
    .allTextContents()
    .catch(() => []);
  const snippet = await page
    .locator("body")
    .innerText()
    .then((t) => t.slice(0, 800))
    .catch(() => "");
  console.error(
    `  debug url=${page.url()} headings=${JSON.stringify(headings)} alert=${JSON.stringify(alert)}\n  body=${snippet}`,
  );
  throw err;
}

function isLoginPost(res) {
  return res.url().includes("/auth/login") && res.request().method() === "POST";
}

function isRefreshPost(res) {
  return res.url().includes("/auth/refresh") && res.request().method() === "POST";
}

function isLogoutPost(res) {
  return res.url().includes("/auth/logout") && res.request().method() === "POST";
}

function isMeGet(res) {
  return res.url().includes("/auth/me") && res.request().method() === "GET";
}

function isBrandsListUrl(url) {
  try {
    const path = new URL(url, ORIGIN).pathname.replace(/\/$/, "");
    return path.endsWith("/agency/brands");
  } catch {
    return false;
  }
}

async function headerValues(res, name) {
  if (typeof res.headerValues === "function") {
    const values = await res.headerValues(name);
    if (Array.isArray(values)) return values;
  }
  if (typeof res.headersArray === "function") {
    const all = await res.headersArray();
    if (Array.isArray(all)) {
      return all
        .filter((h) => String(h.name).toLowerCase() === name.toLowerCase())
        .map((h) => h.value);
    }
  }
  const headers = typeof res.headers === "function" ? res.headers() : {};
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function refreshSetCookieLine(res) {
  const lines = await headerValues(res, "set-cookie");
  return lines.find((line) => line.includes(COOKIE_NAME)) ?? null;
}

function assertCookiePolicy(line, { cleared = false } = {}) {
  if (!line) fail("missing Set-Cookie for agency_refresh_token");
  if (cleared) {
    if (!/agency_refresh_token=;/.test(line) && !/Max-Age=0/.test(line)) {
      fail(`logout cookie should be cleared: ${line}`);
    }
  } else if (/agency_refresh_token=;/.test(line)) {
    fail(`refresh cookie was empty: ${line}`);
  }
  for (const attr of COOKIE_ATTRS) {
    if (!line.includes(attr)) fail(`Set-Cookie missing ${attr}: ${line}`);
  }
}

async function refreshCookie(context) {
  const cookies = await context.cookies(ORIGIN);
  return cookies.find((c) => c.name === COOKIE_NAME) ?? null;
}

async function assertHttpOnlyRefresh(page, context, { present }) {
  const cookie = await refreshCookie(context);
  if (present) {
    if (!cookie?.value) fail("agency_refresh_token missing from cookie jar");
    if (!cookie.httpOnly) fail("agency_refresh_token is not HttpOnly");
    if (cookie.path !== "/") fail(`agency_refresh_token Path expected /, got ${cookie.path}`);
    if (String(cookie.sameSite).toLowerCase() !== "lax") {
      fail(`agency_refresh_token SameSite expected Lax, got ${cookie.sameSite}`);
    }
  } else if (cookie?.value) {
    fail("agency_refresh_token still present");
  }
  const visible = await page.evaluate(() => document.cookie);
  if (visible.includes(COOKIE_NAME)) {
    fail("agency_refresh_token is visible to document.cookie");
  }
}

async function assertHasToken(page) {
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (!token) fail(`${TOKEN_KEY} missing`);
  return token;
}

async function assertNoToken(page) {
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (token) fail(`${TOKEN_KEY} was set: ${token.slice(0, 16)}…`);
}

async function assertNoShell(page) {
  if (await brandsDesk(page).count()) {
    fail("Agency brands desk visible while unauthenticated");
  }
}

async function newPage(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

async function openLogin(page) {
  await page.goto(AUTH, { waitUntil: "domcontentloaded" });
  await signInHeading(page).waitFor();
}

async function loginViaUi(page) {
  await openLogin(page);
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  const loginResponse = page.waitForResponse(isLoginPost);
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginRes = await loginResponse;
  if (loginRes.status() !== 200) fail(`login POST expected 200, got ${loginRes.status()}`);
  try {
    await waitForPath(page, onBrands, 30_000);
    await brandsDesk(page).waitFor({ timeout: 30_000 });
  } catch (err) {
    await dumpWait(page, err);
  }
  return loginRes;
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
        `Login URL is ${AUTH} (port 4002 + basePath /admin)`,
    );
  }
  ok("Agency Admin reachable");
}

async function requireG110Rewrite() {
  step("check G-110 login contract through the Admin rewrite");
  const url = `${ORIGIN}${BASE_PATH}/agency/auth/login`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  } catch (err) {
    fail(`cannot POST ${url} (${err.cause?.code || err.message})`);
  }
  const body = await res.json().catch(() => ({}));
  const cookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const setCookie = cookies.join("\n") || res.headers.get("set-cookie") || "";
  if (!res.ok) {
    fail(`POST ${url} → ${res.status} ${JSON.stringify(body)}`);
  }
  if (body.refresh_token != null || !setCookie.includes(COOKIE_NAME)) {
    fail(
      `rewrite login is not the G-110 contract ` +
        `(JSON refresh_token=${body.refresh_token != null}, ` +
        `Set-Cookie has ${COOKIE_NAME}=${setCookie.includes(COOKIE_NAME)}).\n` +
        `  Admin currently rewrites to KrakenD :9090, which fronts an older Hub:\n` +
        `  JSON still has refresh_token and the cookie is dropped.\n` +
        `  The cargo Hub already implements G-110:\n` +
        `    POST http://127.0.0.1:8080/agency/auth/login\n` +
        `  Point the console at that Hub and restart it:\n` +
        `    code/apps/admin-console/.env → AGENCY_API_ORIGIN=http://127.0.0.1:8080\n` +
        `    (no /v1 — Axum mounts /agency, not /v1/agency)`,
    );
  }
  ok("rewrite login omits refresh_token and sets agency_refresh_token");
}

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/agency-session-refresh.mjs",
  );
  process.exit(1);
});

await requireAdmin();
await requireG110Rewrite();

const browser = await playwright.chromium.launch({
  headless: !SHOW_BROWSER,
  slowMo: SLOW_MS > 0 ? SLOW_MS : 0,
});

try {
  // --- S1 edge: Login response — JSON omits refresh_token; HttpOnly cookie ---
  {
    step("S1 login — JSON has access_token + user only; cookie is HttpOnly");
    const { context, page } = await newPage(browser);
    const loginRes = await loginViaUi(page);
    const body = await loginRes.json();
    if (!body.access_token) fail("login JSON missing access_token");
    if (!body.user) fail("login JSON missing user");
    if (body.refresh_token != null) {
      fail("login JSON leaked refresh_token — rewrite is not the G-110 Hub (see preflight)");
    }
    assertCookiePolicy(await refreshSetCookieLine(loginRes));
    await assertHasToken(page);
    await assertHttpOnlyRefresh(page, context, { present: true });
    ok("login Set-Cookie agency_refresh_token; Secure; HttpOnly; SameSite=Lax; Path=/");
    await look();
    await context.close();
  }

  // --- S1 happy path: dead access token + valid cookie mints a new access token ---
  {
    step("S1 refresh — dead access token is replaced without password");
    const { context, page } = await newPage(browser);
    await loginViaUi(page);
    const before = await refreshCookie(context);
    if (!before?.value) fail("expected refresh cookie after login");
    await page.evaluate((key) => localStorage.setItem(key, "expired-access"), TOKEN_KEY);
    const refreshP = page.waitForResponse(isRefreshPost);
    const meP = page.waitForResponse((res) => isMeGet(res) && res.status() === 200);
    await page.reload({ waitUntil: "domcontentloaded" });
    const refreshRes = await refreshP;
    if (refreshRes.status() !== 200) fail(`/auth/refresh expected 200, got ${refreshRes.status()}`);
    const refreshBody = await refreshRes.json();
    if (!refreshBody.access_token) fail("refresh JSON missing access_token");
    if (refreshBody.refresh_token != null) fail("refresh JSON leaked refresh_token");
    if (refreshBody.user != null) fail("refresh JSON should not include user");
    assertCookiePolicy(await refreshSetCookieLine(refreshRes));
    await meP;
    await waitForPath(page, onBrands);
    await brandsDesk(page).waitFor();
    const token = await assertHasToken(page);
    if (token === "expired-access") fail("access token was not replaced");
    const after = await refreshCookie(context);
    if (!after?.value || after.value === before.value) fail("refresh cookie was not rotated");
    await assertHttpOnlyRefresh(page, context, { present: true });
    ok("refresh rotated the cookie and restored the desk");
    await look();
    await context.close();
  }

  // --- S1 edge: Retry after refresh ---
  {
    step("S1 retry — first brands 401, refresh once, retry succeeds");
    const { context, page } = await newPage(browser);
    await loginViaUi(page);
    let failNextBrands = true;
    await page.route(isBrandsListUrl, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      if (failNextBrands) {
        failNextBrands = false;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: UNAUTHORIZED_JSON,
        });
        return;
      }
      await route.continue();
    });
    const refreshP = page.waitForResponse(isRefreshPost);
    await page.reload({ waitUntil: "domcontentloaded" });
    const refreshRes = await refreshP;
    if (refreshRes.status() !== 200) fail(`retry refresh expected 200, got ${refreshRes.status()}`);
    await waitForPath(page, onBrands);
    await brandsDesk(page).waitFor();
    await assertHasToken(page);
    ok("interceptor refreshed once and retried GET /brands");
    await look();
    await context.close();
  }

  // --- S1 failure: Missing refresh credential ---
  {
    step("S1 missing cookie — POST /auth/refresh is 401");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const result = await page.evaluate(async (path) => {
      const res = await fetch(path, { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
      const text = await res.text();
      return { status: res.status, text };
    }, REFRESH_PATH);
    if (result.status !== 401) fail(`missing cookie expected 401, got ${result.status} ${result.text}`);
    if (await refreshCookie(context)) fail("refresh set a cookie without a credential");
    ok("missing agency_refresh_token → 401");
    await look();
    await context.close();
  }

  // --- S1 failure: Invalid or expired credential ---
  {
    step("S1 invalid cookie — POST /auth/refresh is 401");
    const { context, page } = await newPage(browser);
    await context.addCookies([
      {
        name: COOKIE_NAME,
        value: "invalid-or-expired-refresh",
        domain: new URL(ORIGIN).hostname,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
    await openLogin(page);
    const result = await page.evaluate(async (path) => {
      const res = await fetch(path, { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
      const text = await res.text();
      return { status: res.status, text };
    }, REFRESH_PATH);
    if (result.status !== 401) fail(`invalid cookie expected 401, got ${result.status} ${result.text}`);
    ok("invalid agency_refresh_token → 401");
    await look();
    await context.close();
  }

  // --- S2: Mid-desk 401 then refresh 401 bounces to Sign in ---
  {
    step("S2 mid-desk — API 401 + refresh 401 lands Sign in");
    const { context, page } = await newPage(browser);
    await loginViaUi(page);
    await page.route((url) => String(url).includes("/auth/refresh"), async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: UNAUTHORIZED_JSON,
      });
    });
    await page.route(isBrandsListUrl, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: UNAUTHORIZED_JSON,
      });
    });
    await page.goto(BRANDS, { waitUntil: "domcontentloaded" });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await assertNoToken(page);
    await assertNoShell(page);
    ok("dead session cleared; operator is on Sign in");
    await look();
    await context.close();
  }

  // --- S2 edge: Reload with dead access token follows the same bounce ---
  {
    step("S2 reload — dead access token + rejected refresh → Sign in");
    const { context, page } = await newPage(browser);
    await loginViaUi(page);
    await page.evaluate((key) => localStorage.setItem(key, "expired-access"), TOKEN_KEY);
    await page.route((url) => String(url).includes("/auth/refresh"), async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: UNAUTHORIZED_JSON,
      });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await assertNoToken(page);
    await assertNoShell(page);
    ok("reload bounce matches mid-desk bounce");
    await look();
    await context.close();
  }

  // --- S2 edge: Logout ends access state and the refresh cookie ---
  {
    step("S2 logout — access token and refresh cookie end; no session resumes");
    const { context, page } = await newPage(browser);
    await loginViaUi(page);
    const logoutP = page.waitForResponse(isLogoutPost);
    await page.getByRole("button", { name: "Sign Out" }).click();
    const logoutRes = await logoutP;
    if (logoutRes.status() !== 204 && logoutRes.status() !== 200) {
      fail(`logout expected 204, got ${logoutRes.status()}`);
    }
    assertCookiePolicy(await refreshSetCookieLine(logoutRes), { cleared: true });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await assertNoToken(page);
    await assertHttpOnlyRefresh(page, context, { present: false });
    await assertNoShell(page);
    ok("Sign Out cleared JWT and agency_refresh_token (Path=/)");
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await assertNoShell(page);
    ok("post-logout /dashboard stays on Sign in");
    await look();
    await context.close();
  }

  console.log("\nG-110 UI smoke passed (acceptance scenarios 1–2)");
} catch (err) {
  if (process.exitCode !== 1) {
    console.error(err);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}

process.exit(process.exitCode ?? 0);
