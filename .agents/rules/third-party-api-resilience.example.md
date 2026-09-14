---
description: Universal Third-Party API Rate Limit & Resilience Standard — Token Bucket Governors, Tiered Ephemeral Caching, Outbox Workers, Preemptive Task Schedulers, Circuit Breakers, and Standardized 429 Translation
alwaysApply: false
---

# Universal Third-Party API Rate Limiting & Resilience Standard

Copy to `.agents/rules/third-party-api-resilience.md` and set `alwaysApply: true`.

```text
  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                 SODA OS UNIVERSAL THIRD-PARTY API RESILIENCE ENGINE                             │
  └────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                   │
         ┌────────────────────────┬────────────────┼────────────────────────┬──────────────────────┐
         ▼                        ▼                ▼                        ▼                      ▼
┌──────────────────┐    ┌──────────────────┐ ┌───────────┐        ┌──────────────────┐  ┌──────────────────┐
│ 1. TOKEN BUCKET  │    │ 2. EPHEMERAL     │ │ 3. OUTBOX │        │ 4. CIRCUIT       │  │ 5. SEMANTIC 429  │
│    GOVERNOR      │    │    CACHE (L1/L2) │ │    WORKER │        │    BREAKER       │  │    TRANSLATION   │
├──────────────────┤    ├──────────────────┤ ├───────────┤        ├──────────────────┤  ├──────────────────┤
│ • Multi-Tier QPS │    │ • Read-through   │ │ • Priority│        │ • Trip on >20%   │  │ • RFC 6585       │
│ • Tenant & App   │    │   30s–300s TTL   │ │   Outbox  │        │   Errors / 429s  │  │   Standard HTTP  │
│ • Leaky Bucket   │    │ • Single-Flight  │ │ • Preempt │        │ • Exponential    │  │ • Retry-After    │
│   Smoothing      │    │   Stampede Guard │ │   Clock   │        │   Jitter Backoff │  │   Propagation    │
└──────────────────┘    └──────────────────┘ └───────────┘        └──────────────────┘  └──────────────────┘
```

---

## 1. Core Architectural Invariant: Zero Direct Unmitigated Outbound Calls

Every external third-party API integration across all service domains MUST NOT execute raw, unmitigated outbound HTTP requests directly inside synchronous user request paths:

- **AI & LLM Providers:** OpenAI, Anthropic, Google Vertex AI/Gemini, AWS Bedrock, Mistral, DeepSeek (governed by RPM, TPM, and TPD budgets).
- **Payment & Financial Gateways:** Stripe, PayPal, Omise, 2C2P, Adyen, Bank Open APIs.
- **Social & Messaging Gateways:** Meta (Graph API, WhatsApp Business), LINE Messaging API, TikTok Open API, YouTube Data API, Discord, Slack.
- **Cloud Infrastructure & Telephony:** Twilio, AWS (S3, SES, SQS, KMS), GCP (Maps, Cloud Tasks), SendGrid, Resend, Pusher.
- **E-Commerce & Marketplaces:** Shopify (GraphQL / REST), Shopee Open Platform, Lazada Open Platform, Amazon SP-API.
- **Enterprise SaaS & CRM:** Salesforce, HubSpot, Zendesk, Jira, Notion API, Google Workspace.

All third-party egress calls MUST pass through the **Soda OS 5-Pillar Universal Resilience Pipeline**:

1. **Inbound & Outbound Rate-Limit Budgeting (Multi-Tier Token & Leaky Bucket)**
2. **Tiered Ephemeral Caching & Single-Flight Stampede Defense**
3. **Asynchronous Outbox Queues & Preemptive Due-Work Schedulers**
4. **Adaptive Circuit Breakers with Jittered Exponential Backoff**
5. **Standardized RFC 6585 HTTP 429 Translation & `Retry-After` Header Propagation**

---

## 2. The 5 Mandatory Universal Resilience Invariants

