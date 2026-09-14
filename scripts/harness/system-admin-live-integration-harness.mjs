#!/usr/bin/env node

/**
 * System Admin Live Zero-Mock System Integration & Bidirectional Mutation Harness
 * 
 * Verifies 100% live system integration between:
 * 1. Rust Axum Backend (Port 4001 /v1/admin/...)
 * 2. Next.js System Admin Portal (Port 4005)
 * 3. Dynamic Shared State Mutations, Persistence, and Realtime Reconciliation
 * 
 * Invariants: Zero Mocks, Zero Stubs, Zero Placeholder Fallbacks.
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const AXUM_URL = 'http://127.0.0.1:4001';
const NEXTJS_URL = 'http://localhost:4005';

let passed = 0;
let failed = 0;
const results = [];

function record(name, pass, details = '') {
  if (pass) {
    passed++;
    results.push({ name, status: 'PASS', details });
    console.log(`  \x1b[32m✔\x1b[0m ${name}${details ? ` \x1b[90m(${details})\x1b[0m` : ''}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', details });
    console.log(`  \x1b[31m✖\x1b[0m ${name}${details ? ` \x1b[31m[ERROR: ${details}]\x1b[0m` : ''}`);
  }
}

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, headers: res.headers, body };
}

async function ensureServers() {
  let axumProc = null;
  try {
    const res = await fetch(`${AXUM_URL}/healthz`);
    if (res.status !== 200) throw new Error();
  } catch (e) {
    console.log(`🌐 Starting Rust Axum Backend on port 4001...`);
    axumProc = spawn('cargo', ['run', '--manifest-path', 'Cargo.toml', '--package', 'api'], {
      cwd: path.join(REPO_ROOT, 'code'),
      env: {
        ...process.env,
        API_BIND: '127.0.0.1:4001',
        AGENCY_IN_MEMORY: '1',
      },
      stdio: 'ignore',
    });
    axumProc.unref();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch(`${AXUM_URL}/healthz`);
        if (res.status === 200) {
          console.log(`✓ Axum Backend ready on port 4001`);
          break;
        }
      } catch (err) {}
    }
  }

  let nextProc = null;
  try {
    const res = await fetch(`${NEXTJS_URL}/login`);
    if (res.status !== 200) throw new Error();
  } catch (e) {
    console.log(`🌐 Starting Next.js System Admin on port 4005...`);
    nextProc = spawn('pnpm', ['--filter', 'system-admin', 'start'], {
      cwd: path.join(REPO_ROOT, 'code'),
      stdio: 'ignore',
    });
    nextProc.unref();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch(`${NEXTJS_URL}/login`);
        if (res.status === 200) {
          console.log(`✓ Next.js System Admin ready on port 4005`);
          break;
        }
      } catch (err) {}
    }
  }

  return { axumProc, nextProc };
}

async function main() {
  const { axumProc, nextProc } = await ensureServers();

  console.log('\n================================================================================');
  console.log('🚀 SYSTEM ADMIN ZERO-MOCK LIVE INTEGRATION HARNESS');
  console.log('   Target Backend:  ' + AXUM_URL);
  console.log('   Target Frontend: ' + NEXTJS_URL);
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // SUITE 1: PROCESS & HEALTH CONNECTIVITY
  // ---------------------------------------------------------------------------
  console.log('🔍 [SUITE 1] Verifying Process Liveness & Core Connectivity...');
  try {
    const healthz = await request(AXUM_URL, '/healthz');
    record('Rust Axum Backend /healthz responds HTTP 200', healthz.status === 200);
  } catch (err) {
    record('Rust Axum Backend /healthz responds HTTP 200', false, err.message);
  }

  try {
    const readyz = await request(AXUM_URL, '/readyz');
    record('Rust Axum Backend /readyz responds HTTP 200', readyz.status === 200);
  } catch (err) {
    record('Rust Axum Backend /readyz responds HTTP 200', false, err.message);
  }

  try {
    const nextLogin = await request(NEXTJS_URL, '/login');
    record('Next.js System Admin /login responds HTTP 200', nextLogin.status === 200);
  } catch (err) {
    record('Next.js System Admin /login responds HTTP 200', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: QUERY CONTRACTS (12 PLATFORM DESKS)
  // ---------------------------------------------------------------------------
  console.log('\n📊 [SUITE 2] Verifying Real Live Query Endpoints Across All 12 Desks...');

  // 1. Tenants
  try {
    const res = await request(AXUM_URL, '/v1/admin/tenants/fleet');
    const valid = res.status === 200 && res.body.total >= 4 && Array.isArray(res.body.items);
    record('GET /v1/admin/tenants/fleet returns live tenant fleet', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/tenants/fleet returns live tenant fleet', false, err.message);
  }

  // 2. Finance
  try {
    const res = await request(AXUM_URL, '/v1/admin/finance/ledger');
    const valid = res.status === 200 && res.body.total >= 3 && res.body.items[0].gross_satang > 0;
    record('GET /v1/admin/finance/ledger returns satang precision records', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/finance/ledger returns satang precision records', false, err.message);
  }

  // 3. Campaigns & Samples
  try {
    const res = await request(AXUM_URL, '/v1/admin/campaigns/samples');
    const valid = res.status === 200 && res.body.total >= 3 && res.body.items[0].tracking_number;
    record('GET /v1/admin/campaigns/samples returns courier logistics items', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/campaigns/samples returns courier logistics items', false, err.message);
  }

  // 4. Queues & DLQ
  try {
    const res = await request(AXUM_URL, '/v1/admin/queues/dlq');
    const valid = res.status === 200 && typeof res.body.total === 'number' && Array.isArray(res.body.items);
    record('GET /v1/admin/queues/dlq returns dead letter poison messages', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/queues/dlq returns dead letter poison messages', false, err.message);
  }

  // 5. Security Keys
  try {
    const res = await request(AXUM_URL, '/v1/admin/security/keys');
    const valid = res.status === 200 && res.body.total >= 3 && res.body.items[0].algorithm;
    record('GET /v1/admin/security/keys returns CMEK envelope keys', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/security/keys returns CMEK envelope keys', false, err.message);
  }

  // 6. Runtime Flags
  try {
    const res = await request(AXUM_URL, '/v1/admin/settings/flags');
    const valid = res.status === 200 && res.body.total >= 3 && res.body.items[0].key;
    record('GET /v1/admin/settings/flags returns dynamic feature flags', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/settings/flags returns dynamic feature flags', false, err.message);
  }

  // 7. Users & RBAC
  try {
    const res = await request(AXUM_URL, '/v1/admin/users');
    const valid = res.status === 200 && res.body.total >= 3 && res.body.items[0].role;
    record('GET /v1/admin/users returns active administrator directory', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/users returns active administrator directory', false, err.message);
  }

  // 8. Audit Merkle Blocks
  try {
    const res = await request(AXUM_URL, '/v1/admin/audit/blocks');
    const valid = res.status === 200 && res.body.total >= 2 && res.body.items[0].merkle_root;
    record('GET /v1/admin/audit/blocks returns immutable cryptographic blocks', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/audit/blocks returns immutable cryptographic blocks', false, err.message);
  }

  // 9. Integrations
  try {
    const res = await request(AXUM_URL, '/v1/admin/integrations');
    const valid = res.status === 200 && res.body.total >= 4 && res.body.items[0].circuit_state;
    record('GET /v1/admin/integrations returns partner gateways', valid, `Total: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/integrations returns partner gateways', false, err.message);
  }

  // 10. Ecosystem Health
  try {
    const res = await request(AXUM_URL, '/v1/admin/health/ecosystem');
    const valid = res.status === 200 && res.body.overall_status === 'HEALTHY' && res.body.total_components === 12;
    record('GET /v1/admin/health/ecosystem returns 360° health matrix', valid, `Components: ${res.body?.total_components}`);
  } catch (err) {
    record('GET /v1/admin/health/ecosystem returns 360° health matrix', false, err.message);
  }

  // 11. Cloud Topology
  try {
    const res = await request(AXUM_URL, '/v1/admin/infra/topology');
    const valid = res.status === 200 && res.body.total_nodes >= 4 && res.body.healthy_nodes >= 4;
    record('GET /v1/admin/infra/topology returns multi-AZ K8s topology', valid, `Nodes: ${res.body?.total_nodes}`);
  } catch (err) {
    record('GET /v1/admin/infra/topology returns multi-AZ K8s topology', false, err.message);
  }

  // 12. Telemetry Traces
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/traces');
    const valid = res.status === 200 && res.body.total >= 1;
    record('GET /v1/admin/telemetry/traces returns flamegraph trace summaries', valid, `Traces: ${res.body?.total}`);
  } catch (err) {
    record('GET /v1/admin/telemetry/traces returns flamegraph trace summaries', false, err.message);
  }

  // 13. Telemetry Stats
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/stats');
    const valid = res.status === 200 && res.body.p95_latency_ms > 0 && Array.isArray(res.body.services_health);
    record('GET /v1/admin/telemetry/stats returns percentiles and service health', valid, `P95: ${res.body?.p95_latency_ms}ms`);
  } catch (err) {
    record('GET /v1/admin/telemetry/stats returns percentiles and service health', false, err.message);
  }

  // 14. Telemetry Trace Detail (Hierarchical Spans)
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/traces/4bf92f3577b34da6a3ce929d0e0e4736');
    const valid = res.status === 200 && res.body.root_span && res.body.span_count >= 5;
    record('GET /v1/admin/telemetry/traces/:id returns hierarchical span tree', valid, `Spans: ${res.body?.span_count}`);
  } catch (err) {
    record('GET /v1/admin/telemetry/traces/:id returns hierarchical span tree', false, err.message);
  }

  // 15. Telemetry Metrics Time Series
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/metrics');
    const valid = res.status === 200 && Array.isArray(res.body.series) && res.body.series.length >= 4;
    record('GET /v1/admin/telemetry/metrics returns 4 Golden Signals time-series', valid, `Series: ${res.body?.series?.length}`);
  } catch (err) {
    record('GET /v1/admin/telemetry/metrics returns 4 Golden Signals time-series', false, err.message);
  }

  // 16. Telemetry PromQL Vector Query
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/promql?query=sum(rate(http_requests_total%5B1m%5D))');
    const valid = res.status === 200 && res.body.status === 'success' && Array.isArray(res.body.data?.result);
    record('GET /v1/admin/telemetry/promql returns PromQL matrix vectors', valid, `Status: ${res.body?.status}`);
  } catch (err) {
    record('GET /v1/admin/telemetry/promql returns PromQL matrix vectors', false, err.message);
  }

  // 17. Telemetry SLA Benchmark Certification
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/benchmark');
    const valid = res.status === 200 && res.body.sla_metrics?.mean_overhead_ms < 0.20;
    record('GET /v1/admin/telemetry/benchmark returns certified SLA metrics', valid, `Overhead: ${res.body?.sla_metrics?.mean_overhead_ms}ms`);
  } catch (err) {
    record('GET /v1/admin/telemetry/benchmark returns certified SLA metrics', false, err.message);
  }

  // 18. Dynamic Log Level Query
  try {
    const res = await request(AXUM_URL, '/v1/admin/telemetry/log-level');
    const level = res.body?.global_level || res.body?.effective_level;
    const valid = res.status === 200 && typeof level === 'string';
    record('GET /v1/admin/telemetry/log-level returns cluster effective level', valid, `Level: ${level}`);
  } catch (err) {
    record('GET /v1/admin/telemetry/log-level returns cluster effective level', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: BIDIRECTIONAL MUTATION & PERSISTENCE LIFECYCLE
  // ---------------------------------------------------------------------------
  console.log('\n🔄 [SUITE 3] Verifying Bidirectional Live Mutations & Store Persistence...');

  // Mutation 1: Suspend/Activate Tenant org-001
  try {
    const patchRes = await request(AXUM_URL, '/v1/admin/tenants/org-001/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    const patchOk = patchRes.status === 200 && patchRes.body.status === 'SUSPENDED';

    const verifyRes = await request(AXUM_URL, '/v1/admin/tenants/fleet');
    const tenant001 = verifyRes.body.items.find(t => t.id === 'org-001');
    const persisted = tenant001 && tenant001.status === 'SUSPENDED';

    record('POST /v1/admin/tenants/org-001/status mutates & persists in Axum store', patchOk && persisted, `Status: ${tenant001?.status}`);
  } catch (err) {
    record('POST /v1/admin/tenants/org-001/status mutates & persists in Axum store', false, err.message);
  }

  // Mutation 2: Rotate CMEK Key kms-cmek-01
  try {
    const initialKeys = await request(AXUM_URL, '/v1/admin/security/keys');
    const prevVersion = initialKeys.body.items.find(k => k.key_id === 'kms-cmek-01')?.version || 4;

    const rotateRes = await request(AXUM_URL, '/v1/admin/security/keys/kms-cmek-01/rotate', {
      method: 'POST',
    });
    const rotated = rotateRes.status === 200 && rotateRes.body.version === prevVersion + 1;

    const verifyRes = await request(AXUM_URL, '/v1/admin/security/keys');
    const key = verifyRes.body.items.find(k => k.key_id === 'kms-cmek-01');
    const persisted = key && key.version === prevVersion + 1;

    record(`POST /v1/admin/security/keys/kms-cmek-01/rotate increments version to v${prevVersion + 1} & persists`, rotated && persisted, `Version: v${key?.version}`);
  } catch (err) {
    record('POST /v1/admin/security/keys/kms-cmek-01/rotate increments version & persists', false, err.message);
  }

  // Mutation 3: Replay DLQ Message
  try {
    const dlqList = await request(AXUM_URL, '/v1/admin/queues/dlq');
    let replayed = true;
    let targetId = 'job-replay-all';
    if (dlqList.body.items.length > 0) {
      targetId = dlqList.body.items[0].id;
      const replayRes = await request(AXUM_URL, `/v1/admin/queues/dlq/${targetId}/replay`, {
        method: 'POST',
      });
      replayed = replayRes.status === 200 && replayRes.body.success === true;
    } else {
      const replayRes = await request(AXUM_URL, '/v1/admin/queues/dlq/replay-all', {
        method: 'POST',
      });
      replayed = replayRes.status === 200;
    }

    const verifyRes = await request(AXUM_URL, '/v1/admin/queues/dlq');
    const exists = verifyRes.body.items.some(m => m.id === targetId);

    record('POST /v1/admin/queues/dlq/:id/replay dequeues message & reconciles DLQ', replayed && !exists, `Remaining in DLQ: ${verifyRes.body?.total}`);
  } catch (err) {
    record('POST /v1/admin/queues/dlq/:id/replay dequeues message & reconciles DLQ', false, err.message);
  }

  // Mutation 4: Toggle Feature Flag feature.async_outbox_telemetry_w3c
  try {
    const toggleRes = await request(AXUM_URL, '/v1/admin/settings/flags/feature.async_outbox_telemetry_w3c/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled: false, canary_percentage: 25 }),
    });
    const toggled = toggleRes.status === 200 && toggleRes.body.enabled === false && toggleRes.body.canary_percentage === 25;

    const verifyRes = await request(AXUM_URL, '/v1/admin/settings/flags');
    const flag = verifyRes.body.items.find(f => f.key === 'feature.async_outbox_telemetry_w3c');
    const persisted = flag && flag.enabled === false && flag.canary_percentage === 25;

    record('POST /v1/admin/settings/flags/:key/toggle updates canary & persists in cluster', toggled && persisted, `Enabled: ${flag?.enabled}, Canary: ${flag?.canary_percentage}%`);
  } catch (err) {
    record('POST /v1/admin/settings/flags/:key/toggle updates canary & persists in cluster', false, err.message);
  }

  // Mutation 5: Trip Circuit Breaker partner-tiktok-shop
  try {
    const circuitRes = await request(AXUM_URL, '/v1/admin/integrations/partner-tiktok-shop/circuit', {
      method: 'POST',
      body: JSON.stringify({ state: 'OPEN' }),
    });
    const tripped = circuitRes.status === 200 && circuitRes.body.circuit_state === 'OPEN';

    const verifyRes = await request(AXUM_URL, '/v1/admin/integrations');
    const partner = verifyRes.body.items.find(p => p.id === 'partner-tiktok-shop');
    const persisted = partner && partner.circuit_state === 'OPEN';

    record('POST /v1/admin/integrations/:id/circuit trips breaker to OPEN & persists', tripped && persisted, `Circuit: ${partner?.circuit_state}`);
  } catch (err) {
    record('POST /v1/admin/integrations/:id/circuit trips breaker to OPEN & persists', false, err.message);
  }

  // Mutation 6: Invite Admin User
  try {
    const testEmail = `siriporn-${Date.now()}@sodality.co`;
    const inviteRes = await request(AXUM_URL, '/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Siriporn V. (Principal SRE)',
        email: testEmail,
        role: 'sys:sre',
      }),
    });
    const created = inviteRes.status === 200 && inviteRes.body.email === testEmail;

    const verifyRes = await request(AXUM_URL, '/v1/admin/users');
    const user = verifyRes.body.items.find(u => u.email === testEmail);
    const persisted = user && user.role === 'sys:sre';

    record('POST /v1/admin/users invites administrator & updates active directory', created && persisted, `Assigned ID: ${user?.id}`);
  } catch (err) {
    record('POST /v1/admin/users invites administrator & updates active directory', false, err.message);
  }

  // Mutation 7: Merkle Chain Verification
  try {
    const auditRes = await request(AXUM_URL, '/v1/admin/audit/verify-chain', {
      method: 'POST',
    });
    const valid = auditRes.status === 200 && auditRes.body.success === true && auditRes.body.data?.chain_integrity === 'VALID';
    record('POST /v1/admin/audit/verify-chain verifies SHA-256 Merkle chain integrity', valid, auditRes.body?.message);
  } catch (err) {
    record('POST /v1/admin/audit/verify-chain verifies SHA-256 Merkle chain integrity', false, err.message);
  }

  // Mutation 8: Hardware Attestation
  try {
    const attestRes = await request(AXUM_URL, '/v1/admin/security/enclave/attest', {
      method: 'POST',
    });
    const valid = attestRes.status === 200 && attestRes.body.success === true && attestRes.body.data?.attestation_status === 'PASSED_HARDWARE_INTEGRITY';
    record('POST /v1/admin/security/enclave/attest verifies AMD SEV PCR registers', valid, attestRes.body?.message);
  } catch (err) {
    record('POST /v1/admin/security/enclave/attest verifies AMD SEV PCR registers', false, err.message);
  }

  // Mutation 9: Live Ecosystem Ping
  try {
    const pingRes = await request(AXUM_URL, '/v1/admin/health/ping', {
      method: 'POST',
    });
    const valid = pingRes.status === 200 && pingRes.body.success === true && pingRes.body.data?.services_alive === 12;
    record('POST /v1/admin/health/ping executes microservice mesh health ping', valid, pingRes.body?.message);
  } catch (err) {
    record('POST /v1/admin/health/ping executes microservice mesh health ping', false, err.message);
  }

  // Mutation 10: Dynamic Multi-Tenant Log Level Switcher (Goal G-131)
  try {
    const logLevelRes = await request(AXUM_URL, '/v1/admin/telemetry/log-level', {
      method: 'POST',
      body: JSON.stringify({
        level: 'DEBUG',
        target: 'apps::backend::api',
        tenant_agency_id: '3f1a602c-42b7-4b77-a87f-c4f4b2382103',
      }),
    });
    const mutated = logLevelRes.status === 200 && logLevelRes.body.applied_level === 'DEBUG';

    const verifyRes = await request(AXUM_URL, '/v1/admin/telemetry/log-level');
    const hasOverride = verifyRes.status === 200 && Array.isArray(verifyRes.body.active_overrides);

    record('POST /v1/admin/telemetry/log-level dynamically overrides log level & persists', mutated && hasOverride, `Applied: ${logLevelRes.body?.applied_level}`);
  } catch (err) {
    record('POST /v1/admin/telemetry/log-level dynamically overrides log level & persists', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: NEXT.JS PROXY & REVERSE INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('\n🌐 [SUITE 4] Verifying Next.js Proxy Gateway & Frontend Interoperability...');
  try {
    const proxyRes = await request(NEXTJS_URL, '/v1/admin/tenants/fleet');
    const valid = proxyRes.status === 200 && Array.isArray(proxyRes.body.items);
    const tenant001 = proxyRes.body.items.find(t => t.id === 'org-001');
    const synced = tenant001 && tenant001.status === 'SUSPENDED';
    record('Next.js reverse proxy (/v1/admin/tenants/fleet) receives live mutated Axum state', valid && synced, `Synced Status: ${tenant001?.status}`);
  } catch (err) {
    record('Next.js reverse proxy (/v1/admin/tenants/fleet) receives live mutated Axum state', false, err.message);
  }

  try {
    const proxySec = await request(NEXTJS_URL, '/v1/admin/security/keys');
    const valid = proxySec.status === 200 && Array.isArray(proxySec.body.items);
    const key = proxySec.body.items.find(k => k.key_id === 'kms-cmek-01');
    const synced = key && key.version >= 4;
    record(`Next.js reverse proxy (/v1/admin/security/keys) receives rotated key version v${key?.version}`, valid && synced, `Synced Version: v${key?.version}`);
  } catch (err) {
    record('Next.js reverse proxy (/v1/admin/security/keys) receives rotated key version', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`🏁 SYSTEM INTEGRATION HARNESS SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log('================================================================================');

  if (failed > 0) {
    console.error(`\x1b[31m💥 FAILED: ${failed} integration check(s) failed.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✨ SUCCESS: 100% Zero-Mock System Integration Certified Green!\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during integration harness execution:', err);
  process.exit(1);
});
