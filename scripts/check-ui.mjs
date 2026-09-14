#!/usr/bin/env node
/**
 * UI Guardrail & Design System Consistency Harness (Full Multi-Support)
 *
 * Usage:
 *   node scripts/check-ui.mjs               # Run full comprehensive harness
 *   node scripts/check-ui.mjs --verbose     # Detailed line-by-line violation reports & code snippets
 *   node scripts/check-ui.mjs --routes      # Run route existence & link parity check only
 *   node scripts/check-ui.mjs --theme       # Run theme isolation & contrast guard only
 *   node scripts/check-ui.mjs --a11y        # Run accessibility & interactive element check only
 *   node scripts/check-ui.mjs --imports     # Run design system import compliance check only
 *   node scripts/check-ui.mjs --hex         # Run hardcoded hex color scan only
 *   node scripts/check-ui.mjs --diff        # Output proposed unified diff for theme fixes
 *   node scripts/check-ui.mjs --json        # Output machine-readable JSON report for CI
 *   node scripts/check-ui.mjs --markdown    # Export formatted report to docs/06_raw/
 *
 * Capabilities:
 *   1. Route Parity & Existence: Validates 44+ canonical routes across all 4 portals with route group support ((admin), (brand)).
 *   2. Internal Navigation Link Validator: Scans `<Link href="...">` across all pages to detect dead links (404 prevention).
 *   3. Theme Isolation & Contrast Guard: Dark portals (admin-console, brand-portal, landing-portal) are strictly guarded
 *      against light classes (bg-white, bg-slate-50, text-slate-900, border-slate-300), while validating light portals (creator-liff).
 *   4. Design System Token Suggestion & Proposed Diff Engine: Suggests exact @creatorhub/ui replacement tokens and diffs.
 *   5. Design System ADR-0003 Import Compliance: Enforces central imports through @creatorhub/ui.
 *   6. Accessibility & Interactive Quality: Checks for button type attributes, img alt texts, and empty hrefs.
 *   7. Inline Override Directives: Respects `theme-guard-allow` and `theme-guard-ignore` comments.
 *
 * Referenced by:
 *   - docs/06-workflows/ui-definition-of-done.md
 *   - docs/03-architecture/design-spec.md
 *   - .agents/rules/testing.md
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
  importsOnly: args.includes("--imports") || args.includes("-i"),
  hexOnly: args.includes("--hex"),
  diff: args.includes("--diff") || args.includes("-d"),
  json: args.includes("--json"),
  markdown: args.includes("--markdown") || args.includes("-m"),
  help: args.includes("--help") || args.includes("-h"),
};

if (FLAGS.help) {
  console.log(`
CreatorHub UI & Design System Consistency Harness (Multi-Support)

Options:
  --help, -h       Show this help message
  --verbose, -v    Show detailed line-by-line violation reports & snippets
  --routes, -r     Run route existence & dead link check only
  --theme, -t      Run theme isolation & contrast check only
  --a11y, -a       Run accessibility & interactive elements check only
  --imports, -i    Run design system import compliance check only
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
// 1. CANONICAL ROUTES CONFIGURATION
// -------------------------------------------------------------
const ROUTES = {
  "brand-portal": [
    "auth",
    "dashboard",
    "campaigns",
    "campaigns/[id]",
    "creators",
    "samples",
    "reports",
    "settings",
    "requests",
    "request/new",
    "request/[id]",
    "request/[id]/checkout",
    "request/[id]/connect",
    "request/[id]/contract",
    "logistics",
    "invite/[token]",
  ],
  "admin-console": [
    "auth",
    "dashboard",
    "campaigns",
    "campaigns/[id]",
    "staging",
    "moderation",
    "logistics",
    "payouts",
    "vault",
    "requests",
    "requests/[id]",
    "packages",
    "brands",
    "contracts",
    "agreements",
    "settings",
  ],
  "creator-liff": [
    "auth",
    "home",
    "briefing",
    "dashboard",
    "wallet",
    "profile",
    "campaigns/[id]",
    "request-sample",
    "terms",
    "privacy",
  ],
  "landing-portal": [
    "",
    "components-playground",
  ],
};

// -------------------------------------------------------------
// 2. THEME CONFIGURATION & FORBIDDEN UTILITY RULES
// -------------------------------------------------------------
const PORTAL_THEME_PROFILES = {
  "admin-console": "dark",
  "brand-portal": "dark",
  "landing-portal": "dark",
  "creator-liff": "light",
};

const FORBIDDEN_DARK_PORTAL_RULES = [
  {
    id: "RAW_WHITE_BG",
    name: "Raw White Background",
    regex: /\bbg-white\b(?!\/)/g,
    replaceWith: "bg-card",
    suggestion: "Use semantic tokens like 'bg-card', 'bg-background', or 'bg-muted' instead.",
  },
  {
    id: "LIGHT_SLATE_BG",
    name: "Light Slate Background",
    regex: /\bbg-(slate|gray|zinc|neutral)-(50|100|200)\b(?!\/)/g,
    replaceWith: "bg-muted",
    suggestion: "Use semantic tokens like 'bg-muted', 'bg-accent', or 'bg-card' instead.",
  },
  {
    id: "DARK_SLATE_TEXT",
    name: "Dark Slate Text Color",
    regex: /\btext-(slate|gray|zinc|neutral)-(900|800|700)\b/g,
    replaceWith: "text-foreground",
    suggestion: "Use semantic tokens like 'text-foreground' or 'text-muted-foreground' instead.",
  },
  {
    id: "LIGHT_SLATE_BORDER",
    name: "Light Solid Slate Border",
    regex: /\bborder-(slate|gray|zinc|neutral)-(200|300)\b/g,
    replaceWith: "border-border",
    suggestion: "Use semantic tokens like 'border-border', 'border-muted', or 'border-input' instead.",
  },
  {
    id: "LIGHT_SOLID_BADGE_BG",
    name: "Light Solid Badge Background",
    regex: /\bbg-(indigo|amber|emerald)-(50|100)\b(?!\/)/g,
    replaceWith: (match) => match.replace(/-100|-50/, "-500/15"),
    suggestion: "Use translucent alpha variant (e.g. 'bg-indigo-500/15', 'bg-emerald-500/10') instead.",
  },
  {
    id: "DARK_BADGE_TEXT",
    name: "Dark Badge Text Color",
    regex: /\btext-(indigo|amber|emerald)-(800|900)\b/g,
    replaceWith: (match) => match.replace(/-800|-900/, "-400"),
    suggestion: "Use lighter contrast variant (e.g. 'text-indigo-400', 'text-emerald-400', 'text-amber-400') instead.",
  },
];

// -------------------------------------------------------------
// UTILITIES
// -------------------------------------------------------------

/** Recursively collect all files matching extensions in a directory */
function walk(dir, ext = [".tsx", ".ts"], acc = []) {
  if (!existsSync(dir)) return acc;
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f === ".next" || f === "dist" || f === "build" || f === ".turbo") continue;
    const p = join(dir, f);
    try {
      const s = statSync(p);
      if (s.isDirectory()) {
        walk(p, ext, acc);
      } else if (ext.some((e) => f.endsWith(e))) {
        acc.push(p);
      }
    } catch {
      // Ignore unreadable files
    }
  }
  return acc;
}

