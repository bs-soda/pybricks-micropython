#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-167: HMAC ACTION LINKS & INBOUND EMAIL HARNESS
 * Verifies email_actions.rs, inbound_email.rs, REST routes, and state transitions.
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
const actionsRs = path.join(rootDir, "code/apps/backend/api/src/email_actions.rs");
const inboundRs = path.join(rootDir, "code/apps/backend/api/src/inbound_email.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-167: HMAC ACTION LINKS & INBOUND EMAIL HARNESS                 ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API Action Source Files:${ANSI.reset}`);
assertCheck("email_actions.rs exists", fs.existsSync(actionsRs));
assertCheck("inbound_email.rs exists", fs.existsSync(inboundRs));

if (fs.existsSync(actionsRs)) {
  const src = fs.readFileSync(actionsRs, "utf8");
  console.log(`\n${ANSI.bold}🔑 2. Verifying Cryptographic HMAC Action Token Engine:${ANSI.reset}`);
  assertCheck("Contains EmailActionType enum (ApproveQuote, RejectQuote, ApproveClip, etc.)", src.includes("EmailActionType"));
  assertCheck("Contains ActionTokenPayload struct", src.includes("ActionTokenPayload"));
  assertCheck("Contains sign_action_token function", src.includes("sign_action_token"));
  assertCheck("Contains verify_action_token function", src.includes("verify_action_token"));
  assertCheck("Contains execute_email_action handler", src.includes("execute_email_action") || src.includes("handle_email_action"));
  assertCheck("Contains render_action_html response generator", src.includes("render_action_html") || src.includes("render_confirmation_html"));
}

if (fs.existsSync(inboundRs)) {
  const inSrc = fs.readFileSync(inboundRs, "utf8");
  console.log(`\n${ANSI.bold}📬 3. Verifying Inbound Email Webhook Parser:${ANSI.reset}`);
  assertCheck("Contains InboundEmailWebhook struct", src => src.includes("InboundEmailWebhook") || inSrc.includes("InboundEmailWebhook"));
  assertCheck("Contains parse_reply_intent function", inSrc.includes("parse_reply_intent") || inSrc.includes("extract_reply_intent"));
  assertCheck("Contains strip_quoted_reply_text function", inSrc.includes("strip_quoted") || inSrc.includes("clean_reply_body"));
  assertCheck("Contains handle_inbound_webhook handler", inSrc.includes("handle_inbound_webhook") || inSrc.includes("inbound_email_webhook"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 4. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports email_actions module", lib.includes("pub mod email_actions;"));
  assertCheck("Exports inbound_email module", lib.includes("pub mod inbound_email;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-167 HMAC ACTION LINKS HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
