#!/usr/bin/env node
/**
 * G-104 — Feature 6 Spark HTTP Smoke (SP1–SP2).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/spark.mjs
 *
 * Checks:
 *   SP1: Brand POST /brand/clips/{clip_id}/spark/sync (1-click Spark sync)
 *   SP2: Brand GET /brand/clips/{clip_id}/spark (get Spark ad status)
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

// 1. Verify frozen yaml exists and contains spark tag and SP1-SP2
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f6-sample-clip.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F6 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: spark")) {
  fail("Frozen F6 yaml missing spark tag");
}
if (!frozenYaml.includes("/brand/clips/{clip_id}/spark/sync:")) {
  fail("Frozen F6 yaml missing SP1 sync path");
}
if (!frozenYaml.includes("/brand/clips/{clip_id}/spark:")) {
  fail("Frozen F6 yaml missing SP2 status path");
}
ok("Frozen OpenAPI F6 sample-clip yaml verified for spark (G-093 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json spark paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;

if (!spec.paths["/brand/clips/{clip_id}/spark/sync"]) {
  fail("Runtime OpenAPI missing /brand/clips/{clip_id}/spark/sync");
}
if (!spec.paths["/brand/clips/{clip_id}/spark"]) {
  fail("Runtime OpenAPI missing /brand/clips/{clip_id}/spark");
}

const schemas = spec.components?.schemas || {};
for (const reqSchema of [
  "SparkSyncResponse",
  "SparkStatusResponse",
  "SparkSyncStatus",
]) {
  if (!schemas[reqSchema]) {
    fail(`Runtime OpenAPI missing schema ${reqSchema}`);
  }
}
ok("Runtime OpenAPI export includes spark paths and schemas");

// 3. Check SP1 unauthenticated -> 401
step("POST /brand/clips/00000000-0000-0000-0000-000000000001/spark/sync unauthenticated -> 401");
await request(
  "POST",
  "/brand/clips/00000000-0000-0000-0000-000000000001/spark/sync",
  { expect: 401 }
);
ok("SP1 returns 401 without brandBearer");

// 4. Check SP2 unauthenticated -> 401
step("GET /brand/clips/00000000-0000-0000-0000-000000000001/spark unauthenticated -> 401");
await request(
  "GET",
  "/brand/clips/00000000-0000-0000-0000-000000000001/spark",
  { expect: 401 }
);
ok("SP2 returns 401 without brandBearer");

// 5. Authenticated Brand checks for non-existent clip -> 404
step("Brand login -> SP1 and SP2 on non-existent clip returns 404");
const brandToken = await loginBrandFixture();

await request(
  "POST",
  "/brand/clips/00000000-0000-0000-0000-000000000001/spark/sync",
  {
    token: brandToken,
    expect: 404,
  }
);
ok("SP1 returns 404 on non-existent clip");

await request(
  "GET",
  "/brand/clips/00000000-0000-0000-0000-000000000001/spark",
  {
    token: brandToken,
    expect: 404,
  }
);
ok("SP2 returns 404 on non-existent clip");

console.log("\n------------------------------------------------");
console.log(" All G-104 spark smoke tests PASSED (SP1–SP2)");
console.log("------------------------------------------------\n");
