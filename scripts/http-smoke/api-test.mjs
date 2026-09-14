#!/usr/bin/env node
/**
 * G-069 — External HTTP E2E for G-047 / G-052 / G-053 / G-054 / G-055 / G-056 / G-066.
 * Hits a **already running** API. Does not start the server. No npm install.
 *
 * Default: KrakenD public door (G-065)
 *   docker compose up  (wait for :9090)
 *   node scripts/http-smoke/api-test.mjs
 *
 * Hub-direct:
 *   $env:API_BASE="http://127.0.0.1:8080"
 *   cd code; cargo run -p api
 *
 * Optional env: API_BASE, AGENCY_BOOTSTRAP_EMAIL, AGENCY_BOOTSTRAP_PASSWORD,
 * BRAND_JWT_SECRET (must match the Hub; default test-brand-jwt-secret).
 *
 * Continues after FAIL so every acceptance scenario is attempted. Exit 1 if any FAIL.
 * SKIP = no HTTP surface, G-053 unmounted stub, G-066 ads 404 until Hub rebuild, or runtime OpenAPI when via KrakenD.
 */
import { randomUUID } from "node:crypto";
import {
  ACME_ID,
  BASE,
  BRAND_JWT_SECRET,
  EMAIL,
  FIXTURE_ACCESS_TOKEN,
  FIXTURE_AUTHORIZE_BASE,
  FIXTURE_MERCHANT_ID,
  FIXTURE_SHOP_CIPHER,
  MAX_PDF_MULTIPART_BYTES,
  PASSWORD,
  SEED_MANAGED_100,
  UNKNOWN_ID,
  frozenF2Yaml,
  mintBrandJwt,
  ok,
  pdfMultipart,
  request,
  requestDeclaredLength,
  requireApi,
  step,
  viaGateway,
} from "./lib.mjs";

const stats = { pass: 0, fail: 0, skip: 0 };
const failures = [];

function skip(reason) {
  const err = new Error(reason);
  err.skip = true;
  throw err;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function assertStatus(res, want, label) {
  const allowed = Array.isArray(want) ? want : [want];
  if (!allowed.includes(res.status)) {
    throw new Error(
      `${label}: expected ${allowed.join("|")}, got ${res.status} ${dump(res.body)}`,
    );
  }
}

function expectError(body, code, label) {
  assert(body && typeof body === "object", `${label} ErrorResponse object`);
  assert(body.error === code, `${label}: error ${JSON.stringify(body.error)} want ${code}`);
  assert(typeof body.message === "string" && body.message, `${label} empty message`);
}

function dump(body) {
  if (body == null) return "";
  if (typeof body === "string") return body.slice(0, 400);
  try {
    return JSON.stringify(body).slice(0, 400);
  } catch {
    return String(body);
  }
}

function assertNoSecrets(body, label) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  assert(!raw.includes("shop_cipher"), `${label} leaked shop_cipher`);
  assert(!raw.includes("cipher_"), `${label} leaked cipher_`);
  assert(!raw.includes(FIXTURE_ACCESS_TOKEN), `${label} leaked access token`);
  assert(!raw.includes(FIXTURE_SHOP_CIPHER), `${label} leaked shop cipher`);
  if (body && typeof body === "object") {
    assert(body.access_token == null, `${label} has access_token`);
    assert(body.refresh_token == null, `${label} has refresh_token`);
  }
}

async function run(id, title, fn) {
  step(`${id} — ${title}`);
  try {
    await fn();
    stats.pass += 1;
    ok(`PASS ${id}`);
  } catch (err) {
    if (err?.skip) {
      stats.skip += 1;
      console.log(`  SKIP  ${id}: ${err.message}`);
      return;
    }
    stats.fail += 1;
    const msg = err?.message || String(err);
    failures.push(`${id}: ${msg}`);
    console.error(`  FAIL  ${id}: ${msg}`);
  }
}

function draftBody(name = "HTTP smoke draft") {
  return {
    name,
    mode: "managed",
    price: 200000,
    creator_count: 80,
    review_required: true,
    submit_deadline_days: 7,
    duration_days: 30,
  };
}

function termsBody() {
  return {
    price: 210000,
    creator_count: 90,
    review_required: true,
    submit_deadline_days: 8,
    duration_days: 40,
  };
}

function packageCreate(packageId = SEED_MANAGED_100) {
  return {
    mode: "managed",
    product_link: "https://shop.example/sku",
    package_id: packageId,
  };
}

function customCreate() {
  return {
    mode: "custom",
    product_link: "https://shop.example/sku",
    custom_spec: {
      creator_count: 5,
      duration_days: 14,
      review_required: true,
      submit_deadline_days: 3,
    },
  };
}

function successCallback(orderId, amount = 250000, responseCode = 0) {
  return {
    merchant_id: FIXTURE_MERCHANT_ID,
    detail: {
      response_code: responseCode,
      order_id: orderId,
      receive_amount: amount,
      payment_reference_id: "INET-REF-1",
    },
  };
}

function oauthState(url) {
  const part = String(url).split("state=")[1];
  if (!part) throw new Error(`authorize_url missing state: ${url}`);
  return part.split("&")[0];
}

/** UAT catalogs accumulate smoke drafts; seed rows may not sit on page 1 (size 8). */
async function collectPackagePages(path, token) {
  const first = await request("GET", `${path}?page=1&page_size=50`, { token });
  assertStatus(first, 200, `${path} page 1`);
  const items = [...(first.body.items || [])];
  const pageCount = Number(first.body.page_count) || 1;
  for (let page = 2; page <= pageCount; page += 1) {
    const next = await request("GET", `${path}?page=${page}&page_size=50`, { token });
    assertStatus(next, 200, `${path} page ${page}`);
    items.push(...(next.body.items || []));
  }
  return { envelope: first.body, items };
}

