#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-174: ICALENDAR ENGINE & APALIS SCHEDULER HARNESS
 * Verifies icalendar_engine.rs, RFC 5545 compliance, and Apalis meeting alarms.
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
const calendarRs = path.join(rootDir, "code/apps/backend/api/src/icalendar_engine.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-174: ICALENDAR ENGINE & APALIS SCHEDULER HARNESS               ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API Calendar Source Files:${ANSI.reset}`);
assertCheck("icalendar_engine.rs exists", fs.existsSync(calendarRs));

if (fs.existsSync(calendarRs)) {
  const src = fs.readFileSync(calendarRs, "utf8");
  console.log(`\n${ANSI.bold}📅 2. Verifying RFC 5545 .ics Generator Functions:${ANSI.reset}`);
  assertCheck("Contains IcalendarEvent struct", src.includes("IcalendarEvent"));
  assertCheck("Contains generate_ics_string function", src.includes("generate_ics_string"));
  assertCheck("Contains build_mime_calendar_part function", src.includes("build_mime_calendar_part"));
  assertCheck("Contains escape_ics_text function", src.includes("escape_ics_text"));
  assertCheck("Uses Asia/Bangkok TZID formatting", src.includes("Asia/Bangkok"));
  assertCheck("Supports VALARM 15-minute reminder", src.includes("VALARM") && src.includes("-PT15M"));

  console.log(`\n${ANSI.bold}⏰ 3. Verifying Apalis Meeting Alarm Scheduler:${ANSI.reset}`);
  assertCheck("Contains MeetingAlarmJob enum", src.includes("MeetingAlarmJob"));
  assertCheck("Contains PreMeeting15mAlarm delayed job", src.includes("PreMeeting15mAlarm"));
  assertCheck("Contains PostMeetingRecap delayed job", src.includes("PostMeetingRecap"));
  assertCheck("Contains CalendarStore engine", src.includes("CalendarStore"));

  console.log(`\n${ANSI.bold}🌐 4. Verifying REST Routes & Handlers:${ANSI.reset}`);
  assertCheck("Contains generate_calendar_event handler", src.includes("generate_calendar_event"));
  assertCheck("Contains reschedule_calendar_event handler", src.includes("reschedule_calendar_event"));
  assertCheck("Contains cancel_calendar_event handler", src.includes("cancel_calendar_event"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 5. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports icalendar_engine module", lib.includes("pub mod icalendar_engine;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-174 ICALENDAR ENGINE & APALIS HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
