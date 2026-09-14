#!/usr/bin/env node

/**
 * scripts/backend/g190-campaign-dispatcher-socratic-generator.mjs
 *
 * Goal G-190 Socratic Specification & Architecture Generator:
 * Generates the formal architecture specification for the Campaign Dispatcher Microservice
 * with Apalis Scheduler, NATS JetStream 2.10 Preemption, and iCalendar Engine.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m\x1b[36m║   📜  GOAL G-190: CAMPAIGN DISPATCHER SOCRATIC SPECIFICATION GENERATOR       ║\x1b[0m');
console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

const SPEC_CONTENT = `# Socratic Architecture Specification: Goal G-190

**Goal ID:** \`G-190\`  
**Topic:** Microservice — Campaign Lifecycle, Automated Drip Dispatcher & iCalendar Scheduler with Apalis & NATS Preemption  
**Port:** \`:8087\` (HTTP/2 Fallback) & NATS Subject Group \`SODALITY.campaign.*\`  
**Date:** 2026-08-29  
**Status:** \`SPEC_FROZEN_READY_FOR_EXECUTION\`  

---

## 1. Executive Summary & Root Intent

Goal **G-190** extracts the campaign lifecycle email dispatchers, scheduled reminder drips, iCalendar meeting sync, and 1-click action link processors from the monolithic Axum backend (\`code/apps/backend/api/src/campaign_email_dispatchers.rs\`) into an independent, high-throughput microservice.

### Key Architectural Pillars:
1. **Apalis PostgreSQL Job Scheduling:** Durable stateful cron and delayed scheduling for multi-day campaign drip cadences with persistent execution cursors.
2. **NATS JetStream 2.10 Priority Preemption:** 4-tier QoS queue separating urgent P0 contract alerts from P1 creator invitations, P2 reminders, and P3 bulk newsletters.
3. **Dual-Transport Client (\`transport-kit\`):** Automatic circuit-breaker failover to HTTP/2 REST endpoints (\`:8087\`) during NATS broker maintenance.
4. **RFC 5545 iCalendar Engine:** Automated calendar invitation generation with timezone conversion, RSVP response tracking, and ICS attachment assembly.
5. **HMAC-SHA256 Signed Action Tokens:** Single-use cryptographic tokens enabling 1-click campaign acceptance and submission actions from email.

---

## 2. NATS JetStream 2.10 Priority Subject Mapping

| Priority Tier | SLA | NATS Subject Pattern | Event Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Priority P0** | **< 50ms** | \`SODALITY.campaign.p0.urgent\` | \`CampaignUrgentAlert\` | Contract cancellation, copyright notice, urgent dispute |
| **Priority P1** | **< 250ms** | \`SODALITY.campaign.p1.invite\` | \`CampaignDirectInvite\` | Direct 1-on-1 brand invitation with HMAC action link |
| **Priority P2** | **< 2000ms** | \`SODALITY.campaign.p2.drip\` | \`CampaignReminderDrip\` | Automated 24h/48h milestone reminder, submission nudge |
| **Priority P3** | **Batch** | \`SODALITY.campaign.p3.broadcast\` | \`CampaignOpenBroadcast\` | Open collaboration marketing newsletter to creator pool |

---

## 3. Apalis PostgreSQL Job Definitions

\`\`\`rust
#[derive(Debug, Serialize, Deserialize)]
pub struct CampaignDripJob {
    pub campaign_id: Uuid,
    pub creator_id: Uuid,
    pub step: DripStep,
    pub scheduled_at: DateTime<Utc>,
    pub template_key: String,
    pub dynamic_data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum DripStep {
    InitialInvite,
    Reminder24Hours,
    DeadlineWarning6Hours,
    SubmissionConfirmation,
    PostCampaignReview,
}
\`\`\`

---

## 4. BDD Given-When-Then Acceptance Contract

\`\`\`gherkin
Feature: Campaign Lifecycle & Preemptive Drip Dispatching

  Scenario: Urgent Campaign Alert Preempts 5,000 Queued Marketing Emails
    Given 5,000 Priority P3 marketing broadcast emails are currently queued in the dispatcher
    When an agency admin triggers an urgent P0 campaign cancellation alert
    Then the P0 alert is processed by a worker thread in under 50ms
    And the P3 marketing batch yields execution without causing queue head-of-line blocking

  Scenario: Apalis Delayed Reminder Drip Executes at Scheduled Timestamp
    Given a creator receives a campaign invitation at T0
    When T0 + 48 hours is reached without creator response
    Then Apalis executes the scheduled reminder job from the PostgreSQL queue
    And sends a personalized reminder email with updated HMAC token expiration

  Scenario: Dual-Transport Failover during NATS Broker Disconnect
    Given the NATS JetStream broker is unreachable (network partition)
    When an API client dispatches a campaign invitation via DualTransportClient
    Then the client-side circuit breaker opens and redirects the payload to HTTP/2 port 8087
    And 100% of invitation events are delivered with zero message loss
\`\`\`

---

## 5. Verification Invariants
- **Article I:** Zero mocks, zero synthetic stubs in production code.
- **Article II:** 100% green pass in \`scripts/harness/g190-campaign-dispatcher-harness.mjs\`.
- **Article III:** Structured explanation standard (WHERE, WHY, FOR WHOM, HOW).
`;

const outputPath = path.join(REPO_ROOT, 'docs/06_raw/20260829_114100_g190_campaign_dispatcher_architecture_spec.md');
fs.writeFileSync(outputPath, SPEC_CONTENT, 'utf-8');
console.log(`\x1b[32m✔ Specification exported to: ${outputPath}\x1b[0m\n`);
