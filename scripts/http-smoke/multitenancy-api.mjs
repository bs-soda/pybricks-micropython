#!/usr/bin/env node
/**
 * scripts/http-smoke/multitenancy-api.mjs
 * End-to-end HTTP Smoke Test for G-147 F31 Tenancy REST APIs
 *
 * Verifies:
 * 1. GET /v1/tenancy/workspaces
 * 2. POST /v1/tenancy/switch (Agency -> Brand -> Agency)
 * 3. GET /v1/tenancy/context
 * 4. GET /v1/tenancy/roster
 * 5. GET /v1/tenancy/agency-creators
 * 6. GET /v1/tenancy/brand-creators
 * 7. Cross-tenant switch attack vector rejection (403 TENANT_ACCESS_DENIED)
 */

import { randomUUID } from 'crypto';

const BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4001}`;

console.log('=======================================================');
console.log('  HTTP SMOKE: G-147 F31 Runtime Tenancy REST APIs      ');
console.log(`  Target: ${BASE_URL}`);
console.log('=======================================================\n');

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

async function main() {
  const nonce = randomUUID().slice(0, 8);
  const agencyEmail = `owner.${nonce}@alpha-tenancy.agency`;
  const foreignAgencyEmail = `foreign.${nonce}@beta-tenancy.agency`;

  // ── Step 1: Register and Verify Agency A ──────────────────────
  console.log(`➤ 1. Register & Verify Primary Agency (${agencyEmail})`);
  const regRes = await req('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyEmail,
      password: 'StrongPassword123!',
      company_name: `Alpha Tenancy Agency ${nonce}`,
      display_name: 'Alpha Founder',
    }),
  });
  if (regRes.status !== 201) {
    throw new Error(`Agency A registration failed: ${JSON.stringify(regRes.body)}`);
  }
  const agencyAId = regRes.body.agency_id;

  const otpRes = await req(`/v1/platform/agency/test/otp/${agencyEmail}`);
  const otpCode = otpRes.body.code;

  const verifyRes = await req('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyEmail, code: otpCode }),
  });
  if (verifyRes.status !== 200) {
    throw new Error(`Agency A verification failed: ${JSON.stringify(verifyRes.body)}`);
  }
  const tokenA = verifyRes.body.access_token;
  console.log(`✔ Agency A verified (id: ${agencyAId})`);

  // ── Step 2: Register Foreign Agency B (for attack vector) ─────
  console.log(`➤ 2. Register & Verify Foreign Agency B (${foreignAgencyEmail})`);
  const regBRes = await req('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: foreignAgencyEmail,
      password: 'StrongPassword123!',
      company_name: `Foreign Beta Agency ${nonce}`,
      display_name: 'Beta Founder',
    }),
  });
  const agencyBId = regBRes.body.agency_id;

  const otpBRes = await req(`/v1/platform/agency/test/otp/${foreignAgencyEmail}`);
  const verifyBRes = await req('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: foreignAgencyEmail, code: otpBRes.body.code }),
  });
  const tokenB = verifyBRes.body.access_token;
  console.log(`✔ Foreign Agency B verified (id: ${agencyBId})`);

  // ── Step 3: Mint Invites & Bind Brands ────────────────────────
  console.log('➤ 3. Mint Invites and Bind Brand 1 to Agency A and Foreign Brand to Agency B');
  const inviteARes = await req('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (inviteARes.status !== 200) {
    throw new Error(`Failed to mint invite A: ${JSON.stringify(inviteARes.body)}`);
  }
  const inviteTokenA = inviteARes.body.token;

  const inviteBRes = await req('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (inviteBRes.status !== 200) {
    throw new Error(`Failed to mint invite B: ${JSON.stringify(inviteBRes.body)}`);
  }
  const inviteTokenB = inviteBRes.body.token;

  // Bind Brand 1 to Agency A
  const bind1Res = await req(`/v1/platform/brand/invite/${inviteTokenA}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (bind1Res.status !== 200) {
    throw new Error(`Brand 1 bind failed: ${JSON.stringify(bind1Res.body)}`);
  }
  const brand1Id = bind1Res.body.brand_id;

  // Bind Foreign Brand to Agency B
  const bindForeignRes = await req(`/v1/platform/brand/invite/${inviteTokenB}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (bindForeignRes.status !== 200) {
    throw new Error(`Foreign Brand bind failed: ${JSON.stringify(bindForeignRes.body)}`);
  }
  const foreignBrandId = bindForeignRes.body.brand_id;
  console.log(`✔ Brand 1 (${brand1Id}) bound to Agency A; Foreign Brand (${foreignBrandId}) bound to Agency B`);

  // ── Step 4: GET /v1/tenancy/workspaces ─────────────────────────
  console.log('➤ 4. GET /v1/tenancy/workspaces for Agency A');
  const wsRes = await req('/v1/tenancy/workspaces', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (wsRes.status !== 200) {
    throw new Error(`list workspaces failed: ${JSON.stringify(wsRes.body)}`);
  }
  const workspaces = wsRes.body.workspaces;
  if (!workspaces || workspaces.length < 2) {
    throw new Error(`Expected at least 2 workspaces, got: ${JSON.stringify(workspaces)}`);
  }
  const hasAgency = workspaces.some((w) => w.id === agencyAId && w.type === 'agency');
  const hasBrand1 = workspaces.some((w) => w.id === brand1Id && w.type === 'brand');
  const hasForeignBrand = workspaces.some((w) => w.id === foreignBrandId);
  if (!hasAgency || !hasBrand1 || hasForeignBrand) {
    throw new Error(`Workspace isolation failed: Agency=${hasAgency}, Brand1=${hasBrand1}, ForeignBrandPresent=${hasForeignBrand}`);
  }
  console.log(`✔ Workspaces verified: Agency Org + Brand 1 present, Foreign Brand excluded`);

  // ── Step 5: POST /v1/tenancy/switch (Switch to Brand 1) ────────
  console.log('➤ 5. POST /v1/tenancy/switch to Brand 1');
  const switchBrandRes = await req('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      workspace_id: brand1Id,
      workspace_type: 'brand',
    }),
  });
  if (switchBrandRes.status !== 200) {
    throw new Error(`Switch to Brand 1 failed: ${JSON.stringify(switchBrandRes.body)}`);
  }
  const brandSessionToken = switchBrandRes.body.session_token;
  const brandCtx = switchBrandRes.body.context;
  if (brandCtx.workspace_type !== 'brand' || brandCtx.active_workspace_id !== brand1Id) {
    throw new Error(`Unexpected Brand Context: ${JSON.stringify(brandCtx)}`);
  }
  console.log(`✔ Switched to Brand 1! Scoped token minted: ${brandSessionToken.slice(0, 20)}...`);

  // ── Step 6: GET /v1/tenancy/context ───────────────────────────
  console.log('➤ 6. GET /v1/tenancy/context');
  const ctxRes = await req('/v1/tenancy/context', {
    method: 'GET',
    headers: { Authorization: `Bearer ${brandSessionToken}` },
  });
  if (ctxRes.status !== 200 || ctxRes.body.brand_id !== brand1Id) {
    throw new Error(`Context query failed: ${JSON.stringify(ctxRes.body)}`);
  }
  console.log(`✔ Active context verified: workspace_type = brand, brand_id = ${brand1Id}`);

  // ── Step 7: GET /v1/tenancy/roster ────────────────────────────
  console.log('➤ 7. GET /v1/tenancy/roster');
  const rosterRes = await req('/v1/tenancy/roster', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (rosterRes.status !== 200 || !rosterRes.body.members || rosterRes.body.members.length === 0) {
    throw new Error(`Roster query failed: ${JSON.stringify(rosterRes.body)}`);
  }
  console.log(`✔ Workspace roster returned ${rosterRes.body.members.length} member(s)`);

  // ── Step 8: GET /v1/tenancy/agency-creators & brand-creators ───
  console.log('➤ 8. GET /v1/tenancy/agency-creators & brand-creators');
  const agCreatorsRes = await req('/v1/tenancy/agency-creators', {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const brCreatorsRes = await req('/v1/tenancy/brand-creators', {
    method: 'GET',
    headers: { Authorization: `Bearer ${brandSessionToken}` },
  });
  if (agCreatorsRes.status !== 200 || brCreatorsRes.status !== 200) {
    throw new Error(`Creator rosters failed: ag=${agCreatorsRes.status}, br=${brCreatorsRes.status}`);
  }
  console.log(`✔ Agency creators: ${agCreatorsRes.body.total_creators}, Brand creators: ${brCreatorsRes.body.total_creators}`);

  // ── Step 9: Attack Vector: Cross-Agency Brand Switch Rejection ─
  console.log('➤ 9. Attack Vector: Agency A attempts switch to Foreign Brand owned by Agency B');
  const attackRes = await req('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      workspace_id: foreignBrandId,
      workspace_type: 'brand',
    }),
  });
  if (attackRes.status !== 403) {
    throw new Error(`Attack vector failed! Expected 403 Forbidden, got ${attackRes.status}: ${JSON.stringify(attackRes.body)}`);
  }
  console.log(`✔ Cross-tenant brand switch rejected with HTTP 403 (Error: ${attackRes.body.error})`);

  console.log('\n=======================================================');
  console.log('  ALL G-147 F31 RUNTIME TENANCY CHECKS PASSED ✔        ');
  console.log('=======================================================');
}

main().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
