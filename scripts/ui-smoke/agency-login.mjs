#!/usr/bin/env node
/**
 * G-027 — Agency Admin login UI smoke (Playwright).
 * Maps 1:1 to docs/02-product/acceptance/G-027.md (scenarios 1–3).
 * Scenario 4 is a git/diff check, not a browser case.
 *
 * Hits an already-running Agency Admin app + API. Does not start servers.
 *
 * Prerequisites:
 *   Terminal A:  cd code && cargo run -p api          # http://127.0.0.1:8080
 *   Terminal B:  cd code && pnpm --filter admin-console dev   # http://localhost:4002/admin
 *
 * Install (once):
 *   cd scripts/ui-smoke && npm install && npx playwright install chromium && cd ../..
 *
 * Run from repo root:
 *   node scripts/ui-smoke/agency-login.mjs
 *
 * Demo (headed, slower so you can follow):
 *   $env:UI_SMOKE_HEADED="1"
 *   node scripts/ui-smoke/agency-login.mjs
 *
 * Slower still:
 *   $env:UI_SMOKE_HEADED="1"
 *   $env:UI_SMOKE_DELAY_MS="3000"
 *   $env:UI_SMOKE_SLOW_MS="800"
 *   node scripts/ui-smoke/agency-login.mjs
 *
 * DOM (code/apps/admin-console/src/app/auth/page.tsx):
 *   Email    — labelled "Email" (<input type="email">; React useId — do not hard-code #ids)
 *   Password — labelled "Password"
 *   Submit   — role=button name "Sign in"
 *   Error    — <p role="alert">
 */

const ORIGIN = (process.env.ADMIN_ORIGIN || "http://localhost:4002").replace(/\/$/, "");
const BASE_PATH = process.env.ADMIN_BASE_PATH || "/admin";
const EMAIL = process.env.AGENCY_BOOTSTRAP_EMAIL || "admin@sodality.local";
const PASSWORD = process.env.AGENCY_BOOTSTRAP_PASSWORD || "secret12";
const TOKEN_KEY = "agencyAccessToken";

const AUTH = `${ORIGIN}${BASE_PATH}/auth`;
const DASHBOARD = `${ORIGIN}${BASE_PATH}/dashboard`;
const SHOW_BROWSER = process.env.UI_SMOKE_HEADED === "1";
const DELAY_MS = Number(process.env.UI_SMOKE_DELAY_MS ?? (SHOW_BROWSER ? 2000 : 0));
const SLOW_MS = Number(process.env.UI_SMOKE_SLOW_MS ?? (SHOW_BROWSER ? 500 : 0));

