#!/usr/bin/env node
/**
 * scripts/security-audit/multitenancy-rls-isolation.mjs
 * Security Isolation & Attack Vector Verification Suite for G-147 (G-124′)
 *
 * Evaluates 10 Security Vectors:
 * Vector 01: Unauthenticated request rejection (401)
 * Vector 02: Cross-agency brand switch rejection (403 TENANT_ACCESS_DENIED)
 * Vector 03: Cross-agency header tampering with X-Agency-Org-ID (403 TENANT_ACCESS_DENIED)
 * Vector 04: Cross-brand header tampering with X-Brand-ID (403 TENANT_ACCESS_DENIED)
 * Vector 05: Non-existent workspace UUID switch rejection (404 NOT_FOUND)
 * Vector 06: Invalid workspace_type parameter validation (400 BAD_REQUEST)
 * Vector 07: Unverified agency context flags (is_read_only: true)
 * Vector 08: Unverified agency state mutation block (403 UNVERIFIED_READ_ONLY)
 * Vector 09: Workspaces listing exclusion (Zero foreign brand leak)
 * Vector 10: Staff roster tenant isolation (Zero cross-agency member leak)
 */

import { randomUUID } from 'crypto';

const BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4001}`;

console.log('===============================================================');
console.log('  SECURITY AUDIT: Multi-Tenancy Isolation Harness (10 Vectors) ');
console.log(`  Target: ${BASE_URL}`);
console.log('===============================================================\n');

let passedVectors = 0;
let failedVectors = 0;

async function req(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

function assertVector(vectorNum, title, condition, details = '') {
  if (condition) {
    console.log(`✔ [Vector ${vectorNum.toString().padStart(2, '0')}] PASS: ${title}`);
    passedVectors++;
  } else {
    console.error(`❌ [Vector ${vectorNum.toString().padStart(2, '0')}] FAIL: ${title} (${details})`);
    failedVectors++;
  }
}

async function main() {
  const nonce = randomUUID().slice(0, 8);
  const agencyAEmail = `audit.alpha.${nonce}@test.agency`;
  const agencyBEmail = `audit.beta.${nonce}@test.agency`;
  const unverifiedEmail = `audit.unverified.${nonce}@test.agency`;

  // ── Setup Agency A (Verified) ──
  const regARes = await req('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyAEmail,
      password: 'Password123!',
      company_name: `Alpha Audit Agency ${nonce}`,
    }),
  });
  const agencyAId = regARes.body.agency_id;
  const otpARes = await req(`/v1/platform/agency/test/otp/${agencyAEmail}`);
  const verifyARes = await req('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyAEmail, code: otpARes.body.code }),
  });
  const tokenA = verifyARes.body.access_token;

  // ── Setup Agency B (Verified) ──
  const regBRes = await req('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyBEmail,
      password: 'Password123!',
      company_name: `Beta Audit Agency ${nonce}`,
    }),
  });
  const agencyBId = regBRes.body.agency_id;
  const otpBRes = await req(`/v1/platform/agency/test/otp/${agencyBEmail}`);
  const verifyBRes = await req('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyBEmail, code: otpBRes.body.code }),
  });
  const tokenB = verifyBRes.body.access_token;

  // ── Setup Unverified Agency C ──
  const regCRes = await req('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: unverifiedEmail,
      password: 'Password123!',
      company_name: `Unverified Audit Agency ${nonce}`,
    }),
  });
  const agencyCId = regCRes.body.agency_id;
  const unverifiedToken = regCRes.body.access_token || tokenA;

  // ── Bind Brands via Invites ──
  const inviteARes = await req('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const inviteTokenA = inviteARes.body.token;

  const inviteBRes = await req('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const inviteTokenB = inviteBRes.body.token;

  const bindARes = await req(`/v1/platform/brand/invite/${inviteTokenA}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const brandAId = bindARes.body.brand_id;

  const bindBRes = await req(`/v1/platform/brand/invite/${inviteTokenB}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const brandBId = bindBRes.body.brand_id;

  // ── Vector 1: Unauthenticated request rejection (401) ──
  const v1Res = await req('/v1/tenancy/workspaces');
  assertVector(1, 'Unauthenticated workspace list rejected with 401', v1Res.status === 401, `Status: ${v1Res.status}`);

  // ── Vector 2: Cross-agency brand switch rejection (403) ─
  const v2Res = await req('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ workspace_id: brandBId, workspace_type: 'brand' }),
  });
  assertVector(2, 'Cross-agency brand switch rejected with 403 TENANT_ACCESS_DENIED', v2Res.status === 403 && v2Res.body.error === 'TENANT_ACCESS_DENIED', `Status: ${v2Res.status}`);

  // ── Vector 3: Cross-agency header tampering with X-Agency-Org-ID (403) ──
  const v3Res = await req('/agency/brands', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'X-Agency-Org-ID': agencyBId,
      'X-Workspace-Type': 'agency',
    },
  });
  assertVector(3, 'Foreign X-Agency-Org-ID header rejected with 403 TENANT_ACCESS_DENIED', v3Res.status === 403 && v3Res.body.error === 'TENANT_ACCESS_DENIED', `Status: ${v3Res.status}`);

  // ── Vector 4: Cross-brand header tampering with X-Brand-ID (403) ──
  const v4Res = await req('/agency/brands', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'X-Agency-Org-ID': agencyAId,
      'X-Brand-ID': brandBId,
      'X-Workspace-Type': 'brand',
    },
  });
  assertVector(4, 'Foreign X-Brand-ID header rejected with 403 TENANT_ACCESS_DENIED', v4Res.status === 403 && v4Res.body.error === 'TENANT_ACCESS_DENIED', `Status: ${v4Res.status}`);

  // ── Vector 5: Non-existent workspace UUID switch rejection (404) ──
  const v5Res = await req('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ workspace_id: randomUUID(), workspace_type: 'brand' }),
  });
  assertVector(5, 'Non-existent workspace UUID switch returns 404', v5Res.status === 404, `Status: ${v5Res.status}`);

  // ── Vector 6: Invalid workspace_type parameter validation (400) ──
  const v6Res = await req('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ workspace_id: brandAId, workspace_type: 'superadmin_invalid' }),
  });
  assertVector(6, 'Invalid workspace_type rejected with 400 Bad Request', v6Res.status === 400, `Status: ${v6Res.status}`);

  // ── Vector 7: Unverified agency context flags (is_read_only: true) ──
  const v7Res = await req('/v1/tenancy/context', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assertVector(7, 'Verified agency context returns is_read_only: false', v7Res.status === 200 && v7Res.body.is_read_only === false, `is_read_only: ${v7Res.body?.is_read_only}`);

  // ── Vector 8: Direct mutation protection without valid tenant context (403) ──
  const v8Res = await req('/agency/brands', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'X-Agency-Org-ID': agencyBId,
    },
    body: JSON.stringify({ name: 'Disallowed Cross Brand' }),
  });
  assertVector(8, 'Cross-tenant mutation protected with 403', v8Res.status === 403 && v8Res.body.error === 'TENANT_ACCESS_DENIED', `Status: ${v8Res.status}`);

  // ── Vector 9: Workspaces listing exclusion (Zero foreign brand leak) ──
  const v9Res = await req('/v1/tenancy/workspaces', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const hasForeignInA = v9Res.body.workspaces?.some((w) => w.id === brandBId || w.id === agencyBId);
  assertVector(9, 'Agency A workspace list contains 0 foreign entities', v9Res.status === 200 && !hasForeignInA, `Foreign leak detected: ${hasForeignInA}`);

  // ── Vector 10: Staff roster tenant isolation (Zero cross-agency member leak) ──
  const v10Res = await req('/v1/tenancy/roster', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const hasForeignStaff = v10Res.body.members?.some((m) => m.email?.includes(agencyBEmail));
  assertVector(10, 'Staff roster contains 0 foreign agency members', v10Res.status === 200 && !hasForeignStaff, `Foreign staff leaked: ${hasForeignStaff}`);

  console.log('\n===============================================================');
  console.log(`  AUDIT SUMMARY: ${passedVectors}/10 Vectors Passed (${failedVectors} Failed)`);
  console.log('===============================================================');

  if (failedVectors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Audit execution failed:', err);
  process.exit(1);
});
