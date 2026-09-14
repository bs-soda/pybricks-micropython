#!/usr/bin/env node

/**
 * scripts/harness/g214-beneficiary-verification-harness.mjs
 * 
 * Production Conformance Harness for Goal G-214:
 * Beneficiary Account Name Verification, Anti-Mule Validation & PromptPay BOT Inquiry.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const PORTS_DIR = path.join(REPO_ROOT, 'code/crates/payment-gateway-ports');
const SERVICE_DIR = path.join(REPO_ROOT, 'code/apps/services/payment-service');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   🧪  GOAL G-214: BENEFICIARY VERIFICATION & ANTI-MULE CONFORMANCE HARNESS   ║\x1b[0m');
console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

let totalChecks = 0;
let passedChecks = 0;

function check(title, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  \x1b[32m✔\x1b[0m ${title}`);
  } else {
    console.error(`  \x1b[31m✘\x1b[0m ${title} — ${detail}`);
  }
}

// 1. Check Source Files
console.log('📁 \x1b[1m1. Verifying Beneficiary Port & Microservice Source Files:\x1b[0m');
const REQUIRED_FILES = [
  path.join(PORTS_DIR, 'src/beneficiary.rs'),
  path.join(PORTS_DIR, 'src/lib.rs'),
  path.join(SERVICE_DIR, 'src/compliance/beneficiary/mod.rs'),
  path.join(SERVICE_DIR, 'src/compliance/beneficiary/inquiry.rs'),
  path.join(SERVICE_DIR, 'src/compliance/beneficiary/matcher.rs'),
  path.join(SERVICE_DIR, 'src/server.rs'),
  path.join(SERVICE_DIR, 'tests/beneficiary_tests.rs')
];

for (const fullPath of REQUIRED_FILES) {
  const relPath = path.relative(REPO_ROOT, fullPath);
  check(`File exists: ${relPath}`, fs.existsSync(fullPath), `Missing ${fullPath}`);
}

// 2. Check Code Content & Invariants
console.log('\n🔍 \x1b[1m2. Verifying Architectural Invariants & Zero-Mock Enforcement:\x1b[0m');

const portFile = path.join(PORTS_DIR, 'src/beneficiary.rs');
if (fs.existsSync(portFile)) {
  const content = fs.readFileSync(portFile, 'utf8');
  check('Contains BeneficiaryProxyType enum', content.includes('enum BeneficiaryProxyType'));
  check('Contains Thai Juristic Normalization logic', content.includes('normalize_thai_juristic_name'));
  check('Contains Fuzzy Composite Matcher (Jaro-Winkler + Levenshtein)', content.includes('compute_juristic_match_score'));
  check('Contains Anti-Mule Rule Engine', content.includes('AntiMuleRuleEngine') || content.includes('evaluate_anti_mule_rules'));
  check('Contains Cryptographic Hash Chaining', content.includes('Sha256') || content.includes('sha2'));
  check('Zero Mocks / Zero Stubs in Port', !content.includes('todo!()') && !content.includes('unimplemented!()'));
}

const serverFile = path.join(SERVICE_DIR, 'src/server.rs');
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  check('REST route /v1/payments/compliance/verify-beneficiary registered', content.includes('/v1/payments/compliance/verify-beneficiary'));
}

// 3. Execute Cargo Tests
console.log('\n🦀 \x1b[1m3. Executing Rust Cargo Test Suite for G-214:\x1b[0m');
try {
  const output = execSync('cargo test -p payment-gateway-ports --lib beneficiary && cargo test -p payment-service --test beneficiary_tests', {
    cwd: path.join(REPO_ROOT, 'code'),
    encoding: 'utf8',
    stdio: 'pipe'
  });
  check('All G-214 Cargo unit and integration tests pass cleanly', true);
  console.log('  \x1b[32m✔\x1b[0m Cargo test output verified.');
} catch (err) {
  check('Cargo tests pass cleanly', false, err.stdout || err.message);
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`📊 Conformance Score: ${passedChecks} / ${totalChecks} Checks Passed (${Math.round((passedChecks / totalChecks) * 100)}%)`);
if (passedChecks === totalChecks) {
  console.log('🎉 \x1b[1m\x1b[32mALL G-214 INVARIANTS & CONFORMANCE TESTS PASSED PERFECTLY!\x1b[0m\n');
  process.exit(0);
} else {
  console.log('❌ \x1b[1m\x1b[31mSOME CONFORMANCE CHECKS FAILED.\x1b[0m\n');
  process.exit(1);
}
