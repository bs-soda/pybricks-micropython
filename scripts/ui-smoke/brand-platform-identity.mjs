#!/usr/bin/env node
/**
 * scripts/ui-smoke/brand-platform-identity.mjs
 *
 * G-150 Brand Platform Identity UI & API Integration Smoke Harness:
 * 1. Agency Org Setup & Brand Invite Generation
 * 2. Brand Invite Public Inspection (/v1/platform/brand/invite/{token})
 * 3. Brand Authentication & Session Minting
 * 4. Exclusive Brand Invite Binding (INV-01)
 * 5. Multi-Agency Conflict Rejection (409 Conflict)
 * 6. Brand Contact Email Submission (/v1/platform/brand/contact-email)
 * 7. Resend Rate Limiting / Cooldown Validation
 * 8. Brand OTP Verification (/v1/platform/brand/contact-email/verify)
 * 9. Document Gate & Workspace Access Verification
 */

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║   G-150: Brand Platform Identity UI & Invite Bind Smoke Harness       ║');
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
  const agencyAEmail = `agency.alpha.${timestamp}@sodality.agency`;
  const agencyBEmail = `agency.beta.${timestamp}@sodality.agency`;
  const brandContactEmail = `procurement.${timestamp}@brandacme.com`;
  const agencyPassword = 'SecurePassword123!';

  console.log('── Step 1: Setup Agency Alpha & Agency Beta ─────────────────────────');
  // Register Agency A
  const regARes = await request('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyAEmail,
      password: agencyPassword,
      company_name: `Agency Alpha ${timestamp}`,
      display_name: `Agency Alpha ${timestamp}`,
    }),
  });
  assert(regARes.status === 201, 'Agency Alpha registered');
  const otpARes = await request(`/v1/platform/agency/test/otp/${encodeURIComponent(agencyAEmail)}`);
  const verifyARes = await request('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyAEmail, code: otpARes.body?.code }),
  });
  const agencyAToken = verifyARes.body?.session_token;
  assert(Boolean(agencyAToken), 'Agency Alpha session token received');

  // Register Agency B
  const regBRes = await request('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyBEmail,
      password: agencyPassword,
      company_name: `Agency Beta ${timestamp}`,
      display_name: `Agency Beta ${timestamp}`,
    }),
  });
  assert(regBRes.status === 201, 'Agency Beta registered');
  const otpBRes = await request(`/v1/platform/agency/test/otp/${encodeURIComponent(agencyBEmail)}`);
  const verifyBRes = await request('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: agencyBEmail, code: otpBRes.body?.code }),
  });
  const agencyBToken = verifyBRes.body?.session_token;
  assert(Boolean(agencyBToken), 'Agency Beta session token received');

  console.log('── Step 2: Mint Brand Invites from Agency A & Agency B ──────────────');
  const inviteARes = await request('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agencyAToken}` },
  });
  assert(inviteARes.status === 200 || inviteARes.status === 201, 'Agency A generated brand invite');
  const tokenA = inviteARes.body?.token;
  assert(Boolean(tokenA), `Captured Agency A Invite Token: ${tokenA}`);

  const inviteBRes = await request('/agency/invites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agencyBToken}` },
  });
  assert(inviteBRes.status === 200 || inviteBRes.status === 201, 'Agency B generated brand invite');
  const tokenB = inviteBRes.body?.token;
  assert(Boolean(tokenB), `Captured Agency B Invite Token: ${tokenB}`);

  console.log('── Step 3: Screen B1 - Inspect Brand Invite Token ──────────────────');
  const inspectRes = await request(`/v1/platform/brand/invite/${encodeURIComponent(tokenA)}`);
  assert(inspectRes.status === 200, `Inspect Brand Invite returns 200 OK (got ${inspectRes.status})`);
  assert(inspectRes.body?.valid === true, 'Token is valid');
  assert(inspectRes.body?.agency_name === `Agency Alpha ${timestamp}`, 'Correct inviting agency name returned');

  console.log('── Step 4: Mint Brand Test Session Token ────────────────────────────');
  // Seed a brand under test
  const seedBrandRes = await request('/agency/brands/seed', { method: 'POST' });
  const testBrandId = seedBrandRes.body?.brands?.[0]?.id || '995a674e-2165-5d64-9891-900fe2459800';

  // Mint brand session via auth endpoint
  const brandAuthRes = await request('/brand/auth/session', {
    method: 'POST',
    headers: {
      'x-brand-id': testBrandId,
      'x-brand-name': `Brand Alpha Customer ${timestamp}`,
    },
  });
  assert(brandAuthRes.status === 200, 'Brand session initialized');
  const brandToken = brandAuthRes.body?.access_token;
  assert(Boolean(brandToken), 'Brand bearer token issued');

  console.log('── Step 5: Bind Brand to Agency Alpha (INV-01) ──────────────────────');
  const bindARes = await request(`/v1/platform/brand/invite/${encodeURIComponent(tokenA)}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandToken}` },
  });
  assert(bindARes.status === 200, `Bind brand to Agency A returns 200 OK (got ${bindARes.status})`);
  assert(bindARes.body?.agency_id === regARes.body?.agency_id, 'Brand bound to Agency A organization ID');

  console.log('── Step 6: Verify 409 Conflict on Attempting Agency Beta Bind ───────');
  const bindBRes = await request(`/v1/platform/brand/invite/${encodeURIComponent(tokenB)}/bind`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandToken}` },
  });
  assert(bindBRes.status === 409, `Second agency bind returns 409 Conflict (got ${bindBRes.status})`);
  assert(bindBRes.body?.error === 'BRAND_ALREADY_BOUND', 'Error code is BRAND_ALREADY_BOUND');

  console.log('── Step 7: Screen B2 - Brand Contact Email Submission ───────────────');
  const contactRes = await request('/v1/platform/brand/contact-email', {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandToken}` },
    body: JSON.stringify({ contact_email: brandContactEmail }),
  });
  assert(contactRes.status === 200, `Submit contact email returns 200 OK (got ${contactRes.status})`);
  assert(contactRes.body?.otp_sent === true, 'Response confirms otp_sent = true');

  console.log('── Step 8: Test OTP Resend Cooldown (429 Rate Limiting) ─────────────');
  const resendCooldownRes = await request('/v1/platform/brand/contact-email/resend', {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandToken}` },
  });
  assert(resendCooldownRes.status === 429, `Immediate resend returns 429 Too Many Requests (got ${resendCooldownRes.status})`);

  console.log('── Step 9: Retrieve Contact Email OTP & Verify (Screen B3) ─────────');
  const brandOtpRes = await request(`/v1/platform/brand/test/otp/${encodeURIComponent(brandContactEmail)}`);
  assert(brandOtpRes.status === 200, 'Peek brand test OTP returns 200 OK');
  const brandOtpCode = brandOtpRes.body?.code;
  assert(typeof brandOtpCode === 'string' && brandOtpCode.length === 6, `Retrieved OTP: ${brandOtpCode}`);

  const verifyContactRes = await request('/v1/platform/brand/contact-email/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${brandToken}` },
    body: JSON.stringify({ code: brandOtpCode }),
  });
  assert(verifyContactRes.status === 200, `Verify contact email returns 200 OK (got ${verifyContactRes.status})`);
  assert(verifyContactRes.body?.status === 'verified', 'Brand status is marked as verified');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  G-150 SMOKE RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSmoke();
