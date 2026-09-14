---
name: soda-data-residency-confidential
version: "1.0.0"
description: >-
  Multi-jurisdiction data residency geo-fencing (GDPR, Thai PDPA, Singapore PDPC),
  Customer-Managed Encryption Keys (CMEK / BYOK) via CloudHSM / Vault Enterprise,
  AMD SEV-SNP / Intel SGX confidential computing memory enclaves, and air-gapped on-premises
  deployment packaging. Use on goals implementing sovereign data geo-fencing, enterprise key
  management (BYOK), or confidential hardware isolation. Triggers: data residency, geo-fencing,
  byok, cmek, hsm, confidential computing, amd sev-snp, air gap, gdpr, pdpa.
  Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Data residency, BYOK encryption & confidential computing

**Model:** Jurisdiction Compliance Intake → **Geo-Fenced Routing Topology → Enterprise KMS / BYOK Integration → Confidential Memory Enclaves → Sovereign Compliance Audit**

This skill architects **sovereign, multi-jurisdiction data residency and confidential computing enclaves**, guaranteeing that customer data never leaves legal boundaries and high-stakes computations remain encrypted in memory.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) and [soda-database-architecture](../soda-database-architecture/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Strict territorial geo-fencing** | EU data stays in EU regions (`eu-west-1`), Thai data stays in Thai sovereign clouds, US data stays in US regions. Zero cross-border payload egress. |
| **Customer-Managed Encryption Keys (CMEK / BYOK)** | Enterprise customers hold exclusive control over their cryptographic root keys in Hardware Security Modules (AWS CloudHSM, Azure Key Vault, Vault Enterprise). |
| **Confidential memory enclaves** | High-stakes calculations (Cap Table valuations, M&A due diligence, biometric auth) execute in hardware-encrypted memory enclaves (AMD SEV-SNP / Intel SGX). |
| **Air-gapped on-premises sovereignty** | Defense, banking, and government clients must have an automated 1-click Helm packaging option to run 100% disconnected from the public internet. |
| **Human approves key rotation & residency policies** | Geo-fencing routing rules, key destruction requests, and HSM configurations require explicit human sign-off. |

## Where data residency artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Data residency & residency map** | `docs/03-architecture/data-residency.md` | product |
| **KMS & BYOK key policy** | `docs/03-architecture/kms-policy.md` | product |
| **Air-gap deployment Helm charts** | `code/**/infra/airgap/` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal configures multi-region data residency, BYOK keys, or confidential enclaves | **Auto-run this skill during PLAN & EXECUTE.** Write geo-fenced routers, KMS integration clients, and enclave runners |
| User says **"data residency G-xxx"** / **"byok G-xxx"** | Produce or refine the sovereign data architecture specification for that goal |
| User says **"geo-fencing"** / **"gdpr"** / **"pdpa"** | Stage 2 — configure regional ingress/egress boundaries and partitioned databases |
| User says **"byok"** / **"cloudhsm"** / **"vault enterprise"** | Stage 3 — implement envelope encryption with Customer-Managed Keys (CMEK) |
| User says **"confidential computing"** / **"sev-snp"** | Stage 4 — configure hardware-isolated enclave execution pipelines |
| User says **"air gap"** / **"on-premise package"** | Stage 5 — compile self-contained Helm chart with local offline LLM/DB bundles |

---

## The data residency & confidential lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Legal jurisdiction & classification mapping (PLAN)

Classify data schemas by sovereign legal boundary:

| Region | Regulatory Standard | Ingress / Storage Region | Prohibited Egress |
| :--- | :--- | :--- | :--- |
| **European Union** | GDPR Art 44-49 | `eu-central-1` (Frankfurt) / `eu-west-1` | Egress to US/Non-Adequate countries |
| **Thailand** | Thai PDPA / Bank of Thailand (BOT) | Domestic Cloud (Bangkok) | Un-consented cross-border transfer |
| **United States** | HIPAA / FedRAMP / SOC 2 | `us-east-1` / `us-gov-west-1` | Foreign cloud regions |
| **Singapore** | Singapore PDPC | `ap-southeast-1` | International egress without DTA |

**Deliverable:** Data classification matrix in `docs/03-architecture/data-residency.md`.  
**Gate:** Routing boundaries and tenant legal constraints explicitly defined.

### Stage 2 — Geo-fenced ingress routing & partitioned databases (PLAN → EXECUTE)

1. Edge DNS Anycast routes requests to the legally designated geographic cluster based on `tenant.jurisdiction`.
2. PostgreSQL database instances deployed in-region with zero cross-region replication of PII data tables.

**Deliverable:** Dynamic region-aware router middleware.  
**Gate:** Automated test verifies cross-region API requests are rejected with `451 Unavailable For Legal Reasons`.

### Stage 3 — Envelope encryption & Enterprise BYOK KMS (EXECUTE)

Implement Envelope Encryption ($E_K(\text{DEK}) \to \text{Data}$):
1. **Key Encryption Key (KEK):** Stored inside customer's CloudHSM / Vault instance; never leaves hardware perimeter.
2. **Data Encryption Key (DEK):** Ephemeral 256-bit AES-GCM key generated per document/row, encrypted under KEK.

```
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. CUSTOMER HARDWARE SECURITY MODULE (CloudHSM / KMS)       │
  │    Holds Root Customer Key (KEK) - Customer Controlled      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ (Decrypt DEK Request)
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 2. APPLICATION RUNTIME (In-Memory Only)                     │
  │    Decrypts ephemeral DEK ➔ Encrypts/Decrypts Data Row      │
  │    Zeros memory buffer immediately after operation          │
  └─────────────────────────────────────────────────────────────┘
```

**Deliverable:** BYOK KMS adapter client in `code/**/services/kms/`.  
**Gate:** Revoking customer KEK renders all encrypted tenant data instantly unreadable.

### Stage 4 — AMD SEV-SNP confidential computing enclaves (EXECUTE)

1. Deploy critical computation workers inside AMD SEV-SNP hardware-encrypted memory enclaves.
2. Verify hardware cryptographic attestation report before provisioning encryption keys into memory.

**Deliverable:** Enclave worker build script and attestation verifier.  
**Gate:** Host OS hypervisor memory dumps cannot read plaintext variables inside the enclave.

### Stage 5 — Air-gapped on-premises packaging & audit (REVIEW)

- [ ] 1-click Helm chart deploys complete Soda OS stack offline with local vLLM / Ollama and PostgreSQL.
- [ ] Automated network packet sniffer verifies zero outbound DNS or HTTP requests made from the cluster.
- [ ] Compliance verification report exported proving 100% adherence to target jurisdiction mandates.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Enforce strict geo-fenced data residency routing per tenant jurisdiction | Replicate confidential customer data across un-authorized geographic borders |
| Integrate Customer-Managed Encryption Keys with hardware envelope encryption | Store master KMS keys or plain customer credentials in application code |
| Provide confidential computing enclaves and offline air-gapped Helm packages | Allow un-attested host processes to access confidential memory spaces |

---

## Related

- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security threat analysis
- [soda-database-architecture](../soda-database-architecture/SKILL.md) — Database RLS & sharding
- [soda-audit-soc2-compliance](../soda-audit-soc2-compliance/SKILL.md) — Compliance auditing
