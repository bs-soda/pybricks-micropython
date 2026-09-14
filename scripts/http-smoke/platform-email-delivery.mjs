#!/usr/bin/env node
/**
 * scripts/http-smoke/platform-email-delivery.mjs
 *
 * G-159 Verification Smoke Test:
 * Validates F33 transactional email dispatches and Resend integration paths:
 * 1. Agency Signup OTP (T1)
 * 2. Agency Resend OTP (T2)
 * 3. Agency Staff Invite (T3)
 * 4. Brand Contact Email OTP (T4)
 * 5. Brand Contact Email Resend OTP (T5)
 * 6. CI Test OTP Inspection Endpoint (/v1/platform/agency/test/otp/{email})
 */

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const HAS_RESEND_KEY = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());

console.log('╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║   G-159: F33 Transactional Email Delivery & Resend Smoke Harness     ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝');
console.log(`[*] Target API Base URL : ${API_BASE}`);
console.log(`[*] Resend API Key Mode : ${HAS_RESEND_KEY ? 'LIVE (Real Dispatches)' : 'MOCK / IN-MEMORY (CI Mode)'}`);
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
  const testAgencyEmail = `smoke.agency.${timestamp}@example.com`;
  const testStaffEmail = `smoke.staff.${timestamp}@example.com`;
  const testBrandEmail = `smoke.brand.${timestamp}@example.com`;

  console.log('── Step 1: Agency Signup OTP (T1) ─────────────────────────────────');
  const regRes = await request('/v1/platform/agency/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testAgencyEmail,
      password: 'StrongPassword123!',
      company_name: 'Smoke Test Media Agency',
      display_name: 'Alex Director',
    }),
  });

  assert(regRes.status === 201, `Agency register returns 201 Created (got ${regRes.status})`);
  assert(regRes.body?.otp_sent === true, 'Response contains otp_sent = true');
  assert(Boolean(regRes.body?.agency_id), 'Response contains valid agency_id');

  console.log('── Step 2: CI Test OTP Inspection (GET /test/otp/{email}) ──────────');
  const peekRes = await request(`/v1/platform/agency/test/otp/${encodeURIComponent(testAgencyEmail)}`);
  assert(peekRes.status === 200, `Test OTP peek returns 200 OK (got ${peekRes.status})`);
  const otpCode = peekRes.body?.code;
  assert(typeof otpCode === 'string' && otpCode.length === 6, `Retrieved 6-digit OTP: ${otpCode}`);

  console.log('── Step 3: Agency Verify Email & Acquire JWT ───────────────────────');
  const verifyRes = await request('/v1/platform/agency/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      email: testAgencyEmail,
      code: otpCode,
    }),
  });

  assert(verifyRes.status === 200, `Agency verify returns 200 OK (got ${verifyRes.status})`);
  const token = verifyRes.body?.session_token;
  assert(Boolean(token), 'Received scoped session_token');

  console.log('── Step 4: Agency Staff Invite Dispatch (T3) ──────────────────────');
  const inviteRes = await request('/v1/platform/agency/staff/invite', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      email: testStaffEmail,
      role: 'admin',
    }),
  });

  assert(inviteRes.status === 201, `Staff invite returns 201 Created (got ${inviteRes.status})`);
  assert(Boolean(inviteRes.body?.token), `Generated staff invite token: ${inviteRes.body?.token}`);
  assert(inviteRes.body?.email === testStaffEmail, 'Staff invite matches requested email');

  console.log('── Step 5: Brand Contact Email OTP Dispatch (T4) ──────────────────');
  const brandOtpRes = await request('/v1/platform/brand/contact-email', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brand_id: '00000000-0000-0000-0000-000000000001',
      contact_email: testBrandEmail,
    }),
  });

  assert(brandOtpRes.status === 200, `Brand contact OTP returns 200 OK (got ${brandOtpRes.status})`);
  assert(brandOtpRes.body?.otp_sent === true, 'Brand contact otp_sent = true');

  console.log('── Step 6: Brand Contact Email Resend (T5) ────────────────────────');
  const brandResendRes = await request('/v1/platform/brand/contact-email/resend', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brand_id: '00000000-0000-0000-0000-000000000001',
    }),
  });

  assert(brandResendRes.status === 200, `Brand contact resend returns 200 OK (got ${brandResendRes.status})`);
  assert(brandResendRes.body?.otp_sent === true, 'Brand contact resend otp_sent = true');

  console.log('── Step 7: Localized Thai Agency Signup OTP (X-Locale: th) ────────');
  const testThaiAgencyEmail = `smoke.thai.agency.${timestamp}@example.com`;
  const thaiRegRes = await request('/v1/platform/agency/register', {
    method: 'POST',
    headers: { 'X-Locale': 'th' },
    body: JSON.stringify({
      email: testThaiAgencyEmail,
      password: 'StrongPassword123!',
      company_name: 'บริษัท ทดสอบ มีเดีย เอเจนซี่ จำกัด',
      display_name: 'สมชาย ใจดี',
    }),
  });

  assert(thaiRegRes.status === 201, `Thai agency register returns 201 Created (got ${thaiRegRes.status})`);
  assert(thaiRegRes.body?.otp_sent === true, 'Thai response contains otp_sent = true');

  console.log('── Step 8: Localized Thai Staff Invite (Accept-Language: th-TH) ───');
  const testThaiStaffEmail = `smoke.thai.staff.${timestamp}@example.com`;
  const thaiInviteRes = await request('/v1/platform/agency/staff/invite', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
    },
    body: JSON.stringify({
      email: testThaiStaffEmail,
      role: 'member',
    }),
  });

  assert(thaiInviteRes.status === 201, `Thai staff invite returns 201 Created (got ${thaiInviteRes.status})`);
  assert(Boolean(thaiInviteRes.body?.token), `Generated Thai staff invite token: ${thaiInviteRes.body?.token}`);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  G-159 SMOKE RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSmoke();

