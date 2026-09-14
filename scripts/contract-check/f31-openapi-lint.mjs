#!/usr/bin/env node

/**
 * OpenAPI F31 Runtime Tenancy Contract Linter & Specification Validator (G-142)
 * 
 * Verifies:
 * 1. YAML & Markdown contract existence for amended F31 v0.2.0
 * 2. Strict REMOVAL of legacy N:M AgencyBrandRelationship schema (INV-01 Exclusive Bind)
 * 3. 6 OperationId endpoints mapping to WorkspaceSwitcher (A7) and Creator Rosters
 * 4. 12 Data contract schemas including WorkspaceContext with agency_org_id and is_read_only
 * 5. Standardized multi-tenant runtime headers (X-Agency-Org-ID, X-Brand-ID, X-Workspace-Type)
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n📜 [OPENAPI F31 CONTRACT LINTER] Validating Amended Runtime Tenancy Specification (G-142)...\n");

const rootDir = process.cwd();
const yamlPath = path.join(rootDir, "docs/03-architecture/api/openapi-f31-multitenancy.yaml");
const mdPath = path.join(rootDir, "docs/03-architecture/api/openapi-f31-multitenancy.md");

const checks = [];

function check(name, condition, details = "") {
  checks.push({ name, passed: Boolean(condition), details });
  const status = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status} ${name.padEnd(65)} ${details}`);
}

// 1. Files Existence
check("Amended OpenAPI YAML (openapi-f31-multitenancy.yaml) exists", fs.existsSync(yamlPath));
check("Amended OpenAPI Markdown (openapi-f31-multitenancy.md) exists", fs.existsSync(mdPath));

const yamlContent = fs.readFileSync(yamlPath, "utf-8");
const mdContent = fs.readFileSync(mdPath, "utf-8");

// 2. OpenAPI 3.1 & Version Validation
check("OpenAPI Version 3.1.0", yamlContent.includes("openapi: 3.1.0"));
check("Amended Version 0.2.0", yamlContent.includes("version: 0.2.0") && mdContent.includes("0.2.0"));

// 3. Invariant INV-01: Strict Absence of Legacy N:M AgencyBrandRelationship
const hasLegacyNmInYaml = yamlContent.includes("AgencyBrandRelationship:") || yamlContent.includes("#/components/schemas/AgencyBrandRelationship");
const hasLegacyNmInMd = mdContent.includes("AgencyBrandRelationship:") || mdContent.includes("\"AgencyBrandRelationship\"");
check("INV-01: NO AgencyBrandRelationship N:M Schema in YAML", !hasLegacyNmInYaml, "Legacy N:M removed");
check("INV-01: NO AgencyBrandRelationship N:M Schema in Markdown", !hasLegacyNmInMd, "Exclusive binding enforced");

// 4. Runtime Tenancy Operations
const requiredOperations = [
  { op: "listWorkspaces", screen: "A7", desc: "List User Accessible Workspaces" },
  { op: "switchWorkspace", screen: "A7", desc: "Switch Active Workspace Context" },
  { op: "getWorkspaceContext", screen: "A7", desc: "Get Current Runtime Context" },
  { op: "getWorkspaceRoster", screen: "A5", desc: "Get Active Workspace Member Roster" },
  { op: "listAgencyCreators", screen: "N/A", desc: "List Agency Managed Creators (N:M)" },
  { op: "listBrandCreators", screen: "N/A", desc: "List Brand Campaign Creators (N:M)" },
];

for (const { op, screen, desc } of requiredOperations) {
  const hasOpInYaml = yamlContent.includes(`operationId: ${op}`);
  const hasOpInMd = mdContent.includes(op);
  check(`Operation: ${op.padEnd(25)} [Screen ${screen}]`, hasOpInYaml && hasOpInMd, desc);
}

// 5. Schema Integrity Checks
const requiredSchemas = [
  "WorkspaceSummary",
  "WorkspaceListResponse",
  "WorkspaceSwitchRequest",
  "WorkspaceSwitchResponse",
  "WorkspaceContext",
  "WorkspaceRosterMember",
  "WorkspaceRosterResponse",
  "AgencyCreatorAffiliation",
  "AgencyCreatorListResponse",
  "BrandCreatorAffiliation",
  "BrandCreatorListResponse",
  "ErrorResponse"
];

for (const schema of requiredSchemas) {
  check(`Schema: ${schema}`, yamlContent.includes(`${schema}:`));
}

// 6. Header Parameters
const requiredHeaders = [
  "X-Agency-Org-ID",
  "X-Brand-ID",
  "X-Workspace-Type"
];

for (const header of requiredHeaders) {
  check(`Header: ${header}`, yamlContent.includes(`${header}:`));
}

// 7. Context & Security Attributes
check("INV-02: WorkspaceContext contains agency_org_id", yamlContent.includes("agency_org_id:"));
check("INV-03: WorkspaceContext contains is_read_only", yamlContent.includes("is_read_only:"));
check("WorkspaceContext contains role & verification_status", yamlContent.includes("verification_status:") && yamlContent.includes("role:"));
check("WorkspaceSwitchResponse contains session_token (scoped JWT)", yamlContent.includes("session_token:"));

const totalPassed = checks.filter((c) => c.passed).length;
console.log(`\n📊 Linter Summary: ${totalPassed}/${checks.length} contract assertions passed.`);

if (totalPassed === checks.length) {
  console.log("🏆 [OPENAPI F31 CONTRACT LINTER] All Amended Tenancy Contract Assertions 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("💥 [OPENAPI F31 CONTRACT LINTER] Amended Tenancy specification validation failed!\n");
  process.exit(1);
}
