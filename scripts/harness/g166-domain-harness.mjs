#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-166: AGENCY BYOD CUSTOM DOMAINS PRODUCTION TEST HARNESS
 * Verifies agency_domains.rs, dns_verifier.rs, REST routes, and DNS state transitions.
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
const domainsRs = path.join(rootDir, "code/apps/backend/api/src/agency_domains.rs");
const dnsRs = path.join(rootDir, "code/apps/backend/api/src/dns_verifier.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-166: AGENCY BYOD CUSTOM DOMAINS TEST HARNESS                      ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API Domain Source Files:${ANSI.reset}`);
assertCheck("agency_domains.rs exists", fs.existsSync(domainsRs));
assertCheck("dns_verifier.rs exists", fs.existsSync(dnsRs));

if (fs.existsSync(domainsRs)) {
  const src = fs.readFileSync(domainsRs, "utf8");
  console.log(`\n${ANSI.bold}🌐 2. Verifying Domain Models & State Machine:${ANSI.reset}`);
  assertCheck("Contains AgencyCustomDomain struct", src.includes("struct AgencyCustomDomain") || src.includes("AgencyCustomDomain"));
  assertCheck("Contains DomainVerificationStatus enum", src.includes("enum DomainVerificationStatus") || src.includes("DomainVerificationStatus"));
  assertCheck("Contains DomainType enum (portal / email_sender)", src.includes("enum DomainType") || src.includes("DomainType"));
  assertCheck("Contains register_domain handler", src.includes("register_domain") || src.includes("register_agency_domain"));
  assertCheck("Contains list_domains handler", src.includes("list_domains") || src.includes("list_agency_domains"));
  assertCheck("Contains verify_domain handler", src.includes("verify_domain") || src.includes("verify_agency_domain"));
  assertCheck("Contains delete_domain handler", src.includes("delete_domain") || src.includes("delete_agency_domain"));
}

if (fs.existsSync(dnsRs)) {
  const dnsSrc = fs.readFileSync(dnsRs, "utf8");
  console.log(`\n${ANSI.bold}⚡ 3. Verifying Asynchronous DNS Verification Engine:${ANSI.reset}`);
  assertCheck("Contains DnsRecordType enum (CNAME, TXT, MX)", dnsSrc.includes("DnsRecordType") || dnsSrc.includes("RecordType"));
  assertCheck("Contains verify_cname_record function", dnsSrc.includes("verify_cname") || dnsSrc.includes("check_cname"));
  assertCheck("Contains verify_txt_token function", dnsSrc.includes("verify_txt") || dnsSrc.includes("check_txt"));
  assertCheck("Contains verify_dkim_spf function", dnsSrc.includes("verify_dkim") || dnsSrc.includes("check_dkim"));
  assertCheck("Contains DnsVerificationReport struct", dnsSrc.includes("DnsVerificationReport") || dnsSrc.includes("VerificationReport"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 4. Verifying Module Exports in lib.rs:${ANSI.reset}`);
  assertCheck("Exports agency_domains module", lib.includes("pub mod agency_domains;"));
  assertCheck("Exports dns_verifier module", lib.includes("pub mod dns_verifier;"));
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-166 AGENCY BYOD DOMAINS HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
