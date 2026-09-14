#!/usr/bin/env node
/**
 * G-100 — Feature 5 Creator Auth HTTP Smoke (CA1–CA3).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/creator-auth.mjs
 *
 * Checks:
 *   CA1: Creator POST /creator/auth/line-liff (public token exchange)
 *   CA2: Creator GET /creator/auth/me (creatorBearer session hydration)
 *   CA3: Creator POST /creator/auth/logout (creatorBearer logout & session revocation)
 *
 * Reuses scripts/http-smoke/lib.mjs.
 */
import {
  assertError,
  fail,
  ok,
  request,
  requireApi,
  step,
} from "./lib.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

// 1. Verify frozen yaml exists and contains creator-auth CA1-CA3
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f5-creator-entry.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F5 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: creator-auth")) {
  fail("Frozen F5 yaml missing creator-auth tag");
}
if (!frozenYaml.includes("/creator/auth/line-liff:")) {
  fail("Frozen F5 yaml missing CA1 line-liff path");
}
if (!frozenYaml.includes("/creator/auth/me:")) {
  fail("Frozen F5 yaml missing CA2 me path");
}
if (!frozenYaml.includes("/creator/auth/logout:")) {
  fail("Frozen F5 yaml missing CA3 logout path");
}
ok("Frozen OpenAPI F5 creator-entry yaml verified for creator-auth (G-092 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json creator-auth paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;
if (!spec.paths?.["/creator/auth/line-liff"]) {
  fail("Runtime OpenAPI missing CA1 line-liff path");
}
if (!spec.paths?.["/creator/auth/me"]) {
  fail("Runtime OpenAPI missing CA2 me path");
}
if (!spec.paths?.["/creator/auth/logout"]) {
  fail("Runtime OpenAPI missing CA3 logout path");
}
if (!spec.components?.schemas?.CreatorAuthSession) {
  fail("Runtime OpenAPI missing CreatorAuthSession schema");
}
if (!spec.components?.schemas?.CreatorSummary) {
  fail("Runtime OpenAPI missing CreatorSummary schema");
}
ok("Runtime OpenAPI export includes creator-auth CA1–CA3");

// 3. Test CA1 validation with empty body -> 400
step("CA1 validation with empty body -> 400 Bad Request");
{
  const { body } = await request("POST", "/creator/auth/line-liff", {
    body: {},
    expect: 400,
  });
  assertError(body, "VALIDATION_ERROR");
  ok("CA1 rejects empty payload with 400 VALIDATION_ERROR");
}

// 4. Test CA2 without auth -> 401
step("CA2 GET /creator/auth/me without token -> 401 Unauthorized");
{
  const { body } = await request("GET", "/creator/auth/me", {
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
  ok("CA2 rejects unauthenticated me request with 401");
}

// 5. Test CA1 exchange happy path
step("CA1 exchange LINE LIFF token -> 200 OK with CreatorAuthSession");
let session;
{
  const res = await request("POST", "/creator/auth/line-liff", {
    body: {
      id_token: "line_U1234567890_Mali-Creator",
    },
    expect: 200,
  });
  session = res.body;
  if (!session.access_token) fail("CreatorAuthSession missing access_token");
  if (session.token_type !== "Bearer") fail(`token_type must be Bearer, got ${session.token_type}`);
  if (session.creator?.line_user_id !== "U1234567890") {
    fail(`creator.line_user_id must be U1234567890, got ${session.creator?.line_user_id}`);
  }
  ok("CA1 successfully exchanged LINE LIFF token for Creator JWT session");
}

// 6. Test CA2 session profile hydration
step("CA2 GET /creator/auth/me with creatorBearer -> 200 OK");
{
  const res = await request("GET", "/creator/auth/me", {
    token: session.access_token,
    expect: 200,
  });
  const creator = res.body;
  if (creator.id !== session.creator.id) {
    fail(`Creator id mismatch: ${creator.id} vs ${session.creator.id}`);
  }
  if (creator.display_name !== "Mali Creator") {
    fail(`Display name mismatch: ${creator.display_name}`);
  }
  ok("CA2 successfully returned authenticated Creator profile");
}

// 7. Test CA3 logout & session revocation
step("CA3 POST /creator/auth/logout with creatorBearer -> 200 OK");
{
  const res = await request("POST", "/creator/auth/logout", {
    token: session.access_token,
    expect: 200,
  });
  if (res.body?.ok !== true) fail("Logout response ok must be true");
  ok("CA3 logout returned { ok: true }");
}

// 8. Test post-logout CA2 -> 401 Unauthorized
step("CA2 GET /creator/auth/me with revoked token -> 401 Unauthorized");
{
  const { body } = await request("GET", "/creator/auth/me", {
    token: session.access_token,
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
  ok("Post-logout CA2 confirmed token revocation with 401 UNAUTHORIZED");
}

ok("HTTP Smoke for creator-auth (G-100) verified all gateway, auth, and revocation contracts!");
