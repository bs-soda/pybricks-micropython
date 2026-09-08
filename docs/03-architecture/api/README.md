# API contracts

> **Single source of truth** for HTTP/RPC endpoints. One file per resource or service area.

Agents and humans read contracts here **before** implementing or reviewing API goals.

## Conventions

- File naming: `{resource}.md` or `{service}-{resource}.md` (lowercase, hyphenated)
- Every endpoint documents: method, path, auth, request, response, errors
- Link **Goal:** G-xxx on each new or changed endpoint
- Keep in sync with `code/` — update contract in the same goal as the code change

## Template

See [.agents/skills/soda-rest-api/SKILL.md](../../../.agents/skills/soda-rest-api/SKILL.md) for the contract block format.

## Index

| Contract | Status | Goal |
|----------|--------|------|
| *(none yet — add at first API goal)* | — | — |

## Related

- [design-spec.md](../design-spec.md)
- [overview.md](../overview.md)
