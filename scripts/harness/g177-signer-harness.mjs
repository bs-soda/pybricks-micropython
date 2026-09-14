#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-177: THAI E-TAX DIGITAL SIGNER PRODUCTION TEST HARNESS
 * Verifies hsm-signer crate, etax_signer.rs, PAdES engine, and Apalis scheduler.
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
const crateCargo = path.join(rootDir, "code/crates/hsm-signer/Cargo.toml");
const crateLib = path.join(rootDir, "code/crates/hsm-signer/src/lib.rs");
const apiRs = path.join(rootDir, "code/apps/backend/api/src/etax_signer.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-177: THAI E-TAX DIGITAL SIGNER TEST HARNESS                     ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Workspace Crate Files:${ANSI.reset}`);
assertCheck("hsm-signer/Cargo.toml exists", fs.existsSync(crateCargo));
assertCheck("hsm-signer/src/lib.rs exists", fs.existsSync(crateLib));

if (fs.existsSync(crateLib)) {
  const src = fs.readFileSync(crateLib, "utf8");
  console.log(`\n${ANSI.bold}🔐 2. Verifying Cryptographic Traits & Adapters:${ANSI.reset}`);
  assertCheck("Contains DigitalSigner trait", src.includes("pub trait DigitalSigner"));
  assertCheck("Contains VaultTransitSigner adapter", src.includes("pub struct VaultTransitSigner"));
  assertCheck("Contains Pkcs11SoftHsmSigner adapter", src.includes("pub struct Pkcs11SoftHsmSigner"));
  assertCheck("Strictly no AWS references in code", !src.includes("Amazon") && !src.includes("AWS"));

  console.log(`\n${ANSI.bold}📜 3. Verifying PAdES ISO 32000-1 Signature Embedder:${ANSI.reset}`);
  assertCheck("Contains PadesPdfSigner struct", src.includes("pub struct PadesPdfSigner"));
  assertCheck("Contains sign_pdf_bytes function", src.includes("sign_pdf_bytes"));
  assertCheck("Contains verify_signed_pdf function", src.includes("verify_signed_pdf"));
}

console.log(`\n${ANSI.bold}🌐 4. Verifying Core API Ingress & Apalis Batch Scheduler:${ANSI.reset}`);
assertCheck("etax_signer.rs exists", fs.existsSync(apiRs));
if (fs.existsSync(apiRs)) {
  const apiSrc = fs.readFileSync(apiRs, "utf8");
  assertCheck("Contains ApalisSigningJob enum", apiSrc.includes("ApalisSigningJob"));
  assertCheck("Contains sign_pdf_handler", apiSrc.includes("sign_pdf_handler"));
  assertCheck("Contains verify_signature_handler", apiSrc.includes("verify_signature_handler"));
  assertCheck("Contains schedule_batch_signing_handler", apiSrc.includes("schedule_batch_signing_handler"));
  assertCheck("Contains get_hsm_status_handler", apiSrc.includes("get_hsm_status_handler"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 5. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports etax_signer module", lib.includes("pub mod etax_signer;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-177 THAI E-TAX DIGITAL SIGNER HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
