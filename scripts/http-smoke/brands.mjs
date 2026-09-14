#!/usr/bin/env node
/**
 * G-026 — Agency brands HTTP smoke (curl-style).
 *
 * Prerequisite: API already running.
 *   cd code
 *   cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/brands.mjs
 *
 * `cargo run` without GOTRUE_URL uses an empty in-memory catalog (tests seed).
 * With G-040 GoTrue + Postgres, bootstrap Agency is seeded (G-041) so GET /brands
 * is non-empty; empty membership is a second Agency with no membership row.
 * Membership isolation (403) stays in `cargo test --test brands_api`.
 *
 * Optional env: API_BASE, API_BIND, AGENCY_BOOTSTRAP_EMAIL, AGENCY_BOOTSTRAP_PASSWORD
 */
import {
  EMAIL,
  PASSWORD,
  assertBrand,
  assertError,
  fail,
  frozenYaml,
  ok,
  request,
  requireApi,
  step,
} from "./lib.mjs";

const yaml = frozenYaml();
if (!yaml.includes("version: 1.2.0")) fail("frozen OpenAPI must be v1.2.0");
if (!yaml.includes("  /brands:")) fail("frozen yaml missing GET /brands");
if (!yaml.includes("  /brands/{brand_id}/campaigns:")) {
  fail("frozen yaml missing brand-scoped campaigns");
}
if (yaml.includes("/brands/select")) fail("frozen yaml must not define /brands/select");
ok("frozen OpenAPI v1.2.0 brands tag present (no session-select)");

await requireApi();

step("GET /openapi.json brands paths");
const spec = (await request("GET", "/openapi.json", { expect: 200 })).body;
if (spec.info?.version !== "1.2.0") fail(`runtime version ${spec.info?.version}`);
for (const key of ["/brands", "/brands/{brand_id}/campaigns", "/auth/login"]) {
  if (!spec.paths?.[key]) fail(`runtime openapi missing ${key}`);
}
if (Object.keys(spec.paths || {}).some((k) => k.includes("select"))) {
  fail("runtime must not export a select/switch path");
}
if (!spec.components?.schemas?.Brand) fail("runtime Brand schema missing");
ok("runtime OpenAPI v1.2.0 includes brands");

step("GET /brands without bearer");
{
  const { body } = await request("GET", "/api/v1/agency/brands", { expect: 401 });
  assertError(body, "UNAUTHORIZED");
}

step("POST /auth/login");
const login = (
  await request("POST", "/api/v1/agency/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
    expect: 200,
  })
).body;
const jwt = login.access_token;
if (!jwt || jwt.split(".").length !== 3) fail("access_token must be a JWT");
if (login.user?.role !== "agency") fail("login user.role must be agency");
ok("Agency JWT role=agency");

step("GET /brands (bootstrap membership)");
{
  const { body } = await request("GET", "/api/v1/agency/brands", {
    token: jwt,
    expect: 200,
  });
  if (!Array.isArray(body)) fail(`Brand[] expected, got ${JSON.stringify(body)}`);
  for (const brand of body) assertBrand(brand);
  const gotrue = process.env.GOTRUE_URL && process.env.GOTRUE_URL.trim();
  if (gotrue) {
    if (body.length < 1) {
      fail("bootstrap Agency should see seeded membership when GOTRUE_URL is set (G-041)");
    }
    ok(`${body.length} Brand object(s) for bootstrap (Postgres seed)`);
    const ids = body.map((b) => b.id);
    for (const id of [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ]) {
      if (!ids.includes(id)) fail(`seeded brand ${id} missing from GET /brands`);
    }
    ok("stable seed brand ids present (survive API restart)");
  } else {
    ok(`${body.length} Brand object(s) — [] when identity is in-memory (no durable seed)`);
  }
}

if (process.env.GOTRUE_URL && process.env.GOTRUE_URL.trim()) {
  step("GET /brands empty membership (other Agency, no seed row)");
  const emptyEmail = `empty-member-${Date.now()}@sodality.local`;
  const created = (
    await request("POST", "/api/v1/agency/accounts", {
      token: jwt,
      body: {
        email: emptyEmail,
        password: "empty-secret",
        name: "Empty Member",
        role: "agency",
      },
      expect: 201,
    })
  ).body;
  if (created.email !== emptyEmail) fail("created empty-membership user mismatch");
  const emptyLogin = (
    await request("POST", "/api/v1/agency/auth/login", {
      body: { email: emptyEmail, password: "empty-secret" },
      expect: 200,
    })
  ).body;
  const { body } = await request("GET", "/api/v1/agency/brands", {
    token: emptyLogin.access_token,
    expect: 200,
  });
  if (!Array.isArray(body) || body.length !== 0) {
    fail(`empty membership expected [], got ${JSON.stringify(body)}`);
  }
  ok("Agency without membership row gets []");
}

step("GET /brands/{brand_id}/campaigns unknown uuid");
{
  const { body } = await request(
    "GET",
    "/api/v1/agency/brands/dddddddd-dddd-4ddd-8ddd-dddddddddddd/campaigns",
    { token: jwt, expect: 404 },
  );
  assertError(body, "NOT_FOUND");
}

step("GET /brands/{brand_id}/campaigns invalid uuid");
{
  const { body } = await request(
    "GET",
    "/api/v1/agency/brands/not-a-uuid/campaigns",
    { token: jwt, expect: 400 },
  );
  assertError(body, "VALIDATION_ERROR");
}

step("POST /brands/select (must not exist)");
await request("POST", "/api/v1/agency/brands/select", {
  token: jwt,
  body: { brand_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  expect: 404,
});

console.log("\nG-026 HTTP smoke passed against running API (OpenAPI v1.2.0)");
console.log("Note: 403 isolation is covered by `cd code && cargo test --test brands_api`");