/** Normalize Next.js route path by removing route groups e.g. (admin), (brand) */
function normalizeRoutePath(filePath, appDir) {
  const rel = relative(appDir, filePath);
  let route = rel.replace(/\/?page\.(tsx|jsx|js|ts)$/, "");
  route = route.replace(/\([^)]+\)\/?/g, "");
  return route.replace(/^\/+|\/+$/g, "");
}

// -------------------------------------------------------------
// 1. ROUTE AUDIT & INTERNAL LINK VALIDATOR
// -------------------------------------------------------------
function checkRoutes() {
  const results = {
    totalExpected: 0,
    okCount: 0,
    missingCount: 0,
    missingRoutes: [],
    deadLinks: [],
    detailsByApp: {},
    allDiscoveredRoutes: {},
  };

  for (const [app, expected] of Object.entries(ROUTES)) {
    results.totalExpected += expected.length;
    results.detailsByApp[app] = { ok: [], missing: [] };

    const appDir = join(CODE, "apps", app, "src/app");
    if (!existsSync(appDir)) {
      for (const r of expected) {
        results.missingCount++;
        results.missingRoutes.push({ app, route: r, reason: "app directory not found" });
        results.detailsByApp[app].missing.push(r);
      }
      continue;
    }

    const allPages = walk(appDir, [".tsx", ".jsx", ".js", ".ts"]).filter((f) =>
      /[\\/]page\.(tsx|jsx|js|ts)$/.test(f)
    );
    const existingRoutes = new Set(
      allPages.map((f) => normalizeRoutePath(f, appDir))
    );
    results.allDiscoveredRoutes[app] = Array.from(existingRoutes);

    for (const route of expected) {
      const cleanExpected = route.replace(/^\/+|\/+$/g, "");
      if (existingRoutes.has(cleanExpected)) {
        results.okCount++;
        results.detailsByApp[app].ok.push(cleanExpected);
      } else {
        results.missingCount++;
        results.missingRoutes.push({ app, route: cleanExpected, reason: "page.tsx not found" });
        results.detailsByApp[app].missing.push(cleanExpected);
      }
    }
  }

  // Internal Link Static Validation
  const linkRegex = /<(?:Link|a)[^>]*href=["'](\/[^"']*)["']/g;
  for (const app of Object.keys(ROUTES)) {
    const srcDir = join(CODE, "apps", app, "src");
    if (!existsSync(srcDir)) continue;

    const files = walk(srcDir, [".tsx", ".jsx"]);
    const validRoutes = results.allDiscoveredRoutes[app] || [];

    for (const f of files) {
      const content = readFileSync(f, "utf8");
      let m;
      while ((m = linkRegex.exec(content)) !== null) {
        const target = m[1].split("?")[0].replace(/^\/+|\/+$/g, "");
        if (target.startsWith("http") || target.startsWith("mailto") || target.startsWith("#")) continue;

        // Strip prefix if app uses prefix like /admin or /brand
        const cleanTarget = target.replace(/^(admin|brand|creator)\/?/, "");

        // Check if route matches exact or parameterized route (e.g. [id])
        const isMatch = validRoutes.some((vr) => {
          if (vr === cleanTarget || vr === target) return true;
          const vrPattern = new RegExp("^" + vr.replace(/\[[^\]]+\]/g, "[^/]+") + "$");
          return vrPattern.test(cleanTarget) || vrPattern.test(target);
        });

        if (!isMatch && cleanTarget !== "" && cleanTarget !== "api" && !cleanTarget.startsWith("api/")) {
          // Record potential dead link (advisory)
          results.deadLinks.push({
            app,
            file: relative(ROOT, f),
            targetHref: m[1],
          });
        }
      }
    }
  }

  return results;
}

