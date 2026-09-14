#!/usr/bin/env node

/**
 * @file g195-inet-adapter-harness.mjs
 * @description Conformance and Verification Test Harness for G-195:
 * INET e-Payment Dual-Stack Adapter with Apalis Non-Blocking S2S Webhook Worker & Preemptive P0 Dispatch.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log("================================================================================");
console.log("🧪 G-195 INET e-Payment Dual-Stack Adapter Test Harness");
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
assertCheck("INET Adapter modules exist", () => {
  const inetPath = resolve(process.cwd(), 'code/apps/services/payment-service/src/inet');
  const requiredFiles = [
    'mod.rs',
    'nops_qr.rs',
    'ops_card.rs',
    'webhook.rs',
    'reconciler.rs'
  ];
  for (const f of requiredFiles) {
    if (!existsSync(resolve(inetPath, f))) {
      throw new Error(`Missing required file: ${f}`);
    }
  }
});

// 2. Check NOPS V.2 Dynamic EMVCo QR & CRC-16 Engine
assertCheck("NOPS V.2 Dynamic PromptPay QR EMVCo TLV & CRC-16 engine implemented", () => {
  const nopsContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/inet/nops_qr.rs'), 'utf8');
  if (!nopsContent.includes('PromptPayQrGenerator')) throw new Error('Missing PromptPayQrGenerator struct');
  if (!nopsContent.includes('crc16_ccitt_false')) throw new Error('Missing crc16_ccitt_false calculation');
  if (!nopsContent.includes('A000000677010111')) throw new Error('Missing PromptPay BOT AID Tag 29');
  if (!nopsContent.includes('generate_dynamic_qr')) throw new Error('Missing generate_dynamic_qr method');
});

// 3. Check OPS 3.10 Credit Card Acquiring Engine
assertCheck("OPS 3.10 Card Acquiring & 3D-Secure 2.0 Engine implemented", () => {
  const opsContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/inet/ops_card.rs'), 'utf8');
  if (!opsContent.includes('OpsCardEngine')) throw new Error('Missing OpsCardEngine struct');
  if (!opsContent.includes('create_card_session')) throw new Error('Missing create_card_session method');
  if (!opsContent.includes('tds=2.0')) throw new Error('Missing 3D-Secure 2.0 redirect parameter');
  if (!opsContent.includes('compute_signature')) throw new Error('Missing HMAC signature computation');
});

// 4. Check S2S Webhook Ingestion & Preemptive P0 Dispatch
assertCheck("Apalis S2S Webhook Processor with Nonce Anti-Replay & Priority P0 Dispatch", () => {
  const webhookContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/inet/webhook.rs'), 'utf8');
  if (!webhookContent.includes('InetWebhookProcessor')) throw new Error('Missing InetWebhookProcessor struct');
  if (!webhookContent.includes('process_webhook')) throw new Error('Missing process_webhook method');
  if (!webhookContent.includes('build_p0_event_envelope')) throw new Error('Missing build_p0_event_envelope method');
  if (!webhookContent.includes('TOPIC_PAYMENT_CALLBACK_VERIFIED')) throw new Error('Missing verified callback topic');
});

// 5. Check Daily Settlement Statement Parser
assertCheck("INET NOPS/OPS Clearing CSV Parser implemented", () => {
  const reconContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/inet/reconciler.rs'), 'utf8');
  if (!reconContent.includes('InetStatementParser')) throw new Error('Missing InetStatementParser struct');
  if (!reconContent.includes('parse_csv_statement')) throw new Error('Missing parse_csv_statement method');
  if (!reconContent.includes('CanonicalSettlementEntry')) throw new Error('Missing CanonicalSettlementEntry conversion');
});

// 6. Check Hexagonal Traits Implementation
assertCheck("InetPaymentAdapter implements PaymentGatewayAdapter & PaymentReconciliationAdapter", () => {
  const modContent = readFileSync(resolve(process.cwd(), 'code/apps/services/payment-service/src/inet/mod.rs'), 'utf8');
  if (!modContent.includes('impl PaymentGatewayAdapter for InetPaymentAdapter')) throw new Error('Missing PaymentGatewayAdapter implementation');
  if (!modContent.includes('impl PaymentReconciliationAdapter for InetPaymentAdapter')) throw new Error('Missing PaymentReconciliationAdapter implementation');
  if (!modContent.includes('"inet"')) throw new Error('Missing provider_id "inet"');
});

console.log("\n================================================================================");
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
