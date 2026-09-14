#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-163: INTERNAL CRM CREATOR EMAIL & DUNNING CADENCE HARNESS
 * Verifies backend REST routes, frontend page component, modal composer,
 * and API client models.
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
const backendGateway = path.join(rootDir, "code/apps/backend/api/src/crm_gateway.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");
const messagesPage = path.join(rootDir, "code/apps/internal-crm/src/app/creators/[id]/messages/page.tsx");
const composerComp = path.join(rootDir, "code/apps/internal-crm/src/components/EmailComposerModal.tsx");
const apiClient = path.join(rootDir, "code/apps/internal-crm/src/lib/crm-email-api.ts");
const archSpec = path.join(rootDir, "docs/03-architecture/internal-crm-email-dunning-architecture.md");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-163: CRM EMAIL & DUNNING CADENCE TEST HARNESS                   ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API CRM Gateway & Models:${ANSI.reset}`);
assertCheck("crm_gateway.rs exists", fs.existsSync(backendGateway));

if (fs.existsSync(backendGateway)) {
  const src = fs.readFileSync(backendGateway, "utf8");
  assertCheck("Contains CrmCreatorEmailMessage struct", src.includes("pub struct CrmCreatorEmailMessage"));
  assertCheck("Contains CrmDunningCadencePlan struct", src.includes("pub struct CrmDunningCadencePlan"));
  assertCheck("Contains get_creator_email_history_handler", src.includes("get_creator_email_history_handler"));
  assertCheck("Contains send_creator_email_handler", src.includes("send_creator_email_handler"));
  assertCheck("Contains configure_dunning_cadence_handler", src.includes("configure_dunning_cadence_handler"));
  assertCheck("Contains cancel_dunning_cadence_handler", src.includes("cancel_dunning_cadence_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 2. Verifying Axum Router Registrations in lib.rs:${ANSI.reset}`);
  assertCheck("Routes /v1/crm/creators/{id}/messages", lib.includes("/v1/crm/creators/{id}/messages"));
  assertCheck("Routes /v1/crm/creators/{id}/messages/send", lib.includes("/v1/crm/creators/{id}/messages/send"));
  assertCheck("Routes /v1/crm/creators/{id}/dunning/configure", lib.includes("/v1/crm/creators/{id}/dunning/configure"));
  assertCheck("Routes /v1/crm/creators/{id}/dunning/cancel", lib.includes("/v1/crm/creators/{id}/dunning/cancel"));
}

console.log(`\n${ANSI.bold}💻 3. Verifying Internal CRM Frontend Workspace:${ANSI.reset}`);
assertCheck("creators/[id]/messages/page.tsx exists", fs.existsSync(messagesPage));
assertCheck("components/EmailComposerModal.tsx exists", fs.existsSync(composerComp));
assertCheck("lib/crm-email-api.ts exists", fs.existsSync(apiClient));

if (fs.existsSync(messagesPage)) {
  const page = fs.readFileSync(messagesPage, "utf8");
  assertCheck("Contains 3-Stage Dunning Panel", page.includes("Automated 3-Stage Dunning Cadence"));
  assertCheck("Contains Chronological Timeline", page.includes("Chronological Interaction"));
}

console.log(`\n${ANSI.bold}📖 4. Verifying Architecture Documentation:${ANSI.reset}`);
assertCheck("docs/03-architecture/internal-crm-email-dunning-architecture.md exists", fs.existsSync(archSpec));

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-163 CRM EMAIL & DUNNING HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
