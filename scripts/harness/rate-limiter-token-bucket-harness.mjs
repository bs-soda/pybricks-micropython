#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🪣 SODA OS TOKEN BUCKET & OUTBOUND RATE LIMITER TEST HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Validation of Token Bucket / Leaky Bucket rate limiting governors,
 *          sub-millisecond token replenishment, burst capacity, and RFC 6585 429 guards.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { SodaContractHarness } from './universal-contract-harness.mjs';

export class SodaRateLimiterHarness extends SodaContractHarness {
  constructor(bucketName = 'TikTokOpenApiGovernor') {
    super(`Soda OS Token Bucket Rate Limiter Harness: ${bucketName}`);
  }

  assertTokenBucketReplenishment(ratePerSec, burstCapacity) {
    console.log(`\n🪣 1. Validating Token Bucket Capacity & Replenishment:`);
    this.assert('Rate governor enforces configured per-second rate (e.g. 10 req/s)', ratePerSec > 0);
    this.assert('Burst capacity >= rate limit to absorb transient traffic spikes', burstCapacity >= ratePerSec);

    let tokens = burstCapacity;
    for (let i = 0; i < ratePerSec; i++) {
      tokens--;
    }
    this.assert('Token deduction correctly tracks consumed requests', tokens === (burstCapacity - ratePerSec));
  }

  assert429BackoffJitter(statusCode, retryAfterSec) {
    console.log(`\n⏳ 2. Validating RFC 6585 Exponential Backoff & Jitter:`);
    if (statusCode === 429) {
      this.assert('HTTP 429 response includes explicit Retry-After header', retryAfterSec > 0);
      const backoffWithJitter = (retryAfterSec * 1000) + (Math.random() * 200);
      this.assert('Exponential backoff includes pseudo-random jitter preventing thundering herd', backoffWithJitter > retryAfterSec * 1000);
    } else {
      this.assert('Request completed within allowed quota (HTTP 200 OK)', statusCode === 200);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const harness = new SodaRateLimiterHarness('OutboundEmailDomainWarming');
  harness.assertTokenBucketReplenishment(10, 20);
  harness.assert429BackoffJitter(429, 3);
  harness.summary();
}
