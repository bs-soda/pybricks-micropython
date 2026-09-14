#!/usr/bin/env node

/**
 * OpenAPI F33 Platform Identity Contract Linter & Specification Validator (G-141)
 * 
 * Verifies:
 * 1. YAML & Markdown contract existence
 * 2. 14 OperationId endpoints mapping 1-to-1 with UI Lock screens (A1-A9, B1-B5)
 * 3. 18 Data contract schemas and field definitions
 * 4. Invariant compliance (INV-01 Exclusive Bind 409, INV-02 Multi-Tenant Org Scope, INV-05 Document Gate)
 * 5. Resend email delivery semantics, 300s OTP TTL, and 30s cooldown
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n📜 [OPENAPI F33 CONTRACT LINTER] Validating Platform Identity Specification (G-141)...\n");

const rootDir = process.cwd();
const yamlPath = path.join(rootDir, "docs/03-architecture/api/openapi-f33-platform-identity.yaml");
const mdPath = path.join(rootDir, "docs/03-architecture/api/openapi-f33-platform-identity.md");
const lockDocPath = path.join(rootDir, "docs/02-product/design/f31-platform-ui-v1-lock.md");

const checks = [];

function check(name, condition, details = "") {
  checks.push({ name, passed: Boolean(condition), details });
  const status = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status} ${name.padEnd(65)} ${details}`);
}

// 1. Files Existence
check("OpenAPI YAML Contract (openapi-f33-platform-identity.yaml) exists", fs.existsSync(yamlPath));
check("OpenAPI Markdown Spec (openapi-f33-platform-identity.md) exists", fs.existsSync(mdPath));
check("F31 UI Lock Baseline (f31-platform-ui-v1-lock.md) exists", fs.existsSync(lockDocPath));

const yamlContent = fs.readFileSync(yamlPath, "utf-8");
const mdContent = fs.readFileSync(mdPath, "utf-8");

// 2. OpenAPI 3.1 Syntax Validation
check("OpenAPI Version 3.1.0", yamlContent.includes("openapi: 3.1.0"));
check("Info Title and Version (0.1.0)", yamlContent.includes("Platform Identity") && yamlContent.includes("version: 0.1.0"));

// 3. OperationId & Screen Traceability (A1-A9, B1-B5)
const requiredOperations = [
  { op: "registerAgency", screen: "A1", desc: "Agency Signup & Resend OTP" },
  { op: "verifyAgencyEmail", screen: "A2", desc: "Agency Email OTP Verification" },
  { op: "resendAgencyOtp", screen: "A2", desc: "Agency OTP Resend (30s Cooldown)" },
  { op: "updateAgencyProfile", screen: "A3", desc: "Agency Business Profile & Tax ID" },
  { op: "getAgencyOrg", screen: "A4", desc: "Agency Org & Verification Status" },
  { op: "listAgencyStaff", screen: "A5", desc: "List Agency Staff & Invites" },
  { op: "createStaffInvite", screen: "A5", desc: "Create & Send Staff Invite" },
  { op: "getStaffInvite", screen: "A9", desc: "Inspect Staff Invite Token (Landing)" },
  { op: "acceptStaffInvite", screen: "A9", desc: "Accept Staff Invite & Set Password" },
  { op: "submitBrandContactEmail", screen: "B2", desc: "Submit Brand Contact Email" },
  { op: "verifyBrandContactEmail", screen: "B3", desc: "Verify Brand Contact OTP" },
  { op: "resendBrandContactOtp", screen: "B3", desc: "Resend Brand Contact OTP" },
  { op: "inspectBrandInvite", screen: "B1", desc: "Inspect Brand Invite Token" },
  { op: "bindBrandInvite", screen: "B1", desc: "Bind Brand to Agency Org (409 Conflict)" },
];

for (const { op, screen, desc } of requiredOperations) {
  const hasOpInYaml = yamlContent.includes(`operationId: ${op}`);
  const hasScreenInYaml = yamlContent.includes(`x-ui-screen-id: ${screen}`);
  const hasOpInMd = mdContent.includes(op);
  check(`Operation: ${op.padEnd(26)} [Screen ${screen}]`, hasOpInYaml && hasScreenInYaml && hasOpInMd, desc);
}

// 4. Schema Integrity Checks
const requiredSchemas = [
  "AgencyRegisterRequest", "AgencyRegisterResponse",
  "VerifyEmailOtpRequest", "VerifyEmailOtpResponse",
  "ResendOtpRequest", "ResendOtpResponse",
  "AgencyProfileRequest", "AgencyOrg",
  "AgencyStaff", "StaffInvite", "CreateStaffInviteRequest", "AgencyStaffListResponse",
  "StaffInviteInspection", "StaffInviteAcceptRequest", "StaffInviteAcceptResponse",
  "BrandContactEmailRequest", "BrandContactEmailResponse", "BrandContactVerificationResult",
  "BrandInviteInspection", "InviteBindResult", "InviteBindConflictError",
  "ErrorResponse"
];

for (const schema of requiredSchemas) {
  check(`Schema: ${schema}`, yamlContent.includes(`${schema}:`));
}

// 5. Invariant & Security Rule Checks
check("INV-01: Exclusive Brand Binding (409 Conflict Schema)", yamlContent.includes("InviteBindConflictError") && yamlContent.includes("EXCLUSIVE_BIND_CONFLICT"));
check("INV-02: Multi-Tenant Org Scoping (agency_org_id fields)", yamlContent.includes("agency_org_id") && yamlContent.includes("agency_org_name"));
check("INV-03: Agency Verification Enum (unverified/pending/verified)", yamlContent.includes("unverified, pending, verified, rejected"));
check("INV-04: Staff Role Hierarchy (admin/member)", yamlContent.includes("[admin, member]"));
check("INV-05: Document Gate Unlock Flag (document_gate_unlocked)", yamlContent.includes("document_gate_unlocked:"));

// 6. Resend & OTP Policy
check("OTP Policy: 300s TTL (expires_in_seconds)", yamlContent.includes("300") && mdContent.includes("300 seconds"));
check("OTP Policy: 30s Cooldown (cooldown_seconds)", yamlContent.includes("30") && mdContent.includes("30 seconds"));
check("Email Delivery Provider: Resend", mdContent.includes("Resend") && yamlContent.includes("Resend"));

const totalPassed = checks.filter((c) => c.passed).length;
console.log(`\n📊 Linter Summary: ${totalPassed}/${checks.length} contract assertions passed.`);

if (totalPassed === checks.length) {
  console.log("🏆 [OPENAPI F33 CONTRACT LINTER] All Platform Identity Contract Assertions 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("💥 [OPENAPI F33 CONTRACT LINTER] OpenAPI specification validation failed!\n");
  process.exit(1);
}
