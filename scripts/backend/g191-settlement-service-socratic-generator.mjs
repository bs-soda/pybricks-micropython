#!/usr/bin/env node

/**
 * scripts/backend/g191-settlement-service-socratic-generator.mjs
 *
 * Goal G-191 Socratic Specification & Architecture Generator:
 * Generates the formal architecture specification for the Financial Dunning,
 * Automated Invoicing, PromptPay QR & Batch Payout Settlement Service with Apalis & NATS Preemption.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   📜  GOAL G-191: SETTLEMENT & DUNNING SERVICE SPECIFICATION GENERATOR       ║\x1b[0m');
console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

const SPEC_CONTENT = `# Socratic Architecture Specification: Goal G-191

**Goal ID:** \`G-191\`  
**Topic:** Microservice — Financial Dunning, Automated Invoicing, PromptPay QR & Batch Payout Settlement with Apalis & NATS Preemption  
**Port:** \`:8088\` (HTTP/2 Fallback) & NATS Subject Group \`SODALITY.settlement.*\` / \`SODALITY.payment.*\`  
**Date:** 2026-08-29  
**Status:** \`SPEC_FROZEN_READY_FOR_EXECUTION\`  

---

## 1. Executive Summary & Root Intent

Goal **G-191** extracts the financial dunning worker, invoicing calculation engine, PromptPay dynamic QR generator, and creator batch settlement processor from \`code/apps/backend/api/src/invoicing.rs\`, \`dunning_worker.rs\`, and \`payouts.rs\` into a dedicated, PCI-isolated financial microservice.

### Key Architectural Pillars:
1. **Apalis Stateful Dunning Cadence:** Persistent PostgreSQL state machine executing automated invoice retry intervals:
   - **T+1 Day:** Graceful email reminder with 1-click payment link.
   - **T+3 Days:** SMS alert + regenerated dynamic PromptPay QR code with Satang precision.
   - **T+7 Days:** Automated campaign suspension and staff intervention alert.
2. **NATS JetStream 2.10 Priority Channel Mesh:**
   - \`Priority::P0\` (<50ms): PromptPay & banking webhook reconciliation (\`SODALITY.payment.p0.webhook\`).
   - \`Priority::P1\` (<250ms): Real-time creator wallet payouts (\`SODALITY.settlement.p1.payout\`).
   - \`Priority::P2\` (<2000ms): Thai e-Tax invoice PKCS#11 / HSM digital signing (\`SODALITY.tax.p2.sign\`).
   - \`Priority::P3\` (Batch): Double-entry general ledger journal export (\`SODALITY.accounting.p3.ledger\`).
3. **Anti-Replay Nonce Engine & HMAC Guard:** Bloom-filter deduplication preventing double crediting and replay attacks on banking webhooks.
4. **WORM Financial Audit Trail:** Write-once-read-many cryptographic audit ledger satisfying Bank of Thailand and Revenue Department regulations.

---

## 2. NATS JetStream 2.10 Financial Subjects

| Priority | SLA | NATS Subject | Payload Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **< 50ms** | \`SODALITY.payment.p0.webhook\` | \`PaymentWebhookPayload\` | Real-time PromptPay / INET banking callback |
| **P1** | **< 250ms** | \`SODALITY.settlement.p1.payout\` | \`PayoutRequest\` | Creator batch payout & bank transfer execution |
| **P2** | **< 2000ms** | \`SODALITY.tax.p2.sign\` | \`TaxSignRequest\` | Thai e-Tax XML/PDF HSM digital signature |
| **P3** | **Batch** | \`SODALITY.accounting.p3.ledger\` | \`LedgerSyncBatch\` | General ledger sync to FlowAccount / Peak / Xero |

---

## 3. BDD Given-When-Then Acceptance Contract

\`\`\`gherkin
Feature: Financial Settlement & Preemptive Payment Reconciliation

  Scenario: PromptPay Webhook Preempts Background Dunning Cadence
    Given the settlement worker is processing 10,000 background invoice aging checks
    When an incoming PromptPay payment confirmation webhook arrives
    Then the P0 webhook handler executes in under 50ms
    And the invoice status transitions atomically to PAID
    And the creator wallet balance is unlocked immediately

  Scenario: Dunning Worker Resumes Seamlessly after Worker Restart
    Given an invoice entered Dunning Stage 2 with a scheduled SMS trigger at T+72h
    When the settlement service container restarts at T+70h
    Then Apalis resumes from PostgreSQL state storage without dropping the scheduled job
    And fires the Stage 2 SMS notification precisely at T+72h
\`\`\`

---

## 4. Verification Invariants
- **Article I:** Zero mocks, zero synthetic stubs.
- **Article II:** 100% green pass in \`scripts/harness/g191-settlement-service-harness.mjs\`.
- **Article III:** Structured explanation standard (WHERE, WHY, FOR WHOM, HOW).
`;

const outputPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_114200_g191_settlement_service_architecture_spec.md');
fs.writeFileSync(outputPath, SPEC_CONTENT, 'utf-8');
console.log(`\x1b[32m✔ Specification exported to: ${outputPath}\x1b[0m\n`);
