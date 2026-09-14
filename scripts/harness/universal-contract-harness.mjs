#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧪 SODA OS UNIVERSAL ZERO-MOCK CONTRACT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Universal production test harness validating Zero-Mock Invariants,
 *          Type Safety, Route Contracts, and Dual-Transport Reliability.
 * Invariants: Article I (Zero Mocks, Zero Stubs), Article II (Mandatory Verification)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

export class SodaContractHarness {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.checks = [];
    this.startTime = Date.now();
    console.log(`╔══════════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║   🧪  ${this.suiteName.toUpperCase().padEnd(70)} ║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);
  }

  assert(description, condition, details = '') {
    const passed = Boolean(condition);
    this.checks.push({ description, passed, details });
    const icon = passed ? '  ✔' : '  ✖';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${icon} ${description}\x1b[0m`);
    if (!passed && details) {
      console.log(`    \x1b[33m↳ Details: ${details}\x1b[0m`);
    }
  }

  assertFileExists(relativePath, baseDir = process.cwd()) {
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(baseDir, relativePath);
    const exists = fs.existsSync(fullPath);
    this.assert(`File exists: ${relativePath}`, exists, exists ? '' : `Path not found: ${fullPath}`);
    return exists;
  }

  assertFileContains(relativePath, regexOrString, description = '', baseDir = process.cwd()) {
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(baseDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      this.assert(description || `File ${relativePath} contains expected pattern`, false, `File not found: ${fullPath}`);
      return false;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const matched = regexOrString instanceof RegExp ? regexOrString.test(content) : content.includes(regexOrString);
    this.assert(description || `File ${relativePath} contains ${regexOrString}`, matched, matched ? '' : `Pattern ${regexOrString} not found in ${relativePath}`);
    return matched;
  }

  assertNoMocks(contentOrPath) {
    let content = contentOrPath;
    let label = 'Payload';
    if (typeof contentOrPath === 'string' && fs.existsSync(contentOrPath)) {
      content = fs.readFileSync(contentOrPath, 'utf8');
      label = path.basename(contentOrPath);
    }
    const mockPatterns = [/mock\s*=\s*true/i, /todo!\(\)/, /unimplemented!\(\)/, /dummy_fallback/i, /fake_response/i];
    const found = mockPatterns.find(p => p.test(content));
    this.assert(
      `Zero-Mock invariant satisfied: ${label}`,
      !found,
      found ? `Forbidden mock/stub pattern detected: ${found}` : ''
    );
  }

  summary() {
    const total = this.checks.length;
    const passed = this.checks.filter(c => c.passed).length;
    const failed = total - passed;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n────────────────────────────────────────────────────────────────────────');
    console.log(`📊 Harness Result: ${passed} / ${total} Checks Passed (${duration}s)`);
    if (failed === 0) {
      console.log(`🏆 \x1b[1m\x1b[32m${this.suiteName} PASSED 100% GREEN!\x1b[0m\n`);
      return true;
    } else {
      console.log(`❌ \x1b[1m\x1b[31m${this.suiteName} FAILED WITH ${failed} VIOLATION(S)!\x1b[0m\n`);
      process.exit(1);
    }
  }
}
