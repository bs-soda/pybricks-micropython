#!/usr/bin/env node

/**
 * scripts/harness/g160-email-schema-harness.mjs
 * 
 * Production Migration & Schema Test Harness for Goal G-160:
 * Multi-Tenant Email Template Engine, Delivery Logs & Suppression Lists
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   🧪  GOAL G-160: MULTI-TENANT EMAIL SCHEMA & SEED TEST HARNESS             ║\x1b[0m');
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

const upMigrationPath = path.join(REPO_ROOT, 'code/apps/backend/api/migrations/20260829_001_email_template_schema.up.sql');
const downMigrationPath = path.join(REPO_ROOT, 'code/apps/backend/api/migrations/20260829_001_email_template_schema.down.sql');
const smokeScriptPath = path.join(REPO_ROOT, 'scripts/db-smoke/test-email-template-schema.sql');

// 1. Verify Migration Files
console.log('📁 \x1b[1m1. Verifying Migration Files Existence:\x1b[0m');
check('Up migration file exists', fs.existsSync(upMigrationPath));
check('Down migration file exists', fs.existsSync(downMigrationPath));
check('SQL smoke script exists', fs.existsSync(smokeScriptPath));

if (fs.existsSync(upMigrationPath)) {
  const upSql = fs.readFileSync(upMigrationPath, 'utf-8');

  // 2. Verify Enums & Data Types
  console.log('\n🏷️  \x1b[1m2. Verifying PostgreSQL Enums & Types:\x1b[0m');
  check('Contains email_template_tier enum', upSql.includes('app.email_template_tier'));
  check('Contains mandatory_transactional tier', upSql.includes('mandatory_transactional'));
  check('Contains operational_campaign tier', upSql.includes('operational_campaign'));
  check('Contains commercial_marketing tier', upSql.includes('commercial_marketing'));
  check('Contains email_delivery_status enum', upSql.includes('app.email_delivery_status'));
  check('Contains email_suppression_category enum', upSql.includes('app.email_suppression_category'));

  // 3. Verify Table Schemas
  console.log('\n🗄️  \x1b[1m3. Verifying Core Domain Tables:\x1b[0m');
  check('Creates app.email_templates table', upSql.includes('CREATE TABLE IF NOT EXISTS app.email_templates'));
  check('Creates app.email_audit_log table', upSql.includes('CREATE TABLE IF NOT EXISTS app.email_audit_log'));
  check('Creates app.email_suppressions table', upSql.includes('CREATE TABLE IF NOT EXISTS app.email_suppressions'));
  check('Creates app.user_notification_preferences table', upSql.includes('CREATE TABLE IF NOT EXISTS app.user_notification_preferences'));
  check('Creates app.agency_email_settings table', upSql.includes('CREATE TABLE IF NOT EXISTS app.agency_email_settings'));

  // 4. Verify PII & Privacy Invariants
  console.log('\n🛡️  \x1b[1m4. Verifying Privacy & Security Invariants:\x1b[0m');
  check('Audit log contains recipient_email_masked', upSql.includes('recipient_email_masked'));
  check('Audit log contains recipient_email_hash', upSql.includes('recipient_email_hash'));
  check('Audit log contains payload_variables jsonb', upSql.includes('payload_variables'));
  check('Templates table enables Row-Level Security', upSql.includes('ALTER TABLE app.email_templates ENABLE ROW LEVEL SECURITY'));
  check('Audit log enables Row-Level Security', upSql.includes('ALTER TABLE app.email_audit_log ENABLE ROW LEVEL SECURITY'));

  // 5. Verify 23-Flow Bilingual Master Seeds
  console.log('\n📜 \x1b[1m5. Verifying 23-Flow Bilingual Master Template Seeds (46 Total):\x1b[0m');
  const templateCodes = [
    'T01_AGENCY_STAFF_INVITE',
    'T02_AGENCY_EMAIL_OTP',
    'T03_BRAND_INVITE_BIND',
    'T04_BRAND_CONTACT_EMAIL_OTP',
    'T05_CREATOR_INVITATION',
    'T06_CREATOR_BRIEF_ASSIGNED',
    'T07_SAMPLE_ORDER_PLACED',
    'T08_SAMPLE_TRACKING_SHIPPED',
    'T09_SAMPLE_DELIVERED_REMINDER',
    'T10_VIDEO_SCRIPT_SUBMITTED',
    'T11_VIDEO_SCRIPT_APPROVED',
    'T12_VIDEO_SCRIPT_REJECTED',
    'T13_VIDEO_CLIP_SUBMITTED',
    'T14_VIDEO_CLIP_APPROVED',
    'T15_VIDEO_CLIP_REVISION_REQUESTED',
    'T16_SPARK_CODE_EXPIRING_ALERT',
    'T17_PROFORMA_INVOICE_GENERATED',
    'T18_PAYMENT_RECEIPT_ISSUED',
    'T19_ETAX_INVOICE_DIGITAL_RECEIPT',
    'T20_WITHHOLDING_50TAWI_CERTIFICATE',
    'T21_CREATOR_COMMISSION_PAYOUT_SETTLED',
    'T22_CAMPAIGN_PERFORMANCE_WEEKLY_DIGEST',
    'T23_CREATOR_TIKTOK_SHOP_TRENDING_NEWSLETTER'
  ];

  let missingTemplates = 0;
  for (const code of templateCodes) {
    const hasCode = upSql.includes(code);
    if (!hasCode) missingTemplates++;
  }
  check('All 23 master flow template codes present in seed SQL', missingTemplates === 0, `Missing: ${missingTemplates}`);
  check('Seeds Thai locale (th-TH)', upSql.includes("'th-TH'"));
  check('Seeds English locale (en-US)', upSql.includes("'en-US'"));
}

if (fs.existsSync(downMigrationPath)) {
  const downSql = fs.readFileSync(downMigrationPath, 'utf-8');
  console.log('\n🔄 \x1b[1m6. Verifying Down Migration Rollback Integrity:\x1b[0m');
  check('Down migration drops email_templates', downSql.includes('DROP TABLE IF EXISTS app.email_templates'));
  check('Down migration drops email_audit_log', downSql.includes('DROP TABLE IF EXISTS app.email_audit_log'));
  check('Down migration drops email_suppressions', downSql.includes('DROP TABLE IF EXISTS app.email_suppressions'));
  check('Down migration drops user_notification_preferences', downSql.includes('DROP TABLE IF EXISTS app.user_notification_preferences'));
  check('Down migration drops agency_email_settings', downSql.includes('DROP TABLE IF EXISTS app.agency_email_settings'));
  check('Down migration drops custom enums', downSql.includes('DROP TYPE IF EXISTS app.email_template_tier'));
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log(`📊 \x1b[1mHarness Result:\x1b[0m ${passedChecks} / ${totalChecks} Passed`);
if (passedChecks === totalChecks) {
  console.log('\x1b[32m\x1b[1m🏆 G-160 MULTI-TENANT EMAIL SCHEMA HARNESS VERIFIED 100% GREEN!\x1b[0m\n');
  process.exit(0);
} else {
  console.error('\x1b[31m\x1b[1m⚠️ G-160 HARNESS CHECKS FAILED.\x1b[0m\n');
  process.exit(1);
}
