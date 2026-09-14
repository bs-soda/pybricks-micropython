---
name: soda-api-gateway-contracts
version: "1.0.0"
description: >-
  API Gateway architecture, OpenAPI 3.1 & JSON Schema contract-first design, gRPC/Protobuf
  serialization, GraphQL schema federation, rate limiting (token bucket / leaky bucket),
  API versioning & backwards compatibility, and zero-trust mTLS / HMAC / OAuth2 authentication.
  Use on goals designing API boundaries, public developer endpoints, gateway routing, or schema contracts.
  Triggers: api gateway, openapi, grpc, protobuf, graphql, schema contract, rate limiting,
  api versioning, mtls, oauth2. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# API gateway, contracts & zero-trust boundaries

**Model:** Interface Definition → **Contract-First Schema (OpenAPI/Protobuf) → Gateway Routing & Policy Enforcement → CodeGen / SDK Generation → Automated Contract Testing**

This skill guarantees that all inter-service and client-server communication in Soda OS is governed by **type-safe, versioned, contract-first schemas** with high-performance edge security.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-system-architecture](../soda-system-architecture/SKILL.md) and [soda-rest-api](../soda-rest-api/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Contract-first over code-first** | OpenAPI 3.1 or `.proto` files are the Single Source of Truth (SSOT). Code, routes, and SDKs are generated from the contract, never vice versa. |
| **Strict backward compatibility** | Never remove or rename existing fields in active API versions. New fields must be optional; breaking changes require a new URL path (`/v2/`). |
| **Zero-trust authentication** | Every request entering the API gateway must be authenticated (Ed25519 NKeys, OAuth2 JWT, or mTLS) and authorized via granular RBAC/ABAC scopes. |
| **Edge defense & rate limiting** | Protect upstream services with Token Bucket rate limiters, payload size restrictions, and strict input schema validation. |
| **Human approves API contracts** | API specifications, route additions, and schema alterations must be reviewed and approved before code generation. |

## Where API contract artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **OpenAPI schemas** | `docs/03-architecture/api/openapi.yaml` | product |
| **Protocol Buffers (.proto)** | `docs/03-architecture/api/proto/` | product |
| **API gateway routing rules** | `docs/03-architecture/api/gateway-routes.md` | product |
| **Generated SDKs / types** | `code/**/generated/api/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal adds or modifies external APIs, gateway routes, or inter-service contracts | **Auto-run this skill during PLAN & EXECUTE.** Write OpenAPI/gRPC schema, generate client types, and write contract tests |
| User says **"api contract G-xxx"** / **"openapi G-xxx"** | Produce or refine the API contract specification for that goal |
| User says **"grpc"** / **"protobuf"** | Stage 2 — author Protocol Buffers definition and gRPC service traits |
| User says **"rate limit"** / **"api gateway"** | Stage 3 — configure Token Bucket rate limiting and reverse proxy routing |
| User says **"api versioning"** / **"contract test"** | Stage 5 — run automated schema compatibility checks and breaking change linters |

---

## The API contract lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Contract-first schema authoring (PLAN)

Define OpenAPI 3.1 specification:

```yaml
openapi: 3.1.0
info:
  title: Soda OS Governance API
  version: 1.0.0
paths:
  /api/v1/goals/{goalId}/stage-gates:
    post:
      summary: Advance human stage-gate approval
      operationId: advanceStageGate
      parameters:
        - name: goalId
          in: path
          required: true
          schema:
            type: string
            pattern: '^G-[0-9]{3}$'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StageGateApprovalRequest'
      responses:
        '200':
          description: Stage-gate successfully advanced
```

**Deliverable:** Validated OpenAPI 3.1 YAML file.  
**Gate:** OpenAPI linter passes with zero structural errors (`spectral lint`).

### Stage 2 — High-performance binary contracts (gRPC / Protobuf) (PLAN)

For sub-millisecond inter-process communication:
1. Define `.proto` service contracts with strongly-typed field tags.
2. Protobuf binary serialization yielding $5-10\times$ smaller payloads than JSON.

**Deliverable:** `.proto` service definition in `docs/03-architecture/api/proto/`.  
**Gate:** Field numbers strictly append-only; zero reused tag numbers.

### Stage 3 — Gateway policy enforcement & rate limiting (EXECUTE)

Configure edge policies:
- **Token Bucket Algorithm:** Capacity $B=100$, refill rate $R=20\text{ req/sec}$ per API key.
- **Payload Sanitization:** Hard payload ceiling ($10\text{MB}$ for JSON; $100\text{MB}$ for multipart uploads).
- **CORS & Security Headers:** HSTS, Content-Security-Policy (CSP), X-Frame-Options (`DENY`).

**Deliverable:** Gateway configuration rules and middleware handlers.  
**Gate:** Rate-limited clients receive clean `429 Too Many Requests` with `Retry-After` headers.

### Stage 4 — Automated SDK & type generation (EXECUTE)

1. Generate TypeScript, Dart (Flutter), and Rust client libraries automatically from OpenAPI / Proto specs.
2. Zero manual typing; all API request/response payloads strictly type-checked at compile time.

**Deliverable:** Generated client packages under `code/**/generated/`.  
**Gate:** Full compilation pass on all generated client SDKs.

### Stage 5 — Automated contract testing & drift detection (REVIEW)

- [ ] Run contract testing (e.g. Pact / Dredd / Schemathesis) verifying API implementations match OpenAPI schemas.
- [ ] Breaking change detector passes (e.g., `oasdiff` verifies zero removed endpoints or required parameters).
- [ ] Latency overhead introduced by gateway proxy $\le 5\text{ms}$ at p99.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Author type-safe contract-first schemas and generate client types | Expose raw un-validated backend endpoints directly to the public Internet |
| Enforce strict rate-limiting and zero-trust authentication boundaries | Introduce breaking API changes without bumping the major API version path |
| Run automated contract tests validating OpenAPI compliance | Hand-write client API types that drift from canonical schemas |

---

## Related

- [soda-rest-api](../soda-rest-api/SKILL.md) — REST endpoint development
- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security & auth
