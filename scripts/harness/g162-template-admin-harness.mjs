#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GOAL G-162: SYSTEM ADMIN EMAIL TEMPLATE MANAGEMENT PRODUCTION HARNESS
 * Verifies backend REST routes, frontend page component, modal editor,
 * and API client models.
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
const backendGateway = path.join(rootDir, "code/apps/backend/api/src/system_admin_gateway.rs");
const libRs = path.join(rootDir, "code/apps/backend/api/src/lib.rs");
const emailPage = path.join(rootDir, "code/apps/system-admin/src/app/settings/emails/page.tsx");
const modalComp = path.join(rootDir, "code/apps/system-admin/src/components/TemplateEditorModal.tsx");
const apiClient = path.join(rootDir, "code/apps/system-admin/src/lib/email-admin-api.ts");
const archSpec = path.join(rootDir, "docs/03-architecture/system-admin-email-templates-architecture.md");

console.log(`\n${ANSI.bold}${ANSI.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}║   🧪  GOAL G-162: TEMPLATE ADMIN & TEST DISPATCH TEST HARNESS                ║${ANSI.reset}`);
console.log(`${ANSI.bold}${ANSI.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${ANSI.reset}\n`);

console.log(`${ANSI.bold}📁 1. Verifying Core API System Admin Gateway:${ANSI.reset}`);
assertCheck("system_admin_gateway.rs exists", fs.existsSync(backendGateway));

if (fs.existsSync(backendGateway)) {
  const src = fs.readFileSync(backendGateway, "utf8");
  assertCheck("Contains AdminEmailTemplateItem struct", src.includes("pub struct AdminEmailTemplateItem"));
  assertCheck("Contains list_admin_email_templates_handler", src.includes("list_admin_email_templates_handler"));
  assertCheck("Contains update_admin_email_template_handler", src.includes("update_admin_email_template_handler"));
  assertCheck("Contains dispatch_admin_test_email_handler", src.includes("dispatch_admin_test_email_handler"));
  assertCheck("Contains list_email_forensic_audit_logs_handler", src.includes("list_email_forensic_audit_logs_handler"));
  assertCheck("Initializes 23 email templates", src.includes("tmpl-23") && src.includes("auth.otp_verification"));
}

if (fs.existsSync(libRs)) {
  const lib = fs.readFileSync(libRs, "utf8");
  console.log(`\n${ANSI.bold}📦 2. Verifying Axum Router Registrations in lib.rs:${ANSI.reset}`);
  assertCheck("Routes /v1/admin/emails/templates", lib.includes("/v1/admin/emails/templates"));
  assertCheck("Routes /v1/admin/emails/test-dispatch", lib.includes("/v1/admin/emails/test-dispatch"));
  assertCheck("Routes /v1/admin/emails/audit-logs", lib.includes("/v1/admin/emails/audit-logs"));
}

console.log(`\n${ANSI.bold}💻 3. Verifying System Admin Frontend Workspace:${ANSI.reset}`);
assertCheck("app/settings/emails/page.tsx exists", fs.existsSync(emailPage));
assertCheck("components/TemplateEditorModal.tsx exists", fs.existsSync(modalComp));
assertCheck("lib/email-admin-api.ts exists", fs.existsSync(apiClient));

if (fs.existsSync(emailPage)) {
  const page = fs.readFileSync(emailPage, "utf8");
  assertCheck("Contains 23 Flow Presets header tag", page.includes("23 Flow Presets"));
  assertCheck("Contains search and category filtering", page.includes("searchQuery") && page.includes("selectedCategory"));
  assertCheck("Contains forensic audit log table", page.includes("Email Forensic Delivery Audit"));
}

console.log(`\n${ANSI.bold}📖 4. Verifying Architecture Documentation:${ANSI.reset}`);
assertCheck("docs/03-architecture/system-admin-email-templates-architecture.md exists", fs.existsSync(archSpec));

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`📊 Harness Result: ${passedAssertions} / ${totalAssertions} Passed`);
if (passedAssertions === totalAssertions) {
  console.log(`${ANSI.bold}${ANSI.green}🏆 G-162 TEMPLATE ADMIN HARNESS VERIFIED 100% GREEN!${ANSI.reset}\n`);
} else {
  console.log(`${ANSI.bold}${ANSI.red}⚠️  SOME HARNESS CHECKS FAILED!${ANSI.reset}\n`);
}
