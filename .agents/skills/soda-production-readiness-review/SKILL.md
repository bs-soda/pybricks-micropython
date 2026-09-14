---
name: soda-production-readiness-review
version: "1.0.0"
description: >-
  Production Readiness Review (PRR), Chaos Engineering, load & stress testing, disaster recovery
  runbooks, live traffic shadow verification, and 99.99% SLA launch certification. Run comprehensive
  operational audits across all 8 enterprise pillars before promoting any major system release to production.
  Triggers: production readiness, prr, chaos engineering, stress test, load test, launch gate,
  production audit, disaster recovery runbook, sla certification. Collaboration phases PLAN → REVIEW.
---

# Production Readiness Review (PRR) & Chaos Engineering

**Model:** Release Candidate Intake → **8-Pillar PRR Audit → Chaos Fault Injection & Load Stress → Disaster Recovery Runbook Run → 99.99% Production Launch Gate**

This skill executes a rigorous **Senior Principal Architect Production Readiness Review (PRR)**, subjecting release candidates to chaos engineering, load stress testing, and failure recovery before granting production launch certification.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-code-review](../soda-code-review/SKILL.md) and [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Zero production promotion without PRR** | No application or service reaches production status without a completed, signed-off PRR scorecard across all 8 enterprise pillars. |
| **Chaos engineering verification** | Resilience must be proven empirically by injecting real failure modes (node death, network partition, database failover) during active test traffic. |
| **Load testing beyond peak** | Systems MUST pass load testing at $3\times$ forecasted peak traffic without memory leakage, CPU throttling, or dropped requests. |
| **Actionable disaster recovery runbooks** | Every anticipated failure scenario MUST have an explicit, copy-paste executable runbook in `docs/06-workflows/runbooks/`. |
| **Human releases to production** | Only humans authorize final production releases. The PRR gates the transition, and humans sign the launch certificate. |

## Where PRR artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Production Readiness Scorecard** | `docs/03-architecture/prr-scorecard.md` | product |
| **Disaster recovery runbooks** | `docs/06-workflows/runbooks/` | product |
| **Load & chaos benchmark results** | `docs/03-architecture/chaos-benchmarks.md` | product |
| **Production Launch Certificate** | `docs/05-decisions/LAUNCH-CERT-xxx.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal promotes a system or major feature to production / release phase | **Auto-run this skill during REVIEW.** Execute the 8-pillar PRR audit, run chaos benchmarks, and verify runbooks |
| User says **"production readiness G-xxx"** / **"prr G-xxx"** | Run comprehensive PRR scorecard audit for that goal |
| User says **"chaos test"** / **"fault injection"** | Stage 2 — run Chaos Mesh / Litmus fault injection test suite |
| User says **"load test"** / **"stress test"** | Stage 3 — execute k6 / Locust benchmark at $3\times$ peak traffic |
| User says **"runbook"** / **"dr test"** | Stage 4 — author and dry-run disaster recovery failover runbooks |
| User says **"launch gate"** / **"certify production"** | Stage 5 — compile final Production Launch Certificate |

---

## The Production Readiness Review lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — The 8-Pillar Enterprise PRR Scorecard (PLAN → REVIEW)

Evaluate release candidate across the 8 Enterprise Pillars (Pass / Fail / Blocked):

| # | Enterprise Pillar | Mandatory Check Criteria | Gate Criteria |
|---|:---|:---|:---|
| 1 | **Identity & IAM** | SAML 2.0 / SCIM 2.0 active, fine ABAC enforced | Zero unauthenticated endpoints |
| 2 | **Audit & SOC 2** | Merkle-tree hash chaining, SIEM log forwarding | Hash chain integrity verified |
| 3 | **HA & Consensus** | Multi-region active-active, Redlock, NATS Raft | Zero message loss on partition |
| 4 | **LLM Gateway & FinOps** | Multi-cloud circuit breakers, vector semantic cache | $100\%$ failover on vendor outage |
| 5 | **KMS & Confidential** | CMEK / BYOK envelope encryption, AMD SEV-SNP | Plaintext keys never in memory dumps |
| 6 | **Sagas & Rollbacks** | Compensating transaction rollbacks ($C_1 \gets C_2$) | Injected fail triggers clean rollback |
| 7 | **Data Residency** | Geo-fenced routing per jurisdiction (GDPR/PDPA) | Zero cross-border payload egress |
| 8 | **SRE Observability** | Golden Signals telemetry, OpenTelemetry, SLO alerts | p99 $< 250\text{ms}$, Alert fires in $< 60\text{s}$ |

**Deliverable:** Completed PRR Scorecard in `docs/03-architecture/prr-scorecard.md`.  
**Gate:** $100\%$ of all 8 pillars scored as **PASS**.

### Stage 2 — Chaos engineering & fault injection (REVIEW)

Inject simulated failure modes under live synthetic traffic:
1. **Pod Kill:** Kill $50\%$ of backend application pods simultaneously $\to$ Verify HPA re-provisions with zero $5\text{xx}$ errors.
2. **Database Primary Failover:** Force PostgreSQL leader failover $\to$ Verify PgBouncer reconnects to new leader within $< 5\text{s}$.
3. **Network Latency Injection:** Add $+300\text{ms}$ latency to inter-service calls $\to$ Verify circuit breakers open cleanly and display fallback UI.

**Deliverable:** Chaos test report in `docs/03-architecture/chaos-benchmarks.md`.  
**Gate:** Zero cascading system crashes during chaos execution.

### Stage 3 — High-throughput load & stress testing (REVIEW)

1. Execute load test at $1\times, 2\times, \text{and } 3\times$ peak forecasted traffic ($10,000\text{ RPS}$).
2. Measure p95/p99 latency curves and check for memory leaks over a $2\text{-hour}$ soak test.

**Deliverable:** k6 / Locust load testing telemetry graphs.  
**Gate:** Memory and CPU saturation remain $\le 75\%$ throughout soak test.

### Stage 4 — Disaster recovery (DR) runbook verification (REVIEW)

Author executable markdown runbooks:
- `docs/06-workflows/runbooks/db-failover.md`: PostgreSQL leader promotion commands.
- `docs/06-workflows/runbooks/region-evacuation.md`: Global DNS traffic rerouting commands.
- `docs/06-workflows/runbooks/secret-leak-response.md`: Emergency key invalidation steps.

**Deliverable:** Validated, copy-paste executable DR runbooks.  
**Gate:** Dry-run DR drill executed successfully by an engineer within target RTO ($< 15\text{min}$).

### Stage 5 — Production Launch Certificate & human sign-off (REVIEW → approval)

Draft formal launch certificate in `docs/05-decisions/LAUNCH-CERT-xxx.md`:
- Summary of verified NFR metrics (Latency, Error Rate, RPS).
- Security, Compliance, and SRE approvals.
- Formal roll-forward deployment timeline and rollback threshold triggers.

**Gate (human approval):** Release Commander signs the Launch Certificate before initiating production deploy.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Execute automated chaos benchmarks and evaluate PRR scorecards | Declare a system "Production Ready" if any of the 8 pillars fails |
| Author disaster recovery runbooks with copy-paste executable commands | Trigger destructive chaos injection tests directly on live production without authorization |
| Gate releases until load tests and security scans pass with zero errors | Bypass PRR gates to rush unverified features into production |

---

## Related

- [soda-cloud-infra-sre](../soda-cloud-infra-sre/SKILL.md) — SRE observability & SLAs
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security hardening
- [soda-deploy-staging](../soda-deploy-staging/SKILL.md) — Staging deploy automation
- [soda-incident-response](../soda-incident-response/SKILL.md) — Incident triaging