const COPY = {
  unauthorized: "Invalid email or password.",
  empty: "Enter email and password.",
  unreachable: "Cannot reach the auth service",
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

/** Hold the screen so a demo viewer can read the result. */
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

function loginForm(page) {
  return {
    email: page.getByLabel("Email", { exact: true }),
    password: page.getByLabel("Password", { exact: true }),
    submit: page.getByRole("button", { name: "Sign in" }),
  };
}

function alertWith(page, text) {
  return page.locator("p[role='alert']").filter({ hasText: text });
}

async function newPage(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

async function openLogin(page) {
  await page.goto(AUTH, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
}

async function assertStillOnAuth(page) {
  if (!page.url().includes(`${BASE_PATH}/auth`)) {
    fail(`expected to stay on login, url=${page.url()}`);
  }
}

async function assertNoToken(page) {
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (token) fail(`${TOKEN_KEY} was set: ${token.slice(0, 16)}…`);
}

async function assertHasToken(page) {
  const token = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  if (!token) fail(`${TOKEN_KEY} missing`);
  return token;
}

async function assertNoShell(page) {
  if (await page.getByRole("heading", { name: "Agency · Select brand" }).count()) {
    fail("Agency Select Brand shell visible while unauthenticated");
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
        `Login URL is ${AUTH} (port 4002 + basePath /admin), not http://localhost:4000/auth`,
    );
  }
  ok("Agency Admin reachable");
}

const playwright = await import("playwright").catch(() => {
  console.error(
    "playwright is not installed.\n" +
      "  cd scripts/ui-smoke\n  npm install\n  npx playwright install chromium\n  cd ../..\n" +
      "  node scripts/ui-smoke/agency-login.mjs",
  );
  process.exit(1);
});

await requireAdmin();

const browser = await playwright.chromium.launch({
  headless: !SHOW_BROWSER,
  slowMo: SLOW_MS > 0 ? SLOW_MS : 0,
});

try {
  // --- G-027 Scenario 2 / empty fields (client-side, no API) ---
  {
    step("S2 empty fields — client validation, no session");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const form = loginForm(page);
    await form.email.fill("");
    await form.password.fill("");
    await form.submit.click();
    await alertWith(page, COPY.empty).waitFor();
    ok(`alert: ${COPY.empty}`);
    await assertStillOnAuth(page);
    await assertNoToken(page);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 1 failure: wrong password ---
  {
    step("S1 wrong password — alert, stay on /auth, no JWT");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const form = loginForm(page);
    await form.email.fill(EMAIL);
    await form.password.fill("wrong-password");
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes("/auth/login") && res.request().method() === "POST",
    );
    await form.submit.click();
    const res = await loginResponse;
    if (res.status() !== 401) fail(`wrong password expected 401, got ${res.status()}`);
    await alertWith(page, COPY.unauthorized).waitFor();
    ok(`alert: ${COPY.unauthorized}`);
    await assertStillOnAuth(page);
    await assertNoToken(page);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 1 failure: unknown email ---
  {
    step("S1 unknown email — alert, no session");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const form = loginForm(page);
    await form.email.fill("nobody@invalid.test");
    await form.password.fill("whatever12");
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes("/auth/login") && res.request().method() === "POST",
    );
    await form.submit.click();
    await loginResponse;
    await alertWith(page, COPY.unauthorized).waitFor();
    ok(`alert: ${COPY.unauthorized}`);
    await assertStillOnAuth(page);
    await assertNoToken(page);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 2 failure: API unreachable (abort the rewrite, do not stop cargo) ---
  {
    step("S2 API unreachable — error UX, no mock login success");
    const { context, page } = await newPage(browser);
    await page.route("**/api/v1/agency/auth/login", (route) => route.abort("failed"));
    await openLogin(page);
    const form = loginForm(page);
    await form.email.fill(EMAIL);
    await form.password.fill(PASSWORD);
    await form.submit.click();
    await alertWith(page, COPY.unreachable).waitFor();
    ok("alert: cannot reach auth service");
    await assertStillOnAuth(page);
    await assertNoToken(page);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 3 edge: already on /auth, no redirect loop ---
  {
    step("S3 already on /auth — login form, no loop");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const form = loginForm(page);
    await form.email.waitFor();
    const left = await page
      .waitForURL((url) => !onAuth(url), { timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    if (left) fail(`left /auth unexpectedly → ${page.url()}`);
    await assertStillOnAuth(page);
    await assertNoShell(page);
    ok(`stayed on ${page.url()}`);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 3: unauthenticated protected route ---
  {
    step("S3 unauthenticated /dashboard → /auth, no shell");
    const { context, page } = await newPage(browser);
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await page.waitForURL(onAuth, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
    await assertNoShell(page);
    ok(`redirected to ${page.url()}`);
    await look();
    await context.close();
  }

  // --- G-027 Scenario 3 failure: junk token ---
  {
    step("S3 junk token — treat as unauthenticated");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    await page.evaluate((key) => localStorage.setItem(key, "not-a-jwt"), TOKEN_KEY);
    const me = page.waitForResponse(
      (res) => res.url().includes("/auth/me") && res.request().method() === "GET",
    );
    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    const meRes = await me;
    if (meRes.status() !== 401) fail(`/auth/me junk token expected 401, got ${meRes.status()}`);
    await page.waitForURL(onAuth, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
    await assertNoToken(page);
    await assertNoShell(page);
    ok("junk JWT cleared; redirected to /auth");
    await look();
    await context.close();
  }

  // --- G-027 Scenario 1 happy path + reload /auth/me + logout + post-logout gate ---
  {
    step("S1 success — valid credentials land on /brands");
    const { context, page } = await newPage(browser);
    await openLogin(page);
    const form = loginForm(page);
    await form.email.fill(EMAIL);
    await form.password.fill(PASSWORD);
    const loginResponse = page.waitForResponse(
      (res) => res.url().includes("/auth/login") && res.request().method() === "POST",
    );
    await form.submit.click();
    const loginRes = await loginResponse;
    if (loginRes.status() !== 200) fail(`login POST expected 200, got ${loginRes.status()}`);
    const session = await loginRes.json();
    if (session.user?.role !== "agency") fail(`user.role expected agency, got ${session.user?.role}`);
    if (session.user?.email !== EMAIL) fail(`user.email expected ${EMAIL}, got ${session.user?.email}`);

    await page.waitForURL(onBrands, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency · Select brand" }).waitFor();
    await assertHasToken(page);
    ok(`landed on ${page.url()} role=agency`);
    await look();

    step("S1 reload — session survives; GET /auth/me restores identity");
    const me = page.waitForResponse(
      (res) => res.url().includes("/auth/me") && res.request().method() === "GET",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    const meRes = await me;
    if (meRes.status() !== 200) fail(`/auth/me after reload expected 200, got ${meRes.status()}`);
    const meBody = await meRes.json();
    if (meBody.role !== "agency" || meBody.email !== EMAIL) {
      fail(`/auth/me identity mismatch ${JSON.stringify({ role: meBody.role, email: meBody.email })}`);
    }
    await page.waitForURL(onBrands, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency · Select brand" }).waitFor();
    ok(`still on /brands after reload; me=${meBody.email}`);
    await look();

    step("S1 logout — POST /auth/logout, session cleared, next /dashboard → /auth");
    const logoutResponse = page.waitForResponse(
      (res) => res.url().includes("/auth/logout") && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign Out" }).click();
    const logoutRes = await logoutResponse;
    if (logoutRes.status() !== 204 && logoutRes.status() !== 200) {
      fail(`logout expected 204, got ${logoutRes.status()}`);
    }
    await page.waitForURL(onAuth, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
    await assertNoToken(page);
    ok("Sign Out cleared JWT and returned to /auth");
    await look();

    await page.goto(DASHBOARD, { waitUntil: "domcontentloaded" });
    await page.waitForURL(onAuth, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Agency Admin" }).waitFor();
    await assertNoShell(page);
    ok("post-logout /dashboard redirected to /auth");

    await look();
    await context.close();
  }

  console.log("\nG-027 UI smoke passed (acceptance scenarios 1–3)");
} catch (err) {
  if (process.exitCode !== 1) {
    console.error(err);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}

process.exit(process.exitCode ?? 0);
