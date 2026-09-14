#!/usr/bin/env node
/**
 * Universal Out-of-Process HTTP API Smoke Test Harness (Soda OS)
 *
 * Usage:
 *   node scripts/http-smoke/smoke-runner.example.mjs
 *   API_BASE_URL=http://localhost:3000 node scripts/http-smoke/smoke-runner.example.mjs
 *
 * Purpose:
 *   Performs black-box HTTP verification against live running microservice daemons.
 *   Tests real network sockets, status codes, JSON wire serialization, and Bearer authentication.
 */

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8080";

async function runSmokeTests() {
  console.log(`\n🚀 Starting Out-of-Process HTTP Smoke Test against ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  // Helper: Assert HTTP Response
  async function assertRequest(name, path, options = {}, expectedStatus = 200) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, options);
      if (res.status === expectedStatus) {
        console.log(`✅ [PASS] ${name} (${options.method || "GET"} ${path}) -> HTTP ${res.status}`);
        passed++;
        return await res.json().catch(() => ({}));
      } else {
        console.error(`❌ [FAIL] ${name} (${options.method || "GET"} ${path}) -> Expected HTTP ${expectedStatus}, Got ${res.status}`);
        failed++;
        return null;
      }
    } catch (err) {
      console.error(`💥 [ERROR] ${name} (${path}) Connection Failed: ${err.message}`);
      failed++;
      return null;
    }
  }

  // 1. Health Probe Verification
  await assertRequest("System Health Check", "/health", { method: "GET" }, 200);

  // 2. Add Feature/Domain Specific Smoke Tests below...

  console.log("\n=======================================================");
  console.log(`📊 Smoke Harness Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error("Unhandled harness failure:", err);
  process.exit(1);
});
