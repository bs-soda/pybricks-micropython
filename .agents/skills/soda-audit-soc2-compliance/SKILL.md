---
name: soda-audit-soc2-compliance
version: "1.0.0"
description: >-
  Cryptographic tamper-evident audit ledgers, Merkle-tree hash chaining, non-repudiation,
  continuous SOC 2 Type II / ISO 27001 automated evidence collection, GDPR Art 30 / Thai PDPA
  records of processing activities, and enterprise SIEM log forwarding (Splunk, Datadog).
  Use on goals implementing immutable audit trails, security compliance reporting, or SOC 2 readiness.
  Triggers: audit ledger, soc 2, iso 27001, merkle tree, tamper evident, compliance evidence,
  siem, non-repudiation, gdpr art 30, pdpa. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Audit ledgers, Merkle-tree non-repudiation & SOC 2 compliance

**Model:** Event Interception → **Cryptographic Hash Chaining → Merkle Tree Anchoring → Automated SOC 2 Evidence Collection → SIEM Forwarding & Verification**

This skill guarantees that all human and agent actions in Soda OS are **cryptographically sealed in an immutable, tamper-evident audit ledger, establishing non-repudiation and automated SOC 2 Type II / ISO 27001 compliance**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) and [soda-iso29110](../soda-iso29110/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Tamper-evident hash chaining** | Every state mutation, stage-gate approval, and tool execution is chained into an immutable SHA-256 Merkle hash sequence. |
| **Non-repudiation** | Audit log entries MUST be signed with the actor's cryptographic key (Ed25519 NKey or X.509 certificate) so actions cannot be denied. |
| **Continuous automated evidence** | SOC 2 Type II and ISO 27001 evidence is harvested automatically from live system metrics, Git commits, and test outputs; zero manual screenshot collecting. |
| **Immutable storage isolation** | Audit logs are streamed to append-only, Write-Once-Read-Many (WORM) storage (AWS S3 Object Lock / GCS Bucket Lock). |
| **Human approves compliance reports** | SOC 2 evidence packages and compliance audit summaries require review and sign-off by the Security Officer / Lead Architect. |

## Where audit artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Audit architecture & evidence map** | `docs/03-architecture/audit-ledger.md` | product |
| **SOC 2 Type II compliance matrix** | `docs/08-iso29110/soc2-evidence-matrix.md` | product |
| **Merkle ledger engine** | `code/**/services/audit/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal implements audit trails, compliance reporting, or SOC 2 / ISO evidence collection | **Auto-run this skill during PLAN & EXECUTE.** Write Merkle-tree hash chaining, SIEM forwarders, and evidence collectors |
| User says **"audit ledger G-xxx"** / **"soc2 G-xxx"** | Produce or refine the audit and compliance specification for that goal |
| User says **"merkle tree"** / **"tamper evident"** | Stage 2 — implement cryptographic hash chaining algorithm |
| User says **"soc 2 evidence"** / **"compliance evidence"** | Stage 3 — configure automated evidence collectors for CC6.1, CC6.6, CC7.1 |
| User says **"siem"** / **"log forwarding"** | Stage 4 — configure RFC 5424 structured syslog / JSON streaming to Splunk / Datadog |
| User says **"audit verification"** / **"hash integrity check"** | Stage 5 — run cryptographic verification proving zero broken hash links |

---

## The audit & compliance lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Audit event taxonomy & schema (PLAN)

Define structured audit event payload:

$$H_i = \text{SHA-256}\left(H_{i-1} \,\|\, \text{Timestamp} \,\|\, \text{ActorID} \,\|\, \text{Action} \,\|\, \text{PayloadHash}\right)$$

```json
{
  "sequence": 14205,
  "timestamp": "2026-08-24T07:15:00.123Z",
  "actor": { "id": "usr_987", "email": "architect@sodality.cc", "role": "lead_architect" },
  "action": "STAGE_GATE_APPROVAL",
  "resource": { "type": "GOAL", "id": "G-030" },
  "payload_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "prev_hash": "a1b2c3d4e5f6...",
  "current_hash": "f6e5d4c3b2a1...",
  "signature": "ed25519_sig_..."
}
```

**Deliverable:** Audit schema in `docs/03-architecture/audit-ledger.md`.  
**Gate:** Mandatory fields (Sequence, Actor, Action, PrevHash, Signature) strictly validated.

### Stage 2 — Merkle-tree hash chaining & WORM storage (PLAN → EXECUTE)

1. Compute recursive Merkle root over hourly audit batches.
2. Publish Merkle Root to immutable S3 Object Lock (Compliance Mode, retention $7\text{ years}$).

**Deliverable:** `MerkleLedgerService` implementation.  
**Gate:** Modifying any historical record $H_{i-k}$ immediately invalidates all subsequent hashes.

### Stage 3 — Continuous SOC 2 & ISO 27001 evidence automation (EXECUTE)

Automate evidence collection across Trust Services Criteria:
- **CC6.1 (Logical Access):** SCIM provisioning logs and SAML SSO assertions.
- **CC6.6 (Boundary Defense):** WAF drop counts and API rate-limiting telemetry.
- **CC7.1 (Vulnerability Management):** Daily container CVE scan logs and dependency audits.
- **CC8.1 (Change Management):** Git commit hashes linked to approved goal cards and green test runs.

**Deliverable:** Automated evidence collector scripts in `code/**/services/audit/evidence/`.  
**Gate:** Daily automated audit report generated without human intervention.

### Stage 4 — Real-time SIEM log forwarding (EXECUTE)

1. Format logs via standard RFC 5424 / OpenTelemetry log structure.
2. Stream events to enterprise SIEM (Splunk, Datadog, Elastic) over TLS 1.3 with mTLS authentication.

**Deliverable:** SIEM output sink configuration.  
**Gate:** Event delivery latency to SIEM sink $< 2.0\text{s}$ at p99.

### Stage 5 — Cryptographic ledger integrity verification (REVIEW)

- [ ] Run automated hash chain traversal verifying $100\%$ valid sequential signatures.
- [ ] Verify non-repudiation: all administrative mutations signed by valid Ed25519 key.
- [ ] GDPR Art 30 / Thai PDPA Record of Processing Activities up-to-date and compliant.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Append cryptographically chained audit events to immutable WORM logs | Provide endpoints or mechanisms allowing deletion or alteration of audit records |
| Automate continuous evidence collection for SOC 2 Type II compliance | Record sensitive customer PII or raw authentication credentials in audit payloads |
| Forward structured security logs to enterprise SIEM collectors | Suppress or drop audit events even during high-throughput system load |

---

## Related

- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security hardening
- [soda-enterprise-identity-governance](../soda-enterprise-identity-governance/SKILL.md) — IAM & access logs
- [soda-iso29110](../soda-iso29110/SKILL.md) — ISO quality management
