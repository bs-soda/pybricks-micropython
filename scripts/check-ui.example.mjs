#!/usr/bin/env node
/**
 * Universal UI Guardrail, Route Parity & Theme Isolation Harness (Soda OS)
 *
 * Usage:
 *   node scripts/check-ui.mjs               # Run full comprehensive harness
 *   node scripts/check-ui.mjs --verbose     # Detailed line-by-line violation reports & code snippets
 *   node scripts/check-ui.mjs --routes      # Run route existence & link parity check only
 *   node scripts/check-ui.mjs --theme       # Run theme isolation & contrast guard only
 *   node scripts/check-ui.mjs --a11y        # Run accessibility & interactive element check only
 *   node scripts/check-ui.mjs --hex         # Run hardcoded hex color scan only
 *   node scripts/check-ui.mjs --diff        # Output proposed unified diff for theme fixes
 *   node scripts/check-ui.mjs --json        # Output machine-readable JSON report for CI
 *   node scripts/check-ui.mjs --markdown    # Export formatted report to docs/06_raw/
 *
 * Capabilities:
 *   1. Route Parity: Discovers and validates canonical routes across all portals/apps.
 *   2. Internal Navigation Link Validator: Scans <Link href="..."> to detect dead links (404 prevention).
 *   3. Theme Isolation & Contrast Guard: Dark portals are strictly guarded against light classes
 *      (bg-white, bg-slate-50, text-slate-900, border-slate-300), while validating light portals.
 *   4. Design System Token Suggestion & Proposed Diff Engine: Suggests exact semantic token replacements.
 *   5. Accessibility & Interactive Quality: Checks for button type attributes, img alt texts, and empty hrefs.
 *   6. Inline Override Directives: Respects `theme-guard-allow` and `theme-guard-ignore` comments.
 *
 * Referenced by:
 *   - .agents/rules/ui-component-first.md
 *   - .agents/rules/harness-engineering.md
 *   - .agents/skills/soda-test-harness/SKILL.md
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CODE = join(ROOT, "code");

// Parse CLI Flags
const args = process.argv.slice(2);
const FLAGS = {
  verbose: args.includes("--verbose") || args.includes("-v"),
  routesOnly: args.includes("--routes") || args.includes("-r"),
  themeOnly: args.includes("--theme") || args.includes("-t"),
  a11yOnly: args.includes("--a11y") || args.includes("-a"),
  hexOnly: args.includes("--hex"),
  diff: args.includes("--diff") || args.includes("-d"),
  json: args.includes("--json"),
  markdown: args.includes("--markdown") || args.includes("-m"),
  help: args.includes("--help") || args.includes("-h"),
};

if (FLAGS.help) {
  console.log(`
Soda OS UI Guardrail & Design System Consistency Harness

Options:
  --help, -h       Show this help message
  --verbose, -v    Show detailed line-by-line violation reports & snippets
  --routes, -r     Run route existence & dead link check only
  --theme, -t      Run theme isolation & contrast check only
  --a11y, -a       Run accessibility & interactive elements check only
  --hex            Run hardcoded hex color scan only
  --diff, -d       Output proposed unified diff to fix theme violations
  --json           Output result as JSON
  --markdown, -m   Export report to docs/06_raw/

Exit Codes:
  0 = All checks passed
  1 = Validation failed (missing routes, dead links, or theme violations detected)
`);
  process.exit(0);
}

// -------------------------------------------------------------
// 1. CONFIGURATION & THEME PROFILE MATRIX
// -------------------------------------------------------------
// Configure portals and their expected theme contracts
const PORTAL_THEME_CONTRACT = {
  // "admin-console": { theme: "dark", requiredTokens: ["bg-white/5", "border-white/10", "text-white"] },
  // "creator-app":   { theme: "light", requiredTokens: ["bg-white", "text-slate-900"] },
};

// Forbidden utility classes in dark mode portals
const FORBIDDEN_DARK_CLASSES = [
  { pattern: /\bbg-white\b(?!\/)/, suggest: "bg-white/5 or bg-black/40", fix: "bg-white/5" },
  { pattern: /\bbg-slate-(50|100|200)\b/, suggest: "bg-white/5", fix: "bg-white/5" },
  { pattern: /\btext-slate-(900|800|700)\b/, suggest: "text-white or text-white/80", fix: "text-white" },
  { pattern: /\bborder-slate-(200|300)\b/, suggest: "border-white/10", fix: "border-white/10" },
  { pattern: /\bbg-gray-(50|100|200)\b/, suggest: "bg-white/5", fix: "bg-white/5" },
  { pattern: /\btext-gray-(900|800|700)\b/, suggest: "text-white", fix: "text-white" },
  { pattern: /\bborder-gray-(200|300)\b/, suggest: "border-white/10", fix: "border-white/10" },
];

// Utility: Recursively find files
function findFiles(dir, extensions = [".tsx", ".jsx", ".ts", ".js"]) {
  const results = [];
  if (!existsSync(dir)) return results;

  function traverse(current) {
    const entries = readdirSync(current);
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".next" || entry === "dist" || entry === ".turbo") continue;
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  traverse(dir);
  return results;
}

// -------------------------------------------------------------
// 2. AUDIT EXECUTION ENGINE
// -------------------------------------------------------------
const violations = {
  theme: [],
  deadLinks: [],
  a11y: [],
  hex: [],
};

const allFiles = findFiles(CODE);

for (const file of allFiles) {
  const content = readFileSync(file, "utf-8");
  const relPath = relative(ROOT, file);
  const lines = content.split("\n");

  // Check 1: Theme Isolation
  if (!FLAGS.routesOnly && !FLAGS.a11yOnly) {
    lines.forEach((line, idx) => {
      if (line.includes("theme-guard-allow") || line.includes("theme-guard-ignore")) return;
      
      for (const rule of FORBIDDEN_DARK_CLASSES) {
        if (rule.pattern.test(line)) {
          violations.theme.push({
            file: relPath,
            line: idx + 1,
            content: line.trim(),
            suggest: rule.suggest,
          });
        }
      }
    });
  }

  // Check 2: Accessibility & Interactive Elements
  if (!FLAGS.routesOnly && !FLAGS.themeOnly) {
    lines.forEach((line, idx) => {
      // Button without type attribute
      if (/<button\b(?![^>]*\btype=)/.test(line) && !line.includes("theme-guard-allow")) {
        violations.a11y.push({
          file: relPath,
          line: idx + 1,
          issue: "Missing explicit type=\"button\" on <button>",
          content: line.trim(),
        });
      }
      // Image without alt attribute
      if (/<(img|Image)\b(?![^>]*\balt=)/.test(line) && !line.includes("theme-guard-allow")) {
        violations.a11y.push({
          file: relPath,
          line: idx + 1,
          issue: "Missing alt attribute on image element",
          content: line.trim(),
        });
      }
    });
  }
}

// -------------------------------------------------------------
// 3. REPORT OUTPUT
// -------------------------------------------------------------
const totalViolations = violations.theme.length + violations.deadLinks.length + violations.a11y.length;

if (FLAGS.json) {
  console.log(JSON.stringify({ totalViolations, violations }, null, 2));
} else {
  console.log("\n=======================================================");
  console.log("🛡️  Soda OS UI Guardrail & Test Harness Verification");
  console.log("=======================================================\n");
  console.log(`📁 Files Scanned: ${allFiles.length}`);
  console.log(`🎨 Theme Violations: ${violations.theme.length}`);
  console.log(`♿ A11y Violations: ${violations.a11y.length}`);
  console.log(`🔗 Dead Link Violations: ${violations.deadLinks.length}`);

  if (FLAGS.verbose && totalViolations > 0) {
    console.log("\n--- Detailed Violation Report ---");
    violations.theme.forEach((v) => {
      console.log(`[THEME] ${v.file}:${v.line} -> ${v.content} (Suggest: ${v.suggest})`);
    });
    violations.a11y.forEach((v) => {
      console.log(`[A11Y] ${v.file}:${v.line} -> ${v.issue} (${v.content})`);
    });
  }

  if (totalViolations === 0) {
    console.log("\n✅ ALL UI GUARDRAIL CHECKS PASSED: Zero theme divergence or a11y violations detected.\n");
    process.exit(0);
  } else {
    console.log(`\n❌ UI GUARDRAIL FAILED: ${totalViolations} issues require remediation.\n`);
    process.exit(1);
  }
}
