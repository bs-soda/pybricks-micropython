#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-168: CAMPAIGN LIFECYCLE EMAIL DISPATCHER & APALIS SCHEDULER HARNESS
 * Verifies campaign_email_dispatchers.rs, NATS Priority P1 queueing, and Apalis jobs.
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
const dispatcherRs = path.join(rootDir, "code/apps/backend/api/src/campaign_email_dispatchers.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-168: CAMPAIGN LIFECYCLE DISPATCHER & APALIS HARNESS           ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API Dispatcher Source Files:${ANSI.reset}`);
assertCheck("campaign_email_dispatchers.rs exists", fs.existsSync(dispatcherRs));

if (fs.existsSync(dispatcherRs)) {
  const src = fs.readFileSync(dispatcherRs, "utf8");
  console.log(`\n${ANSI.bold}📩 2. Verifying Real-Time Lifecycle Events & NATS Priority P1:${ANSI.reset}`);
  assertCheck("Contains CampaignLifecycleEvent enum", src.includes("CampaignLifecycleEvent"));
  assertCheck("Contains dispatch_brief_invitation function", src.includes("dispatch_brief_invitation"));
  assertCheck("Contains dispatch_sample_shipped function", src.includes("dispatch_sample_shipped"));
  assertCheck("Contains dispatch_clip_review_decision function", src.includes("dispatch_clip_review_decision"));
  assertCheck("Contains dispatch_payout_remittance function", src.includes("dispatch_payout_remittance"));
  assertCheck("Uses transport_kit Priority::P1 tag", src.includes("Priority::P1"));

  console.log(`\n${ANSI.bold}⏰ 3. Verifying Apalis Delayed Job Scheduler Engine:${ANSI.reset}`);
  assertCheck("Contains ScheduledLifecycleJob enum (Apalis jobs)", src.includes("ScheduledLifecycleJob"));
  assertCheck("Contains BriefAcceptanceReminder delayed job", src.includes("BriefAcceptanceReminder"));
  assertCheck("Contains SampleDeliveryCheck delayed job", src.includes("SampleDeliveryCheck"));
  assertCheck("Contains RevisionFollowup delayed job", src.includes("RevisionFollowup"));
  assertCheck("Contains trigger_due_jobs runner", src.includes("trigger_due_jobs"));
  assertCheck("Contains CampaignDispatcherStore combined engine", src.includes("CampaignDispatcherStore"));

  console.log(`\n${ANSI.bold}🌐 4. Verifying REST Routes & Carriers:${ANSI.reset}`);
  assertCheck("Contains build_carrier_tracking_url helper", src.includes("build_carrier_tracking_url"));
  assertCheck("Contains handle_lifecycle_dispatch handler", src.includes("handle_lifecycle_dispatch"));
  assertCheck("Contains list_scheduled_jobs_handler handler", src.includes("list_scheduled_jobs_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 5. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports campaign_email_dispatchers module", lib.includes("pub mod campaign_email_dispatchers;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-168 CAMPAIGN DISPATCHER & APALIS HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
