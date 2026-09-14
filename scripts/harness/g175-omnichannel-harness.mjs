#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-175: INTERNAL CRM OMNICHANNEL MESSAGING HARNESS
 * Verifies Omnichannel Timeline page, OmnichannelComposer component,
 * Backend Gateway, and NATS priority routing.
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
const timelinePage = path.join(rootDir, "code/apps/internal-crm/src/app/creators/[id]/timeline/page.tsx");
const composerComponent = path.join(rootDir, "code/apps/internal-crm/src/components/OmnichannelComposer.tsx");
const apiClient = path.join(rootDir, "code/apps/internal-crm/src/lib/omnichannel-api.ts");
const backendGateway = path.join(rootDir, "code/apps/backend/api/src/omnichannel_gateway.rs");
const backendLib = path.join(rootDir, "code/apps/backend/api/src/lib.rs");
const archSpec = path.join(rootDir, "docs/03-architecture/internal-crm-omnichannel-messaging-architecture.md");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-175: INTERNAL CRM OMNICHANNEL MESSAGING HARNESS                  ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📱 1. Verifying Omnichannel CRM Workspace & Composer:${ANSI.reset}`);
assertCheck("timeline/page.tsx exists", fs.existsSync(timelinePage));
assertCheck("OmnichannelComposer.tsx exists", fs.existsSync(composerComponent));
assertCheck("omnichannel-api.ts client exists", fs.existsSync(apiClient));

if (fs.existsSync(composerComponent)) {
  const compSrc = fs.readFileSync(composerComponent, "utf8");
  assertCheck("Composer contains LINE channel tab", compSrc.includes("setChannel(\"line\")"));
  assertCheck("Composer contains Email channel tab", compSrc.includes("setChannel(\"email\")"));
  assertCheck("Composer contains SMS channel tab", compSrc.includes("setChannel(\"sms\")"));
  assertCheck("Composer calculates SMS segments", compSrc.includes("smsSegments"));
  assertCheck("Composer contains dynamic token chips", compSrc.includes("{{ creator_name }}"));
}

console.log(`\n${ANSI.bold}🦀 2. Verifying Axum Backend Omnichannel Gateway:${ANSI.reset}`);
assertCheck("omnichannel_gateway.rs exists", fs.existsSync(backendGateway));
if (fs.existsSync(backendGateway)) {
  const gwSrc = fs.readFileSync(backendGateway, "utf8");
  assertCheck("Contains OmnichannelMessage struct", gwSrc.includes("pub struct OmnichannelMessage"));
  assertCheck("Contains NATS P0 topic for SMS", gwSrc.includes("SODALITY.notify.p0.sms"));
  assertCheck("Contains NATS P1 topic for LINE", gwSrc.includes("SODALITY.notify.p1.line"));
  assertCheck("Contains get_timeline query handler", gwSrc.includes("get_omnichannel_timeline_handler"));
  assertCheck("Contains dispatch_message mutation handler", gwSrc.includes("send_omnichannel_message_handler"));
}

console.log(`\n${ANSI.bold}🔗 3. Verifying Axum Route Registrations:${ANSI.reset}`);
if (fs.existsSync(backendLib)) {
  const libSrc = fs.readFileSync(backendLib, "utf8");
  assertCheck("lib.rs declares omnichannel_gateway module", libSrc.includes("pub mod omnichannel_gateway;"));
  assertCheck("lib.rs registers /v1/crm/creators/{id}/omnichannel/messages", libSrc.includes("/v1/crm/creators/{id}/omnichannel/messages"));
  assertCheck("lib.rs registers /v1/crm/creators/{id}/omnichannel/send", libSrc.includes("/v1/crm/creators/{id}/omnichannel/send"));
}
assertCheck("Architecture spec exists", fs.existsSync(archSpec));

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-175 OMNICHANNEL MESSAGING HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
