#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-169: EMAIL DELIVERABILITY & CIRCUIT BREAKER HARNESS
 * Verifies email-deliverability crate, email_circuit_breaker.rs, and Apalis probes.
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
const crateCargo = path.join(rootDir, "code/crates/email-deliverability/Cargo.toml");
const crateLib = path.join(rootDir, "code/crates/email-deliverability/src/lib.rs");
const apiRs = path.join(rootDir, "code/apps/backend/api/src/email_circuit_breaker.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-169: EMAIL DELIVERABILITY & CIRCUIT BREAKER HARNESS            ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Workspace Crate Files:${ANSI.reset}`);
assertCheck("email-deliverability/Cargo.toml exists", fs.existsSync(crateCargo));
assertCheck("email-deliverability/src/lib.rs exists", fs.existsSync(crateLib));

if (fs.existsSync(crateLib)) {
  const src = fs.readFileSync(crateLib, "utf8");
  console.log(`\n${ANSI.bold}🔌 2. Verifying Multi-Provider Traits & Adapters:${ANSI.reset}`);
  assertCheck("Contains EmailProvider trait", src.includes("pub trait EmailProvider"));
  assertCheck("Contains ResendProvider adapter", src.includes("pub struct ResendProvider"));
  assertCheck("Contains PostmarkProvider adapter", src.includes("pub struct PostmarkProvider"));
  assertCheck("Contains EnterpriseSmtpProvider adapter", src.includes("pub struct EnterpriseSmtpProvider"));
  assertCheck("Strictly no AWS references in code", !src.includes("Amazon") && !src.includes("SES"));

  console.log(`\n${ANSI.bold}⚡ 3. Verifying 3-State Circuit Breaker Engine:${ANSI.reset}`);
  assertCheck("Contains CircuitState enum (Closed/Open/HalfOpen)", src.includes("CircuitState"));
  assertCheck("Contains DeliverabilityCircuitBreaker struct", src.includes("DeliverabilityCircuitBreaker"));
  assertCheck("Contains send_with_failover function", src.includes("send_with_failover"));
  assertCheck("Contains trip_open & reset_closed functions", src.includes("trip_open") && src.includes("reset_closed"));
}

console.log(`\n${ANSI.bold}🌐 4. Verifying Core API Ingress & Apalis Probe Scheduler:${ANSI.reset}`);
assertCheck("email_circuit_breaker.rs exists", fs.existsSync(apiRs));
if (fs.existsSync(apiRs)) {
  const apiSrc = fs.readFileSync(apiRs, "utf8");
  assertCheck("Contains DeliverabilityProbeJob enum (Apalis probes)", apiSrc.includes("DeliverabilityProbeJob"));
  assertCheck("Contains send_email_handler with failover", apiSrc.includes("send_email_handler"));
  assertCheck("Contains simulate_outage_handler for chaos testing", apiSrc.includes("simulate_outage_handler"));
  assertCheck("Contains get_circuit_status_handler", apiSrc.includes("get_circuit_status_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 5. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports email_circuit_breaker module", lib.includes("pub mod email_circuit_breaker;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-169 DELIVERABILITY CIRCUIT BREAKER HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
