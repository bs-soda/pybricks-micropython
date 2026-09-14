#!/usr/bin/env node
/**
 * Smoke test for Dynamic Logging Controller API (G-129)
 *
 * Verifies:
 * 1. Querying active log level via GET /v1/admin/telemetry/log-level
 * 2. Changing global log level via POST /v1/admin/telemetry/log-level
 * 3. Setting tenant override with TTL via POST /v1/admin/telemetry/log-level
 * 4. Input validation (400 on invalid log level string)
 * 5. Reverting to baseline INFO
 */

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8080';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

async function runSmoke() {
  console.log(`[dynamic-logging-smoke] Testing against ${BASE_URL}...`);

  // 1. Initial GET
  console.log('[1/5] Testing GET /v1/admin/telemetry/log-level...');
  const initGet = await request('/v1/admin/telemetry/log-level');
  if (initGet.status !== 200 || !initGet.data?.global_level) {
    console.error('FAIL: Expected 200 with global_level, got:', initGet);
    process.exit(1);
  }
  console.log(`✓ Baseline global level: ${initGet.data.global_level}`);

  // 2. Set global to DEBUG
  console.log('[2/5] Testing POST /v1/admin/telemetry/log-level (DEBUG)...');
  const setDebug = await request('/v1/admin/telemetry/log-level', {
    method: 'POST',
    body: JSON.stringify({ level: 'DEBUG', target: 'all' }),
  });
  if (setDebug.status !== 200 || setDebug.data?.applied_level !== 'DEBUG') {
    console.error('FAIL: Expected 200 with applied_level=DEBUG, got:', setDebug);
    process.exit(1);
  }
  console.log('✓ Successfully switched global log level to DEBUG');

  // 3. Set tenant override to VERBOSE
  console.log('[3/5] Testing POST /v1/admin/telemetry/log-level (Tenant Override)...');
  const agencyId = '550e8400-e29b-41d4-a716-446655440000';
  const setOverride = await request('/v1/admin/telemetry/log-level', {
    method: 'POST',
    body: JSON.stringify({
      level: 'VERBOSE',
      target: 'outbox',
      tenant_agency_id: agencyId,
      duration_seconds: 600,
    }),
  });
  if (setOverride.status !== 200 || setOverride.data?.applied_level !== 'VERBOSE') {
    console.error('FAIL: Expected 200 with tenant override, got:', setOverride);
    process.exit(1);
  }
  console.log('✓ Successfully set tenant outbox override to VERBOSE');

  // 4. Test validation failure on invalid level
  console.log('[4/5] Testing validation reject on invalid level...');
  const setInvalid = await request('/v1/admin/telemetry/log-level', {
    method: 'POST',
    body: JSON.stringify({ level: 'INVALID_SUPER_LOG' }),
  });
  if (setInvalid.status !== 400) {
    console.error('FAIL: Expected 400 on invalid level, got:', setInvalid.status);
    process.exit(1);
  }
  console.log('✓ Correctly rejected invalid log level with 400 Bad Request');

  // 5. Revert global level to INFO
  console.log('[5/5] Reverting global level to INFO...');
  const revert = await request('/v1/admin/telemetry/log-level', {
    method: 'POST',
    body: JSON.stringify({ level: 'INFO', target: 'all' }),
  });
  if (revert.status !== 200 || revert.data?.applied_level !== 'INFO') {
    console.error('FAIL: Failed to revert to INFO, got:', revert);
    process.exit(1);
  }
  console.log('✓ Successfully restored global level to INFO');

  console.log('\n[PASS] All 5 Dynamic Logging Controller API assertions succeeded!');
}

runSmoke().catch((err) => {
  console.error('Smoke harness error:', err);
  process.exit(1);
});
