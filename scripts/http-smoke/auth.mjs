#!/usr/bin/env node
/**
 * G-025 / G-040 — Agency auth HTTP smoke (curl-style).
 *
 * Prerequisite: API already running.
 *   cd code
 *   cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/auth.mjs
 *
 * Optional env: API_BASE, API_BIND, AGENCY_BOOTSTRAP_EMAIL, AGENCY_BOOTSTRAP_PASSWORD
 */
import { randomUUID } from "node:crypto";
import {
  EMAIL,
  PASSWORD,
  assertError,
  assertSession,
  assertUser,
  fail,
  frozenYaml,
  jwtPayload,
  ok,
  request,
  requireApi,
  step,
} from "./lib.mjs";

const yaml = frozenYaml();
if (!yaml.includes("version: 1.2.0")) fail("frozen OpenAPI must be v1.2.0");
for (const marker of ["/auth/login", "/auth/logout", "/auth/me", "/accounts"]) {
  if (!yaml.includes(marker)) fail(`frozen yaml missing ${marker}`);
}
ok("frozen OpenAPI v1.2.0 auth+accounts present");

await requireApi();

step("GET /openapi.json schemas");
const spec = (await request("GET", "/openapi.json", { expect: 200 })).body;
if (spec.info?.version !== "1.2.0") fail(`runtime version ${spec.info?.version}`);
for (const key of ["/auth/login", "/auth/logout", "/auth/me", "/accounts"]) {
  if (!spec.paths?.[key]) fail(`runtime openapi missing ${key}`);
}
ok("runtime OpenAPI v1.2.0 auth+accounts OK");

step("GET /auth/me without bearer");
{
  const { body } = await request("GET", "/api/v1/agency/auth/me", { expect: 401 });
  assertError(body, "UNAUTHORIZED");
}

step("GET /auth/me with junk token");
{
  const { body } = await request("GET", "/api/v1/agency/auth/me", {
    token: "not-a-jwt",
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
}

step("POST /auth/login wrong password");
{
  const { body } = await request("POST", "/api/v1/agency/auth/login", {
    body: { email: EMAIL, password: "wrong-password" },
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
}

step("POST /auth/login missing password");
{
  const { body } = await request("POST", "/api/v1/agency/auth/login", {
    body: { email: EMAIL },
    expect: 400,
  });
  assertError(body, "VALIDATION_ERROR");
}

step("POST /auth/login");
const login = (
  await request("POST", "/api/v1/agency/auth/login", {
    body: { email: EMAIL, password: PASSWORD },
    expect: 200,
  })
).body;
assertSession(login);
if (login.user.role !== "agency") fail("login user.role must be agency");
if (login.user.email !== EMAIL) fail("login email mismatch");
const adminJwt = login.access_token;
const payload = jwtPayload(adminJwt);
if (!payload.sub) fail("jwt.sub missing");
const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
if (payload.iss && aud.includes("authenticated") && payload.token_use == null) {
  ok(`GoTrue JWT iss=${payload.iss} aud=authenticated sub=${payload.sub}`);
} else {
  ok("in-memory JWT (3-part) role=agency");
}

step("GET /auth/me with JWT");
{
  const { body } = await request("GET", "/api/v1/agency/auth/me", {
    token: adminJwt,
    expect: 200,
  });
  assertUser(body);
  if (body.id !== login.user.id) fail("/auth/me id mismatch");
  if (body.email !== EMAIL) fail("/auth/me email mismatch");
}

step("POST /accounts without bearer");
{
  const { body } = await request("POST", "/api/v1/agency/accounts", {
    body: {
      email: "x@sodality.local",
      password: "secret12",
      name: "X",
      role: "agency",
    },
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
}

step("POST /accounts");
const newEmail = `smoke-${randomUUID()}@sodality.local`;
const created = (
  await request("POST", "/api/v1/agency/accounts", {
    token: adminJwt,
    body: {
      email: newEmail,
      password: "op-secret",
      name: "Smoke Teammate",
      role: "agency",
    },
    expect: 201,
  })
).body;
assertUser(created);
if (created.email !== newEmail || created.role !== "agency") fail("created user mismatch");

step("POST /auth/login as new account");
{
  const { body } = await request("POST", "/api/v1/agency/auth/login", {
    body: { email: newEmail, password: "op-secret" },
    expect: 200,
  });
  assertSession(body);
  if (body.user.id !== created.id) fail("new login id mismatch");
}

step("GET /accounts");
{
  const { body } = await request("GET", "/api/v1/agency/accounts", {
    token: adminJwt,
    expect: 200,
  });
  if (!Array.isArray(body) || body.length < 2) fail(`expected ≥2 users, got ${JSON.stringify(body)}`);
  for (const account of body) assertUser(account);
  ok(`${body.length} User objects`);
}

step("POST /auth/logout");
{
  const { body } = await request("POST", "/api/v1/agency/auth/logout", {
    token: adminJwt,
    expect: 204,
  });
  if (body !== null) fail("204 must have empty body");
}

step("GET /auth/me after logout");
{
  const { body } = await request("GET", "/api/v1/agency/auth/me", {
    token: adminJwt,
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
}

console.log("\nG-025/G-040 HTTP smoke passed — OpenAPI v1.2.0 against running API");
