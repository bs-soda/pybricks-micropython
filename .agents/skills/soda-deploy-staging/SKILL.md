---
name: soda-deploy-staging
version: "1.0.0"
description: >-
  Deploy to staging following Soda SHIP phase. Use when a goal covers
  deployment, staging release, CI/CD pipeline, or shipping to a non-production
  environment.
---

# Deploy to staging

**Human owns the outcome** — agent prepares, validates, and reports; human approves deploy.

## Preconditions

- [ ] Goal status `in_progress`; scope is deploy/staging only
- [ ] All tests green ([soda-testing](../soda-testing/SKILL.md))
- [ ] [soda-code-review](../soda-code-review/SKILL.md) passed
- [ ] No secrets in repo; use env vars / secret manager documented in goal

## Pre-deploy checklist

- [ ] CI workflow green on target branch
- [ ] Version or build tag documented (if applicable)
- [ ] Database migrations applied or planned ([soda-db-migration](../soda-db-migration/SKILL.md))
- [ ] Rollback steps known (previous image/tag, migration down, or feature flag)

## Deploy steps (adapt per stack)

1. Confirm target environment (staging URL / namespace)
2. Run deploy command or CI workflow documented in goal **Notes for AI**
3. Smoke test critical paths after deploy:
   - Health/readiness endpoint
   - One core user flow from acceptance criteria
4. Record deploy result in goal notes or changelog row

## Post-deploy

- [ ] Staging accessible and smoke tests pass
- [ ] No new errors in logs (spot-check)
- [ ] Human confirms before production (out of scope unless goal says so)

## Agent boundaries

- Prepare scripts, workflow files, and checklists within **Touch map**
- **Do not** deploy to production unless goal explicitly includes it and human confirms
- **Do not** commit secrets

## Related

- [design-spec.md](../../../docs/03-architecture/design-spec.md) — SHIP phase
- [soda-incident-response](../soda-incident-response/SKILL.md) — if deploy fails
