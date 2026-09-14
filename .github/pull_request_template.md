> **Before opening:** replace `G-___` with your goal (e.g. `G-PAY-001` or legacy `G-012`). Fill **Summary** and **Test plan**.  
> CI fails if placeholders remain. Process-only PRs: put the governance tag in the **title** (see github-governance.md).

## Goal

- **Goal ID:** G-___
- **Goal status in [goals.md](../docs/07-backlog/goals.md):** `review` / `approved`

## Summary

_(Required — 1–3 sentences: what changed and why)_

## Scope

- [ ] Single goal only — no unrelated refactors
- [ ] Changes stay within goal **Touch map**
- [ ] Nothing from `project-brief.md` **Out** without an approved goal

## Quality

- [ ] Tests pass locally and in CI
- [ ] Lint / analyzer green
- [ ] [soda-code-review](../.agents/skills/soda-code-review/SKILL.md) lenses addressed:
  - [ ] Security (no secrets, input validation)
  - [ ] Maintainability (minimal diff)
  - [ ] Architecture compliance
  - [ ] No breaking changes / scope creep

## Docs & contracts

- [ ] Acceptance criteria checked in goals.md
- [ ] Acceptance contract verified (if `docs/02-product/acceptance/G-xxx.md` exists)
- [ ] API / data / ADR docs updated if applicable

## Test plan

_(Required — commands run, e.g. `cd code && npm test`)_

- [ ] `AGENTS.md` standard commands
- [ ] Goal test plan

## Human approval

- [ ] I reviewed this PR and approve merge
- [ ] Agent did **not** merge (human merges)
