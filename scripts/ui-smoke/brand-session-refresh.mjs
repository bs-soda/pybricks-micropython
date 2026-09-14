#!/usr/bin/env node
/**
 * G-111 — Brand Portal session refresh + dead-session bounce (Playwright + Chromium).
 * Maps 1:1 to docs/02-product/acceptance/G-111.md (scenarios 1–2 and every edge/failure case).
 *
 * Hits an already-running Brand Portal + Hub. Does not start servers.
 * Does not call live TikTok Login Kit (Q3 B) — Hub JWTs are minted locally with the
 * same HS256 secret the Hub uses (`BRAND_JWT_SECRET` / `test-brand-jwt-secret`).
 *
 * Prerequisites:
 *   Terminal A:  cd code && cargo run -p api          # http://127.0.0.1:8080
 *   Terminal B:  cd code && BRAND_API_ORIGIN=http://127.0.0.1:8080 pnpm --filter brand-portal dev
 *                # http://localhost:4001/brand
 *   Portal rewrite must hit that Hub (not KrakenD :9090/v1):
 *     BRAND_API_ORIGIN=http://127.0.0.1:8080  (no /v1 — Axum mounts /brand, not /v1/brand)
 *     then restart brand-portal so next.config.ts picks it up.
 *
 * Install (once):
 *   cd scripts/ui-smoke && npm install && npx playwright install chromium && cd ../..
 *
 * Run from repo root:
 *   node scripts/ui-smoke/brand-session-refresh.mjs
 *
 * Demo (headed, slower so you can follow):
 *   $env:UI_SMOKE_HEADED="1"
 *   node scripts/ui-smoke/brand-session-refresh.mjs
 *
 * Cookie policy (Q7 A):
 *   brand_refresh_token=…; Secure; HttpOnly; SameSite=Lax; Path=/
 *
 * Next.js App Router client nav does not fire window `load`. Do not use
 * waitForURL's default waitUntil: "load" — use "commit" and wait for copy.
 */

import { createHmac, randomUUID } from "node:crypto";
import { ACME_ID, BRAND_JWT_SECRET } from "../http-smoke/lib.mjs";

const ORIGIN = (process.env.BRAND_ORIGIN || "http://localhost:4001").replace(/\/$/, "");
const BASE_PATH = process.env.BRAND_BASE_PATH || "/brand";
const HUB = (process.env.API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const TOKEN_KEY = "brandToken";
const COOKIE_NAME = "brand_refresh_token";
const AGENCY_COOKIE = "agency_refresh_token";
const COOKIE_ATTRS = ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"];

const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const DASHBOARD = `${ORIGIN}${BASE_PATH}/dashboard`;
const REQUEST_NEW = `${ORIGIN}${BASE_PATH}/request/new`;
const REFRESH_PATH = `${BASE_PATH}/api/auth/refresh`;
const LOGOUT_PATH = `${BASE_PATH}/api/auth/logout`;
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED === "1";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 2000 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 500 : 0));

