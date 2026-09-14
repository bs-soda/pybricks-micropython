#!/usr/bin/env node

/**
 * run-all-fim-epic-harness.mjs
 * 
 * Master Test Harness Runner for Epic FIM:
 * Financial Ledger, Invoicing & Multi-Tenant Accounting
 * 
 * Orchestrates 5-Why Socratic Dialectic engines and Zero-Mock Production Test Harnesses across:
 * - G-228 B2B Contracts & Net-30 Invoicing
 * - G-229 Sub-Wallets & Cost Centers
 * - G-231 IFRS 15 Breakage Ledger
 * - G-242 Partner Rev-Share Ledger
 * - G-250 Multi-Entity ERP Sync
 * - G-241 Smart Dunning FSM
 * - G-240 Guardian Co-Signature Escrow
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m"
};

console.log(`${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════════════════════${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}🚀 MASTER TEST HARNESS & SOCRATIC RUNNER: EPIC FIM (GOALS G-228 to G-250)         ${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}   Group 2: Financial Ledger, Invoicing & Multi-Tenant Accounting               ${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════════════════════${ANSI.reset}\n`);

const steps = [
  // 1. Socratic 5-Why Dialectic Engines
  { name: "G-228 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g228-b2b-contracts-net30-5why-socratic-engine.mjs" },
  { name: "G-229 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g229-subwallets-cost-centers-5why-socratic-engine.mjs" },
  { name: "G-231 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g231-ifrs15-breakage-ledger-5why-socratic-engine.mjs" },
  { name: "G-242 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g242-partner-revshare-ledger-5why-socratic-engine.mjs" },
  { name: "G-250 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g250-multi-entity-erp-sync-5why-socratic-engine.mjs" },
  { name: "G-241 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g241-smart-dunning-fsm-5why-socratic-engine.mjs" },
  { name: "G-240 Socratic 5-Why Engine (Levels 1-5)", script: "scripts/agentic/g240-guardian-escrow-5why-socratic-engine.mjs" },

  // 2. Zero-Mock Production Test Harnesses
  { name: "G-228 Zero-Mock Production Harness", script: "scripts/harness/g228-b2b-contracts-net30-harness.mjs" },
  { name: "G-229 Zero-Mock Production Harness", script: "scripts/harness/g229-subwallets-cost-centers-harness.mjs" },
  { name: "G-231 Zero-Mock Production Harness", script: "scripts/harness/g231-ifrs15-breakage-ledger-harness.mjs" },
  { name: "G-242 Zero-Mock Production Harness", script: "scripts/harness/g242-partner-revshare-ledger-harness.mjs" },
  { name: "G-250 Zero-Mock Production Harness", script: "scripts/harness/g250-multi-entity-erp-sync-harness.mjs" },
  { name: "G-241 Zero-Mock Production Harness", script: "scripts/harness/g241-smart-dunning-fsm-harness.mjs" },
  { name: "G-240 Zero-Mock Production Harness", script: "scripts/harness/g240-guardian-escrow-harness.mjs" }
];

let totalPassed = 0;
let totalFailed = 0;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`\n${ANSI.bold}${ANSI.magenta}[${i + 1}/${steps.length}] Running: ${step.name}...${ANSI.reset}`);
  try {
    const output = execSync(`node ${step.script}`, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`${ANSI.green}  ✅ ${step.name} Passed!${ANSI.reset}`);
    totalPassed++;
  } catch (err) {
    console.error(`${ANSI.red}  ❌ ${step.name} Failed!${ANSI.reset}`);
    totalFailed++;
  }
}

console.log(`\n${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════════════════════${ANSI.reset}`);
console.log(`${ANSI.bold}📊 Summary: ${totalPassed} Passed, ${totalFailed} Failed out of ${steps.length} Suites${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}════════════════════════════════════════════════════════════════════════════════${ANSI.reset}\n`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log(`${ANSI.bold}${ANSI.green}🏆 ALL 7 EPIC FIM GOALS FULLY VERIFIED 100% GREEN!${ANSI.reset}\n`);
  process.exit(0);
}
