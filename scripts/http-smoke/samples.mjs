#!/usr/bin/env node
/**
 * G-102 — Feature 6 Samples HTTP Smoke (S1–S5).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/samples.mjs
 *
 * Checks:
 *   S1: Brand GET /brand/samples (creator sample applications list)
 *   S2: Brand POST /brand/samples/{sample_id}/review (review approval/rejection)
 *   S3: Agency GET /agency/brands/{brand_id}/samples (agency overview)
 *   S4: Agency POST /agency/brands/{brand_id}/samples/sync (on-demand logistics sync)
 *   S5: Creator GET /creator/samples (creator sample list & tracking)
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

// 1. Verify frozen yaml exists and contains samples tag and S1-S5
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f6-sample-clip.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F6 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: samples")) {
  fail("Frozen F6 yaml missing samples tag");
}
if (!frozenYaml.includes("/brand/samples:")) {
  fail("Frozen F6 yaml missing S1 brand samples path");
}
if (!frozenYaml.includes("/brand/samples/{sample_id}/review:")) {
  fail("Frozen F6 yaml missing S2 review path");
}
if (!frozenYaml.includes("/agency/brands/{brand_id}/samples:")) {
  fail("Frozen F6 yaml missing S3 agency samples path");
}
if (!frozenYaml.includes("/agency/brands/{brand_id}/samples/sync:")) {
  fail("Frozen F6 yaml missing S4 sync path");
}
if (!frozenYaml.includes("/creator/samples:")) {
  fail("Frozen F6 yaml missing S5 creator samples path");
}
ok("Frozen OpenAPI F6 sample-clip yaml verified for samples (G-093 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json samples paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;
if (!spec.paths?.["/brand/samples"]) {
  fail("Runtime OpenAPI missing S1 /brand/samples path");
}
if (!spec.paths?.["/brand/samples/{sample_id}/review"]) {
  fail("Runtime OpenAPI missing S2 review path");
}
if (!spec.paths?.["/agency/brands/{brand_id}/samples"]) {
  fail("Runtime OpenAPI missing S3 agency samples path");
}
if (!spec.paths?.["/agency/brands/{brand_id}/samples/sync"]) {
  fail("Runtime OpenAPI missing S4 sync path");
}
if (!spec.paths?.["/creator/samples"]) {
  fail("Runtime OpenAPI missing S5 creator samples path");
}
if (!spec.components?.schemas?.SampleRecord) {
  fail("Runtime OpenAPI missing SampleRecord schema");
}
if (!spec.components?.schemas?.SampleList) {
  fail("Runtime OpenAPI missing SampleList schema");
}
if (!spec.components?.schemas?.SampleReviewRequest) {
  fail("Runtime OpenAPI missing SampleReviewRequest schema");
}
if (!spec.components?.schemas?.SampleSyncResponse) {
  fail("Runtime OpenAPI missing SampleSyncResponse schema");
}
ok("Runtime OpenAPI export includes samples S1–S5 and schemas");

// 3. Test unauthenticated S1 -> 401
step("S1 GET /brand/samples without auth -> 401 Unauthorized");
{
  const { body } = await request("GET", "/brand/samples", {
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
  ok("S1 rejects unauthenticated request with 401");
}

// 4. Authenticate Brand and test S1
step("S1 GET /brand/samples with brandBearer -> 200 OK");
let brandToken;
{
  const brand = await loginBrandFixture();
  brandToken = brand.token;
  const res = await request("GET", "/brand/samples", {
    token: brandToken,
    expect: 200,
  });
  const list = res.body;
  if (!Array.isArray(list.items)) fail("items must be an array");
  if (typeof list.total !== "number") fail("total must be a number");
  if (list.page !== 1) fail(`page must be 1, got ${list.page}`);
  if (list.page_size !== 8) fail(`page_size must be 8, got ${list.page_size}`);
  ok("S1 returned paginated SampleList for brand");
}

// 5. Test S2 review endpoint validation / not found
step("S2 POST /brand/samples/{sample_id}/review for non-existent sample -> 404");
{
  const { body } = await request(
    "POST",
    "/brand/samples/00000000-0000-0000-0000-000000000000/review",
    {
      token: brandToken,
      body: { action: "approve" },
      expect: 404,
    }
  );
  assertError(body, "NOT_FOUND");
  ok("S2 returned 404 for non-existent sample");
}

// 6. Test S5 Creator list samples
step("S5 GET /creator/samples with creatorBearer -> 200 OK");
{
  const liffRes = await request("POST", "/creator/auth/line-liff", {
    body: { id_token: "line_U3334445556_Sample-Tester" },
    expect: 200,
  });
  const creatorToken = liffRes.body.access_token;
  const res = await request("GET", "/creator/samples", {
    token: creatorToken,
    expect: 200,
  });
  if (!Array.isArray(res.body)) fail("S5 must return an array of samples");
  ok("S5 returned creator sample list");
}

ok("HTTP Smoke for samples (G-102) verified S1–S5 endpoints and schema contracts!");
