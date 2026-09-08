# Dev loop

One round = one goal = one commit (when possible) + green tests + review.

See **[team-workflow.md](team-workflow.md)** for the full **collaboration cycle** (DEFINE → SHIP). Terminology: [design-spec.md](../03-architecture/design-spec.md) §8.

**DEFINE spine:** [knowledge-loop.md](knowledge-loop.md) — Conversation → Knowledge → Decision → Execution. Use [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) before first goals.

## Macro cycle (project level)

```text
DEFINE → PLAN → EXECUTE → REVIEW → SHIP (PR-First) → (repeat)
```

## Micro loop (one goal — PR-First)

```text
┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐    ┌─────────────────┐
│ Planner  │───▶│ Implementer  │───▶│  Tester    │───▶│ Reviewer│───▶│  Close   │───▶│ Shipper (PR)    │
│ goal     │    │ feature/G-xxx│    │ zero mocks │    │ review  │    │ archive  │    │ PR to develop   │
└──────────┘    └──────────────┘    └────────────┘    └─────────┘    └──────────┘    └─────────────────┘
```

### 1. Select goal & Branch Isolation

- Open [../07-backlog/goals.md](../07-backlog/goals.md)
- Pick highest **`ready`** goal whose dependencies are `done` (skip `draft` / `planned`)
- **Branch Isolation:** Ensure dedicated branch `feature/G-xxx` (branched from `develop`). Never work on `develop` or `main`.
- Set goal status → `in_progress` when human says **"เริ่ม step N"** (first execution on a `ready` goal) + sync ClickUp (`soda-os sync-clickup G-xxx --status-only`)
- Load acceptance contract `docs/02-product/acceptance/G-xxx.md` if present
- Load matching skill from [skills-library.md](../04-agents/skills-library.md)

### 2. Confirm scope

- **In** / **Out** unambiguous
- Acceptance criteria testable
- **Spec stability** `analyze` is `done` or `n/a` — else **`analyze G-xxx`** first
- If not → Planner updates goal; stop

### 3. Implement (collaboration phase EXECUTE)

- Work exclusively on `feature/G-xxx`
- Read touch map, architecture links, and task skill (API, migration, etc.)
- Code only within scope (Zero Mocks / Zero Stubs)
- Update `docs/03-architecture/api/` or `data/` when applicable
- No unrelated refactors

### 4. Test (Verification / Quality Bar)

- Follow [soda-testing](../../.agents/skills/soda-testing/SKILL.md)
- Run goal **Test plan** and `AGENTS.md` **Standard commands**
- Verify acceptance contract scenarios (`docs/02-product/acceptance/G-xxx.md`)
- Fix all failures and linter warnings before proceeding

### 5. Review (collaboration phase REVIEW)

- Set goal status → `review` + sync ClickUp (`soda-os sync-clickup G-xxx --status-only`)
- Run [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md) (five lenses)
- Human approves → `approved` (sync ClickUp); or request changes → `in_progress`

### 6. Commit & Push on Feature Branch

- **Branch Isolation:** Commit only on `feature/G-xxx`.
- **Zero Local Integration Merging:** Agent **never** switches to `develop` or `main` and **never** runs `git merge` locally.
- Message format: `G-xxx: description`
- Push directly to `origin/feature/G-xxx`:
  ```bash
  git push -u origin feature/G-xxx
  ```

### 7. Close goal

- All **Plan** steps `done`; acceptance criteria `[x]`
- Status → `done` (from `approved` only) + sync ClickUp (`soda-os sync-clickup G-xxx --status-only`)
- Move `goals/G-xxx.md` → `goals/_archived/G-xxx.md`; update `queues/{EPIC}.md` (or Dashboard in [../07-backlog/goals.md](../07-backlog/goals.md) on main)
- Do not append [../07-backlog/changelog-goals.md](../07-backlog/changelog-goals.md) or [../07-backlog/changelog.md](../07-backlog/changelog.md) on an epic branch — roll up on `main` after the PR
- Export technical audit report to `docs/06_raw/`
- Commit and push closeout artifacts to `origin/feature/G-xxx`

### 8. Ship (PR-First Delivery)

- Triggered by `ship G-xxx` (or `open PR G-xxx` / `soda-os pr G-xxx`)
- Push `feature/G-xxx` to `origin/feature/G-xxx`
- Pre-fill `.github/pull_request_template.md` and create PR targeting `develop` (`gh pr create --base develop --head feature/G-xxx ...`)
- Output direct clickable GitHub PR URL and structured review checklist for human review and merge into `develop`
- Follow [soda-deploy-staging](../../.agents/skills/soda-deploy-staging/SKILL.md) if goal scope includes staging deployment after merge

## When to split a goal

Split if estimate > one focused session or touches unrelated modules.

## When to write an ADR

Auth strategy, schema breaking change, new dependency, major architectural choice.

Use [../05-decisions/0000-template.md](../05-decisions/0000-template.md). See [0001-example-postgresql.md](../05-decisions/0001-example-postgresql.md) for format.

## When to write a PDR

Product scope cut, persona priority, timeline tradeoff, feature deferral, pivot after change intake.

Use [../05-decisions/pdr-0000-template.md](../05-decisions/pdr-0000-template.md). See [pdr-0001-example-phase1-no-notification.md](../05-decisions/pdr-0001-example-phase1-no-notification.md) for format.

## After goal done — learning loop

Run [soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md): **`post-ship G-xxx`** → observe metrics/support → update map → draft follow-up goals.

See [knowledge-loop.md](knowledge-loop.md) · [learning-log.md](../02-product/learning-log.md)

## Related

- [knowledge-loop.md](knowledge-loop.md)
- [team-workflow.md](team-workflow.md)
- [definition-of-done.md](definition-of-done.md)
- [../03-architecture/design-spec.md](../03-architecture/design-spec.md)
- [../../AGENTS.md](../../AGENTS.md)