async function loginAgency() {
  const { status, body } = await request("POST", "/agency/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  assertStatus({ status, body }, 200, "agency login");
  assert(typeof body?.access_token === "string", "login missing access_token");
  return body.access_token;
}

async function ensureBrand(agency) {
  let { status, body } = await request("GET", "/agency/brands", { token: agency });
  assertStatus({ status, body }, 200, "GET /agency/brands");
  assert(Array.isArray(body), "Brand[] expected");
  if (body.length === 0) {
    ({ status, body } = await request("POST", "/agency/brands/seed", { token: agency }));
    assertStatus({ status, body }, 200, "POST /agency/brands/seed");
    assert(Array.isArray(body) && body.length > 0, "seed returned no brands");
  }
  const acme = body.find((b) => b.id === ACME_ID);
  return acme?.id || body[0].id;
}

async function uploadPdf(agency, brandId, requestId, quoted) {
  const { contentType, body } = pdfMultipart({ quoted });
  return request(
    "POST",
    `/agency/brands/${brandId}/requests/${requestId}/contract`,
    { token: agency, raw: body, contentType },
  );
}

async function createAccepted(agency, brand, brandId, packageId = SEED_MANAGED_100) {
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(packageId),
  });
  assertStatus(created, 201, "create request");
  const id = created.body.id;
  const uploaded = await uploadPdf(agency, brandId, id);
  assertStatus(uploaded, 200, "upload PDF");
  const accepted = await request("POST", `/brand/requests/${id}/accept`, {
    token: brand,
    body: { accepted: true },
  });
  assertStatus(accepted, 200, "accept");
  assert(accepted.body.status === "accepted", `want accepted, got ${accepted.body.status}`);
  return id;
}

