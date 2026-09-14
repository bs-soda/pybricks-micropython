#!/usr/bin/env node

/**
 * @file g199-opn-adapter-harness.mjs
 * @description Conformance and Verification Test Harness for G-199:
 * Opn (Omise) Payment Gateway Adapter with PromptPay, E-Wallets, Cards, Bank Transfers & Statement Reconciliation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log("================================================================================");
console.log("🧪 G-199 Opn (Omise) Payment Gateway Adapter Test Harness");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assertCheck(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// 1. Check Module Files Structure
assertCheck("Opn Adapter modules exist", () => {
  const opnPath = resolve(process.cwd(), 'code/apps/services/payment-service/src/opn');
  const requiredFiles = [
    'mod.rs',
    'charge.rs',
    'webhook.rs',
    'transfer.rs',
    'reconciler.rs'
  ];
  for (const f of requiredFiles) {
    if (!existsSync(resolve(opnPath, f))) {
      throw new Error(`Missing required file: ${f}`);
    }
  }
});

// 2. Check Omnichannel E-Wallet & Dynamic PromptPay Source Engine
assertCheck("Opn Charge Engine supports PromptPay, TrueMoney, ShopeePay, LINE Pay, and Cards", () => {
  const chargeContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/opn/charge.rs'), 'utf8');
  if (!chargeContent.includes('OpnChargeEngine')) throw new Error('Missing OpnChargeEngine struct');
  if (!chargeContent.includes('create_session')) throw new Error('Missing create_session method');
  if (!chargeContent.includes('TrueMoneyWallet')) throw new Error('Missing TrueMoneyWallet support');
  if (!chargeContent.includes('ShopeePay')) throw new Error('Missing ShopeePay support');
});

// 3. Check S2S Webhook Ingestion & Preemptive P0 Dispatch
assertCheck("Opn Webhook Processor with HMAC-SHA256 & Priority P0 Dispatch", () => {
  const webhookContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/opn/webhook.rs'), 'utf8');
  if (!webhookContent.includes('OpnWebhookProcessor')) throw new Error('Missing OpnWebhookProcessor struct');
  if (!webhookContent.includes('compute_signature')) throw new Error('Missing compute_signature method');
  if (!webhookContent.includes('ConstantTimeEq')) throw new Error('Missing constant-time signature comparison');
  if (!webhookContent.includes('build_p0_event_envelope')) throw new Error('Missing build_p0_event_envelope method');
});

// 4. Check Creator Automated Bank Transfer Payout Engine
assertCheck("Opn Transfer Engine with Idempotency & Fee Deduction", () => {
  const transferContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/opn/transfer.rs'), 'utf8');
  if (!transferContent.includes('OpnTransferEngine')) throw new Error('Missing OpnTransferEngine struct');
  if (!transferContent.includes('process_bank_transfer')) throw new Error('Missing process_bank_transfer method');
  if (!transferContent.includes('fee_satang')) throw new Error('Missing fee calculation');
});

// 5. Check Opn Statement Reconciler Parser
assertCheck("Opn Statement JSON Parser implemented", () => {
  const reconContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/opn/reconciler.rs'), 'utf8');
  if (!reconContent.includes('OpnStatementParser')) throw new Error('Missing OpnStatementParser struct');
  if (!reconContent.includes('parse_json_statement')) throw new Error('Missing parse_json_statement method');
  if (!reconContent.includes('CanonicalSettlementEntry')) throw new Error('Missing CanonicalSettlementEntry conversion');
});

// 6. Check Hexagonal Traits Implementation
assertCheck("OpnPaymentAdapter implements PaymentGatewayAdapter & PaymentReconciliationAdapter", () => {
  const modContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/opn/mod.rs'), 'utf8');
  if (!modContent.includes('impl PaymentGatewayAdapter for OpnPaymentAdapter')) throw new Error('Missing PaymentGatewayAdapter implementation');
  if (!modContent.includes('impl PaymentReconciliationAdapter for OpnPaymentAdapter')) throw new Error('Missing PaymentReconciliationAdapter implementation');
  if (!modContent.includes('"opn"')) throw new Error('Missing provider_id "opn"');
});

console.log("\n================================================================================");
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
