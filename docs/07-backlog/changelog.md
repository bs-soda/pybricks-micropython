# Agent audit trail

> Session-level log of AI actions and human decisions. Complements [changelog-goals.md](changelog-goals.md) (goal completions only).

Append a row after significant agent work or review.

| Date | Goal | Agent action | Files changed (summary) | Human reviewer | Decision |
|------|------|--------------|-------------------------|----------------|----------|
| 2026-05-27 | G-002 | add soda-os upgrade | soda-os upgrade, upgrade docs | human | approve |
| 2026-05-27 | G-000 | CI & PR governance hardening | .github/, scripts/ci/, governance docs | human | approve |
| {YYYY-MM-DD} | — | Agent OS scaffold | governance layer docs | — | — |

## When to log

- Goal moved to `review` or `approved`
- Human approved or rejected a PR / diff
- Operating mode: Incident activated or closed
- Scope creep stopped or goal split

## Format notes

- **Agent action:** implement, test, review report, deploy prep, incident triage
- **Decision:** approve, request changes, blocked, emergency authorized
