#!/usr/bin/env node

/**
 * scripts/harness/g187-clip-worker-harness.mjs
 * 
 * Production Harness for Goal G-187:
 * Validates clip-worker microservice structure, exports, zero-mock invariants, and cargo tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SERVICE_DIR = path.join(REPO_ROOT, 'code/apps/services/clip-worker');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   🧪  GOAL G-187: CLIP-WORKER ZERO-MOCK PRODUCTION TEST HARNESS              ║\x1b[0m');
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

// 1. Check Service Directory & Source Files
const REQUIRED_FILES = [
  'Cargo.toml',
  'src/main.rs',
  'src/lib.rs',
  'src/models.rs',
  'src/verifier.rs',
  'src/rate_limiter.rs',
  'src/server.rs',
  'tests/service_tests.rs'
];

console.log('📁 \x1b[1m1. Verifying Microservice Source Code & Layout:\x1b[0m');
for (const relPath of REQUIRED_FILES) {
  const fullPath = path.join(SERVICE_DIR, relPath);
  const exists = fs.existsSync(fullPath);
  check(`File exists: ${relPath}`, exists, `Missing ${fullPath}`);
}

// 2. Check Cargo Workspace Inclusion
console.log('\n📦 \x1b[1m2. Verifying Cargo Workspace Configuration:\x1b[0m');
const rootCargoToml = path.join(REPO_ROOT, 'code/Cargo.toml');
if (fs.existsSync(rootCargoToml)) {
  const rootCargoContent = fs.readFileSync(rootCargoToml, 'utf-8');
  check(
    'code/Cargo.toml includes "apps/services/clip-worker"',
    rootCargoContent.includes('apps/services/clip-worker'),
    'Workspace member missing in code/Cargo.toml'
  );
} else {
  check('code/Cargo.toml exists', false, 'Cargo.toml not found');
}

// 3. Check Zero-Mock & Zero-Stub Invariant
console.log('\n🛡️  \x1b[1m3. Verifying Zero-Mock & Production Invariants:\x1b[0m');
let zeroMockPassed = true;
if (fs.existsSync(SERVICE_DIR)) {
  const srcFiles = fs.readdirSync(path.join(SERVICE_DIR, 'src'));
  for (const file of srcFiles) {
    const filePath = path.join(SERVICE_DIR, 'src', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('todo!()') || content.includes('unimplemented!()')) {
      zeroMockPassed = false;
      console.error(`  \x1b[31m✘\x1b[0m ${file} contains todo!() or unimplemented!()`);
    }
  }
}
check('All clip-worker files zero-mock compliant', zeroMockPassed, 'Stubs detected in src/');

// 4. Run Native Rust Unit & Integration Tests
console.log('\n🦀 \x1b[1m4. Running Native Rust Tests (cargo test -p clip-worker):\x1b[0m');
try {
  const output = execSync('cargo test -p clip-worker', {
    cwd: path.join(REPO_ROOT, 'code'),
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(output);
  check('Cargo unit & integration tests exit 0', true);
} catch (err) {
  console.error(err.stdout || err.message);
  check('Cargo unit & integration tests exit 0', false, 'Test failure occurred');
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`📊 \x1b[1mHarness Result:\x1b[0m ${passedChecks} / ${totalChecks} Passed`);
if (passedChecks === totalChecks) {
  console.log('\x1b[32m\x1b[1m🏆 G-187 CLIP-WORKER HARNESS VERIFIED 100% GREEN!\x1b[0m\n');
  process.exit(0);
} else {
  console.error('\x1b[31m\x1b[1m⚠️ G-187 HARNESS CHECKS FAILED.\x1b[0m\n');
  process.exit(1);
}