### ⚖️ Invariant 1: Multi-Tier Outbound Rate Governor (Token Bucket & Leaky Bucket)
- **App/Key Ceiling ($B_{\text{global}}$):** Outbound throughput across the entire platform MUST be capped below 75% of the vendor's hard application limit to prevent account-wide suspension.
- **Tenant / Credential Isolation ($B_{\text{tenant}}$):** Individual customer tenants, organization accounts, or client credentials MUST have isolated sub-buckets (e.g. 10 QPS per tenant) to prevent noisy neighbors from exhausting shared platform capacity.
- **Leaky Bucket Flow Smoothing:** Bursty write requests must be enqueued and released at a constant, smooth rate rather than rejected immediately.
- **AI Token Rate Limiter:** For LLMs, governors must track and enforce both **Requests Per Minute (RPM)** and **Tokens Per Minute (TPM)** concurrently.

### ⚖️ Invariant 2: Tiered Ephemeral Read Caching & Single-Flight Stampede Defense
- **L1 In-Memory + L2 Redis Ephemeral Cache (30s–300s TTL):** High-frequency idempotent reads (catalog queries, user profiles, exchange rates, static LLM prompts, merchant status) MUST be served from cache.
- **Single-Flight Stampede Guard (Promise / Mutex Coalescing):** When $N$ concurrent threads experience a cache miss for the exact same cache key `(tenant_id, query_hash)`, only **1** single outbound HTTP request is dispatched to the third-party provider. The remaining $N-1$ callers await that single flight's resolution.
- **Stale-While-Revalidate (SWR):** Under elevated vendor latency or temporary downstream degradation, serve stale cached payloads immediately while asynchronously refreshing data in the background.

### ⚖️ Invariant 3: Transactional Outbox & Preemptive Due-Work Schedulers
- **Transactional Outbox for Mutations:** Outbound state-mutating actions (e.g. payment captures, order creations, webhook dispatches, marketing campaigns, email/SMS broadcasts) MUST be committed transactionally to the database `outbox_jobs` table first.
- **Preemptive Advisory Lock Polling:** Background worker daemons poll `outbox_jobs WHERE due_at <= NOW() AND status IN ('pending', 'retry')` using non-blocking advisory locks (`FOR UPDATE SKIP LOCKED`) to ensure exactly-once execution across horizontal worker replicas.
- **Deterministic Idempotency Keys:** Every outbound mutation MUST include a deterministic idempotency key (`Idempotency-Key`, `client_token`, or `request_id`) derived from the job UUID to guarantee safe execution across network timeouts and retries.

### ⚖️ Invariant 4: Adaptive Circuit Breaker & Jittered Exponential Backoff
- **Finite State Machine:** Implement `Closed` ➔ `Open` ➔ `Half-Open` state transitions:
  - **Trip Condition:** If the downstream vendor error rate exceeds 20% across 50 requests OR 3 consecutive HTTP 429 / 5xx errors occur within 30 seconds, trip to `Open`.
  - **Fast-Fail in `Open` State:** Fail fast immediately without generating outbound network traffic, protecting downstream providers and returning fallback data or structured errors.
  - **Half-Open Canary Probing:** After a cooldown window ($t_{\text{cooldown}} = 10\text{s}$–$30\text{s}$), permit exactly 1 canary probe request. If successful, reset to `Closed`; if failing, return to `Open`.
- **Decorrelated Full Jitter Backoff Formula:** Retries MUST apply decorrelated full jitter to eliminate synchronized thundering herds:
  $$t_{\text{backoff}} = \min\left(t_{\text{max}}, \text{rand}\left(0, 2^{\text{attempt}} \times t_{\text{base}}\right)\right)$$

