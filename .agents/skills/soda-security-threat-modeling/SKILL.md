---
name: soda-security-threat-modeling
version: "1.0.0"
description: >-
  Security architecture, STRIDE threat modeling, Zero-Trust sandbox boundaries,
  OWASP Top 10 Web & MASVS Mobile defense, PII data redaction, cryptographic key rotation,
  and SOC 2 / ISO 27001 compliance hardening. Use on goals conducting security audits,
  hardening authentication gates, sandboxing untrusted code, or modeling security threats.
  Triggers: security architecture, threat modeling, stride, owasp, zero trust, sandboxing,
  pii redaction, key rotation, soc 2, encryption. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Security architecture, STRIDE threat modeling & zero-trust hardening

**Model:** Architecture Inspection → **STRIDE Threat Modeling → Zero-Trust Boundary Definition → Cryptographic & Sandbox Hardening → Automated Security Audit**

This skill guarantees that Soda OS applications enforce **uncompromising security boundaries, STRIDE threat mitigation, PII data protection, WASM sandbox isolation, and cryptographic defense-in-depth**.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-code-review](../soda-code-review/SKILL.md) and [soda-system-architecture](../soda-system-architecture/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Zero-trust architecture** | Never trust; always verify. Every request, token, and IPC message MUST be authenticated and cryptographically signed (Ed25519 NKeys / mTLS). |
| **Defense in depth** | Security is implemented across multiple redundant layers: Network Gateways, Container Sandboxes, Application Auth, and Database Row-Level Security. |
| **Zero plaintext PII / Secrets** | Credit cards, phone numbers, API keys, and personal identifiers MUST pass through redacting PII shields before touching logs, storage, or LLMs. |
| **Sandboxed untrusted execution** | Untrusted user code and agent scripts MUST run inside fuel-metered WASM sandboxes (Wasmtime) or isolated MicroVMs with hard memory caps ($\le 64\text{MB}$). |
| **Human approves security exceptions** | Security waivers, permission elevations, or cryptographic key rotations require explicit human sign-off. |

## Where security artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Threat model & STRIDE matrix** | `docs/03-architecture/threat-model.md` | product |
| **Security architecture blueprint** | `docs/03-architecture/security-architecture.md` | product |
| **Cryptographic key management SOP** | `docs/03-architecture/kms-policy.md` | product |
| **Security audit report** | `docs/03-architecture/security-audit.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces authentication, crypto keys, sandboxes, or handles sensitive data | **Auto-run this skill during PLAN & EXECUTE.** Author STRIDE matrix, configure WASM sandboxes, and run SAST security linters |
| User says **"threat model G-xxx"** / **"security G-xxx"** | Produce or refine the security architecture specification for that goal |
| User says **"stride"** / **"threat analysis"** | Stage 2 — run systematic STRIDE analysis across all data flow boundaries |
| User says **"pii redaction"** / **"aether shield"** | Stage 3 — configure automated PII scrubbing regexes and token vaulting |
| User says **"sandbox"** / **"wasm sandboxing"** | Stage 4 — configure Wasmtime fuel metering, gas limits, and memory ceilings |
| User says **"security review"** / **"owasp check"** | Stage 5 — run OWASP Top 10 Web & MASVS Mobile compliance verification |

---

## The security engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Data flow diagram (DFD) & trust boundaries (PLAN)

Map data flows across trust boundaries:
1. **Public Zone (Untrusted):** Mobile Apps, Web Browsers, External Webhooks.
2. **DMZ Gateways (Boundary):** Reverse Proxy, Cloudflare, API Gateway with WAF.
3. **Core Application Zone (Semi-Trusted):** Microservices, NATS JetStream, Redis.
4. **Data & Vault Zone (High-Trust):** PostgreSQL with RLS, HSM / KMS Vault, Cold Backup.

**Deliverable:** Data Flow Diagram in `docs/03-architecture/threat-model.md`.  
**Gate:** Trust boundaries and cryptographic transition points explicitly demarcated.

### Stage 2 — STRIDE threat modeling matrix (PLAN)

Analyze all DFD elements against the 6 STRIDE categories:

| STRIDE Threat | Potential Vulnerability | Mandatory Mitigation Invariant |
| :--- | :--- | :--- |
| **S (Spoofing)** | Forged user/agent identity | Ed25519 NKeys / OAuth2 JWT signatures on every request. |
| **T (Tampering)** | Modified in-flight parameters | TLS 1.3 encryption + HMAC payload integrity check. |
| **R (Repudiation)** | Denying an unauthorized action | Append-only Merkle-tree cryptographic audit log. |
| **I (Info Disclosure)**| Leaked customer PII or keys | Automated PII scrubber + AES-256 GCM encryption at rest. |
| **D (Denial of Service)**| Flooding endpoints | Token Bucket rate limiter + 64MB memory ceiling per task. |
| **E (Elevation of Priv)**| Bypassing admin gates | Kernel-level PostgreSQL Row-Level Security (RLS). |

**Deliverable:** STRIDE risk assessment matrix with mitigation owners.  
**Gate:** Zero unmitigated High-Severity threats.

### Stage 3 — PII scrubbing & egress token re-hydration (EXECUTE)

1. Scrub sensory and conversational inputs before logging or passing to LLM context:
   - Credit cards (`\b(?:\d[ -]*?){13,16}\b` $\to$ `[REDACTED_CC]`).
   - Phone numbers & emails $\to$ `[REDACTED_PHONE]`, `[REDACTED_EMAIL]`.
   - API keys & JWT tokens $\to$ `[REDACTED_SECRET]`.
2. Secure egress hydration: Re-hydrate tokens exclusively at isolated egress gateways.

**Deliverable:** PII scrubbing filter middleware.  
**Gate:** Automated test passes 1,000 synthetic PII strings with 100% redaction rate.

### Stage 4 — Zero-trust WASM sandboxing & fuel metering (EXECUTE)

1. Execute untrusted scripts inside Wasmtime sandboxes.
2. Enforce hard physical constraints:
   - Memory allocation ceiling: $\le 64\text{MB}$.
   - CPU fuel/gas limit: Hard cutoff after $10^9$ instructions ($< 500\text{ms}$).
   - System calls: Zero raw filesystem/network access unless explicitly passed via capability handles.

**Deliverable:** WASM sandbox runtime configuration.  
**Gate:** Infinite loop script (`while(true){}`) terminated safely by fuel limiter in $< 500\text{ms}$.

### Stage 5 — OWASP & automated security compliance audit (REVIEW)

- [ ] OWASP Top 10 Web validation (SQLi, XSS, CSRF, SSRF, Broken Auth).
- [ ] OWASP MASVS Mobile validation (No sensitive data in shared preferences, biometrics enforced).
- [ ] Dependencies scanned with zero Critical/High CVEs.
- [ ] Cryptographic keys rotated on a strict 90-day schedule via KMS.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Conduct rigorous STRIDE threat modeling and define zero-trust sandboxes | Bypass authentication or encryption checks for "development convenience" |
| Redact PII data automatically from telemetry, logs, and prompt contexts | Store plaintext secrets, private keys, or API tokens in code or Git |
| Enforce fuel-metered WASM sandboxes with strict memory and CPU ceilings | Allow untrusted code execution directly on host OS without sandboxing |

---

## Related

- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries & DDD
- [soda-api-gateway-contracts](../soda-api-gateway-contracts/SKILL.md) — Edge defense & mTLS
- [soda-code-review](../soda-code-review/SKILL.md) — Security lens code review
