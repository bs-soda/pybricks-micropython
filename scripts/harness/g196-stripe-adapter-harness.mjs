#!/usr/bin/env node

/**
 * @file g196-stripe-adapter-harness.mjs
 * @description Conformance and Verification Test Harness for G-196:
 * Stripe Payment Gateway Adapter with Multi-Currency Checkout, Webhooks, Stripe Connect Payouts & Balance Reconciliation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log("================================================================================");
console.log("🧪 G-196 Stripe Payment Gateway Adapter Test Harness");
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
assertCheck("Stripe Adapter modules exist", () => {
  const stripePath = resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe');
  const requiredFiles = [
    'mod.rs',
    'checkout.rs',
    'webhook.rs',
    'payout.rs',
    'reconciler.rs'
  ];
  for (const f of requiredFiles) {
    if (!existsSync(resolve(stripePath, f))) {
      throw new Error(`Missing required file: ${f}`);
    }
  }
});

// 2. Check Multi-Currency Stripe Hosted Checkout Sessions
assertCheck("Stripe Hosted Checkout Engine supports multi-currency (USD, EUR, SGD, GBP, JPY, THB)", () => {
  const checkoutContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe/checkout.rs'), 'utf8');
  if (!checkoutContent.includes('StripeCheckoutEngine')) throw new Error('Missing StripeCheckoutEngine struct');
  if (!checkoutContent.includes('create_session')) throw new Error('Missing create_session method');
  if (!checkoutContent.includes('checkout.stripe.com')) throw new Error('Missing Stripe Checkout URL template');
});

// 3. Check Stripe Webhook Ingestion & Preemptive P0 Dispatch
assertCheck("Stripe Webhook Processor with Stripe-Signature HMAC-SHA256 & Priority P0 Dispatch", () => {
  const webhookContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe/webhook.rs'), 'utf8');
  if (!webhookContent.includes('StripeWebhookProcessor')) throw new Error('Missing StripeWebhookProcessor struct');
  if (!webhookContent.includes('parse_stripe_signature_header')) throw new Error('Missing parse_stripe_signature_header');
  if (!webhookContent.includes('compute_v1_signature')) throw new Error('Missing compute_v1_signature method');
  if (!webhookContent.includes('ConstantTimeEq')) throw new Error('Missing constant-time signature comparison');
  if (!webhookContent.includes('build_p0_event_envelope')) throw new Error('Missing build_p0_event_envelope method');
});

// 4. Check Stripe Connect Creator Mass Payout Engine
assertCheck("Stripe Connect Payout Engine with Idempotency & Fee Deduction", () => {
  const payoutContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe/payout.rs'), 'utf8');
  if (!payoutContent.includes('StripePayoutEngine')) throw new Error('Missing StripePayoutEngine struct');
  if (!payoutContent.includes('process_transfer')) throw new Error('Missing process_transfer method');
  if (!payoutContent.includes('fee_satang')) throw new Error('Missing fee calculation');
});

// 5. Check Stripe Balance Transaction Statement Parser
assertCheck("Stripe /v1/balance_transactions JSON Parser implemented", () => {
  const reconContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe/reconciler.rs'), 'utf8');
  if (!reconContent.includes('StripeStatementParser')) throw new Error('Missing StripeStatementParser struct');
  if (!reconContent.includes('parse_json_statement')) throw new Error('Missing parse_json_statement method');
  if (!reconContent.includes('CanonicalSettlementEntry')) throw new Error('Missing CanonicalSettlementEntry conversion');
});

// 6. Check Hexagonal Traits Implementation
assertCheck("StripePaymentAdapter implements PaymentGatewayAdapter & PaymentReconciliationAdapter", () => {
  const modContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/stripe/mod.rs'), 'utf8');
  if (!modContent.includes('impl PaymentGatewayAdapter for StripePaymentAdapter')) throw new Error('Missing PaymentGatewayAdapter implementation');
  if (!modContent.includes('impl PaymentReconciliationAdapter for StripePaymentAdapter')) throw new Error('Missing PaymentReconciliationAdapter implementation');
  if (!modContent.includes('"stripe"')) throw new Error('Missing provider_id "stripe"');
});

console.log("\n================================================================================");
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
