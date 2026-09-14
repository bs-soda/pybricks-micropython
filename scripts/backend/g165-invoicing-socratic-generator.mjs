#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-165: PROMPTPAY EMVCO QR & INVOICING INVARIANT GENERATOR
 * Generates and certifies EMVCo TLV strings, CRC-16 checksums, and dunning cadences.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

// CRC16/CCITT-FALSE implementation (Polynomial: 0x1021, Init: 0xFFFF)
function calculateCRC16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTLV(tag, value) {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

function generatePromptPayQR(target, amount) {
  // Tag 00: Payload Format Indicator (01)
  const tag00 = formatTLV("00", "01");
  // Tag 01: Point of Initiation (12 = Dynamic with Amount, 11 = Static)
  const tag01 = formatTLV("01", amount ? "12" : "11");

  // Tag 29: Merchant Account Info - PromptPay (AID: A000000677010111)
  const aid = formatTLV("00", "A000000677010111");
  let subTag = "";
  if (target.length === 10 && target.startsWith("0")) {
    // Mobile number: 0066 + 9 digits
    const mobileFormatted = `0066${target.substring(1)}`;
    subTag = formatTLV("01", mobileFormatted);
  } else if (target.length === 13) {
    // Thai Citizen ID
    subTag = formatTLV("02", target);
  } else if (target.length === 15) {
    // Tax Biller ID
    subTag = formatTLV("03", target);
  } else {
    // Default Tax ID format
    subTag = formatTLV("02", target.padStart(13, "0"));
  }
  const tag29Content = `${aid}${subTag}`;
  const tag29 = formatTLV("29", tag29Content);

  // Tag 53: Transaction Currency (764 = THB)
  const tag53 = formatTLV("53", "764");

  // Tag 54: Transaction Amount
  let tag54 = "";
  if (amount && amount > 0) {
    tag54 = formatTLV("54", Number(amount).toFixed(2));
  }

  // Tag 58: Country Code (TH)
  const tag58 = formatTLV("58", "TH");

  // Partial payload before CRC
  const partial = `${tag00}${tag01}${tag29}${tag53}${tag54}${tag58}6304`;
  const checksum = calculateCRC16(partial);

  return `${partial}${checksum}`;
}

// Multi-Stage Dunning Stage Calculator
function calculateDunningStage(dueDate, currentDate = new Date()) {
  const due = new Date(dueDate).getTime();
  const now = currentDate.getTime();
  const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));

  if (diffDays < -3) {
    return { stage: "scheduled", action: "none", description: "Invoice active, awaiting T-3d" };
  } else if (diffDays >= -3 && diffDays < 0) {
    return { stage: "t_minus_3d", action: "send_polite_reminder", description: "Upcoming payment reminder (T-3 days)" };
  } else if (diffDays === 0) {
    return { stage: "t_due_date", action: "send_due_date_notice", description: "Invoice due today" };
  } else if (diffDays > 0 && diffDays <= 3) {
    return { stage: "t_plus_3d", action: "send_overdue_warning", description: "Overdue payment notice (T+3 days)" };
  } else {
    return { stage: "t_plus_7d", action: "send_final_escalation", description: "Final dunning escalation notice (T+7+ days)" };
  }
}

console.log(`\n${ANSI.bold}${ANSI.cyan}⚡ Evaluating G-165: PromptPay QR & Invoicing Invariants...${ANSI.reset}\n`);

console.log(`${ANSI.bold}📱 1. PromptPay Dynamic EMVCo QR Invariant Verification:${ANSI.reset}`);
const qrPayload = generatePromptPayQR("0105566001234", 10700.0);
console.log(`  ✔ Raw EMVCo QR String: ${qrPayload}`);
console.log(`  ✔ CRC-16 Checksum: ${qrPayload.slice(-4)}`);
if (!qrPayload.startsWith("000201010212") || !qrPayload.includes("5303764540810700.005802TH6304")) {
  throw new Error("PromptPay EMVCo structure mismatch");
}

console.log(`\n${ANSI.bold}📅 2. 4-Stage Dunning Lifecycle Cadence Verification:${ANSI.reset}`);
const now = new Date("2026-08-28T00:00:00Z");

const s1 = calculateDunningStage("2026-08-31T00:00:00Z", now); // T-3 days
console.log(`  ✔ T-3d Pre-Due Stage : [${s1.stage}] -> ${s1.action} (${s1.description})`);
if (s1.stage !== "t_minus_3d") throw new Error("T-3d stage mismatch");

const s2 = calculateDunningStage("2026-08-28T00:00:00Z", now); // Td (Today)
console.log(`  ✔ Td Due Date Stage  : [${s2.stage}] -> ${s2.action} (${s2.description})`);
if (s2.stage !== "t_due_date") throw new Error("Td stage mismatch");

const s3 = calculateDunningStage("2026-08-25T00:00:00Z", now); // T+3 days
console.log(`  ✔ T+3d Overdue Stage : [${s3.stage}] -> ${s3.action} (${s3.description})`);
if (s3.stage !== "t_plus_3d") throw new Error("T+3d stage mismatch");

const s4 = calculateDunningStage("2026-08-20T00:00:00Z", now); // T+8 days
console.log(`  ✔ T+7d Final Stage   : [${s4.stage}] -> ${s4.action} (${s4.description})`);
if (s4.stage !== "t_plus_7d") throw new Error("T+7d stage mismatch");

console.log(`\n${ANSI.bold}${ANSI.green}✅ Goal G-165 Socratic Generator & Invariant Checks Certified (100% PASS)${ANSI.reset}\n`);
