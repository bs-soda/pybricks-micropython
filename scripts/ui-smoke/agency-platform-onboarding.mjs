#!/usr/bin/env node
/**
 * scripts/ui-smoke/agency-platform-onboarding.mjs
 *
 * G-149 UI & API Integration Smoke Harness:
 * Validates the complete live Platform Identity onboarding & staff lifecycle:
 * 1. Agency Signup (/v1/platform/agency/register)
 * 2. OTP Inspection (/v1/platform/agency/test/otp/{email})
 * 3. Email Verification & Session Mint (/v1/platform/agency/verify-email)
 * 4. Business Profile Onboarding (/v1/platform/agency/onboarding/profile)
 * 5. Agency Org Inspection (/v1/platform/agency/org)
 * 6. Staff Roster Inspection (/v1/platform/agency/staff)
 * 7. Staff Member Invitation (/v1/platform/agency/staff/invite)
 * 8. Screen A9 Landing Token Inspection (/v1/platform/agency/staff/invite/{token})
 * 9. Screen A9 Staff Invitation Accept (/v1/platform/agency/staff/accept)
 * 10. Staff Member Active Session Verification
 */

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║   G-149: Agency Platform Onboarding UI & Staff Lifecycle Smoke        ║');
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
  const agencyEmail = `onboarding.agency.${timestamp}@sodality.agency`;
  const agencyPassword = 'SecurePassword123!';
  const companyName = `Nexus Digital Agency ${timestamp}`;
  const staffEmail = `sarah.ops.${timestamp}@nexus.agency`;
  const staffPassword = 'StrongStaffPass123!';

  console.log('── Step 1: Agency Signup (Screen A1) ──────────────────────────────');
  const regRes = await request('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyEmail,
      password: agencyPassword,
      company_name: companyName,
      display_name: companyName,
    }),
  });

  assert(regRes.status === 201, `Agency signup returns 201 Created (got ${regRes.status})`);
  assert(regRes.body?.otp_sent === true, 'Response confirms otp_sent = true');
  const agencyId = regRes.body?.agency_id;
  assert(Boolean(agencyId), `Captured agency_id: ${agencyId}`);

  console.log('── Step 2: Retrieve Verification OTP ──────────────────────────────');
  const peekRes = await request(`/v1/platform/agency/test/otp/${encodeURIComponent(agencyEmail)}`);
  assert(peekRes.status === 200, `Peek test OTP returns 200 OK (got ${peekRes.status})`);
  const otpCode = peekRes.body?.code;
  assert(typeof otpCode === 'string' && otpCode.length === 6, `Retrieved 6-digit OTP: ${otpCode}`);

  console.log('── Step 3: Verify Email OTP & Mint Session (Screen A2) ─────────────');
  const verifyRes = await request('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      email: agencyEmail,
      code: otpCode,
    }),
  });

  assert(verifyRes.status === 200, `Verify email returns 200 OK (got ${verifyRes.status})`);
  assert(verifyRes.body?.verification_status === 'verified', 'Status marked as verified');
  const sessionToken = verifyRes.body?.session_token;
  assert(Boolean(sessionToken), 'Received scoped session token');

  console.log('── Step 4: Complete Business Profile Onboarding (Screen A3) ────────');
  const profileRes = await request('/v1/platform/agency/onboarding/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({
      company_name: `${companyName} Ltd.`,
      display_name: `${companyName} International`,
      tax_id: '0105566778899',
      billing_address: '88/1 Sukhumvit Rd, Khlong Toei, Bangkok 10110',
      billing_email: `billing@nexus.${timestamp}.co`,
    }),
  });

  assert(profileRes.status === 200, `Profile update returns 200 OK (got ${profileRes.status})`);
  assert(profileRes.body?.display_name === `${companyName} International`, 'Display name updated');
  assert(profileRes.body?.tax_id === '0105566778899', 'Tax ID updated');

  console.log('── Step 5: Inspect Agency Organization (Screen A4) ─────────────────');
  const orgRes = await request('/v1/platform/agency/org', {
    method: 'GET',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });

  assert(orgRes.status === 200, `Get agency org returns 200 OK (got ${orgRes.status})`);
  assert(orgRes.body?.verification_status === 'verified', 'Org status is verified');

  console.log('── Step 6: List Staff Members (Screen A5) ──────────────────────────');
  const staffListRes = await request('/v1/platform/agency/staff', {
    method: 'GET',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });

  assert(staffListRes.status === 200, `List staff returns 200 OK (got ${staffListRes.status})`);
  assert(staffListRes.body?.members?.length >= 1, 'Contains at least owner admin staff');
  assert(staffListRes.body?.members[0]?.email === agencyEmail, 'First member is agency admin');

  console.log('── Step 7: Create Staff Member Invite (Screen A5 Modal) ────────────');
  const inviteRes = await request('/v1/platform/agency/staff/invite', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({
      email: staffEmail,
      role: 'admin',
    }),
  });

  assert(inviteRes.status === 201, `Create staff invite returns 201 Created (got ${inviteRes.status})`);
  const staffToken = inviteRes.body?.token;
  assert(Boolean(staffToken), `Generated staff invitation token: ${staffToken}`);

  console.log('── Step 8: Screen A9 Landing Token Inspection ──────────────────────');
  const inspectRes = await request(`/v1/platform/agency/staff/invite/${encodeURIComponent(staffToken)}`);
  assert(inspectRes.status === 200, `Inspect staff invite returns 200 OK (got ${inspectRes.status})`);
  assert(inspectRes.body?.valid === true, 'Token is valid');
  assert(inspectRes.body?.email === staffEmail, 'Invited email matches');
  assert(Boolean(inspectRes.body?.agency_name), `Agency name resolved: ${inspectRes.body?.agency_name}`);

  console.log('── Step 9: Screen A9 Staff Invitation Accept ───────────────────────');
  const acceptRes = await request('/v1/platform/agency/staff/accept', {
    method: 'POST',
    body: JSON.stringify({
      token: staffToken,
      password: staffPassword,
      display_name: 'Sarah Ops Manager',
    }),
  });

  assert(acceptRes.status === 200, `Accept staff invite returns 200 OK (got ${acceptRes.status})`);
  const staffSessionToken = acceptRes.body?.session_token;
  assert(Boolean(staffSessionToken), 'Staff received scoped session token');

  console.log('── Step 10: Verify Staff Member Access to Agency Workspace ─────────');
  const staffOrgRes = await request('/v1/platform/agency/org', {
    method: 'GET',
    headers: { Authorization: `Bearer ${staffSessionToken}` },
  });

  assert(staffOrgRes.status === 200, `Staff accessing agency org returns 200 OK (got ${staffOrgRes.status})`);
  assert(staffOrgRes.body?.id === agencyId, 'Staff belongs to the same agency organization');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  G-149 SMOKE RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSmoke();
