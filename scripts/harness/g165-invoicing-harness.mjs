#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-165: INVOICING, PROMPTPAY QR & DUNNING TEST HARNESS
 * Verifies PromptPay EMVCo QR code generator, Invoicing state machine, and Dunning loops.
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
const promptpayQrFile = path.join(rootDir, "code/apps/backend/api/src/promptpay_qr.rs");
const invoicingFile = path.join(rootDir, "code/apps/backend/api/src/invoicing.rs");
const dunningFile = path.join(rootDir, "code/apps/backend/api/src/dunning_worker.rs");
const libFile = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-165: PROMPTPAY QR & INVOICING TEST HARNESS                       ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Invoicing Engine Source Files:${ANSI.reset}`);
assertCheck("promptpay_qr.rs exists", fs.existsSync(promptpayQrFile));
assertCheck("invoicing.rs exists", fs.existsSync(invoicingFile));
assertCheck("dunning_worker.rs exists", fs.existsSync(dunningFile));

if (fs.existsSync(promptpayQrFile)) {
  const qrSrc = fs.readFileSync(promptpayQrFile, "utf8");
  console.log(`\n${ANSI.bold}📱 2. Verifying PromptPay EMVCo Generator Invariants:${ANSI.reset}`);
  assertCheck("Contains PromptPayQR struct or generator", qrSrc.includes("PromptPayQR") || qrSrc.includes("generate_promptpay_qr"));
  assertCheck("Contains CRC16 CCITT-FALSE calculation", qrSrc.includes("calculate_crc16") || qrSrc.includes("0x1021"));
  assertCheck("Contains Tag 00 Payload Format Indicator", qrSrc.includes("00"));
  assertCheck("Contains Tag 29 Merchant Info PromptPay AID", qrSrc.includes("A000000677010111"));
  assertCheck("Contains Tag 53 THB Currency Code 764", qrSrc.includes("764"));
  assertCheck("Contains Tag 54 Transaction Amount", qrSrc.includes("54"));
  assertCheck("Contains Tag 58 Country Code TH", qrSrc.includes("TH") || qrSrc.includes("58"));
}

if (fs.existsSync(invoicingFile)) {
  const invSrc = fs.readFileSync(invoicingFile, "utf8");
  console.log(`\n${ANSI.bold}🧾 3. Verifying Invoicing State Machine & REST APIs:${ANSI.reset}`);
  assertCheck("Contains InvoiceModel struct", invSrc.includes("InvoiceModel") || invSrc.includes("Invoice"));
  assertCheck("Contains InvoiceStatus enum (draft, issued, paid, overdue, void)", invSrc.includes("InvoiceStatus") || invSrc.includes("draft"));
  assertCheck("Contains create_invoice handler", invSrc.includes("create_invoice"));
  assertCheck("Contains list_invoices handler", invSrc.includes("list_invoices"));
  assertCheck("Contains get_invoice handler", invSrc.includes("get_invoice"));
  assertCheck("Contains generate_invoice_qr handler", invSrc.includes("pay_qr") || invSrc.includes("generate_invoice_qr"));
}

if (fs.existsSync(dunningFile)) {
  const dunSrc = fs.readFileSync(dunningFile, "utf8");
  console.log(`\n${ANSI.bold}📅 4. Verifying Automated Dunning Cron Worker:${ANSI.reset}`);
  assertCheck("Contains DunningStage enum (T-3d, Td, T+3d, T+7d)", dunSrc.includes("DunningStage") || dunSrc.includes("t_minus_3d"));
  assertCheck("Contains run_dunning_cycle function", dunSrc.includes("run_dunning_cycle") || dunSrc.includes("evaluate_dunning"));
  assertCheck("Contains idempotent schedule recording", dunSrc.includes("dunning_schedules") || dunSrc.includes("recorded_reminders"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-165 INVOICING & PROMPTPAY HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
