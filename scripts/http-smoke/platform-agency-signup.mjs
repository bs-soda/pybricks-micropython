#!/usr/bin/env node
/**
 * G-144 — Platform Identity Agency Signup & Email OTP Smoke Test Harness
 *
 * Covers:
 *  1. Agency self-serve registration (POST /v1/platform/agency/register)
 *  2. Email OTP verification (POST /v1/platform/agency/verify-email)
 *  3. OTP resend & 30s cooldown (POST /v1/platform/agency/resend-otp)
 *  4. Business profile onboarding (POST /v1/platform/agency/onboarding/profile)
 *  5. Agency organization inspection (GET /v1/platform/agency/org)
 *  6. Staff list & invite creation (POST /v1/platform/agency/staff/invite)
 *  7. Staff invite inspection (GET /v1/platform/agency/staff/invite/{token})
 *  8. Staff invite acceptance (POST /v1/platform/agency/staff/accept)
 *
 * Usage:
 *   node scripts/http-smoke/platform-agency-signup.mjs
 */

import { randomUUID } from "node:crypto";

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:4001").replace(/\/$/, "");

function ok(msg) {
  console.log(`\x1b[32m✔\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\x1b[31m✘ ${msg}\x1b[0m`);
  process.exit(1);
}

function step(msg) {
  console.log(`\n\x1b[36m➤ ${msg}\x1b[0m`);
}