const UNAUTHORIZED_JSON = JSON.stringify({
  error: "UNAUTHORIZED",
  message: "Session expired. Sign in again.",
});
const VALID_GRANT_JSON = JSON.stringify({
  status: "valid",
  shop: { id: "shop-g111-smoke", name: "G-111 Smoke Shop" },
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

function onDashboard(url) {
  return url.pathname.endsWith(`${BASE_PATH}/dashboard`);
}

function signedInChrome(page) {
  return page.getByRole("button", { name: "Sign Out" });
}

function signInHeading(page) {
  return page.getByRole("heading", { name: "Brand Portal" });
}

function loginWithTikTok(page) {
  return page.getByRole("button", { name: "Login with TikTok" });
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
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY).catch(() => null);
  console.error(
    `  debug url=${page.url()} brandToken=${token ? "set" : "missing"} headings=${JSON.stringify(headings)} alert=${JSON.stringify(alert)}\n  body=${snippet}`,
  );
  throw err;
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

function pathOf(url) {
  try {
    return new URL(url, ORIGIN).pathname.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isPackagesListUrl(url) {
  const path = pathOf(url);
  return path.endsWith("/api/packages") || path.endsWith("/brand/packages");
}

function isSellerStatusUrl(url) {
  return pathOf(url).endsWith("/seller/status");
}

function mintJwt({ tokenUse, sub, email, brandId, ttlSecs }) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      email,
      aud: "authenticated",
      role: "authenticated",
      token_use: tokenUse,
      jti: randomUUID(),
      iat: now,
      exp: now + ttlSecs,
      brand_id: brandId,
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", BRAND_JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function mintBrandPair() {
  const sub = randomUUID();
  const email = "g111-smoke@tiktok.local";
  return {
    access: mintJwt({ tokenUse: "access", sub, email, brandId: ACME_ID, ttlSecs: 60 * 60 }),
    refresh: mintJwt({
      tokenUse: "refresh",
      sub,
      email,
      brandId: ACME_ID,
      ttlSecs: 60 * 60 * 24 * 7,
    }),
  };
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

function nodeSetCookieLines(res) {
  if (typeof res.headers.getSetCookie === "function") {
    const lines = res.headers.getSetCookie();
    if (Array.isArray(lines) && lines.length) return lines;
  }
  const raw = res.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function brandRefreshCookieLine(lines) {
  return lines.find((line) => line.includes(COOKIE_NAME)) ?? null;
}

async function refreshSetCookieLine(res) {
  return brandRefreshCookieLine(await headerValues(res, "set-cookie"));
}

function assertCookiePolicy(line, { cleared = false } = {}) {
  if (!line) fail(`missing Set-Cookie for ${COOKIE_NAME}`);
  if (cleared) {
    if (!/brand_refresh_token=;/.test(line) && !/Max-Age=0/.test(line)) {
      fail(`logout cookie should be cleared: ${line}`);
    }
  } else if (/brand_refresh_token=;/.test(line)) {
    fail(`refresh cookie was empty: ${line}`);
  }
  for (const attr of COOKIE_ATTRS) {
    if (!line.includes(attr)) fail(`Set-Cookie missing ${attr}: ${line}`);
  }
}

function assertNoBrandRefreshSetCookie(res, label) {
  const line = brandRefreshCookieLine(nodeSetCookieLines(res));
  if (line && !/brand_refresh_token=;/.test(line) && !/Max-Age=0/.test(line)) {
    fail(`${label} minted ${COOKIE_NAME}: ${line}`);
  }
}

async function refreshCookie(context) {
  const cookies = await context.cookies(ORIGIN);
  return cookies.find((c) => c.name === COOKIE_NAME) ?? null;
}

async function assertHttpOnlyRefresh(page, context, { present }) {
  const cookie = await refreshCookie(context);
  if (present) {
    if (!cookie?.value) fail(`${COOKIE_NAME} missing from cookie jar`);
    if (!cookie.httpOnly) fail(`${COOKIE_NAME} is not HttpOnly`);
    if (cookie.path !== "/") fail(`${COOKIE_NAME} Path expected /, got ${cookie.path}`);
    if (String(cookie.sameSite).toLowerCase() !== "lax") {
      fail(`${COOKIE_NAME} SameSite expected Lax, got ${cookie.sameSite}`);
    }
  } else if (cookie?.value) {
    fail(`${COOKIE_NAME} still present`);
  }
  const visible = await page.evaluate(() => document.cookie);
  if (visible.includes(COOKIE_NAME)) {
    fail(`${COOKIE_NAME} is visible to document.cookie`);
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

async function assertNoRole(page) {
  const role = await page.evaluate(() => localStorage.getItem("userRole"));
  if (role === "brand") fail("userRole=brand still set after bounce");
}

async function assertNoShell(page) {
  if (await signedInChrome(page).count()) {
    fail("Brand Sign Out chrome visible while unauthenticated");
  }
}

async function newPage(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

async function stubValidGrants(page) {
  const fulfill = async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: VALID_GRANT_JSON,
    });
  };
  await page.route((url) => String(url).includes("/seller/status"), fulfill);
  await page.route((url) => String(url).includes("/ads/status"), fulfill);
}

async function addRefreshCookie(context, value) {
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value,
      domain: new URL(ORIGIN).hostname,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
}

async function landReturningBrand(page, context, pair = mintBrandPair()) {
  await stubValidGrants(page);
  await addRefreshCookie(context, pair.refresh);
  const land = new URL(`${DASHBOARD}?token=${encodeURIComponent(pair.access)}`);
  if (land.searchParams.has("refresh_token")) fail("callback URL leaked refresh_token");
  if (!land.searchParams.get("token")) fail("callback URL missing short-lived token");
  await page.goto(land.toString(), { waitUntil: "domcontentloaded" });
  try {
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), TOKEN_KEY, {
      timeout: 45_000,
    });
    await waitForPath(page, (url) => onDashboard(url) && !url.searchParams.has("token"), 30_000);
    await signedInChrome(page).waitFor({ timeout: 30_000 });
  } catch (err) {
    await dumpWait(page, err);
  }
  await assertHasToken(page);
  return pair;
}

async function openLogin(page) {
  await page.goto(AUTH, { waitUntil: "domcontentloaded" });
  await signInHeading(page).waitFor();
  await loginWithTikTok(page).waitFor();
}

async function requireBrandPortal() {
  step(`check Brand Portal at ${AUTH}`);
  try {
    const res = await fetch(AUTH, { redirect: "manual" });
    if (res.status >= 500) fail(`GET ${AUTH} → ${res.status}`);
  } catch (err) {
    fail(
      `cannot reach ${AUTH} (${err.cause?.code || err.message}). Start Brand Portal:\n` +
        `  cd code\n  BRAND_API_ORIGIN=http://127.0.0.1:8080 pnpm --filter brand-portal dev\n` +
        `Login URL is ${AUTH} (port 4001 + basePath /brand)`,
    );
  }
  ok("Brand Portal reachable");
}

async function requireG111Rewrite() {
  step("check G-111 refresh contract through the Brand rewrite");
  const url = `${ORIGIN}${REFRESH_PATH}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    fail(`cannot POST ${url} (${err.cause?.code || err.message})`);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status !== 401) {
    fail(
      `rewrite refresh is not the G-111 contract (POST ${url} → ${res.status} ${JSON.stringify(body)}).\n` +
        `  Brand Portal currently rewrites to KrakenD :9090, which may front an older Hub\n` +
        `  without B5 POST /brand/auth/refresh.\n` +
        `  Point the portal at the cargo Hub and restart it:\n` +
        `    BRAND_API_ORIGIN=http://127.0.0.1:8080\n` +
        `    (no /v1 — Axum mounts /brand, not /v1/brand)`,
    );
  }
  if (body.refresh_token != null) {
    fail("rewrite refresh JSON leaked refresh_token");
  }
  ok("rewrite POST /brand/api/auth/refresh is 401 without cookie (G-111 Hub)");
}

async function requireHub() {
  step(`check Hub B5 at ${HUB}/brand/auth/refresh`);
  let res;
  try {
    res = await fetch(`${HUB}/brand/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    fail(
      `cannot reach ${HUB} (${err.cause?.code || err.message}). Start the API:\n` +
        `  cd code\n  cargo run -p api`,
    );
  }
  const body = await res.json().catch(() => ({}));
  if (res.status !== 401) {
    fail(
      `Hub POST /brand/auth/refresh expected 401 without cookie, got ${res.status} ${JSON.stringify(body)}.\n` +
        `  Restart the cargo Hub so it includes G-111 B5:\n` +
        `    stop the current api.exe, then: cd code && cargo run -p api`,
    );
  }
  ok("Hub B5 refresh is 401 without cookie");
}

async function hubJson(path, init = {}) {
  const res = await fetch(`${HUB}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { res, body };
}

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/brand-session-refresh.mjs",
  );
  process.exit(1);
});

