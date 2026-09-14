#!/usr/bin/env node
/**
 * G-103 — Feature 6 Clips HTTP Smoke (C1–C5).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/clips.mjs
 *
 * Checks:
 *   C1: Creator POST /creator/campaigns/{set_id}/clips (submit clip)
 *   C2: Creator GET /creator/campaigns/{set_id}/clips (creator clips list)
 *   C3: Agency GET /agency/brands/{brand_id}/clips (moderation desk list)
 *   C4: Agency POST /agency/brands/{brand_id}/clips/{clip_id}/moderate (moderate clip)
 *   C5: Brand GET /brand/clips (approved brand clips)
 *
 * Reuses scripts/http-smoke/lib.mjs.
 */
import {
  assertError,
  fail,
  loginBrandFixture,
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

// 1. Verify frozen yaml exists and contains clips tag and C1-C5
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f6-sample-clip.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F6 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: clips")) {
  fail("Frozen F6 yaml missing clips tag");
}
if (!frozenYaml.includes("/creator/campaigns/{set_id}/clips:")) {
  fail("Frozen F6 yaml missing C1/C2 creator clips path");
}
if (!frozenYaml.includes("/agency/brands/{brand_id}/clips:")) {
  fail("Frozen F6 yaml missing C3 agency clips path");
}
if (!frozenYaml.includes("/agency/brands/{brand_id}/clips/{clip_id}/moderate:")) {
  fail("Frozen F6 yaml missing C4 moderate path");
}
if (!frozenYaml.includes("/brand/clips:")) {
  fail("Frozen F6 yaml missing C5 brand clips path");
}
ok("Frozen OpenAPI F6 sample-clip yaml verified for clips (G-093 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json clips paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;

if (!spec.paths["/creator/campaigns/{set_id}/clips"]) {
  fail("Runtime OpenAPI missing /creator/campaigns/{set_id}/clips");
}
if (!spec.paths["/agency/brands/{brand_id}/clips"]) {
  fail("Runtime OpenAPI missing /agency/brands/{brand_id}/clips");
}
if (!spec.paths["/agency/brands/{brand_id}/clips/{clip_id}/moderate"]) {
  fail("Runtime OpenAPI missing /agency/brands/{brand_id}/clips/{clip_id}/moderate");
}
if (!spec.paths["/brand/clips"]) {
  fail("Runtime OpenAPI missing /brand/clips");
}

const schemas = spec.components?.schemas || {};
for (const reqSchema of [
  "ClipRecord",
  "ClipList",
  "ClipSubmitRequest",
  "ClipModerationRequest",
  "ClipModerationAction",
  "ClipModerationMode",
  "ClipStatus",
]) {
  if (!schemas[reqSchema]) {
    fail(`Runtime OpenAPI missing schema ${reqSchema}`);
  }
}
ok("Runtime OpenAPI export includes clips paths and schemas");

// 3. Check C1 unauthenticated -> 401
step("POST /creator/campaigns/00000000-0000-0000-0000-000000000001/clips unauthenticated -> 401");
await request(
  "POST",
  "/creator/campaigns/00000000-0000-0000-0000-000000000001/clips",
  {
    body: { video_url: "https://www.tiktok.com/@u/v/123" },
    expect: 401,
  }
);
ok("C1 returns 401 without creatorBearer");

// 4. Check C2 unauthenticated -> 401
step("GET /creator/campaigns/00000000-0000-0000-0000-000000000001/clips unauthenticated -> 401");
await request(
  "GET",
  "/creator/campaigns/00000000-0000-0000-0000-000000000001/clips",
  { expect: 401 }
);
ok("C2 returns 401 without creatorBearer");

// 5. Check C3 unauthenticated -> 401
step("GET /agency/brands/00000000-0000-0000-0000-000000000001/clips unauthenticated -> 401");
await request(
  "GET",
  "/agency/brands/00000000-0000-0000-0000-000000000001/clips",
  { expect: 401 }
);
ok("C3 returns 401 without agencyBearer");

// 6. Check C4 unauthenticated -> 401
step("POST /agency/brands/00000000-0000-0000-0000-000000000001/clips/00000000-0000-0000-0000-000000000002/moderate unauthenticated -> 401");
await request(
  "POST",
  "/agency/brands/00000000-0000-0000-0000-000000000001/clips/00000000-0000-0000-0000-000000000002/moderate",
  {
    body: { action: "approve" },
    expect: 401,
  }
);
ok("C4 returns 401 without agencyBearer");

// 7. Check C5 unauthenticated -> 401
step("GET /brand/clips unauthenticated -> 401");
await request("GET", "/brand/clips", { expect: 401 });
ok("C5 returns 401 without brandBearer");

// 8. Brand login and C5 list
step("Brand login -> GET /brand/clips returns 200 ClipList");
const brandToken = await loginBrandFixture();
const brandClips = await request("GET", "/brand/clips", {
  token: brandToken,
  expect: 200,
});
if (!Array.isArray(brandClips.body.items)) {
  fail("C5 /brand/clips items is not an array");
}
ok("C5 /brand/clips returned 200 with valid ClipList");

console.log("\n------------------------------------------------");
console.log(" All G-103 clips smoke tests PASSED (C1–C5)");
console.log("------------------------------------------------\n");
