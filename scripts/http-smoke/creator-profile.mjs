#!/usr/bin/env node
/**
 * G-101 — Feature 5 Creator Profile HTTP Smoke (CP1–CP4).
 *
 * Prerequisite: API already running.
 *   cd code && cargo run -p api
 *
 * Then from repo root:
 *   node scripts/http-smoke/creator-profile.mjs
 *
 * Checks:
 *   CP1: Creator GET /creator/profile (creatorBearer profile retrieval)
 *   CP2: Creator PATCH /creator/profile (contact, shipping address, handles update)
 *   CP3: Creator GET /creator/wallet (wallet balance stub)
 *   CP4: Creator GET /creator/campaigns (joined campaigns list & status filter)
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

// 1. Verify frozen yaml exists and contains creator-profile CP1-CP4
const yamlPath = join(
  repoRoot,
  "docs/03-architecture/api/openapi-f5-creator-entry.yaml"
);
if (!existsSync(yamlPath)) {
  fail(`Missing frozen F5 yaml at ${yamlPath}`);
}
const frozenYaml = readFileSync(yamlPath, "utf-8");
if (!frozenYaml.includes("name: creator-profile")) {
  fail("Frozen F5 yaml missing creator-profile tag");
}
if (!frozenYaml.includes("/creator/profile:")) {
  fail("Frozen F5 yaml missing CP1/CP2 profile path");
}
if (!frozenYaml.includes("/creator/wallet:")) {
  fail("Frozen F5 yaml missing CP3 wallet path");
}
if (!frozenYaml.includes("/creator/campaigns:")) {
  fail("Frozen F5 yaml missing CP4 campaigns path");
}
ok("Frozen OpenAPI F5 creator-entry yaml verified for creator-profile (G-092 SSOT)");

await requireApi();

// 2. Verify runtime OpenAPI export
step("GET /openapi.json creator-profile paths and schemas");
const specRes = await request("GET", "/openapi.json", { expect: 200 });
const spec = specRes.body;
if (!spec.paths?.["/creator/profile"]) {
  fail("Runtime OpenAPI missing CP1/CP2 profile path");
}
if (!spec.paths?.["/creator/wallet"]) {
  fail("Runtime OpenAPI missing CP3 wallet path");
}
if (!spec.paths?.["/creator/campaigns"]) {
  fail("Runtime OpenAPI missing CP4 campaigns path");
}
if (!spec.components?.schemas?.CreatorProfile) {
  fail("Runtime OpenAPI missing CreatorProfile schema");
}
if (!spec.components?.schemas?.ShippingAddress) {
  fail("Runtime OpenAPI missing ShippingAddress schema");
}
if (!spec.components?.schemas?.CreatorWalletSummary) {
  fail("Runtime OpenAPI missing CreatorWalletSummary schema");
}
if (!spec.components?.schemas?.CreatorJoinedCampaignList) {
  fail("Runtime OpenAPI missing CreatorJoinedCampaignList schema");
}
ok("Runtime OpenAPI export includes creator-profile CP1–CP4 and schemas");

// 3. Test unauthenticated CP1 -> 401
step("CP1 GET /creator/profile without auth -> 401 Unauthorized");
{
  const { body } = await request("GET", "/creator/profile", {
    expect: 401,
  });
  assertError(body, "UNAUTHORIZED");
  ok("CP1 rejects unauthenticated request with 401");
}

// 4. Authenticate creator via CA1
step("CA1 create creator session for profile smoke");
let session;
{
  const res = await request("POST", "/creator/auth/line-liff", {
    body: {
      id_token: "line_U9876543210_Ploy-Beauty",
    },
    expect: 200,
  });
  session = res.body;
  ok("Creator authenticated successfully");
}

// 5. Test CP1 initial profile retrieval
step("CP1 GET /creator/profile with creatorBearer -> 200 OK");
{
  const res = await request("GET", "/creator/profile", {
    token: session.access_token,
    expect: 200,
  });
  const profile = res.body;
  if (profile.id !== session.creator.id) {
    fail(`Profile id mismatch: ${profile.id} vs ${session.creator.id}`);
  }
  if (profile.line_user_id !== "U9876543210") {
    fail(`Line user ID mismatch: ${profile.line_user_id}`);
  }
  ok("CP1 returned valid initial CreatorProfile");
}

// 6. Test CP2 patch profile with shipping address and handles
step("CP2 PATCH /creator/profile with Thai shipping address -> 200 OK");
{
  const res = await request("PATCH", "/creator/profile", {
    token: session.access_token,
    body: {
      display_name: "Ploy Beauty VIP",
      phone_number: "0819876543",
      email: "ploy.beauty@example.com",
      bio: "Beauty blogger & skincare reviewer",
      shipping_address: {
        recipient_name: "Ploy Srisuk",
        phone_number: "0819876543",
        address_line1: "55/12 Sukhumvit 71",
        subdistrict: "Phra Khanong Nuea",
        district: "Watthana",
        province: "Bangkok",
        postal_code: "10110",
      },
      social_handles: {
        tiktok_username: "@ploy.beauty",
        instagram_handle: "@ploy_official",
      },
    },
    expect: 200,
  });
  const updated = res.body;
  if (updated.display_name !== "Ploy Beauty VIP") {
    fail(`Display name not updated: ${updated.display_name}`);
  }
  if (updated.shipping_address?.postal_code !== "10110") {
    fail(`Postal code mismatch: ${updated.shipping_address?.postal_code}`);
  }
  if (updated.social_handles?.tiktok_username !== "@ploy.beauty") {
    fail(`TikTok username mismatch: ${updated.social_handles?.tiktok_username}`);
  }
  ok("CP2 updated creator profile, shipping address, and social handles");
}

// 7. Test CP2 validation failure (invalid postal code) -> 400
step("CP2 PATCH /creator/profile with invalid postal code -> 400 Bad Request");
{
  const { body } = await request("PATCH", "/creator/profile", {
    token: session.access_token,
    body: {
      shipping_address: {
        recipient_name: "Ploy",
        phone_number: "0812345678",
        address_line1: "Road",
        subdistrict: "Sub",
        district: "Dist",
        province: "BKK",
        postal_code: "999", // Invalid: 3 digits instead of 5
      },
    },
    expect: 400,
  });
  assertError(body, "VALIDATION_ERROR");
  ok("CP2 rejected invalid postal code with 400 VALIDATION_ERROR");
}

// 8. Test CP3 wallet stub
step("CP3 GET /creator/wallet with creatorBearer -> 200 OK");
{
  const res = await request("GET", "/creator/wallet", {
    token: session.access_token,
    expect: 200,
  });
  const wallet = res.body;
  if (wallet.creator_id !== session.creator.id) {
    fail(`Wallet creator_id mismatch: ${wallet.creator_id}`);
  }
  if (wallet.available_balance_satang !== 0) {
    fail(`Available balance must be 0 satang, got ${wallet.available_balance_satang}`);
  }
  if (wallet.currency !== "THB") {
    fail(`Currency must be THB, got ${wallet.currency}`);
  }
  ok("CP3 returned valid CreatorWalletSummary stub");
}

// 9. Test CP4 joined campaigns
step("CP4 GET /creator/campaigns with creatorBearer -> 200 OK");
{
  const res = await request("GET", "/creator/campaigns", {
    token: session.access_token,
    expect: 200,
  });
  const list = res.body;
  if (!Array.isArray(list.items)) fail("items must be an array");
  if (typeof list.total !== "number") fail("total must be a number");
  if (list.page !== 1) fail(`page must be 1, got ${list.page}`);
  if (list.page_size !== 8) fail(`page_size must be 8, got ${list.page_size}`);
  ok("CP4 returned valid paginated CreatorJoinedCampaignList");
}

ok("HTTP Smoke for creator-profile (G-101) verified all profile, address, wallet, and campaign endpoints!");
