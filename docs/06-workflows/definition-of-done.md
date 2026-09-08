# Definition of done

A goal is **done** only when all items below pass **and** status is **`approved`** with human sign-off.

## Per-goal checklist (copy into goal or acceptance contract)

```markdown
## G-xxx DoD

- [ ] Feature implemented within **In** scope and **Touch map**
- [ ] Acceptance contract scenarios verified (if `docs/02-product/acceptance/G-xxx.md` exists)
- [ ] Tests passing (goal **Test plan** + AGENTS.md standard commands)
- [ ] No lint / analyzer errors
- [ ] Docs updated (API, data, ADR if architectural)
- [ ] Acceptance criteria in goals.md checked `[x]`
- [ ] soda-code-review checklist passed
- [ ] Human approved → status `approved`
- [ ] Changelog entries written
```

## Code

- [ ] All **acceptance criteria** in the goal are met
- [ ] Acceptance contract scenarios pass (when present)
- [ ] Changes stay within goal **In** scope and **Touch map**
- [ ] No commented-out dead code or debug prints left behind
- [ ] Public APIs / schemas updated in `docs/03-architecture/api/` if changed
- [ ] Domain rules updated in `docs/03-architecture/data/` if changed
- [ ] ADR written or linked for architectural decisions

## Quality

- [ ] [soda-testing](../../.agents/skills/soda-testing/SKILL.md) — test/lint commands pass
- [ ] New behavior has tests where logic is non-trivial
- [ ] [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md) checklist passed (all review lenses)

## Process (PR-First Governance)

- [ ] **Branch Isolation:** Executed exclusively on dedicated `feature/G-xxx` branch (branched from `develop`)
- [ ] **Zero Local Integration Merging:** No local merges to `develop` or `main`; agent did not switch branches
- [ ] **Spec stability** passed: clarify + spec check before `ready`; analyze before first execute (or `n/a`)
- [ ] **ClickUp Status Synchronized:** `soda-os sync-clickup G-xxx --status-only` run on all status transitions
- [ ] **Goal status flow:** `ready` → `in_progress` → `review` → `approved` → `done`
- [ ] **Goal archived:** `goals/G-xxx.md` moved to `goals/_archived/G-xxx.md`
- [ ] **Audit & Logs:** Entry in `docs/07-backlog/changelog-goals.md`, `changelog.md`, and raw technical report in `docs/06_raw/`
- [ ] **Feature Branch Push:** All commits pushed directly to `origin/feature/G-xxx`
- [ ] **PR Generation:** GitHub Pull Request targeting `develop` created with structured checklist (`ship G-xxx` / `soda-os pr G-xxx`)

## Ship (PR-First Delivery & Staging)

- [ ] GitHub PR generated to `develop` with filled template and zero placeholder leaks
- [ ] Structured review checklist presented for human review and merge
- [ ] [soda-deploy-staging](../../.agents/skills/soda-deploy-staging/SKILL.md) pre-deploy checklist complete (if goal includes staging deploy)
- [ ] Staging smoke tests pass
- [ ] Human confirmed deploy outcome
- [ ] Rollback path documented if deploy failed

## Product (if user-facing)

- [ ] Copy and UX reviewed against product brief / design docs
- [ ] Security and privacy constraints respected

## Not required every goal

- Full E2E (unless goal says so)
- README marketing updates
- Production deploy (unless goal explicitly includes it)

## Related

- [dev-loop.md](dev-loop.md)
- [../02-product/acceptance-template.md](../02-product/acceptance-template.md)
- [github-governance.md](github-governance.md)
- [../02-product/acceptance/README.md](../02-product/acceptance/README.md)
- [../04-agents/skills-library.md](../04-agents/skills-library.md)
- [../../.agents/rules/governance.md](../../.agents/rules/governance.md)
