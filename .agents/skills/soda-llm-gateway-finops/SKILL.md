---
name: soda-llm-gateway-finops
version: "1.0.0"
description: >-
  Enterprise multi-cloud LLM gateway, circuit breakers, semantic caching, departmental
  cost allocation, prompt injection firewalls, and token FinOps. Automatically route requests
  across Claude, OpenAI, Vertex AI, AWS Bedrock, and self-hosted vLLM with zero downtime,
  cutting token costs by 45-60% via vector semantic caching. Use on goals designing LLM infrastructure,
  optimizing AI model expenses, or implementing AI circuit breakers. Triggers: llm gateway,
  model routing, semantic cache, finops, token budget, circuit breaker, prompt firewall.
  Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Enterprise LLM gateway, semantic caching & token FinOps

**Model:** Prompt Intake → **Prompt Firewall & PII Redaction → Semantic Cache Lookup → Multi-Cloud Circuit Breaker Routing → Cost Attribution & FinOps Ledger**

This skill architects **resilient, multi-cloud LLM infrastructure with enterprise FinOps governance**, guaranteeing zero downtime during vendor outages and cutting token expenditures by $45-60\%$ through semantic caching.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-generative-ai-ui](../soda-generative-ai-ui/SKILL.md) and [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Multi-cloud model redundancy** | Never rely on a single LLM vendor. Every model capability (Reasoning, Fast Coding, Embeddings) MUST have active fallback providers with automated circuit breakers. |
| **Semantic caching first** | Queries with cosine similarity $\ge 0.94$ against cached prompt embeddings are served directly from Redis vector store, avoiding redundant API calls. |
| **Hard departmental cost ceilings** | Every workspace/cost center is assigned a hard monthly token quota. Usage $> 80\%$ alerts the administrator; usage $> 100\%$ blocks non-critical batch requests. |
| **Zero data retention agreement (ZDR)** | Enterprise gateway enforces zero-data-retention headers (`no-train`, `data-retention: 0`) across all model vendor APIs. |
| **Human approves vendor quota changes** | Altering departmental token budgets, adding new model providers, or changing fallback priorities requires human approval. |

## Where LLM gateway artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **LLM gateway architecture spec** | `docs/03-architecture/llm-gateway.md` | product |
| **Departmental FinOps budgets** | `docs/03-architecture/finops-budgets.json` | product |
| **Gateway proxy service** | `code/**/services/llm-gateway/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal configures LLM providers, model fallbacks, semantic caching, or token budgeting | **Auto-run this skill during PLAN & EXECUTE.** Author model routing tables, circuit breaker thresholds, and FinOps meters |
| User says **"llm gateway G-xxx"** / **"finops G-xxx"** | Produce or refine the LLM gateway and FinOps specification for that goal |
| User says **"circuit breaker"** / **"model failover"** | Stage 2 — configure automated provider failover (Claude $\to$ GPT $\to$ Bedrock $\to$ vLLM) |
| User says **"semantic cache"** / **"token optimization"** | Stage 3 — build vector similarity caching layer in Redis |
| User says **"finops budget"** / **"token quotas"** | Stage 4 — implement departmental cost attribution and quota enforcement middleware |
| User says **"gateway review"** / **"cost audit"** | Stage 5 — verify failover latency, cache hit rates, and prompt injection defense |

---

## The LLM gateway engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Model capability mapping & prompt firewalls (PLAN)

1. Map capabilities to primary and secondary providers:
   - **High-Reasoning & Complex Coding:** Primary = Anthropic Claude 3.5 Sonnet; Fallback = OpenAI GPT-4o / Vertex AI Gemini 1.5 Pro.
   - **Fast Lightweight & Embeddings:** Primary = Gemini 1.5 Flash / Bedrock Titan; Fallback = Local vLLM (Qwen2.5-Coder).
2. Inline Prompt Injection Firewall: Inspect prompts for jailbreak vectors (`Ignore previous instructions`, `System prompt override`) and drop malicious payloads before dispatching to model endpoints.

**Deliverable:** Model matrix in `docs/03-architecture/llm-gateway.md`.  
**Gate:** Prompt firewall passes 100% of standard OWASP LLM Top 10 injection attack benchmarks.

### Stage 2 — Automated multi-cloud circuit breakers (PLAN → EXECUTE)

Implement Netflix Hystrix / Resilience4j style circuit breakers:
- **State Machine:** `CLOSED` (Healthy) $\to$ `OPEN` (5 consecutive $5\text{xx}$ errors in $10\text{s}$) $\to$ `HALF-OPEN` (Test request every $5\text{s}$).
- When primary vendor circuit opens, seamlessly reroute in $< 100\text{ms}$ to fallback provider.

**Deliverable:** Gateway proxy middleware with active health checks.  
**Gate:** Simulated vendor outage triggers zero client request failures ($100\%$ failover success).

### Stage 3 — Vector semantic caching layer (EXECUTE)

```
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. PROMPT INGESTION & EMBEDDING                             │
  │    Input: "How do I implement JWT auth in Rust?"            │
  │    Generate embedding vector via fast local model (10ms)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 2. REDIS VECTOR SIMILARITY QUERY                            │
  │    HNSW Cosine Distance check against cached prompts        │
  └──────────────────────────────┬──────────────────────────────┘
                 │                               │
        (Similarity >= 0.94)            (Similarity < 0.94)
                 ▼                               ▼
  ┌─────────────────────────────┐ ┌─────────────────────────────┐
  │ CACHE HIT! (Cost: $0.00)    │ │ CACHE MISS: Dispatch to LLM │
  │ Return cached output in 5ms │ │ Cache result in Redis (24h) │
  └─────────────────────────────┘ └─────────────────────────────┘
```

**Deliverable:** Redis vector semantic cache service.  
**Gate:** Cache hits return in $< 15\text{ms}$ with zero downstream LLM billing.

### Stage 4 — Departmental FinOps attribution & quota limits (EXECUTE)

1. Record every request in `finops_token_ledger`:
   - `tenant_id`, `department` (Engineering, Marketing, Sales), `model`, `prompt_tokens`, `completion_tokens`, `cost_usd`.
2. Hard quota enforcement rejecting non-critical requests when department reaches $100\%$ limit.

**Deliverable:** FinOps token accounting middleware.  
**Gate:** Department token costs tracked accurately within $\pm 0.01\%$.

### Stage 5 — Gateway SLA & performance review (REVIEW)

- [ ] End-to-end gateway proxy latency overhead $\le 25\text{ms}$ on cache miss.
- [ ] Zero-Data-Retention (ZDR) confirmed across all active enterprise vendor contracts.
- [ ] Monthly cost reduction of $45-60\%$ verified on benchmark prompt workloads.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Route model requests across redundant multi-cloud providers | Hardcode a single external model vendor without fallback redundancy |
| Cache deterministic prompt responses via vector semantic similarity | Cache confidential tenant-specific PII or credentials across tenant boundaries |
| Enforce departmental token quotas and hard cost ceilings | Allow unbounded token generation that could lead to billing runaway |

---

## Related

- [soda-generative-ai-ui](../soda-generative-ai-ui/SKILL.md) — Streaming AI UI patterns
- [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md) — Cloud infrastructure & SLAs
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security & sandboxing
