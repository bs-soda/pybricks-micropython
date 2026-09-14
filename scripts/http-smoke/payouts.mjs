#!/usr/bin/env node
/**
 * G-106 — Feature 7 Payouts HTTP Smoke (P1–P6).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/payouts.mjs
 *
 * Checks:
 *   P1: Agency GET /agency/payouts
 *   P2: Agency POST /agency/payouts/calculate
 *   P3: Agency POST /agency/payouts/{payout_id}/approve
 *   P4: Agency POST /agency/payouts/{payout_id}/settle
 *   P5: Brand GET /brand/campaign-projects/{project_id}/payouts
 *   P6: Creator GET /creator/wallet/payouts
 *
 * Reuses scripts/http-smoke/lib.mjs.
 */
import {
  fail,
  loginAdmin,
  loginBrandFixture,
  mintBrandJwt,
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

// 1. Verify frozen yaml exists and contains payouts tag and P1-P6
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f7-closeout.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F7 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: payouts")) {
  fail("Frozen F7 yaml missing payouts tag");
}
if (!frozenYaml.includes("/agency/payouts:")) {
  fail("Frozen F7 yaml missing P1 path");
}
if (!frozenYaml.includes("/agency/payouts/calculate:")) {
  fail("Frozen F7 yaml missing P2 path");
}
if (!frozenYaml.includes("/agency/payouts/{payout_id}/approve:")) {
  fail("Frozen F7 yaml missing P3 path");
}
if (!frozenYaml.includes("/agency/payouts/{payout_id}/settle:")) {
  fail("Frozen F7 yaml missing P4 path");
}
if (!frozenYaml.includes("/brand/campaign-projects/{project_id}/payouts:")) {
  fail("Frozen F7 yaml missing P5 path");
}
if (!frozenYaml.includes("/creator/wallet/payouts:")) {
  fail("Frozen F7 yaml missing P6 path");
}
ok("Frozen OpenAPI F7 closeout yaml verified for payouts (G-094 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json payouts paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;

for (const path of [
  "/agency/payouts",
  "/agency/payouts/calculate",
  "/agency/payouts/{payout_id}/approve",
  "/agency/payouts/{payout_id}/settle",
  "/brand/campaign-projects/{project_id}/payouts",
  "/creator/wallet/payouts",
]) {
  if (!spec.paths[path]) {
    fail(`Runtime OpenAPI missing path ${path}`);
  }
}

const schemas = spec.components?.schemas || {};
for (const reqSchema of [
  "PayoutRecord",
  "PayoutList",
  "PayoutCalculateRequest",
  "PayoutCalculateResponse",
  "PayoutSettleRequest",
  "CreatorPayoutItem",
  "CreatorPayoutHistoryList",
  "PayoutStatus",
]) {
  if (!schemas[reqSchema]) {
    fail(`Runtime OpenAPI missing schema ${reqSchema}`);
  }
}
ok("Runtime OpenAPI export includes payouts paths and schemas");

// 3. Unauthenticated checks -> 401
step("Unauthenticated requests return 401");
await request("GET", "/agency/payouts", { expect: 401 });
await request("POST", "/agency/payouts/calculate", {
  body: { project_id: "00000000-0000-0000-0000-000000000001" },
  expect: 401,
});
await request(
  "POST",
  "/agency/payouts/00000000-0000-0000-0000-000000000001/approve",
  { expect: 401 }
);
await request(
  "POST",
  "/agency/payouts/00000000-0000-0000-0000-000000000001/settle",
  { expect: 401 }
);
await request(
  "GET",
  "/brand/campaign-projects/00000000-0000-0000-0000-000000000001/payouts",
  { expect: 401 }
);
await request("GET", "/creator/wallet/payouts", { expect: 401 });
ok("All P1–P6 endpoints reject unauthenticated calls with 401");

// 4. Authenticated Agency checks
step("Agency login -> P1 list payouts");
const agencyToken = await loginAdmin();
const p1Res = await request("GET", "/agency/payouts", {
  token: agencyToken,
  expect: 200,
});
if (!Array.isArray(p1Res.body.items)) {
  fail("P1 response items is not an array");
}
ok("P1 Agency list staged payouts returned 200 PayoutList");

// 5. Authenticated Brand checks
step("Brand login -> P5 campaign payouts");
const brandToken = await loginBrandFixture();
const p5Res = await request(
  "GET",
  "/brand/campaign-projects/00000000-0000-0000-0000-000000000001/payouts",
  {
    token: brandToken,
  }
);
if (p5Res.status !== 404 && p5Res.status !== 200) {
  fail(`P5 unexpected status: ${p5Res.status}`);
}
ok("P5 Brand campaign payouts handler responded correctly");

// 6. Authenticated Creator checks
step("Creator auth -> P6 wallet payouts history");
const creatorAuthRes = await request("POST", "/creator/auth/line-liff", {
  body: { id_token: "line_U106_Smoke_Tester" },
  expect: 200,
});
const creatorToken = creatorAuthRes.body.access_token;
const p6Res = await request("GET", "/creator/wallet/payouts", {
  token: creatorToken,
  expect: 200,
});
if (!Array.isArray(p6Res.body.items)) {
  fail("P6 response items is not an array");
}
ok("P6 Creator wallet payout history returned 200 CreatorPayoutHistoryList");

console.log("\n------------------------------------------------");
console.log(" All G-106 payouts smoke tests PASSED (P1–P6)");
console.log("------------------------------------------------\n");
