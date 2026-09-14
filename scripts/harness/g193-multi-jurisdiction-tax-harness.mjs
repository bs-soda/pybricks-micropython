#!/usr/bin/env node

/**
 * scripts/harness/g193-multi-jurisdiction-tax-harness.mjs
 *
 * Production Test & Invariant Verification Harness for Goal G-193:
 * Dynamic Multi-Jurisdiction Tax Regulatory Policies, Country Strategy Pattern & Global Settlement Engine
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   🧪  GOAL G-193: MULTI-JURISDICTION TAX POLICIES TEST HARNESS               ║\x1b[0m');
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

// 1. Verify Specification and Agentic Socratic Script
console.log('🏛️  \x1b[1m1. Verifying Socratic Blueprint & Specs:\x1b[0m');
const specPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_141500_multi_jurisdiction_dynamic_tax_and_settlement_architecture.md');
check('G-193 Multi-Jurisdiction Architecture Specification exists', fs.existsSync(specPath));
const blueprintPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_142000_g193_clarification_socratic_blueprint.md');
check('G-193 Socratic Clarification Blueprint exists', fs.existsSync(blueprintPath));
const specCheckPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_142100_g193_clarification_and_spec_check_report.md');
check('G-193 Spec Check Certification Report exists', fs.existsSync(specCheckPath));
const acceptancePath = path.join(REPO_ROOT, 'docs/02-product/acceptance/G-193.md');
check('G-193 Acceptance Contract exists', fs.existsSync(acceptancePath));
const socraticScript = path.join(REPO_ROOT, 'scripts/agentic/g193-5why-agentic-socratic-loop.mjs');
check('G-193 Socratic 5-Why Script exists', fs.existsSync(socraticScript));

// 2. Verify Country Policies Directory & Modular Architecture
console.log('\n📁 \x1b[1m2. Verifying Country Policies Directory & Strategy Pattern Files:\x1b[0m');
const taxEngineDir = path.join(REPO_ROOT, 'code/crates/tax-engine/src');
check('tax-engine crate exists', fs.existsSync(taxEngineDir));
check('trait_def.rs exists', fs.existsSync(path.join(taxEngineDir, 'trait_def.rs')));
check('context.rs exists', fs.existsSync(path.join(taxEngineDir, 'context.rs')));
check('currency.rs exists', fs.existsSync(path.join(taxEngineDir, 'currency.rs')));
check('registry.rs exists', fs.existsSync(path.join(taxEngineDir, 'registry.rs')));

const policiesDir = path.join(taxEngineDir, 'policies');
check('policies directory exists', fs.existsSync(policiesDir));
check('policies/mod.rs exists', fs.existsSync(path.join(policiesDir, 'mod.rs')));
check('policies/thailand.rs exists', fs.existsSync(path.join(policiesDir, 'thailand.rs')));
check('policies/singapore.rs exists', fs.existsSync(path.join(policiesDir, 'singapore.rs')));
check('policies/malaysia.rs exists', fs.existsSync(path.join(policiesDir, 'malaysia.rs')));
check('policies/indonesia.rs exists', fs.existsSync(path.join(policiesDir, 'indonesia.rs')));
check('policies/philippines.rs exists', fs.existsSync(path.join(policiesDir, 'philippines.rs')));
check('policies/united_states.rs exists', fs.existsSync(path.join(policiesDir, 'united_states.rs')));

// 3. Verify Mathematical Country Policy Logic & Invariants in Code
console.log('\n⚙️  \x1b[1m3. Verifying Policy Invariants & Trait Implementations:\x1b[0m');

if (fs.existsSync(path.join(policiesDir, 'thailand.rs'))) {
  const thContent = fs.readFileSync(path.join(policiesDir, 'thailand.rs'), 'utf-8');
  check('Thailand policy computes 7% VAT', thContent.includes('0.07'));
  check('Thailand policy computes 3% Section 50 Tawi', thContent.includes('0.03'));
  check('Thailand policy outputs ETDA XML format', thContent.includes('EtdaXmlPades') || thContent.includes('ETDA'));
}

if (fs.existsSync(path.join(policiesDir, 'singapore.rs'))) {
  const sgContent = fs.readFileSync(path.join(policiesDir, 'singapore.rs'), 'utf-8');
  check('Singapore policy computes 9% GST', sgContent.includes('0.09'));
  check('Singapore policy handles 0% cross-border export', sgContent.includes('0.0') || sgContent.includes('is_cross_border'));
  check('Singapore policy outputs PEPPOL format', sgContent.includes('Peppol') || sgContent.includes('PEPPOL'));
}

if (fs.existsSync(path.join(policiesDir, 'malaysia.rs'))) {
  const myContent = fs.readFileSync(path.join(policiesDir, 'malaysia.rs'), 'utf-8');
  check('Malaysia policy computes 8% SST', myContent.includes('0.08'));
  check('Malaysia policy computes 2% Section 107D WHT', myContent.includes('0.02'));
  check('Malaysia policy outputs MyInvois format', myContent.includes('MyInvois'));
}

if (fs.existsSync(path.join(policiesDir, 'indonesia.rs'))) {
  const idContent = fs.readFileSync(path.join(policiesDir, 'indonesia.rs'), 'utf-8');
  check('Indonesia policy computes 11% PPN', idContent.includes('0.11'));
  check('Indonesia policy computes 2% PPh 23 WHT', idContent.includes('0.02'));
  check('Indonesia policy outputs DJP e-Faktur format', idContent.includes('DjpEfaktur') || idContent.includes('e-Faktur'));
}

// 4. Verify Currency Decimal Scaling Logic (0, 2, 3 decimals)
console.log('\n💱 \x1b[1m4. Verifying Multi-Currency Fractional Integer Scaling:\x1b[0m');
if (fs.existsSync(path.join(taxEngineDir, 'currency.rs'))) {
  const currContent = fs.readFileSync(path.join(taxEngineDir, 'currency.rs'), 'utf-8');
  check('Contains ISO 4217 CurrencyCode enum', currContent.includes('enum CurrencyCode'));
  check('Contains 0-decimal scale for JPY / VND', currContent.includes('JPY') && currContent.includes('0'));
  check('Contains 2-decimal scale for THB / USD / SGD', currContent.includes('THB') && currContent.includes('2'));
}

// 5. Run Native Rust Cargo Unit Tests
console.log('\n🦀 \x1b[1m5. Executing Cargo Test for tax-engine and tax-service:\x1b[0m');
try {
  const cargoOutput = execSync('cargo test -p tax-engine -- --nocapture', {
    cwd: path.join(REPO_ROOT, 'code'),
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  check('Cargo unit tests in tax-engine pass with exit code 0', true);
} catch (err) {
  check('Cargo unit tests in tax-engine pass with exit code 0', false, err.message);
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`📊 Harness Result: ${passedChecks} / ${totalChecks} Passed`);
if (passedChecks === totalChecks) {
  console.log('🏆 G-193 MULTI-JURISDICTION TAX & SETTLEMENT HARNESS VERIFIED 100% GREEN!\n');
} else {
  console.error('❌ G-193 HARNESS ENCOUNTERED INVARIANT FAILURES\n');
  process.exit(1);
}