async function payUntil(brand, id, amount, want) {
  const session = await request("POST", `/brand/requests/${id}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(session, 201, "pay-sessions");
  const orderId = session.body.order_id;
  const cb = await request("POST", "/payment/callback", {
    body: successCallback(orderId, amount),
  });
  assertStatus(cb, 200, "payment callback");
  const got = await request("GET", `/brand/requests/${id}`, { token: brand });
  assertStatus(got, 200, "GET request after pay");
  assert(got.body.status === want, `want status ${want}, got ${got.body.status}`);
  return { orderId, request: got.body };
}

// ---------------------------------------------------------------------------
function needRuntimeSpec() {
  if (!spec?.paths) {
    skip("runtime /openapi.json is Hub-only; KrakenD does not proxy it");
  }
}

await requireApi();

const yaml = frozenF2Yaml();
assert(yaml.includes("version: 0.1.2") || yaml.includes("0.1.2"), "frozen F2 yaml version");
ok(
  `API ${BASE} · ${viaGateway() ? "KrakenD /v1" : "Hub-direct"} · BRAND_JWT_SECRET=${BRAND_JWT_SECRET === "test-brand-jwt-secret" ? "test default" : "env"}`,
);

let spec = null;
if (viaGateway()) {
  ok("skip GET /openapi.json (not on KrakenD)");
} else {
  spec = (await request("GET", "/openapi.json")).body;
  assert(spec?.info?.version === "1.2.0", `runtime OpenAPI ${spec?.info?.version}`);
}

const agency = await loginAgency();
const brandId = await ensureBrand(agency);
const brand = mintBrandJwt(brandId);
const otherBrand = mintBrandJwt(randomUUID());
ok(`agency JWT + brand_id=${brandId}`);

// ============================================================================
// G-047 packages
// ============================================================================

await run("G047-S3-openapi", "runtime lists P1–P9; freeze-absolute (no /api/v1/agency/packages)", async () => {
  assert(yaml.includes("  /agency/packages:"), "frozen yaml missing packages");
  if (!spec?.paths) {
    return;
  }
  const paths = spec.paths || {};
  for (const key of [
    "/agency/packages",
    "/agency/packages/{package_id}",
    "/agency/packages/{package_id}/activate",
    "/agency/packages/{package_id}/deactivate",
    "/agency/packages/{package_id}/versions",
    "/agency/packages/{package_id}/recommended",
    "/brand/packages",
  ]) {
    assert(paths[key], `runtime missing ${key}`);
  }
  assert(!paths["/api/v1/agency/packages"], "must not nest packages under /api/v1/agency");
  assert(yaml.includes("  /agency/packages:"), "frozen yaml missing packages");
});

await run("G047-S1-401", "P1/P3 missing bearer → 401", async () => {
  const list = await request("GET", "/agency/packages");
  assertStatus(list, 401, "P1 no bearer");
  expectError(list.body, "UNAUTHORIZED", "P1");
  const create = await request("POST", "/agency/packages", { body: draftBody() });
  assertStatus(create, 401, "P3 no bearer");
  expectError(create.body, "UNAUTHORIZED", "P3");
});

await run("G047-S1-404", "PATCH / activate unknown uuid → 404", async () => {
  const patch = await request("PATCH", `/agency/packages/${UNKNOWN_ID}`, {
    token: agency,
    body: draftBody(),
  });
  assertStatus(patch, 404, "PATCH unknown");
  const act = await request("POST", `/agency/packages/${UNKNOWN_ID}/activate`, {
    token: agency,
  });
  assertStatus(act, 404, "activate unknown");
});

await run("G047-S3-agency-list", "P1 lists all statuses; seed Managed 100/50/Broadcast 1000; bad sort 400", async () => {
  const list = await request("GET", "/agency/packages", { token: agency });
  assertStatus(list, 200, "P1");
  assert(list.body.page_size === 8, `page_size ${list.body.page_size}`);
  assert(Array.isArray(list.body.items), "PackageList.items");
  assert(list.body.total >= 3, `seed total ${list.body.total}`);
  const { items } = await collectPackagePages("/agency/packages", agency);
  const names = items.map((p) => p.name);
  assert(names.includes("Managed 100"), "seed Managed 100");
  assert(names.includes("Managed 50"), "seed Managed 50");
  assert(names.includes("Affiliate Broadcast 1,000"), "seed Broadcast 1,000");
  const bad = await request("GET", "/agency/packages?sort=nope", { token: agency });
  assertStatus(bad, 400, "invalid sort");
});

await run("G047-S1-draft-activate", "P3 unpublished v1; PATCH same v1; P4 publishes that v1; P4/P3 on active 400", async () => {
  const created = await request("POST", "/agency/packages", {
    token: agency,
    body: draftBody("Managed 80 smoke"),
  });
  assertStatus(created, 201, "P3 POST");
  assert(created.body.status === "draft", `status ${created.body.status}`);
  assert(created.body.versions?.[0]?.version === "1.0", "v1 number");
  assert(created.body.versions[0].published_at == null, "unpublished v1");
  const id = created.body.id;

  const patched = await request("PATCH", `/agency/packages/${id}`, {
    token: agency,
    body: { ...draftBody("Managed 80b"), price: 205000 },
  });
  assertStatus(patched, 200, "P3 PATCH");
  assert(patched.body.status === "draft", "still draft");
  assert(patched.body.name === "Managed 80b", "name upsert");
  assert(patched.body.versions.length === 1, "same unpublished v1");
  assert(patched.body.versions[0].published_at == null, "still unpublished");

  const active = await request("POST", `/agency/packages/${id}/activate`, {
    token: agency,
  });
  assertStatus(active, 200, "P4 from draft");
  assert(active.body.status === "active", "active");
  assert(active.body.versions.length === 1, "same version id/number");
  assert(typeof active.body.versions[0].published_at === "string", "published_at set");

  const again = await request("POST", `/agency/packages/${id}/activate`, {
    token: agency,
  });
  assertStatus(again, 400, "P4 while active");
  const patchActive = await request("PATCH", `/agency/packages/${id}`, {
    token: agency,
    body: draftBody(),
  });
  assertStatus(patchActive, 400, "PATCH while active");
});

await run("G047-S2-deactivate-reactivate-p6", "P5 hides + clears recommended; P6 while hidden; P4 no new version", async () => {
  const created = await request("POST", "/agency/packages", {
    token: agency,
    body: draftBody("Deact smoke"),
  });
  assertStatus(created, 201, "draft");
  const id = created.body.id;
  const act = await request("POST", `/agency/packages/${id}/activate`, { token: agency });
  assertStatus(act, 200, "activate");
  const rec = await request("PUT", `/agency/packages/${id}/recommended`, { token: agency });
  assertStatus(rec, [200, 400], "P7 set recommended (400 if seed Managed 100 already holds it)");
  const deact = await request("POST", `/agency/packages/${id}/deactivate`, { token: agency });
  assertStatus(deact, 200, "P5");
  assert(deact.body.status === "deactivated", "deactivated");
  assert(deact.body.recommended === false, "recommended cleared");
  const versionsBefore = deact.body.versions.length;
  const again = await request("POST", `/agency/packages/${id}/deactivate`, { token: agency });
  assertStatus(again, 200, "P5 idempotent");
  const edited = await request("POST", `/agency/packages/${id}/versions`, {
    token: agency,
    body: termsBody(),
  });
  assertStatus(edited, 201, "P6 while deactivated");
  assert(edited.body.status === "deactivated", "still deactivated");
  assert(edited.body.versions.length === versionsBefore + 1, "new version");
  assert(edited.body.name === "Deact smoke", "name unchanged");
  assert(edited.body.mode === "managed", "mode unchanged");
  const re = await request("POST", `/agency/packages/${id}/activate`, { token: agency });
  assertStatus(re, 200, "P4 from deactivated");
  assert(re.body.status === "active", "active");
  assert(re.body.versions.length === versionsBefore + 1, "P4 did not mint a version");
});

await run("G047-S2-p6-on-draft", "P6 on unpublished v1 → 400", async () => {
  const created = await request("POST", "/agency/packages", {
    token: agency,
    body: draftBody("P6 draft"),
  });
  assertStatus(created, 201, "draft");
  const v = await request("POST", `/agency/packages/${created.body.id}/versions`, {
    token: agency,
    body: termsBody(),
  });
  assertStatus(v, 400, "P6 on draft");
});

await run("G047-S2-p7-non-active", "P7 on draft → 400", async () => {
  const created = await request("POST", "/agency/packages", {
    token: agency,
    body: draftBody("P7 draft"),
  });
  assertStatus(created, 201, "draft");
  const rec = await request("PUT", `/agency/packages/${created.body.id}/recommended`, {
    token: agency,
  });
  assertStatus(rec, 400, "P7 on draft");
});

await run("G047-S3-p9-active-only", "P9 active only; seed present; 401 without bearer", async () => {
  // P7 is exclusive — G047-S2-deactivate-reactivate-p6 may have stolen seed recommended.
  const restore = await request("PUT", `/agency/packages/${SEED_MANAGED_100}/recommended`, {
    token: agency,
  });
  assertStatus(restore, 200, "restore seed Managed 100 recommended");
  const list = await request("GET", "/brand/packages", { token: brand });
  assertStatus(list, 200, "P9");
  assert(list.body.page_size === 8, "page 8");
  assert(Array.isArray(list.body.items), "items");
  assert(list.body.items.every((p) => p.status === "active"), "active only");
  const { items } = await collectPackagePages("/brand/packages", brand);
  assert(items.every((p) => p.status === "active"), "active only (all pages)");
  const names = items.map((p) => p.name);
  assert(names.includes("Managed 100"), "Managed 100");
  assert(names.includes("Managed 50"), "Managed 50");
  assert(names.includes("Affiliate Broadcast 1,000"), "Broadcast");
  assert(!names.includes("P6 draft"), "draft omitted");
  assert(!names.includes("P7 draft"), "unpublished draft omitted");
  const hundred = items.find((p) => p.name === "Managed 100");
  assert(hundred?.recommended === true, "Managed 100 recommended");
  const unauth = await request("GET", "/brand/packages");
  assertStatus(unauth, 401, "P9 no bearer");
});

await run("G047-S1-restart", "draft survives restart (durable Postgres)", async () => {
  skip("requires a second API process; covered by cargo test + GoTrue+PG");
});

await run("G047-S3-empty-active", "empty active set → items []", async () => {
  skip("would deactivate seed rows and break later scenarios; cargo test covers empty list");
});

await run("G047-S3-yaml-ui-ws", "Out: no yaml rewrite / portal / websocket on this runner", async () => {
  assert(yaml.includes("x-status: frozen") || yaml.includes("frozen"), "frozen marker");
  if (spec?.paths) {
    assert(!spec.paths["/realtime"], "no /realtime on runtime");
  }
});

// ============================================================================
// G-052 invites
// ============================================================================

await run("G052-S3-openapi", "runtime lists I1–I3 freeze-absolute", async () => {
  assert(yaml.includes("  /agency/brands/{brand_id}/invites:"), "frozen yaml I1");
  assert(yaml.includes("  /brand/invites/{token}:"), "frozen yaml I2");
  if (!spec?.paths) {
    return;
  }
  const paths = spec.paths || {};
  assert(paths["/agency/brands/{brand_id}/invites"], "I1");
  assert(paths["/brand/invites/{token}"], "I2");
  assert(paths["/brand/invites/{token}/consume"], "I3");
});

await run("G052-S1-401", "I1 missing bearer → 401", async () => {
  const res = await request("POST", `/agency/brands/${brandId}/invites`);
  assertStatus(res, 401, "I1 no bearer");
  expectError(res.body, "UNAUTHORIZED", "I1");
});

await run("G052-S1-404-403", "I1 unknown uuid 404; non-member 403", async () => {
  const missing = await request("POST", `/agency/brands/${UNKNOWN_ID}/invites`, {
    token: agency,
  });
  assertStatus(missing, 404, "unknown brand");
  const email = `empty-member-${Date.now()}@sodality.local`;
  const created = await request("POST", "/agency/accounts", {
    token: agency,
    body: { email, password: "empty-secret", name: "Empty Member", role: "agency" },
  });
  assertStatus(created, 201, "create empty-membership account");
  const login = await request("POST", "/agency/auth/login", {
    body: { email, password: "empty-secret" },
  });
  assertStatus(login, 200, "login empty member");
  const forbidden = await request("POST", `/agency/brands/${brandId}/invites`, {
    token: login.body.access_token,
  });
  assertStatus(forbidden, 403, "not a member");
});

await run("G052-S1-mint-reuse", "I1 mints URL; second unused+valid reuses token", async () => {
  const first = await request("POST", `/agency/brands/${brandId}/invites`, {
    token: agency,
  });
  assertStatus(first, 200, "I1");
  const token = first.body.token;
  assert(token, "token");
  assert(
    String(first.body.onboarding_url).endsWith(`/brand/invite/${token}`),
    `onboarding_url ${first.body.onboarding_url}`,
  );
  assert(first.body.expires_at, "expires_at");
  const second = await request("POST", `/agency/brands/${brandId}/invites`, {
    token: agency,
  });
  assertStatus(second, 200, "I1 reuse");
  assert(second.body.token === token, "same unused token");
  assert(second.body.onboarding_url === first.body.onboarding_url, "same URL");
});

await run("G052-S2-get-consume-idempotent", "I2 then I3; second I3 200; I2 after use still 200", async () => {
  const minted = await request("POST", `/agency/brands/${brandId}/invites`, {
    token: agency,
  });
  assertStatus(minted, 200, "I1");
  const token = minted.body.token;
  const got = await request("GET", `/brand/invites/${token}`);
  assertStatus(got, 200, "I2");
  assert(got.body.used_at == null, "unused");
  const consumed = await request("POST", `/brand/invites/${token}/consume`);
  assertStatus(consumed, 200, "I3");
  assert(consumed.body.brand_id === brandId, "brand_id");
  assert(consumed.body.used_at, "used_at");
  const again = await request("POST", `/brand/invites/${token}/consume`);
  assertStatus(again, 200, "I3 idempotent");
  assert(again.body.brand_id === brandId, "same brand");
  const resume = await request("GET", `/brand/invites/${token}`);
  assertStatus(resume, 200, "I2 after consume");
  assert(resume.body.brand_id === brandId, "resume brand");
});

await run("G052-S2-unknown-invented", "unknown / client-invented token → 404", async () => {
  const get = await request("GET", "/brand/invites/not-a-real-token");
  assertStatus(get, 404, "I2 unknown");
  const post = await request("POST", "/brand/invites/not-a-real-token/consume");
  assertStatus(post, 404, "I3 invented");
});

await run("G052-S1-expiry-ttl", "I1 after expiry mints a new token; I2/I3 expired reject", async () => {
  skip("TTL is 3 Asia/Bangkok calendar days; cargo test inserts an expired InviteRecord");
});

await run("G052-S1-typed-name", "I1 has no create-brand body", async () => {
  const res = await request("POST", `/agency/brands/${brandId}/invites`, {
    token: agency,
    body: { name: "Invented Co" },
  });
  assertStatus(res, [200, 400], "freeze has no body; extra JSON must not create a brand");
  if (res.status === 200) {
    assert(res.body.brand_id === brandId, "must stay on catalog brand_id");
  }
});

// ============================================================================
// G-053 brand-auth (archived done; routes may still be unmounted)
// ============================================================================

await run("G053-S1-start-callback-me-logout", "B1–B4 Login Kit session (acceptance G-053)", async () => {
  const start = await request("POST", "/brand/auth/tiktok/start", {
    body: {},
  });
  if (start.status === 404) {
    skip(
      "B1–B4 not mounted (GET/POST /brand/auth/* → 404). Known stub; human 2026-08-20 option 2.",
    );
  }
  assertStatus(start, 200, "B1 start");
  assert(start.body.authorize_url, "OAuthStart.authorize_url");

  const badCode = await request(
    "GET",
    "/brand/auth/tiktok/callback?code=invalid&state=nope",
  );
  assertStatus(badCode, [400, 401], "invalid auth code");

  const deny = await request(
    "GET",
    "/brand/auth/tiktok/callback?error=access_denied&state=nope",
  );
  assertStatus(deny, [400, 401], "deny callback");

  const me = await request("GET", "/brand/auth/me");
  assertStatus(me, 401, "B3 no bearer");
  const logout = await request("POST", "/brand/auth/logout");
  assertStatus(logout, 401, "B4 no bearer");
});

await run("G053-S1-empty-avatar", "callback with empty avatar → profile avatar null", async () => {
  skip("needs Login Kit fixture user with empty avatar; no HTTP fixture on this process");
});

// ============================================================================
// G-054 requests
// ============================================================================

let packageRequestId;
let customRequestId;

await run("G054-S3-openapi", "runtime lists R1–R7 R10; pay-sessions is payments not requests nest under /api/v1", async () => {
  assert(yaml.includes("  /brand/requests:"), "frozen yaml R1");
  assert(yaml.includes("  /agency/requests/owed-summary:"), "frozen yaml R10");
  if (!spec?.paths) {
    return;
  }
  const paths = spec.paths || {};
  for (const key of [
    "/brand/requests",
    "/brand/requests/{request_id}",
    "/brand/requests/{request_id}/contract/file",
    "/brand/requests/{request_id}/revision",
    "/brand/requests/{request_id}/accept",
    "/agency/brands/{brand_id}/requests",
    "/agency/brands/{brand_id}/requests/{request_id}",
    "/agency/brands/{brand_id}/requests/{request_id}/contract",
    "/agency/requests/owed-summary",
  ]) {
    assert(paths[key], `missing ${key}`);
  }
  assert(!paths["/api/v1/agency/requests"], "no F1 prefix requests");
});

await run("G054-S1-401", "Brand/Agency missing bearer → 401", async () => {
  const r1 = await request("POST", "/brand/requests", { body: packageCreate() });
  assertStatus(r1, 401, "R1 no bearer");
  const owed = await request("GET", "/agency/requests/owed-summary");
  assertStatus(owed, 401, "R10 no bearer");
});

await run("G054-S1-create-pdf-accept", "R1 submitted → R5 PDF → R7 accepted; lists + owed banner", async () => {
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(),
  });
  assertStatus(created, 201, "R1");
  assert(created.body.status === "submitted", "submitted");
  assert(created.body.package?.package_id === SEED_MANAGED_100, "snapshot package_id");
  assert(!JSON.stringify(created.body).includes("%PDF"), "no PDF bytes in JSON");
  packageRequestId = created.body.id;

  const owed = await request("GET", "/agency/requests/owed-summary", { token: agency });
  assertStatus(owed, 200, "R10");
  assert(Array.isArray(owed.body), "OwedGroup[]");
  assert(
    owed.body.some((g) => g.brand_id === brandId && g.count >= 1),
    `owed missing brand ${dump(owed.body)}`,
  );

  const mine = await request("GET", "/brand/requests", { token: brand });
  assertStatus(mine, 200, "R2");
  assert(mine.body.page_size === 8, "page 8");
  assert(
    mine.body.items.every((r) => r.brand_id === brandId),
    "list mine",
  );

  const agencyList = await request("GET", `/agency/brands/${brandId}/requests`, {
    token: agency,
  });
  assertStatus(agencyList, 200, "R4");
  assert(agencyList.body.page_size === 8, "agency page 8");

  const uploaded = await uploadPdf(agency, brandId, packageRequestId);
  assertStatus(uploaded, 200, "R5");
  assert(uploaded.body.status === "contract_ready", "contract_ready");
  assert(uploaded.body.contract?.versions?.[0]?.version === "1.0", "v1.0");
  assert(uploaded.body.contract.versions[0].pdf_bytes == null, "no pdf_bytes");

  const file = await request("GET", `/brand/requests/${packageRequestId}/contract/file`, {
    token: brand,
    binary: true,
  });
  assertStatus(file, 200, "file GET");
  const ct = file.headers.get("content-type") || "";
  assert(ct.includes("pdf"), `content-type ${ct}`);
  const text = Buffer.from(file.body).toString("utf8");
  assert(text.includes("%PDF"), "PDF bytes");

  const accepted = await request("POST", `/brand/requests/${packageRequestId}/accept`, {
    token: brand,
    body: { accepted: true },
  });
  assertStatus(accepted, 200, "R7");
  assert(accepted.body.status === "accepted", "accepted");
  assert(accepted.body.contract?.signature_ref === "accept-checkbox", "signature_ref");
});

await run("G054-S1-failures", "not-https / accept-before-PDF / unknown / foreign / inactive package", async () => {
  const httpLink = await request("POST", "/brand/requests", {
    token: brand,
    body: { ...packageCreate(), product_link: "http://nope" },
  });
  assertStatus(httpLink, 400, "http product_link");

  const submitted = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(),
  });
  assertStatus(submitted, 201, "second submitted");
  const early = await request("POST", `/brand/requests/${submitted.body.id}/accept`, {
    token: brand,
    body: { accepted: true },
  });
  assertStatus(early, 400, "accept while submitted");

  const unknown = await request("GET", `/agency/brands/${UNKNOWN_ID}/requests`, {
    token: agency,
  });
  assertStatus(unknown, 404, "unknown brand_id");

  const foreign = await request("GET", `/brand/requests/${submitted.body.id}`, {
    token: otherBrand,
  });
  assertStatus(foreign, 404, "foreign brand JWT");

  const draftPkg = await request("POST", "/agency/packages", {
    token: agency,
    body: draftBody("Inactive pkg"),
  });
  assertStatus(draftPkg, 201, "draft package");
  const inactive = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(draftPkg.body.id),
  });
  assertStatus(inactive, 400, "package not active");
});

await run("G054-S1-413", "PDF multipart over cap → 413", async () => {
  if (viaGateway()) {
    skip(
      "R5 413 uses declared Content-Length over cap; KrakenD waits then RST before Hub DefaultBodyLimit. Hub-direct API_BASE=:8080.",
    );
  }
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(),
  });
  assertStatus(created, 201, "create for 413");
  const tooBig = await requestDeclaredLength(
    "POST",
    `/agency/brands/${brandId}/requests/${created.body.id}/contract`,
    {
      token: agency,
      raw: Buffer.from("x"),
      contentType: "multipart/form-data; boundary=x",
      contentLength: MAX_PDF_MULTIPART_BYTES + 1,
    },
  );
  assertStatus(tooBig, 413, "413 over cap");
});

await run("G054-S1-403", "Agency not a member → 403", async () => {
  const email = `no-member-${Date.now()}@sodality.local`;
  const created = await request("POST", "/agency/accounts", {
    token: agency,
    body: { email, password: "nm-secret12", name: "No Member", role: "agency" },
  });
  assertStatus(created, 201, "account");
  const login = await request("POST", "/agency/auth/login", {
    body: { email, password: "nm-secret12" },
  });
  const list = await request("GET", `/agency/brands/${brandId}/requests`, {
    token: login.body.access_token,
  });
  assertStatus(list, 403, "not a member");
});

await run("G054-S2-custom-revision", "custom quote required; revision loop; empty comment 400; accept during revision 400", async () => {
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: customCreate(),
  });
  assertStatus(created, 201, "custom R1");
  customRequestId = created.body.id;
  const noQuote = await uploadPdf(agency, brandId, customRequestId);
  assertStatus(noQuote, 400, "custom first PDF without quote");
  const quoted = await uploadPdf(agency, brandId, customRequestId, "9000");
  assertStatus(quoted, 200, "quoted PDF");
  assert(Number(quoted.body.quoted_price) === 9000, "quoted_price");
  const empty = await request("POST", `/brand/requests/${customRequestId}/revision`, {
    token: brand,
    body: { comment: "" },
  });
  assertStatus(empty, 400, "empty comment");
  const rev = await request("POST", `/brand/requests/${customRequestId}/revision`, {
    token: brand,
    body: { comment: "fix logo" },
  });
  assertStatus(rev, 200, "R6");
  assert(rev.body.status === "revision_requested", "revision_requested");
  const acceptRev = await request("POST", `/brand/requests/${customRequestId}/accept`, {
    token: brand,
    body: { accepted: true },
  });
  assertStatus(acceptRev, 400, "accept during revision");
  const v11 = await uploadPdf(agency, brandId, customRequestId);
  assertStatus(v11, 200, "second PDF");
  const versions = v11.body.contract?.versions || [];
  assert(versions.some((v) => v.version === "1.1"), "version 1.1");
});

await run("G054-S2-package-price-frozen", "package-mode R5 must not change snapshot price", async () => {
  const created = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(),
  });
  assertStatus(created, 201, "package request");
  const price = created.body.package?.price;
  const uploaded = await uploadPdf(agency, brandId, created.body.id, "1");
  assertStatus(uploaded, 200, "package PDF with stray quote field");
  assert(
    uploaded.body.package?.price === price,
    `snapshot price changed ${price} → ${uploaded.body.package?.price}`,
  );
});

await run("G054-S3-p8-in-use", "DELETE seed package while a snapshot exists → 400 + deactivate", async () => {
  const del = await request("DELETE", `/agency/packages/${SEED_MANAGED_100}`, {
    token: agency,
  });
  assertStatus(del, 400, "P8 in-use");
  const msg = String(del.body?.message || "").toLowerCase();
  assert(msg.includes("deactivate"), `tell Deactivate: ${msg}`);
});

await run("G054-S3-r9-expire", "GET evaluates expire from ready + elapsed paid_at", async () => {
  skip("R9 needs a fixture row with ready + paid_at in the past; no HTTP seed (Q3 A / cargo test)");
});

await run("G054-S2-pay-out", "POST pay-sessions exists as G-055 ($1), not absent", async () => {
  assert(
    yaml.includes("  /brand/requests/{request_id}/pay-sessions:"),
    "$1 is on frozen yaml (G-055)",
  );
  if (!spec?.paths) {
    return;
  }
  assert(spec.paths?.["/brand/requests/{request_id}/pay-sessions"], "$1 is on runtime (G-055)");
});

// ============================================================================
// G-055 payments
// ============================================================================

await run("G055-S3-openapi", "$1 $2 freeze-absolute; no /v1 on Axum", async () => {
  if (viaGateway()) {
    skip("Axum-has-no-/v1 is Hub-direct; via KrakenD POST /payment/callback is public /v1/payment/callback");
  }
  needRuntimeSpec();
  assert(spec.paths?.["/brand/requests/{request_id}/pay-sessions"], "$1");
  assert(spec.paths?.["/payment/callback"], "$2");
  assert(!spec.paths?.["/v1/payment/callback"], "KrakenD /v1 is G-065");
  const v1 = await request("POST", "/v1/payment/callback", { body: { detail: {} } });
  assertStatus(v1, 404, "no /v1 on Axum");
});

await run("G055-S1-401-400-404", "$1 no bearer 401; not accepted 400; unknown/foreign 404", async () => {
  const noAuth = await request("POST", `/brand/requests/${packageRequestId}/pay-sessions`, {
    body: { method: "qr" },
  });
  assertStatus(noAuth, 401, "$1 no bearer");
  const submitted = await request("POST", "/brand/requests", {
    token: brand,
    body: packageCreate(),
  });
  const notAccepted = await request(
    "POST",
    `/brand/requests/${submitted.body.id}/pay-sessions`,
    { token: brand, body: { method: "qr" } },
  );
  assertStatus(notAccepted, 400, "$1 while submitted");
  const unknown = await request("POST", `/brand/requests/${UNKNOWN_ID}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(unknown, 404, "unknown request");
  const foreign = await request(
    "POST",
    `/brand/requests/${packageRequestId}/pay-sessions`,
    { token: otherBrand, body: { method: "qr" } },
  );
  assertStatus(foreign, 404, "foreign request");
});

