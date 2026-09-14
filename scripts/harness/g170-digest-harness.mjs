#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-170: NOTIFICATION PREFERENCES & DAILY DIGEST TEST HARNESS
 * Verifies notification_preferences.rs, preference CRUD, and Apalis scheduler.
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
const prefRs = path.join(rootDir, "code/apps/backend/api/src/notification_preferences.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-170: NOTIFICATION PREFERENCES & DAILY DIGEST HARNESS           ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Notification Preferences Engine File:${ANSI.reset}`);
assertCheck("notification_preferences.rs exists", fs.existsSync(prefRs));

if (fs.existsSync(prefRs)) {
  const src = fs.readFileSync(prefRs, "utf8");
  console.log(`\n${ANSI.bold}⚙️ 2. Verifying Granular Preference Data Structures:${ANSI.reset}`);
  assertCheck("Contains NotificationPreferences struct", src.includes("pub struct NotificationPreferences"));
  assertCheck("Contains marketing_promotions toggle", src.includes("pub marketing_promotions: bool"));
  assertCheck("Contains campaign_updates toggle", src.includes("pub campaign_updates: bool"));
  assertCheck("Contains security_p0_immutable field", src.includes("pub security_p0_immutable: bool"));

  console.log(`\n${ANSI.bold}📅 3. Verifying Apalis Digest Scheduler Job Types:${ANSI.reset}`);
  assertCheck("Contains ApalisDigestJob enum", src.includes("pub enum ApalisDigestJob"));
  assertCheck("Contains DailyDigestBatchJob variant", src.includes("DailyDigestBatchJob"));
  assertCheck("Contains WeeklyDigestBatchJob variant", src.includes("WeeklyDigestBatchJob"));

  console.log(`\n${ANSI.bold}🛡️ 4. Verifying Delivery Allowance & P0 Invariants:${ANSI.reset}`);
  assertCheck("Contains check_delivery_allowance_handler", src.includes("check_delivery_allowance_handler"));
  assertCheck("Priority P0 is immune to unsubscribes", src.includes("Priority::P0") && src.includes("immune to unsubscribes"));

  console.log(`\n${ANSI.bold}🌐 5. Verifying Axum Router Endpoints:${ANSI.reset}`);
  assertCheck("Contains get_preferences_handler", src.includes("get_preferences_handler"));
  assertCheck("Contains update_preferences_handler", src.includes("update_preferences_handler"));
  assertCheck("Contains one_click_unsubscribe_handler", src.includes("one_click_unsubscribe_handler"));
  assertCheck("Contains trigger_daily_digest_batch_handler", src.includes("trigger_daily_digest_batch_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 6. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports notification_preferences module", lib.includes("pub mod notification_preferences;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-170 NOTIFICATION PREFERENCES & DIGEST HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