// -------------------------------------------------------------
// 2. THEME ISOLATION & CONTRAST GUARD
// -------------------------------------------------------------
function checkThemeIsolation() {
  const results = {
    totalFilesScanned: 0,
    totalViolations: 0,
    violationsByFile: new Map(),
    proposedDiffs: new Map(),
  };

  for (const [app, theme] of Object.entries(PORTAL_THEME_PROFILES)) {
    if (theme !== "dark") continue;

    const srcDir = join(CODE, "apps", app, "src");
    if (!existsSync(srcDir)) continue;

    const files = walk(srcDir, [".tsx", ".jsx"]);

    for (const file of files) {
      results.totalFilesScanned++;
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      const relPath = relative(ROOT, file);
      let fileModified = false;
      const fixedLines = [...lines];

      lines.forEach((line, idx) => {
        // Skip comments or explicit ignore/allow directives (on current or up to 4 preceding lines)
        const prev1 = idx > 0 ? lines[idx - 1] : "";
        const prev2 = idx > 1 ? lines[idx - 2] : "";
        const prev3 = idx > 2 ? lines[idx - 3] : "";
        const prev4 = idx > 3 ? lines[idx - 4] : "";
        if (
          line.includes("theme-guard-ignore") ||
          line.includes("theme-guard-allow") ||
          prev1.includes("theme-guard-ignore") ||
          prev1.includes("theme-guard-allow") ||
          prev2.includes("theme-guard-ignore") ||
          prev2.includes("theme-guard-allow") ||
          prev3.includes("theme-guard-ignore") ||
          prev3.includes("theme-guard-allow") ||
          prev4.includes("theme-guard-ignore") ||
          prev4.includes("theme-guard-allow")
        ) return;

        let newLine = line;
        for (const rule of FORBIDDEN_DARK_PORTAL_RULES) {
          const matches = line.match(rule.regex);
          if (matches) {
            results.totalViolations += matches.length;
            if (!results.violationsByFile.has(relPath)) {
              results.violationsByFile.set(relPath, []);
            }
            results.violationsByFile.get(relPath).push({
              lineNum: idx + 1,
              ruleId: rule.id,
              ruleName: rule.name,
              matches: [...new Set(matches)],
              suggestion: rule.suggestion,
              snippet: line.trim(),
            });

            // Calculate proposed replacement
            if (typeof rule.replaceWith === "function") {
              newLine = newLine.replace(rule.regex, rule.replaceWith);
            } else {
              newLine = newLine.replace(rule.regex, rule.replaceWith);
            }
            fileModified = true;
          }
        }
        fixedLines[idx] = newLine;
      });

      if (fileModified) {
        results.proposedDiffs.set(relPath, {
          original: content,
          proposed: fixedLines.join("\n"),
        });
      }
    }
  }

  return results;
}

