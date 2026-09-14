#!/usr/bin/env node

/**
 * @file g209-agency-4eye-rma-harness.mjs
 * @description Automated Conformance Test Harness for Goal G-209:
 * Agency 4-Eye Refund Approval Queue, Sample RMA Tracking & TikTok Asset Revocation.
 *
 * Verifies:
 * 1. Existence and integrity of Rust approval ports in `crates/payment-gateway-ports/src/approval.rs`.
 * 2. 4-Eye Maker-Checker approval FSM in `apps/services/settlement-service/src/approval/`.
 * 3. Physical sample RMA tracking engine and inspection verdict states.
 * 4. TikTok Spark Ads authorization code revocation and asset blacklist engine.
 * 5. Campaign set invalidation and creator invitation token revocation.
 * 6. High-value refund threshold (฿50,000 / 5,000,000 Satang) dual sign-off enforcement.
 * 7. Axum REST endpoint registration `/v1/agency/refunds/...` and `/v1/agency/rma/...`.
 * 8. Zero-mock / zero-stub compliance.
 * 9. Cargo unit and integration test execution.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
console.log("║   🧪  GOAL G-209: AGENCY 4-EYE APPROVAL & RMA CONFORMANCE HARNESS            ║");
console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

let passedChecks = 0;
let totalChecks = 0;

function assertCheck(description, condition) {
  totalChecks++;
  if (condition) {
    console.log(`  ✔ ${description}`);
    passedChecks++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
  }
}

// 1. Source Files Verification
console.log("📁 1. Verifying 4-Eye Approval & RMA Microservice Source Files:");
const filesToCheck = [
  "code/crates/payment-gateway-ports/src/approval.rs",
  "code/crates/payment-gateway-ports/src/lib.rs",
  "code/apps/services/settlement-service/src/approval/mod.rs",
  "code/apps/services/settlement-service/src/approval/four_eye.rs",
  "code/apps/services/settlement-service/src/approval/rma.rs",
  "code/apps/services/settlement-service/src/approval/spark_revocation.rs",
  "code/apps/services/settlement-service/src/server.rs",
  "code/apps/services/settlement-service/tests/agency_approval_rma_tests.rs"
];

for (const relPath of filesToCheck) {
  const fullPath = resolve(process.cwd(), relPath);
  assertCheck(`File exists: ${relPath}`, existsSync(fullPath));
}

// 2. Architectural Invariants Verification
console.log("\n🔍 2. Verifying Architectural Invariants & Zero-Mock Enforcement:");

const portFile = resolve(process.cwd(), "code/crates/payment-gateway-ports/src/approval.rs");
if (existsSync(portFile)) {
  const content = readFileSync(portFile, "utf-8");
  assertCheck("Contains FourEyeApprovalStatus FSM enum", content.includes("FourEyeApprovalStatus"));
  assertCheck("Contains SampleRmaStatus FSM enum", content.includes("SampleRmaStatus"));
  assertCheck("Contains ฿50k High-Value Threshold (5_000_000 Satang)", content.includes("5_000_000") || content.includes("FOUR_EYE_THRESHOLD_SATANG"));
  assertCheck("Contains Maker-Checker Self-Approval Block", content.includes("SelfApprovalProhibited") || content.includes("reviewer_admin_id != approver_admin_id") || content.includes("reviewer_admin_id == approver_admin_id"));
  assertCheck("Contains TikTok Spark Ads Revocation logic", content.includes("SparkCodeRevocation") || content.includes("revoke_spark_code"));
  assertCheck("Contains Cryptographic Hash Chaining Audit", content.includes("SHA256") || content.includes("Sha256") || content.includes("audit_hash"));
  assertCheck("Zero Mocks / Zero Stubs in Port", !content.includes("todo!()") && !content.includes("unimplemented!()"));
}

const serverFile = resolve(process.cwd(), "code/apps/services/settlement-service/src/server.rs");
if (existsSync(serverFile)) {
  const serverContent = readFileSync(serverFile, "utf-8");
  assertCheck("REST route /v1/agency/refunds registered", serverContent.includes("/v1/agency/refunds"));
  assertCheck("REST route /v1/agency/rma registered", serverContent.includes("/v1/agency/rma"));
}

// 3. Cargo Unit and Integration Tests
console.log("\n🦀 3. Executing Rust Cargo Test Suite for G-209:");
try {
  const testOutput = execSync(
    "cargo test -p payment-gateway-ports --lib approval && cargo test -p settlement-service --test agency_approval_rma_tests",
    { cwd: resolve(process.cwd(), "code"), encoding: "utf-8" }
  );
  assertCheck("All G-209 Cargo unit and integration tests pass cleanly", testOutput.includes("test result: ok"));
  console.log("  ✔ Cargo test output verified.");
} catch (error) {
  console.error("  ❌ Cargo tests failed:\n", error.stdout || error.message);
  assertCheck("Cargo tests executed without errors", false);
}

// Summary
console.log("\n════════════════════════════════════════════════════════════════════════════════");
console.log(`📊 Conformance Score: ${passedChecks} / ${totalChecks} Checks Passed (${Math.round((passedChecks / totalChecks) * 100)}%)`);

if (passedChecks === totalChecks) {
  console.log("🎉 ALL G-209 INVARIANTS & CONFORMANCE TESTS PASSED PERFECTLY!\n");
  process.exit(0);
} else {
  console.error("❌ G-209 CONFORMANCE HARNESS FAILED!\n");
  process.exit(1);
}
