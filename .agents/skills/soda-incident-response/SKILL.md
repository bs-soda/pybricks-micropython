---
name: soda-incident-response
version: "1.1.0"
description: >-
  Production or staging incident triage and response. Use when the user reports
  outages, errors in production, rollback needs, or postmortem for an incident.
---

# Incident response

**Human leads communication and final decisions.** Agent investigates, proposes fixes, documents.

**Operating mode: Incident** overrides **Operating mode: Normal** only when human **explicitly declares an incident** and authorizes emergency actions.

## Operating mode: Normal vs Incident

| | Operating mode: Normal | Operating mode: Incident |
|---|-------------|---------------|
| **Command trigger** | Default | Human: "incident", "SEV-1", "prod down", … |
| **Hotfix** | Requires goal + review | Human may authorize emergency path |
| **Prod changes** | Forbidden without approval | Human may authorize specific actions |
| **Goal workflow** | Full goal status flow | Mitigate first; formal goal for permanent fix |
| **Audit** | Standard changelog | Mandatory [changelog.md](../../../docs/07-backlog/changelog.md) entry |

Return to **Operating mode: Normal** when human declares incident resolved.

## Severity (triage)

| Level | Signal | First action |
|-------|--------|--------------|
| **SEV-1** | Service down / data loss risk | Stop risky changes; human notified immediately |
| **SEV-2** | Major feature broken | Mitigate + root cause in parallel |
| **SEV-3** | Minor degradation | Fix in next goal if not urgent |

## Response loop

1. **Stabilize** — rollback, scale, or disable feature flag if faster than fix
2. **Diagnose** — logs, metrics, recent deploys, linked G-xxx / commits
3. **Fix or mitigate** — smallest change; new goal if scope is large
4. **Verify** — smoke test; confirm error rate normal
5. **Document** — timeline, root cause, action items; audit log entry

## Agent does

- Gather evidence from logs, CI, recent changelog
- Propose rollback using [soda-deploy-staging](../soda-deploy-staging/SKILL.md) rollback steps
- Draft postmortem outline in `docs/05-decisions/` or goal notes (human reviews)
- Suggest `draft` goal for permanent fix if out of current scope
- Log incident actions in [changelog.md](../../../docs/07-backlog/changelog.md)

## Agent does not (without explicit human authorization in incident mode)

- Rotate secrets or change production config
- Deploy to production
- Mark unrelated goals `done` during incident
- Commit hotfix without user request
- Skip post-incident documentation

## Postmortem template

```markdown
# Incident YYYY-MM-DD — {title}

## Summary
{one paragraph}

## Timeline
| Time | Event |
|------|-------|

## Root cause

## What went well / what to improve

## Action items
| Item | Owner | Goal |
|------|-------|------|
```

## Related

- [governance.md](../../../.agents/rules/governance.md) — operating modes ([design-spec.md](../../../docs/03-architecture/design-spec.md) §8)
- [security.md](../../../.agents/rules/security.md)
- [soda-deploy-staging](../soda-deploy-staging/SKILL.md)
- [changelog-goals.md](../../../docs/07-backlog/changelog-goals.md)
- [changelog.md](../../../docs/07-backlog/changelog.md)
