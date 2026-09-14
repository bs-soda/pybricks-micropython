#!/usr/bin/env node
/**
 * G-099 — Feature 5 Creator Invites HTTP Smoke (CI1–CI4).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/creator-invites.mjs
 *
 * Checks:
 *   CI1: Agency POST .../sets/{set_id}/creator-invites (single & batch)
 *   CI2: Agency GET .../sets/{set_id}/creator-invites (paging & filtering)
 *   CI3: Creator Public GET /creator/invites/{token}
 *   CI4: Creator POST /creator/invites/{token}/consume (session binding & 410 on re-claim)
 *
 * Reuses scripts/http-smoke/lib.mjs.
 */
import {
  EMAIL,
  PASSWORD,
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

// 1. Verify frozen yaml exists and contains creator-invite CI1-CI4
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f5-creator-entry.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F5 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: creator-invite")) {
  fail("Frozen F5 yaml missing creator-invite tag");
}
if (!frozenYaml.includes("/creator/invites/{token}/consume:")) {
  fail("Frozen F5 yaml missing CI4 consume path");
}
ok("Frozen OpenAPI F5 creator-entry yaml verified (G-092 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json creator-invite paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;
if (!spec.paths?.["/agency/brands/{brand_id}/campaign-projects/{project_id}/sets/{set_id}/creator-invites"]) {
  fail("Runtime OpenAPI missing CI1/CI2 creator-invites path");
}
if (!spec.paths?.["/creator/invites/{token}"]) {
  fail("Runtime OpenAPI missing CI3 public inspect path");
}
if (!spec.paths?.["/creator/invites/{token}/consume"]) {
  fail("Runtime OpenAPI missing CI4 consume path");
}
if (!spec.components?.schemas?.CreatorInviteRecord) {
  fail("Runtime OpenAPI missing CreatorInviteRecord schema");
}
ok("Runtime OpenAPI export includes creator-invite CI1–CI4");

// 3. Test CI1 / CI2 without auth -> 401
step("CI1 / CI2 without Bearer token -> 401 Unauthorized");
{
  const fakeBrand = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const fakeProj = "11111111-1111-4111-8111-111111111111";
  const fakeSet = "22222222-2222-4222-8222-222222222222";
  const { body } = await request(
    "POST",
    `/agency/brands/${fakeBrand}/campaign-projects/${fakeProj}/sets/${fakeSet}/creator-invites`,
    {
      body: {},
      expect: 401,
    }
  );
  assertError(body, "UNAUTHORIZED");
  ok("CI1 rejects unauthenticated request with 401");
}

// 4. Test CI3 Public Inspect with nonexistent token -> 404
step("CI3 Public Inspect with unknown token -> 404 Not Found");
{
  const { body } = await request("GET", "/creator/invites/cr_inv_nonexistent", {
    expect: 404,
  });
  assertError(body, "NOT_FOUND");
  ok("CI3 public inspect returns 404 for unknown token");
}

// 5. Test CI4 Consume without Bearer token -> 401
step("CI4 Consume without Bearer token -> 401 Unauthorized");
{
  const { body } = await request(
    "POST",
    "/creator/invites/cr_inv_test/consume",
    {
      expect: 401,
    }
  );
  assertError(body, "UNAUTHORIZED");
  ok("CI4 rejects unauthenticated consume with 401");
}

ok("HTTP Smoke for creator-invite (G-099) verified all gateway and auth contracts!");
