---
name: soda-code-review
version: "1.1.0"
description: >-
  Human and agent code review checklist before marking a goal done or merging.
  Use when reviewing a diff, PR, or before closing G-xxx, or when the user asks
  for code review.
---

# Code review checklist

Run after tests pass, before goal status → `approved` or merge. Set goal status → `review` during collaboration phase REVIEW.

Review through **five lenses** — not syntax only.

## Lens 1: Scope & process

- [ ] **One goal** — diff matches a single G-xxx; no unrelated changes
- [ ] **Touch map** — only listed paths edited (+ goal/changelog/docs)
- [ ] **Project scope** — nothing from Out of scope without a goal
- [ ] **Acceptance criteria** — each item verifiably met
- [ ] **Acceptance contract** — scenarios in `docs/02-product/acceptance/G-xxx.md` pass (if present)
- [ ] **Spec drift** — diff matches Intent + How + Change delta; no invented extra behaviour
- [ ] **Goal status** — goal is `review`; not `done` until human approves

## Lens 2: Security

- [ ] No secrets, tokens, or credentials in code or docs
- [ ] User input validated; auth checks where required
- [ ] PII handled per product brief / privacy constraints
- [ ] No auth/security boundary changes without linked ADR + human approval

## Lens 3: Maintainability

- [ ] Smallest correct diff; no drive-by refactors
- [ ] No dead code, debug prints, or commented-out blocks
- [ ] Naming matches project conventions
- [ ] Error handling at boundaries; no silent failures

## Lens 4: Architecture compliance

- [ ] Matches `docs/03-architecture/` and stack rules (`.agents/rules/{stack}.md`)
- [ ] API changes in `docs/03-architecture/api/` if applicable
- [ ] Domain rules in `docs/03-architecture/data/` if applicable
- [ ] ADR written or linked for architectural decisions

## Lens 5: Breaking changes & scope creep

- [ ] No undocumented breaking API or schema changes
- [ ] No major dependency upgrades outside goal **In**
- [ ] If scope grew → stop; Planner splits or new `draft` goal

## Tests

- [ ] Test plan from goal executed and green
- [ ] New non-trivial logic has behavioral tests ([soda-testing](../soda-testing/SKILL.md))

## Human decision

| Outcome | Action |
|---------|--------|
| **Approve** | Set goal → `approved`; user may request `commit G-xxx`; append [changelog.md](../../../docs/07-backlog/changelog.md) |
| **Request changes** | Stay `in_progress` or `review`; fix and re-run checklist |
| **Scope creep** | Stop — Planner splits or new `draft` goal |
| **Blocked** | Set `blocked`; document in goal notes |

Agent: report checklist results by lens; **do not commit** unless user asks. **Do not merge.**

## Related

- [definition-of-done.md](../../../docs/06-workflows/definition-of-done.md)
- [governance.md](../../../.agents/rules/governance.md)
- [soda-goal-workflow](../soda-goal-workflow/SKILL.md)
