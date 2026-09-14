#!/usr/bin/env node

/**
 * scripts/backend/g192-tiktok-sync-socratic-generator.mjs
 *
 * Goal G-192 Socratic Specification & Architecture Generator:
 * Generates the formal architecture specification for the TikTok Product Catalog Sync,
 * Spark Ad Authorization & Media Processing Worker with Apalis & NATS Preemption.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   📜  GOAL G-192: TIKTOK SYNC & MEDIA WORKER SPECIFICATION GENERATOR         ║\x1b[0m');
console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

const SPEC_CONTENT = `# Socratic Architecture Specification: Goal G-192

**Goal ID:** \`G-192\`  
**Topic:** Microservice — TikTok Product Catalog Sync, Spark Ad Authorization & Media Processing Worker with Apalis & NATS Preemption  
**Port:** \`:8089\` (HTTP/2 Fallback) & NATS Subject Group \`SODALITY.tiktok.*\` / \`SODALITY.clip.*\`  
**Date:** 2026-08-29  
**Status:** \`SPEC_FROZEN_READY_FOR_EXECUTION\`  

---

## 1. Executive Summary & Root Intent

Goal **G-192** isolates TikTok Shop product catalog delta synchronization, TikTok Business Ads ingestion, Spark Ad authorization validation, and creator video transcoding from \`code/apps/backend/api/src/tiktok_catalog.rs\`, \`ads.rs\`, and \`clips.rs\` into a dedicated, cooperative asynchronous worker microservice.

### Key Architectural Pillars:
1. **Apalis Recurring Cron Sync:** Durable 15-minute catalog polling with persistent pagination cursors in PostgreSQL.
2. **NATS JetStream 2.10 Priority Channel Mesh:**
   - \`Priority::P0\` (<50ms): Instant Spark Ad authorization code verification (\`SODALITY.tiktok.p0.spark\`).
   - \`Priority::P1\` (<250ms): Real-time TikTok Shop commission order webhooks (\`SODALITY.tiktok.p1.order\`).
   - \`Priority::P2\` (<2000ms): Product catalog SKU delta update streams (\`SODALITY.tiktok.p2.catalog\`).
   - \`Priority::P3\` (Bulk): Video clip ffmpeg transcoding and waveform extraction (\`SODALITY.tiktok.p3.media\`).
3. **Tokio Cooperative Task Yielding:** High-concurrency task yielding (\`tokio::task::yield_now\`) preventing CPU-bound ffmpeg tasks from blocking Tokio worker threads.
4. **Token Bucket Rate Governor:** Strict 10 req/s rate throttling per TikTok Shop seller app to prevent HTTP 429 penalties.

---

## 2. NATS JetStream 2.10 TikTok Subjects

| Priority | SLA | NATS Subject | Event Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **< 50ms** | \`SODALITY.tiktok.p0.spark\` | \`SparkVerifyRequest\` | Instant TikTok Spark code verification |
| **P1** | **< 250ms** | \`SODALITY.tiktok.p1.order\` | \`TikTokOrderWebhook\` | Commission order status & GMV attribution |
| **P2** | **< 2000ms** | \`SODALITY.tiktok.p2.catalog\` | \`CatalogDeltaEvent\` | Incremental SKU price/stock updates |
| **P3** | **Bulk** | \`SODALITY.tiktok.p3.media\` | \`ClipTranscodeJob\` | Ephemeral video compression & audio extraction |

---

## 3. BDD Given-When-Then Acceptance Contract

\`\`\`gherkin
Feature: TikTok Catalog Sync & Spark Ad Verification

  Scenario: Spark Code Validation Preempts Bulk Video Transcoding
    Given a worker is currently transcoding 10 heavy creator video submissions
    When an advertiser submits a TikTok Spark Ad authorization code for verification
    Then the worker yields execution cooperatively
    And validates the Spark code in under 50ms without queue delay

  Scenario: Catalog Delta Sync Respects TikTok Open API Rate Governor
    Given 50,000 product SKUs require synchronization
    When the Apalis catalog cron fires
    Then requests are metered at exactly 10 requests per second via TokenBucketRateLimiter
    And zero HTTP 429 Rate Limit errors are returned by TikTok Open API
\`\`\`

---

## 4. Verification Invariants
- **Article I:** Zero mocks, zero synthetic stubs.
- **Article II:** 100% green pass in \`scripts/harness/g192-tiktok-sync-harness.mjs\`.
- **Article III:** Structured explanation standard (WHERE, WHY, FOR WHOM, HOW).
`;

const outputPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_114300_g192_tiktok_sync_worker_architecture_spec.md');
fs.writeFileSync(outputPath, SPEC_CONTENT, 'utf-8');
console.log(`\x1b[32m✔ Specification exported to: ${outputPath}\x1b[0m\n`);