async function request(method, path, { body, token, expect } = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (expect !== undefined && res.status !== expect) {
    fail(`[${method} ${path}] Expected HTTP ${expect}, got HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  return { status: res.status, body: json };
}

console.log("=======================================================");
console.log("  HTTP SMOKE: G-144 Platform Agency Signup & Staff    ");
console.log("=======================================================");

const runId = randomUUID().slice(0, 8);
const adminEmail = `sarah.admin.${runId}@test.agency`;
const staffEmail = `john.staff.${runId}@test.agency`;

// Step 1: Validation checks on registration
step("1. Registration validation rejection (invalid email / short password)");
{
  const { status, body } = await request("POST", "/v1/platform/agency/register", {
    body: {
      email: "invalid-email",
      password: "123",
      company_name: "",
    },
    expect: 400,
  });
  ok(`Invalid input rejected with HTTP ${status}`);
}

// Step 2: Register Agency Admin
step(`2. Register new agency (${adminEmail})`);
let agencyId = null;
let userId = null;
{
  const { status, body } = await request("POST", "/v1/platform/agency/register", {
    body: {
      email: adminEmail,
      password: "StrongPassword123!",
      company_name: `Acme Agency ${runId}`,
      display_name: "Sarah Connor",
    },
    expect: 201,
  });

  if (body.status !== "unverified" || !body.otp_sent) {
    fail(`Unexpected register response: ${JSON.stringify(body)}`);
  }
  agencyId = body.agency_id;
  userId = body.user_id;
  ok(`Registered unverified agency ${agencyId} for user ${userId}`);
}

// Step 3: Resend OTP Cooldown check
step("3. OTP Resend cooldown enforcement (within 30s -> 429)");
{
  const { status } = await request("POST", "/v1/platform/agency/resend-otp", {
    body: { email: adminEmail },
    expect: 429,
  });
  ok(`Immediate OTP resend correctly throttled with HTTP ${status}`);
}

// Step 4: Peek OTP code
step("4. Retrieve OTP verification code");
let otpCode = null;
{
  const { status, body } = await request("GET", `/v1/platform/agency/test/otp/${adminEmail}`, {
    expect: 200,
  });
  otpCode = body.code;
  if (!otpCode || otpCode.length !== 6) {
    fail(`Invalid OTP peek: ${JSON.stringify(body)}`);
  }
  ok(`Retrieved active OTP code: ${otpCode}`);
}

// Step 5: Verify Email with OTP
step("5. Verify Email OTP & Issue Session Token");
let adminToken = null;
{
  const { status, body } = await request("POST", "/v1/platform/agency/verify-email", {
    body: {
      email: adminEmail,
      code: otpCode,
    },
    expect: 200,
  });

  if (!body.access_token || body.agency?.verification_status !== "verified") {
    fail(`Verify failed: ${JSON.stringify(body)}`);
  }
  adminToken = body.access_token;
  ok(`Email verified! Agency verification_status = ${body.agency.verification_status}`);
}

// Step 6: Update Business Profile
step("6. Onboard Business Profile & Tax ID");
{
  const { status, body } = await request("POST", "/v1/platform/agency/onboarding/profile", {
    token: adminToken,
    body: {
      company_registered_name: "Acme Global Media Co., Ltd.",
      tax_id: "0105558123456",
      address_line: "123 Sukhumvit Road, Bangkok",
      billing_email: `billing.${runId}@test.agency`,
    },
    expect: 200,
  });

  if (body.tax_id !== "0105558123456") {
    fail(`Profile update mismatch: ${JSON.stringify(body)}`);
  }
  ok(`Business profile updated: Tax ID ${body.tax_id}`);
}

// Step 7: Inspect Agency Org
step("7. Inspect Agency Org (/v1/platform/agency/org)");
{
  const { status, body } = await request("GET", "/v1/platform/agency/org", {
    token: adminToken,
    expect: 200,
  });

  if (body.verification_status !== "verified") {
    fail(`Unexpected org status: ${JSON.stringify(body)}`);
  }
  ok(`Agency Org verified: ${body.name} (Status: ${body.verification_status})`);
}

// Step 8: List Agency Staff
step("8. List Agency Staff (/v1/platform/agency/staff)");
{
  const { status, body } = await request("GET", "/v1/platform/agency/staff", {
    token: adminToken,
    expect: 200,
  });

  if (!Array.isArray(body) || body.length === 0) {
    fail(`Staff roster empty: ${JSON.stringify(body)}`);
  }
  ok(`Staff roster returned ${body.length} member(s), role = ${body[0].role}`);
}

// Step 9: Create Staff Invite
step(`9. Admin creates staff invite for ${staffEmail}`);
let staffInviteToken = null;
{
  const { status, body } = await request("POST", "/v1/platform/agency/staff/invite", {
    token: adminToken,
    body: {
      email: staffEmail,
      role: "member",
    },
    expect: 201,
  });

  if (!body.token || !body.token.startsWith("stf_")) {
    fail(`Invalid staff invite response: ${JSON.stringify(body)}`);
  }
  staffInviteToken = body.token;
  ok(`Staff invite created with token: ${staffInviteToken}`);
}

// Step 10: Inspect Staff Invite (Public)
step(`10. Public inspect staff invite (${staffInviteToken})`);
{
  const { status, body } = await request("GET", `/v1/platform/agency/staff/invite/${staffInviteToken}`, {
    expect: 200,
  });

  if (body.status !== "pending" || body.role !== "member") {
    fail(`Staff invite inspection invalid: ${JSON.stringify(body)}`);
  }
  ok(`Staff invite inspection verified: Agency ${body.agency_name}, Role ${body.role}`);
}

// Step 11: Accept Staff Invite
step(`11. Accept staff invite for ${staffEmail}`);
let staffToken = null;
{
  const { status, body } = await request("POST", "/v1/platform/agency/staff/accept", {
    body: {
      token: staffInviteToken,
      password: "StaffPassword123!",
      display_name: "John Doe",
    },
    expect: 200,
  });

  if (!body.access_token || body.staff_membership?.role !== "member") {
    fail(`Staff accept failed: ${JSON.stringify(body)}`);
  }
  staffToken = body.access_token;
  ok(`Staff invite accepted! Issued token for ${body.user.email} (Role: ${body.staff_membership.role})`);
}

console.log("\n=======================================================");
console.log("  ALL G-144 PLATFORM AGENCY SIGNUP CHECKS PASSED ✔    ");
console.log("=======================================================");