// -------------------------------------------------------------
// 3. ACCESSIBILITY & INTERACTIVE QUALITY AUDIT
// -------------------------------------------------------------
function checkAccessibility() {
  const results = {
    totalInteractiveElements: 0,
    buttonTypeMissing: [],
    imgAltMissing: [],
    emptyHrefs: [],
  };

  const buttonRegex = /<button(?![^>]*type=)[^>]*>/g;
  const imgAltRegex = /<img(?![^>]*alt=)[^>]*>/g;
  const emptyHrefRegex = /<(?:a|Link)[^>]*href=["'](#|)["'][^>]*>/g;

  for (const app of Object.keys(ROUTES)) {
    const srcDir = join(CODE, "apps", app, "src");
    if (!existsSync(srcDir)) continue;

    for (const f of walk(srcDir, [".tsx", ".jsx"])) {
      const content = readFileSync(f, "utf8");
      const lines = content.split("\n");
      const relPath = relative(ROOT, f);

      lines.forEach((line, idx) => {
        if (line.includes("theme-guard-ignore") || line.includes("/* eslint-disable")) return;

        if (buttonRegex.test(line)) {
          results.buttonTypeMissing.push({ file: relPath, lineNum: idx + 1, snippet: line.trim() });
        }
        if (imgAltRegex.test(line)) {
          results.imgAltMissing.push({ file: relPath, lineNum: idx + 1, snippet: line.trim() });
        }
        if (emptyHrefRegex.test(line)) {
          results.emptyHrefs.push({ file: relPath, lineNum: idx + 1, snippet: line.trim() });
        }
      });
    }
  }

  return results;
}

// -------------------------------------------------------------
// 4. DESIGN SYSTEM ADR-0003 IMPORT COMPLIANCE
// -------------------------------------------------------------
function checkDesignSystemImports() {
  const results = {
    totalFilesChecked: 0,
    unauthorizedImports: [],
  };

  const forbiddenImports = [
    { pattern: /from ["']@radix-ui\/[^"']+["']/g, msg: "Direct import from @radix-ui forbidden by ADR-0003. Import from @creatorhub/ui." },
    { pattern: /from ["']lucide-react["']/g, isAdvisory: true, msg: "Lucide icons direct import (allowed for icons, prefer @creatorhub/ui for wrapped badges/buttons)." },
  ];

  for (const app of Object.keys(ROUTES)) {
    const srcDir = join(CODE, "apps", app, "src");
    if (!existsSync(srcDir)) continue;

    for (const f of walk(srcDir, [".tsx", ".ts"])) {
      results.totalFilesChecked++;
      const content = readFileSync(f, "utf8");
      const relPath = relative(ROOT, f);

      for (const rule of forbiddenImports) {
        if (!rule.isAdvisory && rule.pattern.test(content)) {
          results.unauthorizedImports.push({ file: relPath, message: rule.msg });
        }
      }
    }
  }

  return results;
}

// -------------------------------------------------------------
// 5. HARDCODED HEX COLOR SCAN (ADVISORY)
// -------------------------------------------------------------
function checkHexLiterals() {
  const hexRe = /#[0-9a-fA-F]{6}\b/g;
  const results = {
    totalHexCount: 0,
    filesWithHex: 0,
    hexByFile: [],
  };

  for (const app of Object.keys(ROUTES)) {
    const srcDir = join(CODE, "apps", app, "src");
    if (!existsSync(srcDir)) continue;

    for (const f of walk(srcDir, [".tsx", ".jsx"])) {
      const content = readFileSync(f, "utf8");
      const m = content.match(hexRe);
      if (m) {
        results.totalHexCount += m.length;
        results.filesWithHex++;
        results.hexByFile.push([relative(ROOT, f), [...new Set(m)]]);
      }
    }
  }

  return results;
}

// -------------------------------------------------------------
// MAIN RUNNER
// -------------------------------------------------------------
function main() {
  const isFullRun = !FLAGS.routesOnly && !FLAGS.themeOnly && !FLAGS.a11yOnly && !FLAGS.importsOnly && !FLAGS.hexOnly;

  const routeResult = (isFullRun || FLAGS.routesOnly) ? checkRoutes() : null;
  const themeResult = (isFullRun || FLAGS.themeOnly || FLAGS.diff) ? checkThemeIsolation() : null;
  const a11yResult = (isFullRun || FLAGS.a11yOnly) ? checkAccessibility() : null;
  const importResult = (isFullRun || FLAGS.importsOnly) ? checkDesignSystemImports() : null;
  const hexResult = (isFullRun || FLAGS.hexOnly) ? checkHexLiterals() : null;

  // JSON Export Mode
  if (FLAGS.json) {
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      passed: (routeResult?.missingCount ?? 0) === 0 && (themeResult?.totalViolations ?? 0) === 0,
      routes: routeResult,
      theme: themeResult ? {
        totalFilesScanned: themeResult.totalFilesScanned,
        totalViolations: themeResult.totalViolations,
        violations: Object.fromEntries(themeResult.violationsByFile),
      } : null,
      accessibility: a11yResult,
      imports: importResult,
      hex: hexResult,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(jsonOutput.passed ? 0 : 1);
  }

  // Diff Output Mode
  if (FLAGS.diff) {
    console.log("\n==================================================");
    console.log(" 📝 PROPOSED DESIGN SYSTEM REFACTOR DIFFS");
    console.log("==================================================");
    if (!themeResult || themeResult.proposedDiffs.size === 0) {
      console.log("✅ Zero theme violations found. No diffs needed.");
    } else {
      for (const [file, { original, proposed }] of themeResult.proposedDiffs.entries()) {
        console.log(`\n--- a/${file}`);
        console.log(`+++ b/${file}`);
        const origLines = original.split("\n");
        const propLines = proposed.split("\n");
        origLines.forEach((ol, idx) => {
          const pl = propLines[idx];
          if (ol !== pl) {
            console.log(`- L${idx + 1}: ${ol.trim()}`);
            console.log(`+ L${idx + 1}: ${pl.trim()}`);
          }
        });
      }
    }
    process.exit(themeResult?.totalViolations ? 1 : 0);
  }

  // Console Reporting
  console.log("\n==================================================");
  console.log(" 🚀 CreatorHub UI & Theme Guardrail Harness");
  console.log("==================================================");

  // 1. Routes Report
  if (routeResult) {
    console.log(`\n📍 [1. Routes Audit] Checked ${routeResult.totalExpected} canonical routes across 4 portals:`);
    if (routeResult.missingCount === 0) {
      console.log(`   ✅ All ${routeResult.okCount} expected routes are present.`);
    } else {
      console.log(`   ❌ ${routeResult.missingCount} missing route(s):`);
      for (const m of routeResult.missingRoutes) {
        console.log(`      - ${m.app}: /${m.route} (${m.reason})`);
      }
    }
  }

  // 2. Theme Isolation Report
  if (themeResult) {
    console.log(`\n🎨 [2. Theme Isolation] Scanned ${themeResult.totalFilesScanned} dark-portal UI files:`);
    if (themeResult.totalViolations === 0) {
      console.log("   ✅ Zero light-theme class violations found in dark portals.");
    } else {
      console.log(`   ❌ Found ${themeResult.totalViolations} light-theme violation(s) in dark portals:\n`);
      for (const [file, issues] of themeResult.violationsByFile.entries()) {
        console.log(`   📁 ${file}:`);
        for (const issue of issues) {
          console.log(`      Line ${issue.lineNum} [${issue.ruleName}]: '${issue.matches.join(", ")}'`);
          console.log(`      💡 Fix: ${issue.suggestion}`);
          if (FLAGS.verbose) {
            console.log(`      🔎 Code: ${issue.snippet.slice(0, 120)}...`);
          }
          console.log("");
        }
      }
    }
  }

  // 3. Accessibility Report (Advisory)
  if (a11yResult) {
    const totalA11y = a11yResult.buttonTypeMissing.length + a11yResult.imgAltMissing.length + a11yResult.emptyHrefs.length;
    console.log(`\n♿ [3. Accessibility & Elements] (Advisory):`);
    if (totalA11y === 0) {
      console.log("   ✅ All buttons, images, and links meet interactive quality standards.");
    } else {
      console.log(`   ℹ️  ${a11yResult.buttonTypeMissing.length} buttons missing explicit type, ${a11yResult.emptyHrefs.length} empty hrefs.`);
    }
  }

  // 4. Design System Imports
  if (importResult) {
    console.log(`\n📦 [4. Design System Imports] Checked ${importResult.totalFilesChecked} files:`);
    if (importResult.unauthorizedImports.length === 0) {
      console.log("   ✅ All components comply with ADR-0003 (@creatorhub/ui import standard).");
    } else {
      console.log(`   ❌ ${importResult.unauthorizedImports.length} unauthorized import(s) detected.`);
    }
  }

  // 5. Hex Colors Report
  if (hexResult) {
    console.log(`\n🏷️  [5. Hex Colors Audit] (Design Token Enforcement):`);
    if (hexResult.totalHexCount === 0) {
      console.log("   ✅ Zero hardcoded hex color literals found.");
    } else {
      console.log(`   ❌ ${hexResult.totalHexCount} hardcoded hex in ${hexResult.filesWithHex} files (MUST use @creatorhub/ui tokens instead):`);
      for (const [file, hexes] of hexResult.hexByFile) {
        console.log(`      ${file}: ${hexes.join(", ")}`);
      }
    }
  }

  // Quality Score Calculation
  const hasRouteErrors = (routeResult?.missingCount ?? 0) > 0;
  const hasThemeErrors = (themeResult?.totalViolations ?? 0) > 0;
  const hasImportErrors = (importResult?.unauthorizedImports?.length ?? 0) > 0;
  const hasHexErrors = (hexResult?.totalHexCount ?? 0) > 0;

  console.log("\n==================================================");
  console.log(" 📊 UI GUARD HARNESS SUMMARY");
  console.log("==================================================");
  if (routeResult) console.log(`- Canonical Routes: ${routeResult.okCount} OK, ${routeResult.missingCount} Missing`);
  if (themeResult) console.log(`- Theme Violations: ${themeResult.totalViolations} in ${themeResult.totalFilesScanned} Files`);
  if (a11yResult) console.log(`- A11y Advisory: ${a11yResult.buttonTypeMissing.length} button type warnings`);
  if (importResult) console.log(`- ADR-0003 Imports: ${importResult.unauthorizedImports.length === 0 ? "Compliant" : "Violations found"}`);
  if (hexResult) console.log(`- Hardcoded Hex: ${hexResult.totalHexCount} instances (${hasHexErrors ? "FAILED" : "OK"})`);

  const passed = !hasRouteErrors && !hasThemeErrors && !hasImportErrors && !hasHexErrors;

  // Markdown Export Mode
  if (FLAGS.markdown) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rawPath = join(ROOT, "docs/06_raw", `${timestamp}_ui_guard_harness_report.md`);
    const mdContent = `# UI Guardrail & Theme Consistency Report\n\n**Timestamp:** ${new Date().toISOString()}\n**Status:** ${passed ? "PASSED" : "FAILED"}\n\n## Summary\n- Routes: ${routeResult?.okCount || 0} OK, ${routeResult?.missingCount || 0} Missing\n- Theme Violations: ${themeResult?.totalViolations || 0}\n- Hardcoded Hex: ${hexResult?.totalHexCount || 0}\n`;
    writeFileSync(rawPath, mdContent, "utf8");
    console.log(`\n📄 Report exported to ${rawPath}`);
  }

  if (!passed) {
    console.log("\n❌ UI HARNESS FAILED — Fix missing routes, theme violations, or hardcoded hex colors listed above.\n");
    process.exit(1);
  }

  console.log("\n✅ ALL UI & THEME GUARD CHECKS PASSED!\n");
  process.exit(0);
}

main();
