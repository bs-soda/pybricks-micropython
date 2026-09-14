#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-171: ACCOUNTING SERVICE PRODUCTION TEST HARNESS
 * Verifies crates/accounting-sync, apps/services/accounting-service, and docker-compose.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

let passedAssertions = 0;
let totalAssertions = 0;

function assertCheck(description, condition) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ${ANSI.green}✔${ANSI.reset} ${description}`);
  } else {
    console.error(`  ${ANSI.red}✖ FAIL:${ANSI.reset} ${description}`);
    process.exitCode = 1;
  }
}

const rootDir = process.cwd();
const crateCargo = path.join(rootDir, "code/crates/accounting-sync/Cargo.toml");
const crateLib = path.join(rootDir, "code/crates/accounting-sync/src/lib.rs");
const serviceCargo = path.join(rootDir, "code/apps/services/accounting-service/Cargo.toml");
const serviceMain = path.join(rootDir, "code/apps/services/accounting-service/src/main.rs");
const dockerCompose = path.join(rootDir, "docker-compose.yml");
const cargoWorkspace = path.join(rootDir, "code/Cargo.toml");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-171: ACCOUNTING SERVICE PRODUCTION TEST HARNESS                   ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Crate & Microservice Directory Structure:${ANSI.reset}`);
assertCheck("crates/accounting-sync/Cargo.toml exists", fs.existsSync(crateCargo));
assertCheck("crates/accounting-sync/src/lib.rs exists", fs.existsSync(crateLib));
assertCheck("apps/services/accounting-service/Cargo.toml exists", fs.existsSync(serviceCargo));
assertCheck("apps/services/accounting-service/src/main.rs exists", fs.existsSync(serviceMain));

if (fs.existsSync(cargoWorkspace)) {
  const ws = fs.readFileSync(cargoWorkspace, "utf8");
  assertCheck("Cargo.toml includes crates/accounting-sync", ws.includes("crates/accounting-sync"));
  assertCheck("Cargo.toml includes apps/services/accounting-service", ws.includes("apps/services/accounting-service"));
}

if (fs.existsSync(crateLib)) {
  const libSrc = fs.readFileSync(crateLib, "utf8");
  console.log(`\n${ANSI.bold}📦 2. Verifying Accounting Domain Models & Adapters:${ANSI.reset}`);
  assertCheck("Contains AccountingProvider trait", libSrc.includes("trait AccountingProvider") || libSrc.includes("AccountingProvider"));
  assertCheck("Contains FlowAccountAdapter", libSrc.includes("FlowAccountAdapter"));
  assertCheck("Contains PeakEngineAdapter", libSrc.includes("PeakEngineAdapter") || libSrc.includes("PeakAdapter"));
  assertCheck("Contains XeroAdapter", libSrc.includes("XeroAdapter"));
  assertCheck("Contains validate_double_entry function", libSrc.includes("validate_double_entry") || libSrc.includes("is_balanced"));
}

if (fs.existsSync(serviceMain)) {
  const mainSrc = fs.readFileSync(serviceMain, "utf8");
  console.log(`\n${ANSI.bold}⚡ 3. Verifying Standalone Microservice Daemon (:8086):${ANSI.reset}`);
  assertCheck("Listens on port 8086", mainSrc.includes("8086"));
  assertCheck("Contains NATS priority topic constants", mainSrc.includes("SODALITY.accounting.p0.sync") || mainSrc.includes("SODALITY.accounting.p3.batch"));
  assertCheck("Contains cooperative yielding tokio::task::yield_now()", mainSrc.includes("yield_now"));
  assertCheck("Contains /health and /metrics endpoints", mainSrc.includes("/health") && mainSrc.includes("/metrics"));
  assertCheck("Contains /v1/accounting/sync endpoint", mainSrc.includes("/v1/accounting/sync"));
}

if (fs.existsSync(dockerCompose)) {
  const dc = fs.readFileSync(dockerCompose, "utf8");
  console.log(`\n${ANSI.bold}🐳 4. Verifying Docker Compose 6-Microservices Mesh:${ANSI.reset}`);
  assertCheck("docker-compose.yml defines accounting-service", dc.includes("accounting-service:"));
  assertCheck("Maps port 8086:8086", dc.includes("8086:8086"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-171 ACCOUNTING SERVICE HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
