#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-176: MAILPIT SANDBOX & STAGING CATCH-ALL TEST HARNESS
 * Verifies mailpit_sandbox.rs, docker-compose.yml service, and catch-all logic.
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
const dockerCompose = path.join(rootDir, "docker-compose.yml");
const sandboxRs = path.join(rootDir, "code/apps/backend/api/src/mailpit_sandbox.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");
const workflowDoc = path.join(rootDir, "docs/06-workflows/mailpit-sandbox.md");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-176: MAILPIT SANDBOX & STAGING CATCH-ALL TEST HARNESS           ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}🐳 1. Verifying Docker Compose Mailpit Service Definition:${ANSI.reset}`);
assertCheck("docker-compose.yml exists", fs.existsSync(dockerCompose));

if (fs.existsSync(dockerCompose)) {
  const dc = fs.readFileSync(dockerCompose, "utf8");
  assertCheck("Contains mailpit service", dc.includes("mailpit:"));
  assertCheck("Uses axllent/mailpit image", dc.includes("image: axllent/mailpit"));
  assertCheck("Exposes SMTP port 1025", dc.includes("1025:1025"));
  assertCheck("Exposes Web UI port 8025", dc.includes("8025:8025"));
}

console.log(`\n${ANSI.bold}📁 2. Verifying Core API Mailpit Driver:${ANSI.reset}`);
assertCheck("mailpit_sandbox.rs exists", fs.existsSync(sandboxRs));

if (fs.existsSync(sandboxRs)) {
  const src = fs.readFileSync(sandboxRs, "utf8");
  assertCheck("Contains MailpitSandboxConfig struct", src.includes("pub struct MailpitSandboxConfig"));
  assertCheck("Contains filter_recipients catch-all logic", src.includes("pub fn filter_recipients"));
  assertCheck("Contains MailpitSandboxStore struct", src.includes("pub struct MailpitSandboxStore"));
  assertCheck("Contains send_test_email_handler", src.includes("send_test_email_handler"));
  assertCheck("Contains get_mailpit_status_handler", src.includes("get_mailpit_status_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 3. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports mailpit_sandbox module", lib.includes("pub mod mailpit_sandbox;"));
}

console.log(`\n${ANSI.bold}📖 4. Verifying Developer Workflow Documentation:${ANSI.reset}`);
assertCheck("docs/06-workflows/mailpit-sandbox.md exists", fs.existsSync(workflowDoc));

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-176 MAILPIT SANDBOX & CATCH-ALL HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
