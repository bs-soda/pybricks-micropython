---
name: soda-enterprise-identity-governance
version: "1.0.0"
description: >-
  Enterprise identity architecture, SAML 2.0 SSO federation (Okta, Azure AD / Microsoft Entra,
  PingIdentity, Google Workspace), SCIM 2.0 automated user lifecycle provisioning, Fine-Grained
  Attribute-Based Access Control (ABAC), and multi-tenant organization directory sync.
  Use on goals implementing enterprise SSO, employee onboarding/offboarding sync, or document-level
  permission policies. Triggers: enterprise identity, saml, sso, scim, abac, okta, azure ad,
  entra id, user provisioning, rbac. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Enterprise identity, SAML 2.0 / SCIM & Fine-Grained ABAC

**Model:** Identity Provider Discovery → **SAML 2.0 Federation → SCIM 2.0 User Lifecycle Engine → Attribute-Based Access Control (ABAC) → Enterprise SSO Audit**

This skill engineers **Fortune 500 Enterprise Identity and Access Management (IAM)**, enabling single sign-on (SSO), automated directory synchronization, and granular document-level permission controls across enterprise tenants.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-system-architecture](../soda-system-architecture/SKILL.md) and [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **SSO federation standard** | Support standard SAML 2.0 (SP-Initiated & IdP-Initiated) and OpenID Connect (OIDC) with enterprise IdPs (Okta, Entra ID, PingIdentity). |
| **Automated SCIM 2.0 lifecycle** | Employee provisioning, role updates, and instant de-provisioning MUST sync via SCIM `/Users` and `/Groups` REST endpoints. |
| **Fine-Grained ABAC** | Access control evaluated dynamically based on Subject Attributes, Resource Attributes, Action, and Environmental Context (e.g. time, IP, tenant). |
| **Strict tenant boundary** | Identity credentials and session tokens are strictly scoped to a single `tenant_id`; cross-tenant token pollution is cryptographically impossible. |
| **Human approves privilege elevation** | Modifying super-admin roles, granting root tenant rights, or creating global directory mappings requires human sign-off. |

## Where enterprise identity artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Identity architecture spec** | `docs/03-architecture/identity-architecture.md` | product |
| **ABAC policy matrix** | `docs/03-architecture/abac-policies.json` | product |
| **SAML / SCIM services** | `code/**/services/identity/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal implements SSO, SAML, SCIM, or enterprise user management | **Auto-run this skill during PLAN & EXECUTE.** Configure SAML SP metadata, SCIM endpoints, and ABAC engine |
| User says **"enterprise identity G-xxx"** / **"sso G-xxx"** | Produce or refine the enterprise IAM specification for that goal |
| User says **"saml"** / **"okta"** / **"entra id"** | Stage 2 — configure SAML metadata exchange, X.509 cert validation, and assertion parsing |
| User says **"scim"** / **"user provisioning"** | Stage 3 — build SCIM 2.0 REST endpoints for user/group provisioning & de-provisioning |
| User says **"abac"** / **"permissions matrix"** | Stage 4 — implement Open Policy Agent (OPA) / ABAC policy evaluation engine |
| User says **"sso audit"** / **"iam check"** | Stage 5 — verify token expiry, certificate rotation, and revocation latency |

---

## The enterprise identity lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Identity Provider (IdP) mapping & trust setup (PLAN)

Map enterprise IdP capabilities:
- **Supported IdPs:** Okta, Microsoft Entra ID (Azure AD), PingIdentity, Google Workspace.
- **Protocol:** SAML 2.0 with SHA-256 signatures; OIDC Authorization Code Flow with PKCE.

**Deliverable:** IdP integration matrix in `docs/03-architecture/identity-architecture.md`.  
**Gate:** EntityID, ACS URL, and Single Logout (SLO) endpoints strictly defined.

### Stage 2 — SAML 2.0 Service Provider (SP) federation (PLAN → EXECUTE)

1. Generate SP X.509 public certificates and metadata XML.
2. Validate incoming SAML assertions:
   - Signature verification against IdP public certificate.
   - `NotBefore` and `NotOnOrAfter` timestamp verification ($\pm 60\text{s}$ clock skew).
   - `AudienceRestriction` matches SP EntityID.

**Deliverable:** SAML authentication handler and session emitter.  
**Gate:** Automated unit test verifies invalid/expired SAML assertions are rejected with `401 Unauthorized`.

### Stage 3 — SCIM 2.0 automated provisioning engine (EXECUTE)

Implement RFC 7643 & RFC 7644 SCIM 2.0 endpoints:
- `POST /scim/v2/Users`: Create and provision new user.
- `PATCH /scim/v2/Users/{id}`: Update user attributes or deactivate (`active: false`).
- `DELETE /scim/v2/Users/{id}`: De-provision user and terminate all active sessions instantly.
- `GET /scim/v2/Groups`: Sync group memberships to enterprise roles.

**Deliverable:** SCIM REST controller with Bearer token authentication.  
**Gate:** De-provisioning request terminates active JWT sessions in $< 500\text{ms}$.

### Stage 4 — Fine-Grained Attribute-Based Access Control (ABAC) (EXECUTE)

Define ABAC evaluation rules:

$$\text{Decision} = f\left(\text{Subject}\{\text{Role, Dept, Clearance}\}, \text{Resource}\{\text{Owner, Classification, Tenant}\}, \text{Action}, \text{Context}\right)$$

Example: External design agencies can view UX deliverables (`docs/03-architecture/brand/`), while Board members and CFO hold exclusive decryption rights over Cap Table waterfalls and DCF models.

**Deliverable:** ABAC evaluator middleware in `code/**/services/identity/abac.*`.  
**Gate:** 100% test coverage over positive and negative permission permutations.

### Stage 5 — SSO session governance & certificate rotation (REVIEW)

- [ ] SAML signing certificates support dual-certificate rollover without downtime.
- [ ] Session lifetime capped at $12\text{ hours}$ with idle timeout after $30\text{ minutes}$.
- [ ] Multi-Factor Authentication (MFA) enforcement status passed from IdP claims.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Implement standard SAML 2.0 and SCIM 2.0 enterprise identity protocols | Store un-hashed passwords or raw IdP private keys in application databases |
| Enforce strict ABAC rules ensuring zero cross-tenant data leakage | Allow bypass of IdP authentication for administrative backdoor routes |
| Automate instant user revocation upon receiving SCIM de-provisioning calls | Retain active session tokens after an employee is marked inactive in SCIM |

---

## Related

- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries & DDD
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Threat analysis
- [soda-audit-soc2-compliance](../soda-audit-soc2-compliance/SKILL.md) — Access audit logging