await requireBrandPortal();
await requireHub();
await requireG111Rewrite();

const browser = await playwright.chromium.launch({
  headless: !SHOW_BROWSER,
  slowMo: SLOW_MS > 0 ? SLOW_MS : 0,
});

try {
  // --- S1 edge: Login Kit callback — ?token= only + HttpOnly cookie (no live TikTok) ---
  {
    step("S1 Login Kit callback — ?token= stays; cookie is HttpOnly; JSON never has refresh_token");
    const { context, page } = await newPage(browser);
    const pair = await landReturningBrand(page, context);
    const landed = new URL(page.url());
    if (landed.searchParams.has("refresh_token")) fail("portal URL leaked refresh_token");
    const stored = await assertHasToken(page);
    if (stored !== pair.access && stored === pair.refresh) {
      fail("portal stored the refresh JWT as brandToken");
    }
    await assertHttpOnlyRefresh(page, context, { present: true });
    ok("callback URL has short-lived ?token= only; brand_refresh_token is HttpOnly Path=/");
    await look();
    await context.close();
  }

  // --- S1 happy path: dead access token + valid cookie mints a new access token ---
  {
    step("S1 refresh — dead access token is replaced without TikTok");
    const { context, page } = await newPage(browser);
    await landReturningBrand(page, context);
    const before = await refreshCookie(context);
    if (!before?.value) fail("expected refresh cookie after landing");
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
    const keys = Object.keys(refreshBody);
    if (keys.some((k) => k !== "access_token")) {
      fail(`refresh JSON must contain only access_token, got ${keys.join(",")}`);
    }
    assertCookiePolicy(await refreshSetCookieLine(refreshRes));
    await meP;
    await waitForPath(page, onDashboard);
    await signedInChrome(page).waitFor();
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
    step("S1 retry — first packages 401, refresh once, retry succeeds");
    const { context, page } = await newPage(browser);
    await landReturningBrand(page, context);
    let failNextPackages = true;
    await page.route(isPackagesListUrl, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      if (failNextPackages) {
        failNextPackages = false;
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
    await page.goto(REQUEST_NEW, { waitUntil: "domcontentloaded" });
    const refreshRes = await refreshP;
    if (refreshRes.status() !== 200) fail(`retry refresh expected 200, got ${refreshRes.status()}`);
    const refreshBody = await refreshRes.json();
    if (refreshBody.refresh_token != null) fail("retry refresh JSON leaked refresh_token");
    await assertHasToken(page);
    if (await loginWithTikTok(page).count()) fail("retry bounce to Login after a successful refresh");
    ok("interceptor refreshed once and retried GET /packages");
    await look();
    await context.close();
  }

  // --- S1 edge: Flow 1 invite — HTTP I3 is not a session mint; B1 start sets no cookie ---
  {
    step("S1 Flow 1 invite — I2 GET + I3 consume + B1 start do not Set-Cookie brand_refresh_token");
    const login = await hubJson("/agency/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (login.res.status !== 200 || typeof login.body?.access_token !== "string") {
      fail(`agency login for invite mint expected 200, got ${login.res.status}`);
    }
    const invite = await hubJson("/agency/invites", {
      method: "POST",
      headers: { Authorization: `Bearer ${login.body.access_token}` },
    });
    if (invite.res.status !== 200 || typeof invite.body?.token !== "string") {
      fail(`POST /agency/invites expected 200, got ${invite.res.status} ${JSON.stringify(invite.body)}`);
    }
    const token = invite.body.token;
    const getInvite = await hubJson(`/brand/invites/${encodeURIComponent(token)}`);
    if (getInvite.res.status !== 200) {
      fail(`GET invite expected 200, got ${getInvite.res.status}`);
    }
    assertNoBrandRefreshSetCookie(getInvite.res, "GET /brand/invites/{token}");
    if (getInvite.body?.refresh_token != null) fail("I2 JSON leaked refresh_token");

    const consume = await hubJson(`/brand/invites/${encodeURIComponent(token)}/consume`, {
      method: "POST",
    });
    if (consume.res.status !== 200 && consume.res.status !== 409) {
      fail(`I3 consume expected 200/409, got ${consume.res.status} ${JSON.stringify(consume.body)}`);
    }
    assertNoBrandRefreshSetCookie(consume.res, "POST /brand/invites/{token}/consume");
    if (consume.body?.refresh_token != null) fail("I3 JSON leaked refresh_token");
    if (consume.body?.access_token != null) fail("I3 JSON minted access_token (session mint is B2 only)");

    const start = await hubJson("/brand/auth/tiktok/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_token: token }),
    });
    if (start.res.status !== 200) {
      fail(`B1 start expected 200, got ${start.res.status} ${JSON.stringify(start.body)}`);
    }
    assertNoBrandRefreshSetCookie(start.res, "POST /brand/auth/tiktok/start");
    if (start.body?.refresh_token != null) fail("B1 JSON leaked refresh_token");
    ok("Flow 1 HTTP I2/I3 and B1 start are not a Hub session mint");
    await look();
  }

  // --- S1 edge: Login Kit callback without code — 302 error, no cookie ---
  {
    step("S1 Login Kit callback without code — 302 ?error=; no brand_refresh_token");
    const res = await fetch(`${HUB}/brand/auth/tiktok/callback`, { redirect: "manual" });
    if (res.status !== 302 && res.status !== 303) {
      fail(`callback without code expected 302/303, got ${res.status}`);
    }
    const location = res.headers.get("location") || "";
    if (!location.includes("/brand/auth") || !location.includes("error=")) {
      fail(`callback Location should be /brand/auth?error=, got ${location}`);
    }
    if (location.includes("refresh_token=")) fail(`callback Location leaked refresh_token: ${location}`);
    if (location.includes("token=")) fail(`failed callback should not set ?token=: ${location}`);
    assertNoBrandRefreshSetCookie(res, "GET /brand/auth/tiktok/callback (no code)");
    ok("failed B2 does not set brand_refresh_token");
    await look();
  }

  // --- S1 failure: Missing refresh credential ---
  {
    step("S1 missing cookie — POST /auth/refresh is 401");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const result = await page.evaluate(async (path) => {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      return { status: res.status, text };
    }, REFRESH_PATH);
    if (result.status !== 401) fail(`missing cookie expected 401, got ${result.status} ${result.text}`);
    let body = {};
    try {
      body = JSON.parse(result.text);
    } catch {
      /* ignore */
    }
    if (body.access_token) fail("missing cookie minted an access_token");
    if (body.refresh_token != null) fail("missing-cookie JSON leaked refresh_token");
    if (await refreshCookie(context)) fail("refresh set a cookie without a credential");
    ok("missing brand_refresh_token → 401");
    await look();
    await context.close();
  }

  // --- S1 failure: Invalid or expired credential ---
  {
    step("S1 invalid cookie — POST /auth/refresh is 401");
    const { context, page } = await newPage(browser);
    await addRefreshCookie(context, "invalid-or-expired-refresh");
    await openLogin(page);
    const result = await page.evaluate(async (path) => {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      return { status: res.status, text };
    }, REFRESH_PATH);
    if (result.status !== 401) fail(`invalid cookie expected 401, got ${result.status} ${result.text}`);
    let body = {};
    try {
      body = JSON.parse(result.text);
    } catch {
      /* ignore */
    }
    if (body.access_token) fail("invalid cookie minted an access_token");
    ok("invalid brand_refresh_token → 401");
    await look();
    await context.close();
  }

  // --- S1 failure: Agency cookie only ---
  {
    step("S1 Agency cookie — Brand refresh never reads agency_refresh_token");
    const { context, page } = await newPage(browser);
    const pair = mintBrandPair();
    await context.addCookies([
      {
        name: AGENCY_COOKIE,
        value: pair.refresh,
        domain: new URL(ORIGIN).hostname,
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
    await openLogin(page);
    const result = await page.evaluate(async (path) => {
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      return { status: res.status, text };
    }, REFRESH_PATH);
    if (result.status !== 401) {
      fail(`agency cookie only expected 401, got ${result.status} ${result.text}`);
    }
    if (await refreshCookie(context)) fail("Brand refresh wrote brand_refresh_token from an Agency cookie");
    ok("agency_refresh_token alone → 401");
    await look();
    await context.close();
  }

  // --- S2: Mid-desk 401 then refresh 401 bounces to Login ---
  {
    step("S2 mid-desk — API 401 + refresh 401 lands Login");
    const { context, page } = await newPage(browser);
    await landReturningBrand(page, context);
    await page.unrouteAll({ behavior: "wait" });
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
    await page.route(isSellerStatusUrl, async (route) => {
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
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("brand-portal-session"));
    });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await loginWithTikTok(page).waitFor();
    await assertNoToken(page);
    await assertNoRole(page);
    await assertNoShell(page);
    ok("dead session cleared; brand is on Login");
    await look();
    await context.close();
  }

  // --- S2 edge: Reload with dead access token follows the same bounce ---
  {
    step("S2 reload — dead access token + rejected refresh → Login");
    const { context, page } = await newPage(browser);
    await landReturningBrand(page, context);
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
    await assertNoRole(page);
    await assertNoShell(page);
    ok("reload bounce matches mid-desk bounce");
    await look();
    await context.close();
  }

  // --- S2 edge: Logout ends access state and the refresh cookie ---
  {
    step("S2 logout — access token and refresh cookie end; no session resumes");
    const { context, page } = await newPage(browser);
    await landReturningBrand(page, context);
    const access = await assertHasToken(page);
    const logoutP = page.waitForResponse(isLogoutPost);
    await page.evaluate(
      async ({ path, token, tokenKey }) => {
        await fetch(path, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        localStorage.removeItem(tokenKey);
        localStorage.removeItem("userRole");
      },
      { path: LOGOUT_PATH, token: access, tokenKey: TOKEN_KEY },
    );
    const logoutRes = await logoutP;
    if (logoutRes.status() !== 204 && logoutRes.status() !== 200) {
      fail(`logout expected 204, got ${logoutRes.status()}`);
    }
    assertCookiePolicy(await refreshSetCookieLine(logoutRes), { cleared: true });
    await assertNoToken(page);
    await assertHttpOnlyRefresh(page, context, { present: false });
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await assertNoShell(page);
    ok("logout cleared JWT and brand_refresh_token (Path=/); /dashboard stays on Login");
    await look();
    await context.close();
  }

  // --- S2 edge: Mock role flag without a Hub session ---
  {
    step("S2 mock role — userRole=brand without Hub token does not keep chrome");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    await page.evaluate(() => {
      localStorage.setItem("userRole", "brand");
      localStorage.removeItem("brandToken");
    });
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await waitForPath(page, onAuth);
    await signInHeading(page).waitFor();
    await loginWithTikTok(page).waitFor();
    await assertNoToken(page);
    await assertNoShell(page);
    const role = await page.evaluate(() => localStorage.getItem("userRole"));
    if (role === "brand") fail("mock userRole=brand kept the operator marked signed-in");
    ok("mock brand role without Hub JWT bounced to Login");
    await look();
    await context.close();
  }

  console.log("\nG-111 UI smoke passed (acceptance scenarios 1–2)");
} catch (err) {
  if (process.exitCode !== 1) {
    console.error(err);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}

process.exit(process.exitCode ?? 0);
