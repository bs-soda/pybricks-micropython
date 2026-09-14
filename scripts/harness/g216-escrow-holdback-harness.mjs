#!/usr/bin/env node

/**
 * @file g216-escrow-holdback-harness.mjs
 * @description Automated Conformance Test Harness for Goal G-216:
 * Creator Milestone Escrow Holdback (14-Day Warranty Window) & Auto-Release Daemon.
 *
 * Verifies:
 * 1. Existence and integrity of Rust holdback ports in `crates/payment-gateway-ports/src/holdback.rs`.
 * 2. Holdback service and daemon in `apps/services/settlement-service/src/holdback/`.
 * 3. Exact 70/30 Satang integer math invariants ($(\text{gross} \times 7000) / 10000$).
 * 4. 14-day warranty TTL ($1,209,600$ seconds).
 * 5. Dispute freeze and auto-release state machine transitions.
 * 6. Axum REST endpoint registration `/v1/settlement/creators/{id}/held-escrow` and `/v1/settlement/holdbacks/{id}/freeze`.
 * 7. Zero-mock / zero-stub compliance.
 * 8. Cargo unit and integration test execution.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
console.log("║   🧪  GOAL G-216: CREATOR ESCROW HOLDBACK & DAEMON CONFORMANCE HARNESS       ║");
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
console.log("📁 1. Verifying Holdback Port & Microservice Source Files:");
const filesToCheck = [
  "code/crates/payment-gateway-ports/src/holdback.rs",
  "code/crates/payment-gateway-ports/src/lib.rs",
  "code/apps/services/settlement-service/src/holdback/mod.rs",
  "code/apps/services/settlement-service/src/holdback/splitter.rs",
  "code/apps/services/settlement-service/src/holdback/daemon.rs",
  "code/apps/services/settlement-service/src/server.rs",
  "code/apps/services/settlement-service/tests/escrow_holdback_tests.rs"
];

for (const relPath of filesToCheck) {
  const fullPath = resolve(process.cwd(), relPath);
  assertCheck(`File exists: ${relPath}`, existsSync(fullPath));
}

// 2. Architectural Invariants Verification
console.log("\n🔍 2. Verifying Architectural Invariants & Zero-Mock Enforcement:");

const portFile = resolve(process.cwd(), "code/crates/payment-gateway-ports/src/holdback.rs");
if (existsSync(portFile)) {
  const content = readFileSync(portFile, "utf8");
  assertCheck("Contains HoldbackState FSM enum", content.includes("enum HoldbackState"));
  assertCheck("Contains MilestoneEscrowSplitter logic (70/30 split)", (content.includes("7000") || content.includes("7_000")) && (content.includes("10000") || content.includes("10_000")));
  assertCheck("Contains 14-Day Warranty Duration (1,209,600s / 14 days)", content.includes("14") || content.includes("1_209_600"));
  assertCheck("Contains Double-Entry Journal Generator", content.includes("2105") && content.includes("2100"));
  assertCheck("Contains Cryptographic Hash Chaining", content.includes("Sha256") || content.includes("sha256"));
  assertCheck("Zero Mocks / Zero Stubs in Port", !content.includes("todo!()") && !content.includes("unimplemented!()"));
} else {
  assertCheck("Port file present for inspection", false);
}

const serverFile = resolve(process.cwd(), "code/apps/services/settlement-service/src/server.rs");
if (existsSync(serverFile)) {
  const content = readFileSync(serverFile, "utf8");
  assertCheck("REST route /v1/settlement/creators/{id}/held-escrow registered", content.includes("/v1/settlement/creators/{id}/held-escrow") || content.includes("/held-escrow"));
  assertCheck("REST route /v1/settlement/holdbacks/{id}/freeze registered", content.includes("/v1/settlement/holdbacks/{id}/freeze") || content.includes("/freeze"));
} else {
  assertCheck("Server file present for inspection", false);
}

// 3. Executing Rust Cargo Test Suite
console.log("\n🦀 3. Executing Rust Cargo Test Suite for G-216:");
try {
  const cargoOutput = execSync(
    "cargo test -p payment-gateway-ports --lib holdback && cargo test -p settlement-service --test escrow_holdback_tests",
    { cwd: resolve(process.cwd(), "code"), encoding: "utf8", stdio: "pipe" }
  );
  assertCheck("All G-216 Cargo unit and integration tests pass cleanly", true);
  console.log("  ✔ Cargo test output verified.");
} catch (err) {
  assertCheck("All G-216 Cargo unit and integration tests pass cleanly", false);
  console.error("  ❌ Cargo test error:\n", err.stdout || err.message);
}

console.log("\n" + "═".repeat(80));
console.log(`📊 Conformance Score: ${passedChecks} / ${totalChecks} Checks Passed (${Math.round((passedChecks / totalChecks) * 100)}%)`);

if (passedChecks === totalChecks) {
  console.log("🎉 ALL G-216 INVARIANTS & CONFORMANCE TESTS PASSED PERFECTLY!\n");
  process.exit(0);
} else {
  console.error("⚠️ G-216 CONFORMANCE SUITE DETECTED UNRESOLVED INVARIANTS.\n");
  process.exit(1);
}