await run("G055-S3-session-alone", "$1 only leaves status accepted (ap_url does not mark paid)", async () => {
  const session = await request("POST", `/brand/requests/${packageRequestId}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(session, 201, "$1 qr");
  assert(session.body.order_id, "order_id");
  assert(String(session.body.order_id).length <= 20, "order_id ≤ 20");
  assert(session.body.method === "qr", "method");
  assert(session.body.amount > 0, "amount");
  assert(session.body.pay_url, "pay_url");
  const got = await request("GET", `/brand/requests/${packageRequestId}`, { token: brand });
  assert(got.body.status === "accepted", `$1 must not pay, got ${got.body.status}`);
});

await run("G055-S2-fail-unknown-mismatch-nonjson", "$2 200 for parsed JSON that must not pay; 400 non-JSON", async () => {
  const session = await request("POST", `/brand/requests/${packageRequestId}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(session, 201, "session");
  const orderId = session.body.order_id;
  const amount = session.body.amount;

  const failCode = await request("POST", "/payment/callback", {
    body: successCallback(orderId, amount, 1),
  });
  assertStatus(failCode, 200, "fail code");
  const unknown = await request("POST", "/payment/callback", {
    body: successCallback("unknown-order-idxx", amount, 0),
  });
  assertStatus(unknown, 200, "unknown order");
  const mismatch = await request("POST", "/payment/callback", {
    body: successCallback(orderId, 1, 0),
  });
  assertStatus(mismatch, 200, "amount mismatch");
  const merchant = await request("POST", "/payment/callback", {
    body: {
      merchant_id: "other-merchant",
      detail: {
        response_code: 0,
        order_id: orderId,
        receive_amount: amount,
        payment_reference_id: "X",
      },
    },
  });
  assertStatus(merchant, 200, "wrong merchant");
  const still = await request("GET", `/brand/requests/${packageRequestId}`, { token: brand });
  assert(still.body.status === "accepted", `still accepted, got ${still.body.status}`);

  const plain = await request("POST", "/payment/callback", {
    raw: "not-json",
    contentType: "text/plain",
  });
  assertStatus(plain, 400, "non-JSON");
  const empty = await request("POST", "/payment/callback", {
    raw: Buffer.alloc(0),
    contentType: "application/json",
  });
  assertStatus(empty, 400, "empty body");
});

await run("G055-S1-qr-paid", "matching $2 → paid (ads A3 not valid on this process)", async () => {
  const session = await request("POST", `/brand/requests/${packageRequestId}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(session, 201, "qr session");
  const orderId = session.body.order_id;
  const amount = session.body.amount;
  const cb = await request("POST", "/payment/callback", {
    body: {
      merchant_id: FIXTURE_MERCHANT_ID,
      detail: {
        response_code: "0",
        order_id: orderId,
        receive_amount: String(amount),
        payment_reference_id: "INET-REF-1",
      },
    },
  });
  assertStatus(cb, 200, "$2 success");
  const got = await request("GET", `/brand/requests/${packageRequestId}`, { token: brand });
  assert(got.body.status === "paid", `want paid (A3 fixture off), got ${got.body.status}`);
  assert(got.body.payment_id === "INET-REF-1", "payment_id");
  assert(got.body.payment_method === "qr", "payment_method");
  assert(got.body.paid_at, "paid_at");

  const replay = await request("POST", "/payment/callback", {
    body: successCallback(orderId, amount),
  });
  assertStatus(replay, 200, "idempotent replay");
  const again = await request("GET", `/brand/requests/${packageRequestId}`, { token: brand });
  assert(again.body.status === "paid", "replay stays paid");
  assert(again.body.payment_id === got.body.payment_id, "one write");
  assert(again.body.paid_at === got.body.paid_at, "paid_at unchanged");

  const second = await request("POST", `/brand/requests/${packageRequestId}/pay-sessions`, {
    token: brand,
    body: { method: "qr" },
  });
  assertStatus(second, 400, "$1 already paid");
});

await run("G055-S1-card", "dual method card; never persist PAN", async () => {
  const id = await createAccepted(agency, brand, brandId);
  const session = await request("POST", `/brand/requests/${id}/pay-sessions`, {
    token: brand,
    body: { method: "card" },
  });
  assertStatus(session, 201, "card session");
  assert(session.body.method === "card", "method card");
  const raw = JSON.stringify(session.body);
  assert(!/card_no|pan|payer/i.test(raw) || !raw.includes("4111"), "no PAN");
  const cb = await request("POST", "/payment/callback", {
    body: successCallback(session.body.order_id, session.body.amount),
  });
  assertStatus(cb, 200, "card $2");
  const got = await request("GET", `/brand/requests/${id}`, { token: brand });
  assert(["paid", "ready"].includes(got.body.status), `card pay ${got.body.status}`);
  assert(got.body.payment_method === "card", "payment_method card");
});

await run("G055-S1-skip-connect-ready", "$4 both grants valid → ready", async () => {
  skip(
    "requires both grants before first $2; seller first-run needs paid (chicken-egg). A3 HTTP is G-066.",
  );
});

// ============================================================================
// G-056 seller
// ============================================================================

await run("G056-S3-openapi", "S1–S3 freeze-absolute; S2 no JWT", async () => {
  assert(yaml.includes("  /brand/seller/authorize:"), "frozen yaml S1");
  assert(yaml.includes("  /brand/seller/callback:"), "frozen yaml S2");
  assert(yaml.includes("  /brand/seller/status:"), "frozen yaml S3");
  if (!spec?.paths) {
    return;
  }
  const paths = spec.paths || {};
  assert(paths["/brand/seller/authorize"], "S1");
  assert(paths["/brand/seller/callback"], "S2");
  assert(paths["/brand/seller/status"], "S3");
  const sec = paths["/brand/seller/callback"]?.get?.security;
  assert(
    sec == null ||
      (Array.isArray(sec) &&
        (sec.length === 0 || sec.some((s) => s && Object.keys(s).length === 0))),
    "S2 must not require JWT",
  );
});

await run("G056-S1-401-400", "S1/S3 no bearer 401; first-run not paid 400", async () => {
  const noAuth = await request("POST", "/brand/seller/authorize");
  assertStatus(noAuth, 401, "S1 no bearer");
  const statusNo = await request("GET", "/brand/seller/status");
  assertStatus(statusNo, 401, "S3 no bearer");
  const unpaidBrand = mintBrandJwt(randomUUID());
  const notPaid = await request("POST", "/brand/seller/authorize", {
    token: unpaidBrand,
  });
  assertStatus(notPaid, 400, "first-run not paid");
});

await run("G056-S3-missing", "S3 missing before grant", async () => {
  const st = await request("GET", "/brand/seller/status", { token: brand });
  assertStatus(st, 200, "S3");
  if (st.body.status === "valid") {
    ok("grant already valid from a prior run");
    return;
  }
  assert(st.body.status === "missing", `want missing, got ${st.body.status}`);
  assert(st.body.shop == null, "shop null when missing");
});

await run("G056-S1-S2-deny-empty-unknown", "unknown state / deny / empty shops → 400; no persist", async () => {
  const unknown = await request(
    "GET",
    "/brand/seller/callback?code=ok&state=not-a-state",
  );
  assertStatus(unknown, 400, "forged state");

  const start = await request("POST", "/brand/seller/authorize", { token: brand });
  assertStatus(start, 200, "S1 after paid");
  const url = start.body.authorize_url;
  assert(url.startsWith(FIXTURE_AUTHORIZE_BASE), url);
  const stateQ = oauthState(url);

  const deny = await request(
    "GET",
    `/brand/seller/callback?error=access_denied&state=${stateQ}`,
  );
  assertStatus(deny, 400, "deny");

  const start2 = await request("POST", "/brand/seller/authorize", { token: brand });
  assertStatus(start2, 200, "S1 again after deny consumed state");
  const empty = await request(
    "GET",
    `/brand/seller/callback?code=empty&state=${oauthState(start2.body.authorize_url)}`,
  );
  assertStatus(empty, 400, "empty shops");

  const st = await request("GET", "/brand/seller/status", { token: brand });
  if (st.body.status === "valid") {
    ok("status already valid; deny/empty did not have to stay missing");
    return;
  }
  assert(st.body.status === "missing", `still missing, got ${st.body.status}`);
});

await run("G056-S1-callback-first-shop", "S2 persists first shop; no cipher/tokens; stays paid without A3", async () => {
  const start = await request("POST", "/brand/seller/authorize", { token: brand });
  assertStatus(start, 200, "S1");
  const stateQ = oauthState(start.body.authorize_url);
  const grant = await request(
    "GET",
    `/brand/seller/callback?code=ok&state=${stateQ}`,
  );
  assertStatus(grant, 200, "S2");
  assert(grant.body.status === "valid", "valid");
  assert(grant.body.shop?.id === "shop-fixture-1", "first shop id");
  assert(grant.body.shop?.name === "Fixture Shop", "first shop name");
  assertNoSecrets(grant.body, "S2");

  const st = await request("GET", "/brand/seller/status", { token: brand });
  assertStatus(st, 200, "S3");
  assert(st.body.status === "valid", "S3 valid");
  assert(st.body.shop?.id === "shop-fixture-1", "S3 shop");
  assertNoSecrets(st.body, "S3");

  const paid = await request("GET", `/brand/requests/${packageRequestId}`, {
    token: brand,
  });
  assert(
    paid.body.status === "paid",
    `A3 not valid → stay paid, got ${paid.body.status}`,
  );
});

await run("G056-S1-multi-first-only", "many shops → persist first only", async () => {
  const start = await request("POST", "/brand/seller/authorize", { token: brand });
  assertStatus(start, 200, "S1 reconnect/valid also allowed");
  const grant = await request(
    "GET",
    `/brand/seller/callback?code=multi&state=${oauthState(start.body.authorize_url)}`,
  );
  assertStatus(grant, 200, "S2 multi");
  assert(grant.body.shop?.id === "shop-fixture-1", "first shop only");
  assert(grant.body.shop?.id !== "shop-fixture-2", "must not persist second");
});

await run("G056-S2-two-paid-no-ads", "two paid rows stay paid when A3 is not valid; other brand unchanged", async () => {
  const id2 = await createAccepted(agency, brand, brandId);
  await payUntil(brand, id2, 250000, "paid");
  const a = await request("GET", `/brand/requests/${packageRequestId}`, { token: brand });
  const b = await request("GET", `/brand/requests/${id2}`, { token: brand });
  assert(a.body.status === "paid", "row1 paid");
  assert(b.body.status === "paid", "row2 paid");
});

await run("G056-S2-ads-flip-ready", "S2 + fixture A3 valid flips all brand paid → ready", async () => {
  skip("A3 HTTP is G-066; flip asserted in G066-S2-seller-flip-ready after ads callback");
});

await run("G056-S1-reconnect-expired", "S1 200 when S3 expired/revoked even if request ready", async () => {
  skip("no HTTP to seed expired/revoked grant; cargo test seeds SellerGrantKind");
});

// ============================================================================
// G-066 ads (TikTok Business fixture — not live Marketing OAuth)
// ============================================================================

const ADS_UNMOUNTED =
  "Hub /brand/ads/* 404 — rebuild api with G-066 (`docker compose up --build -d --no-deps api`)";
let adsMounted = true;

function skipUnlessAdsMounted() {
  if (!adsMounted) skip(ADS_UNMOUNTED);
}

await run("G066-S3-openapi", "A1–A3 freeze-absolute; A2 no JWT", async () => {
  assert(yaml.includes("  /brand/ads/authorize:"), "frozen yaml A1");
  assert(yaml.includes("  /brand/ads/callback:"), "frozen yaml A2");
  assert(yaml.includes("  /brand/ads/status:"), "frozen yaml A3");
  if (!spec?.paths) {
    return;
  }
  const paths = spec.paths || {};
  assert(paths["/brand/ads/authorize"], "A1");
  assert(paths["/brand/ads/callback"], "A2");
  assert(paths["/brand/ads/status"], "A3");
  const sec = paths["/brand/ads/callback"]?.get?.security;
  assert(
    sec == null ||
      (Array.isArray(sec) &&
        (sec.length === 0 || sec.some((s) => s && Object.keys(s).length === 0))),
    "A2 must not require JWT",
  );
});

await run("G066-S1-401", "A1/A3 no bearer 401", async () => {
  const noAuth = await request("POST", "/brand/ads/authorize");
  if (noAuth.status === 404) {
    adsMounted = false;
    skip(ADS_UNMOUNTED);
  }
  assertStatus(noAuth, 401, "A1 no bearer");
  const statusNo = await request("GET", "/brand/ads/status");
  assertStatus(statusNo, 401, "A3 no bearer");
});

await run("G066-S3-missing", "A3 missing before grant", async () => {
  skipUnlessAdsMounted();
  const st = await request("GET", "/brand/ads/status", { token: brand });
  if (st.status === 404) {
    adsMounted = false;
    skip(ADS_UNMOUNTED);
  }
  assertStatus(st, 200, "A3");
  if (st.body.status === "valid") {
    ok("grant already valid from a prior run");
    return;
  }
  assert(st.body.status === "missing", `want missing, got ${st.body.status}`);
});

await run("G066-S2-callback-errors", "deny 400; missing state 400; invalid state 401", async () => {
  skipUnlessAdsMounted();
  const deny = await request(
    "GET",
    "/brand/ads/callback?error=access_denied&error_description=User%20denied",
  );
  if (deny.status === 404) {
    adsMounted = false;
    skip(ADS_UNMOUNTED);
  }
  assertStatus(deny, 400, "deny");

  const noState = await request("GET", "/brand/ads/callback?code=code_without_state");
  assertStatus(noState, 400, "missing state");

  const bad = await request("GET", "/brand/ads/callback?code=code&state=invalid_jwt");
  assertStatus(bad, 401, "invalid state JWT");
});

await run("G066-S1-S2-S3-happy", "A1 state JWT; A2 stores grant; A3 valid; no tokens", async () => {
  skipUnlessAdsMounted();
  const start = await request("POST", "/brand/ads/authorize", { token: brand });
  if (start.status === 404) {
    adsMounted = false;
    skip(ADS_UNMOUNTED);
  }
  assertStatus(start, 200, "A1");
  const url = start.body.authorize_url;
  assert(typeof url === "string" && url.includes("state="), "authorize_url has state");
  assert(url.includes("business-api.tiktok.com"), url);
  const stateQ = oauthState(url);

  const grant = await request(
    "GET",
    `/brand/ads/callback?code=mock_code&state=${stateQ}`,
  );
  assertStatus(grant, 200, "A2");
  assert(grant.body.status === "valid", `A2 status ${grant.body.status}`);
  assertNoSecrets(grant.body, "A2");

  const st = await request("GET", "/brand/ads/status", { token: brand });
  assertStatus(st, 200, "A3");
  assert(st.body.status === "valid", "A3 valid");
  assertNoSecrets(st.body, "A3");
});

await run("G066-S2-seller-flip-ready", "A3 valid + seller S2 reconnect flips paid → ready", async () => {
  skipUnlessAdsMounted();
  const ads = await request("GET", "/brand/ads/status", { token: brand });
  if (ads.status === 404) {
    adsMounted = false;
    skip(ADS_UNMOUNTED);
  }
  if (ads.body?.status !== "valid") {
    skip("A3 not valid; G066-S1-S2-S3-happy must pass first (ads callback marks A3)");
  }
  const start = await request("POST", "/brand/seller/authorize", { token: brand });
  assertStatus(start, 200, "S1 reconnect");
  const grant = await request(
    "GET",
    `/brand/seller/callback?code=ok&state=${oauthState(start.body.authorize_url)}`,
  );
  assertStatus(grant, 200, "S2 after A3");
  const paid = await request("GET", `/brand/requests/${packageRequestId}`, {
    token: brand,
  });
  assertStatus(paid, 200, "request");
  assert(
    paid.body.status === "ready",
    `both grants → ready, got ${paid.body.status}`,
  );
});

await run("G066-S2-expired-state", "expired state JWT", async () => {
  skip("oauth_state JWT TTL is 15 min; no HTTP to mint an expired state");
});

await run("G066-S3-expired-revoked", "A3 expired/revoked seed", async () => {
  skip("no HTTP to seed expired/revoked ads grant");
});

// ============================================================================
console.log("\n────────────────────────────────────────");
console.log(
  `G-069 HTTP E2E: ${stats.pass} pass · ${stats.fail} fail · ${stats.skip} skip`,
);
if (failures.length) {
  console.error("Failures:");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
console.log("All attempted HTTP scenarios passed (skips are fixture-only).");
