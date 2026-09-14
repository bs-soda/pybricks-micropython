#!/usr/bin/env node
/**
 * G-105 — Feature 7 Analytics HTTP Smoke (A1–A5).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/analytics.mjs
 *
 * Checks:
 *   A1: Brand GET /brand/campaign-projects/{project_id}/analytics
 *   A2: Brand GET /brand/analytics/overview
 *   A3: Agency GET /agency/brands/{brand_id}/analytics/overview
 *   A4: Agency GET /agency/analytics/dashboard
 *   A5: Agency POST /agency/analytics/sync
 *
 * Reuses scripts/http-smoke/lib.mjs.
 */
import {
  assertError,
  fail,
  loginAdmin,
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

// 1. Verify frozen yaml exists and contains analytics tag and A1-A5
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f7-closeout.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F7 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: analytics")) {
  fail("Frozen F7 yaml missing analytics tag");
}
if (!frozenYaml.includes("/brand/campaign-projects/{project_id}/analytics:")) {
  fail("Frozen F7 yaml missing A1 path");
}
if (!frozenYaml.includes("/brand/analytics/overview:")) {
  fail("Frozen F7 yaml missing A2 path");
}
if (!frozenYaml.includes("/agency/brands/{brand_id}/analytics/overview:")) {
  fail("Frozen F7 yaml missing A3 path");
}
if (!frozenYaml.includes("/agency/analytics/dashboard:")) {
  fail("Frozen F7 yaml missing A4 path");
}
if (!frozenYaml.includes("/agency/analytics/sync:")) {
  fail("Frozen F7 yaml missing A5 path");
}
ok("Frozen OpenAPI F7 closeout yaml verified for analytics (G-094 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json analytics paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;

for (const path of [
  "/brand/campaign-projects/{project_id}/analytics",
  "/brand/analytics/overview",
  "/agency/brands/{brand_id}/analytics/overview",
  "/agency/analytics/dashboard",
  "/agency/analytics/sync",
]) {
  if (!spec.paths[path]) {
    fail(`Runtime OpenAPI missing path ${path}`);
  }
}

const schemas = spec.components?.schemas || {};
for (const reqSchema of [
  "CampaignAnalytics",
  "BrandAnalyticsOverview",
  "TopPerformingBrand",
  "AgencyDashboardAnalytics",
  "AnalyticsSyncResponse",
]) {
  if (!schemas[reqSchema]) {
    fail(`Runtime OpenAPI missing schema ${reqSchema}`);
  }
}
ok("Runtime OpenAPI export includes analytics paths and schemas");

// 3. Unauthenticated checks -> 401
step("Unauthenticated requests return 401");
await request(
  "GET",
  "/brand/campaign-projects/00000000-0000-0000-0000-000000000001/analytics",
  { expect: 401 }
);
await request("GET", "/brand/analytics/overview", { expect: 401 });
await request(
  "GET",
  "/agency/brands/00000000-0000-0000-0000-000000000001/analytics/overview",
  { expect: 401 }
);
await request("GET", "/agency/analytics/dashboard", { expect: 401 });
await request("POST", "/agency/analytics/sync", { expect: 401 });
ok("All A1–A5 endpoints reject unauthenticated calls with 401");

// 4. Authenticated Brand checks
step("Brand login -> A2 overview");
const brandToken = await loginBrandFixture();
const a2Res = await request("GET", "/brand/analytics/overview", {
  token: brandToken,
  expect: 200,
});
if (typeof a2Res.body.total_gmv_satang !== "number") {
  fail("A2 response missing total_gmv_satang");
}
ok("A2 Brand analytics overview returns satang totals");

// 5. Authenticated Agency checks
step("Agency login -> A4 dashboard and A5 sync");
const agencyToken = await loginAdmin();
const a4Res = await request("GET", "/agency/analytics/dashboard", {
  token: agencyToken,
  expect: 200,
});
if (typeof a4Res.body.total_gmv_satang !== "number") {
  fail("A4 response missing total_gmv_satang");
}
ok("A4 Agency dashboard returns aggregated satang totals");

const a5Res = await request("POST", "/agency/analytics/sync", {
  token: agencyToken,
  expect: 202,
});
if (a5Res.body.status !== "queued") {
  fail("A5 response status is not queued");
}
ok("A5 Agency sync successfully enqueues sync job (202 Accepted)");

console.log("\n------------------------------------------------");
console.log(" All G-105 analytics smoke tests PASSED (A1–A5)");
console.log("------------------------------------------------\n");
