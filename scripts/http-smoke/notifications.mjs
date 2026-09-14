#!/usr/bin/env node
/**
 * G-107 — Feature 8 Notifications HTTP Smoke (N1–N12).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/notifications.mjs
 *
 * Checks:
 *   N1: Agency GET /agency/notifications
 *   N2: Agency GET /agency/notifications/unread-count
 *   N3: Agency POST /agency/notifications/{notification_id}/read
 *   N4: Agency POST /agency/notifications/mark-all-read
 *   N5: Brand GET /brand/notifications
 *   N6: Brand GET /brand/notifications/unread-count
 *   N7: Brand POST /brand/notifications/{notification_id}/read
 *   N8: Brand POST /brand/notifications/mark-all-read
 *   N9: Creator GET /creator/notifications
 *   N10: Creator GET /creator/notifications/unread-count
 *   N11: Creator POST /creator/notifications/{notification_id}/read
 *   N12: Creator POST /creator/notifications/mark-all-read
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

// 1. Verify frozen yaml exists and contains notifications tag and N1-N12
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f8-notifications.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F8 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: notifications")) {
  fail("Frozen F8 yaml missing notifications tag");
}
for (const path of [
  "/agency/notifications:",
  "/agency/notifications/unread-count:",
  "/agency/notifications/{notification_id}/read:",
  "/agency/notifications/mark-all-read:",
  "/brand/notifications:",
  "/brand/notifications/unread-count:",
  "/brand/notifications/{notification_id}/read:",
  "/brand/notifications/mark-all-read:",
  "/creator/notifications:",
  "/creator/notifications/unread-count:",
  "/creator/notifications/{notification_id}/read:",
  "/creator/notifications/mark-all-read:",
]) {
  if (!frozenYaml.includes(path)) {
    fail(`Frozen F8 yaml missing path ${path}`);
  }
}
ok("Frozen OpenAPI F8 notifications yaml verified (G-095 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json notifications paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;

for (const path of [
  "/agency/notifications",
  "/agency/notifications/unread-count",
  "/agency/notifications/{notification_id}/read",
  "/agency/notifications/mark-all-read",
  "/brand/notifications",
  "/brand/notifications/unread-count",
  "/brand/notifications/{notification_id}/read",
  "/brand/notifications/mark-all-read",
  "/creator/notifications",
  "/creator/notifications/unread-count",
  "/creator/notifications/{notification_id}/read",
  "/creator/notifications/mark-all-read",
]) {
  if (!spec.paths[path]) {
    fail(`Runtime OpenAPI missing path ${path}`);
  }
}

const schemas = spec.components?.schemas || {};
for (const reqSchema of [
  "NotificationRecord",
  "NotificationList",
  "UnreadCountResponse",
  "MarkAllReadResponse",
  "RecipientRole",
]) {
  if (!schemas[reqSchema]) {
    fail(`Runtime OpenAPI missing schema ${reqSchema}`);
  }
}
ok("Runtime OpenAPI export includes notifications paths and schemas");

// 3. Unauthenticated checks -> 401
step("Unauthenticated requests return 401");
await request("GET", "/agency/notifications", { expect: 401 });
await request("GET", "/agency/notifications/unread-count", { expect: 401 });
await request(
  "POST",
  "/agency/notifications/00000000-0000-0000-0000-000000000001/read",
  { expect: 401 }
);
await request("POST", "/agency/notifications/mark-all-read", { expect: 401 });

await request("GET", "/brand/notifications", { expect: 401 });
await request("GET", "/brand/notifications/unread-count", { expect: 401 });
await request(
  "POST",
  "/brand/notifications/00000000-0000-0000-0000-000000000001/read",
  { expect: 401 }
);
await request("POST", "/brand/notifications/mark-all-read", { expect: 401 });

await request("GET", "/creator/notifications", { expect: 401 });
await request("GET", "/creator/notifications/unread-count", { expect: 401 });
await request(
  "POST",
  "/creator/notifications/00000000-0000-0000-0000-000000000001/read",
  { expect: 401 }
);
await request("POST", "/creator/notifications/mark-all-read", { expect: 401 });
ok("All N1–N12 endpoints reject unauthenticated calls with 401");

// 4. Authenticated Agency checks
step("Agency login -> N1 list, N2 unread-count, N4 mark-all-read");
const agencyToken = await loginAdmin();
const n2Res = await request("GET", "/agency/notifications/unread-count", {
  token: agencyToken,
  expect: 200,
});
if (typeof n2Res.body.unread_count !== "number") {
  fail("N2 unread_count is not a number");
}
const n1Res = await request("GET", "/agency/notifications", {
  token: agencyToken,
  expect: 200,
});
if (!Array.isArray(n1Res.body.items)) {
  fail("N1 response items is not an array");
}
const n4Res = await request("POST", "/agency/notifications/mark-all-read", {
  token: agencyToken,
  expect: 200,
});
if (!n4Res.body.ok) {
  fail("N4 mark-all-read did not return ok: true");
}
ok("N1–N4 Agency notifications endpoints verified");

// 5. Authenticated Brand checks
step("Brand login -> N5 list, N6 unread-count, N8 mark-all-read");
const brandToken = await loginBrandFixture();
const n6Res = await request("GET", "/brand/notifications/unread-count", {
  token: brandToken,
  expect: 200,
});
if (typeof n6Res.body.unread_count !== "number") {
  fail("N6 unread_count is not a number");
}
const n5Res = await request("GET", "/brand/notifications", {
  token: brandToken,
  expect: 200,
});
if (!Array.isArray(n5Res.body.items)) {
  fail("N5 response items is not an array");
}
const n8Res = await request("POST", "/brand/notifications/mark-all-read", {
  token: brandToken,
  expect: 200,
});
if (!n8Res.body.ok) {
  fail("N8 mark-all-read did not return ok: true");
}
ok("N5–N8 Brand notifications endpoints verified");

// 6. Authenticated Creator checks
step("Creator auth -> N9 list, N10 unread-count, N12 mark-all-read");
const creatorAuthRes = await request("POST", "/creator/auth/line-liff", {
  body: { id_token: "line_U107_Smoke_Tester" },
  expect: 200,
});
const creatorToken = creatorAuthRes.body.access_token;
const n10Res = await request("GET", "/creator/notifications/unread-count", {
  token: creatorToken,
  expect: 200,
});
if (typeof n10Res.body.unread_count !== "number") {
  fail("N10 unread_count is not a number");
}
const n9Res = await request("GET", "/creator/notifications", {
  token: creatorToken,
  expect: 200,
});
if (!Array.isArray(n9Res.body.items)) {
  fail("N9 response items is not an array");
}
const n12Res = await request("POST", "/creator/notifications/mark-all-read", {
  token: creatorToken,
  expect: 200,
});
if (!n12Res.body.ok) {
  fail("N12 mark-all-read did not return ok: true");
}
ok("N9–N12 Creator notifications endpoints verified");

console.log("\n------------------------------------------------");
console.log(" All G-107 notifications smoke tests PASSED (N1–N12)");
console.log("------------------------------------------------\n");
