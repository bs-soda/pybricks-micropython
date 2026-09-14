#!/usr/bin/env node
/**
 * scripts/ui-smoke/workspace-switcher.mjs
 *
 * G-148 F31 Runtime Tenancy & Workspace Switcher Live Integration Smoke Harness:
 * 1. Agency Org Setup & Authentication
 * 2. Workspace Enumeration (GET /v1/tenancy/workspaces)
 * 3. Initial Workspace Context (GET /v1/tenancy/context)
 * 4. Bound Brand Listing in Workspace Hierarchy
 * 5. 1-Click Switch to Brand Workspace (POST /v1/tenancy/switch)
 * 6. Scoped Brand Token Context & Permissions (R-12)
 * 7. Multi-Tenant Creator Rosters (/v1/tenancy/agency-creators vs /v1/tenancy/brand-creators)
 * 8. 1-Click Switch back to Agency Org (POST /v1/tenancy/switch)
 * 9. Multi-Tenant Header Extraction & JWT Scoping Verification
 */

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║   G-148: F31 Tenancy & Workspace Switcher UI Integration Harness       ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝');
console.log(`[*] Target API Base URL : ${API_BASE}`);
console.log('');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    totalFailed++;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, ok: res.ok, body, headers: res.headers };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function runSmoke() {
  const timestamp = Date.now();
  const agencyEmail = `switcher.agency.${timestamp}@sodality.agency`;
  const agencyPassword = 'SecurePassword123!';
  const companyName = `Nexus Orbit Agency ${timestamp}`;

  console.log('── Step 1: Register Agency & Authenticate ───────────────────────────');
  const regRes = await request('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyEmail,
      password: agencyPassword,
      company_name: companyName,
      display_name: companyName,
    }),
  });
  assert(regRes.status === 201, `Agency registered successfully (got ${regRes.status})`);
  const agencyOrgId = regRes.body?.agency_id;
  assert(Boolean(agencyOrgId), `Captured Agency Org ID: ${agencyOrgId}`);

  const otpRes = await request(`/v1/platform/agency/test/otp/${encodeURIComponent(agencyEmail)}`);
  const verifyRes = await request('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyEmail, code: otpRes.body?.code }),
  });
  let activeToken = verifyRes.body?.session_token;
  assert(Boolean(activeToken), 'Agency session token received');

  console.log('── Step 2: Screen A7 - List Initial Workspaces ──────────────────────');
  const list1Res = await request('/v1/tenancy/workspaces', {
    method: 'GET',
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert(list1Res.status === 200, `List workspaces returns 200 OK (got ${list1Res.status})`);
  assert(Array.isArray(list1Res.body?.workspaces), 'Response contains workspaces array');
  const initialAgencyWs = list1Res.body?.workspaces.find((w) => w.type === 'agency');
  assert(Boolean(initialAgencyWs), `Found active agency workspace: ${initialAgencyWs?.name}`);

  console.log('── Step 3: Inspect Initial Agency Workspace Context ────────────────');
  const ctx1Res = await request('/v1/tenancy/context', {
    method: 'GET',
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert(ctx1Res.status === 200, `Get workspace context returns 200 OK (got ${ctx1Res.status})`);
  assert(ctx1Res.body?.workspace_type === 'agency', 'Context workspace_type is "agency"');
  assert(ctx1Res.body?.brand_id === null || ctx1Res.body?.brand_id === undefined, 'Brand ID is not set in agency context');

  console.log('── Step 4: Generate Brand Invite & Bind Brand to Agency ─────────────');
  const inviteRes = await request('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  const tokenInvite = inviteRes.body?.token;
  assert(Boolean(tokenInvite), `Created Brand Invite Token: ${tokenInvite}`);

  // Seed brands and mint brand session
  const seedRes = await request('/agency/brands/seed', { method: 'POST' });
  const testBrand = seedRes.body?.brands?.[0] || { id: '995a674e-2165-5d64-9891-900fe2459800', name: 'Glow Beauty' };
  const brandTokenRes = await request('/brand/auth/session', {
    method: 'POST',
    headers: { 'x-brand-id': testBrand.id, 'x-brand-name': testBrand.name },
  });
  const brandAuthToken = brandTokenRes.body?.access_token;
  assert(Boolean(brandAuthToken), 'Brand auth token issued');

  // Bind brand
  const bindRes = await request(`/v1/platform/brand/invite/${encodeURIComponent(tokenInvite)}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandAuthToken}` },
  });
  assert(bindRes.status === 200, `Brand bound to agency successfully (got ${bindRes.status})`);

  console.log('── Step 5: Screen A7 - List Workspaces (Hierarchy & Bound Brands) ───');
  const list2Res = await request('/v1/tenancy/workspaces', {
    method: 'GET',
    headers: { Authorization: `Bearer ${activeToken}` },
  });
  assert(list2Res.status === 200, 'List workspaces returns 200 OK after brand bind');
  const boundBrandWs = list2Res.body?.workspaces.find((w) => w.type === 'brand');
  assert(Boolean(boundBrandWs), `Found bound brand workspace: ${boundBrandWs?.name}`);

  console.log('── Step 6: 1-Click Switch to Brand Workspace (Screen A7 Action) ────');
  const targetBrandId = boundBrandWs?.id || testBrand.id;
  const switchBrandRes = await request('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${activeToken}` },
    body: JSON.stringify({
      workspace_id: targetBrandId,
      workspace_type: 'brand',
    }),
  });
  assert(switchBrandRes.status === 200, `Switch to brand workspace returns 200 OK (got ${switchBrandRes.status})`);
  assert(switchBrandRes.body?.success === true, 'Switch response confirms success');
  const brandScopedToken = switchBrandRes.body?.session_token;
  assert(Boolean(brandScopedToken), 'Scoped JWT session token received for brand workspace');

  console.log('── Step 7: Verify Scoped Brand Context & R-12 Isolation ─────────────');
  const brandCtxRes = await request('/v1/tenancy/context', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${brandScopedToken}`,
      'X-Agency-Org-ID': agencyOrgId,
      'X-Brand-ID': targetBrandId,
      'X-Workspace-Type': 'brand',
    },
  });
  assert(brandCtxRes.status === 200, 'Brand context query returns 200 OK');
  assert(brandCtxRes.body?.workspace_type === 'brand', 'Workspace type is "brand"');
  assert(brandCtxRes.body?.brand_id === targetBrandId, `Context brand_id matches target (${targetBrandId})`);

  console.log('── Step 8: Multi-Tenant Creator Rosters Query ───────────────────────');
  const brandCreatorsRes = await request(`/v1/tenancy/brand-creators?brand_id=${encodeURIComponent(targetBrandId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${brandScopedToken}`,
      'X-Agency-Org-ID': agencyOrgId,
      'X-Brand-ID': targetBrandId,
      'X-Workspace-Type': 'brand',
    },
  });
  assert(brandCreatorsRes.status === 200, `Get brand creators returns 200 OK (got ${brandCreatorsRes.status})`);
  assert(typeof brandCreatorsRes.body?.total_creators === 'number', 'Total creators count returned');

  const agencyCreatorsRes = await request('/v1/tenancy/agency-creators', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'X-Agency-Org-ID': agencyOrgId,
      'X-Workspace-Type': 'agency',
    },
  });
  assert(agencyCreatorsRes.status === 200, `Get agency creators returns 200 OK (got ${agencyCreatorsRes.status})`);
  assert(typeof agencyCreatorsRes.body?.total_creators === 'number', 'Total agency creators count returned');

  console.log('── Step 9: 1-Click Switch Back to Agency Org ───────────────────────');
  const switchAgencyRes = await request('/v1/tenancy/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandScopedToken}` },
    body: JSON.stringify({
      workspace_id: agencyOrgId,
      workspace_type: 'agency',
    }),
  });
  assert(switchAgencyRes.status === 200, `Switch back to agency org returns 200 OK (got ${switchAgencyRes.status})`);
  assert(switchAgencyRes.body?.context?.workspace_type === 'agency', 'Switched back to agency workspace type');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  G-148 SMOKE RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSmoke();
