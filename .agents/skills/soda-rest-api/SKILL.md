---
name: soda-rest-api
version: "1.0.0"
description: >-
  Creates or changes HTTP/RPC endpoints following Soda API standards: contract
  in docs, consistent errors, auth, tests. Use when a goal adds or modifies REST
  or RPC APIs, endpoints, routes, or API contracts.
---

# Create REST API

Stack-agnostic playbook. Adapt paths to the project's stack under `code/`.

## Before coding

1. Read active goal **In / Out / Touch map**
2. Check [docs/03-architecture/api/](../../../docs/03-architecture/api/README.md) for existing contracts
3. Read linked ADRs (auth, versioning)

## Contract first

Add or update a contract file under `docs/03-architecture/api/`:

```markdown
# {Resource name}

## {METHOD} {path}

**Auth:** required | optional | none  
**Goal:** G-xxx

### Request
{schema or example JSON}

### Response 200
{schema or example JSON}

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 404 | NOT_FOUND | Resource missing |
| 500 | INTERNAL | Unexpected server error |
```

Keep contracts in sync when implementation changes.

## Implementation checklist

- [ ] Handler/route in goal **Touch map** only
- [ ] Input validation at boundary; never trust client
- [ ] Consistent error shape (code + message; no stack traces to client)
- [ ] Auth enforced per contract
- [ ] Logging without secrets or PII in plain text
- [ ] Unit/integration tests for happy path + main error cases

## Test plan (minimum)

- Success response matches contract
- Validation failure returns 400 with stable error code
- Auth failure returns 401 when required
- Not found returns 404 when applicable

Run [soda-testing](../soda-testing/SKILL.md) for test conventions.

## Close

- Contract file updated in same goal commit (when user requests commit)
- Goal acceptance criteria checked

## Related

- [docs/03-architecture/api/README.md](../../../docs/03-architecture/api/README.md)
- [soda-testing](../soda-testing/SKILL.md)
- [soda-code-review](../soda-code-review/SKILL.md)
