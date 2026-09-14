#!/usr/bin/env node

/**
 * Internal CRM Lifecycle & Daemon Verification Harness (G-158)
 * 
 * Verifies:
 * 1. Existence and permissions of lifecycle shell scripts
 * 2. Port and PID management configuration
 * 3. Graceful SIGTERM/SIGKILL teardown rules
 * 4. Diagnostic telemetry probe integration
 * 5. Ephemeral test orchestrator trap cleanup
 */

import fs from "node:fs";
import path from "node:path";

console.log("\n⚙️  [CRM LIFECYCLE HARNESS] Verifying Internal CRM Lifecycle Automation Scripts...\n");

const rootDir = process.cwd();
const upScript = path.join(rootDir, "scripts/crm/crm-up.sh");
const downScript = path.join(rootDir, "scripts/crm/crm-down.sh");
const statusScript = path.join(rootDir, "scripts/crm/crm-status.sh");
const testE2eScript = path.join(rootDir, "scripts/crm/crm-test-e2e.sh");
const crmAllScript = path.join(rootDir, "scripts/crm/crm-all.sh");

const checks = [];

function check(name, condition, details = "") {
  checks.push({ name, passed: Boolean(condition), details });
  const status = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${status} ${name.padEnd(60)} ${details}`);
}

// 1. Script Existence
check("Startup Script (crm-up.sh) exists", fs.existsSync(upScript));
check("Teardown Script (crm-down.sh) exists", fs.existsSync(downScript));
check("Status Probe Script (crm-status.sh) exists", fs.existsSync(statusScript));
check("Ephemeral E2E Script (crm-test-e2e.sh) exists", fs.existsSync(testE2eScript));
check("Master Suite Script (crm-all.sh) exists", fs.existsSync(crmAllScript));

// 2. Executable Permissions
function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

check("crm-up.sh is executable (+x)", isExecutable(upScript));
check("crm-down.sh is executable (+x)", isExecutable(downScript));
check("crm-status.sh is executable (+x)", isExecutable(statusScript));
check("crm-test-e2e.sh is executable (+x)", isExecutable(testE2eScript));

// 3. Content Inspection: crm-up.sh
const upContent = fs.readFileSync(upScript, "utf-8");
check("crm-up.sh: Port 4001 Backend Target", upContent.includes("4001"));
check("crm-up.sh: Port 4006 Frontend Target", upContent.includes("4006"));
check("crm-up.sh: PID Tracking (.crm-backend.pid)", upContent.includes(".crm-backend.pid"));
check("crm-up.sh: PID Tracking (.crm-frontend.pid)", upContent.includes(".crm-frontend.pid"));
check("crm-up.sh: Log Redirection (logs/crm-*.log)", upContent.includes("logs/crm-backend.log") && upContent.includes("logs/crm-frontend.log"));
check("crm-up.sh: HTTP 200 Health Probing", upContent.includes("curl -sf http://127.0.0.1:4001/v1/crm/overview") && upContent.includes("curl -sf http://127.0.0.1:4006"));

// 4. Content Inspection: crm-down.sh
const downContent = fs.readFileSync(downScript, "utf-8");
check("crm-down.sh: SIGTERM Graceful Wait", downContent.includes("kill") && downContent.includes("wait_sec"));
check("crm-down.sh: SIGKILL Fallback", downContent.includes("kill -9"));
check("crm-down.sh: Port Release Verification", downContent.includes("lsof -ti:\"$port\"") || downContent.includes("lsof -ti:"));
check("crm-down.sh: PID File Cleanup", downContent.includes("rm -f \"$pid_file\""));

// 5. Content Inspection: crm-status.sh
const statusContent = fs.readFileSync(statusScript, "utf-8");
check("crm-status.sh: Memory RSS Inspection", statusContent.includes("ps -o rss="));
check("crm-status.sh: Health Latency Measurement", statusContent.includes("curl") && statusContent.includes("LATENCY_MS"));

// 6. Content Inspection: crm-test-e2e.sh
const testE2eContent = fs.readFileSync(testE2eScript, "utf-8");
check("crm-test-e2e.sh: Trap Cleanup on Exit", testE2eContent.includes("trap cleanup EXIT INT TERM"));
check("crm-test-e2e.sh: Boots via crm-up.sh", testE2eContent.includes("crm-up.sh"));
check("crm-test-e2e.sh: Probes via crm-status.sh", testE2eContent.includes("crm-status.sh"));
check("crm-test-e2e.sh: Executes crm-all.sh", testE2eContent.includes("crm-all.sh"));

const totalPassed = checks.filter((c) => c.passed).length;
console.log(`\n📊 Lifecycle Summary: ${totalPassed}/${checks.length} assertions passed.`);

if (totalPassed === checks.length) {
  console.log("🏆 [CRM LIFECYCLE HARNESS] All Lifecycle Automation Assertions 100% GREEN!\n");
  process.exit(0);
} else {
  console.error("💥 [CRM LIFECYCLE HARNESS] Lifecycle script verification failed!\n");
  process.exit(1);
}
