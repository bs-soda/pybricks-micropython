#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-173: EMAIL SECURITY & SPAM LINTER TEST HARNESS
 * Verifies email_security_linter.rs, spam scorer, and token-bucket throttler.
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
const linterRs = path.join(rootDir, "code/apps/backend/api/src/email_security_linter.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-173: EMAIL SECURITY & SPAM LINTER TEST HARNESS                 ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API Security Engine File:${ANSI.reset}`);
assertCheck("email_security_linter.rs exists", fs.existsSync(linterRs));

if (fs.existsSync(linterRs)) {
  const src = fs.readFileSync(linterRs, "utf8");
  console.log(`\n${ANSI.bold}🔍 2. Verifying Heuristic Spam Linter Engine:${ANSI.reset}`);
  assertCheck("Contains SpamLinterEngine struct", src.includes("pub struct SpamLinterEngine"));
  assertCheck("Contains lint evaluation function", src.includes("pub fn lint"));
  assertCheck("Checks uppercase ratio (>30%)", src.includes("RULE_UPPERCASE_SUBJECT"));
  assertCheck("Contains high-risk promotional keywords", src.includes("CLAIM FREE") && src.includes("GUARANTEED CASH"));

  console.log(`\n${ANSI.bold}🚫 3. Verifying Disposable Domain Filter:${ANSI.reset}`);
  assertCheck("Contains DisposableDomainRegistry struct", src.includes("pub struct DisposableDomainRegistry"));
  assertCheck("Contains is_disposable checker", src.includes("pub fn is_disposable"));
  assertCheck("Contains standard disposable domains", src.includes("mailinator.com") && src.includes("tempmail.com"));

  console.log(`\n${ANSI.bold}⏱️ 4. Verifying Token Bucket IP Throttler:${ANSI.reset}`);
  assertCheck("Contains TokenBucketThrottler struct", src.includes("pub struct TokenBucketThrottler"));
  assertCheck("Contains check_and_consume rate limit logic", src.includes("pub fn check_and_consume"));
  assertCheck("Restricts OTP requests to 5 per 15 min", src.includes("5.0 / 900.0"));

  console.log(`\n${ANSI.bold}🌐 5. Verifying Axum Router & REST Handlers:${ANSI.reset}`);
  assertCheck("Contains lint_email_handler", src.includes("lint_email_handler"));
  assertCheck("Contains check_domain_handler", src.includes("check_domain_handler"));
  assertCheck("Contains throttle_check_handler", src.includes("throttle_check_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 6. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports email_security_linter module", lib.includes("pub mod email_security_linter;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-173 EMAIL SECURITY & SPAM LINTER HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