### ⚖️ Invariant 5: Standardized RFC 6585 Error Translation & Header Propagation
- When any third-party provider responds with HTTP 429 or proprietary vendor error codes:
  1. Extract and parse standard or vendor-specific cooldown headers (`Retry-After`, `x-ratelimit-reset`, `x-ratelimit-reset-requests`, `x-ratelimit-reset-tokens`, `x-tts-quota-reset`).
  2. Return standard HTTP 429 (`Too Many Requests`) status with `Retry-After: <seconds>` to the calling client.
  3. Format the response body according to the universal RFC 6585 error schema:
     ```json
     {
       "error": "THIRD_PARTY_RATE_LIMITED",
       "vendor": "<vendor_name>",
       "category": "ai | payment | messaging | cloud | commerce | crm",
       "message": "Downstream third-party rate limit exceeded. Please retry after cooldown.",
       "retry_after_sec": 5,
       "resilience_action": "ephemeral_fallback_available | queued_for_retry"
     }
     ```

---

## 3. Universal Provider Archetype Reference Matrix

| Provider Archetype | Representative Services | Typical Quota Model | Standard Error Codes | Mitigation Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **AI & LLM Services** | OpenAI, Anthropic, Gemini, Bedrock, DeepSeek | • RPM (100–10k)<br>• TPM (50k–2M)<br>• TPD ceilings | `429`, `insufficient_quota`, `rate_limit_exceeded`, `overloaded_error` | Dual Token/Token Bucket Governor + Semantic KV Prompt Caching + Multi-Provider Fallback Routing |
| **Payments & Banking** | Stripe, PayPal, Omise, 2C2P, Adyen | • 25–100 QPS (Read/Write)<br>• Anti-fraud burst caps | `429`, `rate_limit`, `too_many_requests` | Transactional Outbox + Strict Idempotency Keys + Exponential Jitter Backoff |
| **Messaging & Social** | Meta (WhatsApp/Graph), LINE, TikTok, Telegram | • 10–50 QPS global<br>• 2k–10k req/min | `429`, `4`, `17`, `613`, `105002`, `30001001` | Outbound Token Bucket per Channel + Leaky Bucket Queue + Ephemeral Read Caching |
| **Cloud & Telephony** | Twilio, AWS (S3, SES, KMS), SendGrid, Resend | • 10–100 QPS<br>• Concurrent call caps | `429`, `ProvisionedThroughputExceeded`, `TooManyRequestsException` | Preemptive Due-Work Worker Bus + Queue Groups + Rate-Governed Bulk Dispatch |
| **E-Commerce & Marketplaces** | Shopify, Shopee, Lazada, Amazon SP-API | • Cost-based GraphQL (e.g. 1000 pts/sec)<br>• REST 2–10 QPS | `429`, `THROTTLED`, `EXCEEDED_RATE_LIMIT` | GraphQL Leaky Bucket Drainer + Single-Flight Catalog Cache + Background Sync Workers |
| **Enterprise CRM & Productivity** | Salesforce, HubSpot, Jira, Google Workspace | • Daily API call pools<br>• 10–100 req/sec burst | `429`, `REQUEST_LIMIT_EXCEEDED`, `rate_limited` | Bulk API 2.0 Outbox batching + Distributed Redis Token Bucket |

---

## 4. Mandatory Verification Pass Checklist

Before approving any goal interacting with third-party APIs:
- [ ] **Governor Precision Test:** Outbound token/leaky bucket accurately meters and holds traffic when QPS / TPM threshold is exceeded.
- [ ] **Single-Flight Coalesce Test:** 20 concurrent requests for the exact same cache miss dispatch exactly 1 outbound HTTP request.
- [ ] **Circuit Breaker Trip & Recovery Test:** Consecutive downstream 429s/5xxs trip breaker to `Open` (fast-failing) and recover cleanly in `Half-Open` state.
- [ ] **Outbox Exactly-Once Execution Test:** Outbox worker processes queued jobs with `FOR UPDATE SKIP LOCKED` and deterministic idempotency keys without duplicate side effects.
- [ ] **Header Parsing Test:** Vendor rate-limit headers are correctly parsed and normalized into standard `Retry-After` HTTP headers.
- [ ] **Zero Stubs / Zero Mocks:** 100% genuine operational resilience logic implemented and verified.
