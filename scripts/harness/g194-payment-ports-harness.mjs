#!/usr/bin/env node

/**
 * @file g194-payment-ports-harness.mjs
 * @description Conformance and Verification Test Harness for G-194:
 * Payment Gateway Ports, Unified Trait, Preemptive NATS JetStream Messaging & Smart Router.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

console.log("================================================================================");
console.log("🧪 G-194 Payment Gateway Ports & Smart Router Test Harness");
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

// 1. Check Crate Structure
assertCheck("Crate Cargo.toml and modules exist", () => {
  const cratePath = resolve(process.cwd(), 'code/crates/payment-gateway-ports');
  const requiredFiles = [
    'Cargo.toml',
    'src/lib.rs',
    'src/traits.rs',
    'src/models.rs',
    'src/events.rs',
    'src/router.rs',
    'src/reconciliation.rs',
    'src/error.rs'
  ];
  for (const f of requiredFiles) {
    if (!existsSync(resolve(cratePath, f))) {
      throw new Error(`Missing required file: ${f}`);
    }
  }
});

// 2. Check Port Trait Invariants
assertCheck("PaymentGatewayAdapter & PaymentReconciliationAdapter traits defined", () => {
  const traitsContent = readFileSync(resolve(process.cwd(), 'code/crates/payment-gateway-ports/src/traits.rs'), 'utf8');
  if (!traitsContent.includes('pub trait PaymentGatewayAdapter')) throw new Error('Missing PaymentGatewayAdapter trait');
  if (!traitsContent.includes('pub trait PaymentReconciliationAdapter')) throw new Error('Missing PaymentReconciliationAdapter trait');
  if (!traitsContent.includes('async fn create_checkout_session')) throw new Error('Missing create_checkout_session method');
  if (!traitsContent.includes('async fn verify_and_parse_webhook')) throw new Error('Missing verify_and_parse_webhook method');
  if (!traitsContent.includes('async fn process_payout')) throw new Error('Missing process_payout method');
  if (!traitsContent.includes('fn parse_settlement_statement')) throw new Error('Missing parse_settlement_statement method');
});

// 3. Check Preemptive P0 Event Topics
assertCheck("Preemptive NATS JetStream P0 Priority and Topics mapped", () => {
  const eventsContent = readFileSync(resolve(process.cwd(), 'code/crates/payment-gateway-ports/src/events.rs'), 'utf8');
  if (!eventsContent.includes('Priority::P0')) throw new Error('Missing Priority::P0 mapping');
  if (!eventsContent.includes('payment.checkout.initiated')) throw new Error('Missing checkout topic');
  if (!eventsContent.includes('payment.callback.verified')) throw new Error('Missing verified callback topic');
  if (!eventsContent.includes('settlement.invoices.paid')) throw new Error('Missing invoice settlement topic');
});

// 4. Check Smart Router & Circuit Breaker
assertCheck("PaymentRouter with dynamic dispatch and CircuitBreaker defined", () => {
  const routerContent = readFileSync(resolve(process.cwd(), 'code/crates/payment-gateway-ports/src/router.rs'), 'utf8');
  if (!routerContent.includes('pub struct PaymentRouter')) throw new Error('Missing PaymentRouter struct');
  if (!routerContent.includes('CircuitBreaker')) throw new Error('Missing CircuitBreaker integration');
  if (!routerContent.includes('execute_checkout_with_failover')) throw new Error('Missing execute_checkout_with_failover method');
});

// 5. Check 3-Way Reconciliation Matcher
assertCheck("ReconciliationMatcher with exact Satang 3-way matching defined", () => {
  const reconContent = readFileSync(resolve(process.cwd(), 'code/crates/payment-gateway-ports/src/reconciliation.rs'), 'utf8');
  if (!reconContent.includes('pub struct ReconciliationMatcher')) throw new Error('Missing ReconciliationMatcher struct');
  if (!reconContent.includes('reconcile_batch')) throw new Error('Missing reconcile_batch method');
  if (!reconContent.includes('DiscrepancyKind')) throw new Error('Missing DiscrepancyKind');
});

console.log("\n================================================================================");
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
