# My Soda OS App — Agent Entry Point

> **Pause before coding.** This repo uses **Soda goal-driven development** — Human defines scope, AI implements within goals.

Soda OS Template Version: `1.24.0`

Human onboarding: [docs/06-workflows/team-workflow.md](docs/06-workflows/team-workflow.md)  
Framework map: [docs/03-architecture/design-spec.md](docs/03-architecture/design-spec.md)

## Mission

Develop a high-performance application following Soda OS Agent Governance.

## Soda Agent OS — six layers

```text
Context + Skill + Goal + Governance + Approval + Audit
```

| Layer | Location | Agent job |
|-------|----------|-----------|
| **Context** | compiled action bundle | **EXECUTE:** `step-N.md` + `action-step-N.yaml` |
| **Skill** | `.agents/skills/soda-*/` | Follow task playbook |
| **Goal** | `docs/07-backlog/goals.md`, `docs/02-product/acceptance/` | One `ready` goal per round |
| **Governance** | `.agents/rules/governance.md`, `security.md` | Hard boundaries |
| **Approval** | Human in REVIEW / SHIP | No merge, prod, or `done` without human |
| **Audit** | `docs/07-backlog/changelog.md` | Log decisions |

## How this repo works

| Layer | Location | Agent job |
|-------|----------|-----------|
| **Goals** | `docs/07-backlog/goals.md` + `goals/G-PAY-001.md` (legacy `G-001.md`) | Work on **one** `ready` goal only; archive to `goals/_archived/` on close. Allocate with `soda-os goal next`. |
| **Rules** | `.agents/rules/` | Always follow |
| **Skills** | `.agents/skills/soda-*/` | Read when task matches skill description |
| **Specs** | `docs/02-product/`, `docs/03-architecture/` | Read links in the active goal |
| **API / data** | `docs/03-architecture/api/`, `data/` | Update contracts when goal changes APIs or domain rules |

**Goal status:** `draft` / `planned` = spec only · `ready` = may pick · `in_progress` · `review` · `blocked` · `approved` · `done`  
(Canonical terms: [design-spec.md](docs/03-architecture/design-spec.md) §8 — collaboration phase ≠ goal status.)

## Approval gates — NO AI MAY (without explicit human approval)

- Merge to `develop`, `main` / `master`, or any protected integration branch
- Switch to integration branches (`develop` / `main`) or execute `git merge` / `git rebase` locally
- Deploy to **production**
- Modify infrastructure
- Run destructive migrations
- Change auth / security boundaries
- Mark goal `done` without human approval (`approved` → `done`)

See [.agents/rules/governance.md](.agents/rules/governance.md), [.agents/rules/commits.md](.agents/rules/commits.md), and [.agents/rules/security.md](.agents/rules/security.md).

## Collaboration cycle (every session)

```text
DEFINE → PLAN → EXECUTE → REVIEW → SHIP (PR-First)
```

Each name is a **collaboration phase** — not an operating mode, bundle mode, or response level. See [design-spec.md](docs/03-architecture/design-spec.md) §8.

1. **DEFINE** — Discovery interview → distill knowledge → record decisions → then goals ([knowledge-loop.md](docs/06-workflows/knowledge-loop.md))
2. **PLAN** — Confirm In/Out/touch map; acceptance contract; ClickUp sync (`ready`); branch preparation (`feature/G-xxx`)
3. **EXECUTE** — Implement with task skill (API, migration, …) within touch map on `feature/G-xxx`; ClickUp sync (`in_progress`)
4. **REVIEW** — Run code-review skill + tests; human approves → `approved`; ClickUp sync (`review` → `approved`)
5. **SHIP (PR-First)** — Close goal (`goals/_archived/`), ClickUp sync (`done`), commit & push to `origin/feature/G-xxx`, create GitHub PR to `develop`, generate direct PR URL & structured checklist for human review and merge

## Context loading (before collaboration phase EXECUTE)

**Do not** load the full list below on every step — use the **context compiler**:

| Command trigger | Load |
|---------|------|
| **ทำ G-xxx** | `goals/G-xxx.md` only |
| **compile G-xxx** / hydrate | Build `.bundle/` per [context-compiler.md](docs/03-architecture/context-compiler.md) |
| **เริ่ม step N** | `step-N.md` + `action-step-N.yaml` + allowed_files |
| **continue G-xxx** | `delta.md` + changed paths only |

Full project context (bootstrap, discovery, new goal draft) — load in order:

1. This file (`AGENTS.md`)
2. [docs/00-project-snapshot.md](docs/00-project-snapshot.md)
3. [docs/02-product/project-brief.md](docs/02-product/project-brief.md)
4. Active goal in [docs/07-backlog/goals.md](docs/07-backlog/goals.md)
5. Acceptance contract `docs/02-product/acceptance/G-xxx.md` (if present)
6. Linked ADR in `docs/05-decisions/`
7. Relevant API/data docs
8. Matching `soda-*` skill

## Read first (in order)

1. [docs/02-product/project-brief.md](docs/02-product/project-brief.md) — canonical spec
2. [docs/03-architecture/overview.md](docs/03-architecture/overview.md) — stack & boundaries
3. [docs/03-architecture/design-spec.md](docs/03-architecture/design-spec.md) — framework map
4. [docs/07-backlog/goals.md](docs/07-backlog/goals.md) — pick **one** active goal
5. [docs/06-workflows/definition-of-done.md](docs/06-workflows/definition-of-done.md)

## Work loop (every round — PR-First)

1. Select a single **`ready`** goal (dependencies `done`; skip `draft` / `planned`). Ensure on dedicated branch `feature/G-xxx`.
2. Confirm **In / Out / Touch map / Acceptance criteria** — stop if `[NEEDS CLARIFICATION]` or analyze still `pending`.
3. Set goal status → `in_progress` when human says **"เริ่ม step N"** (first execution on a `ready` goal; **`analyze G-xxx`** must be `done` or `n/a`). Sync ClickUp → `in_progress`.
4. Load matching **soda-** skill; implement within goal scope on `feature/G-xxx`.
5. Set goal status → `review` (sync ClickUp); run **soda-testing** + **soda-code-review**.
6. Human approves → `approved` (sync ClickUp).
7. Mark goal `done` (sync ClickUp); archive to `goals/_archived/G-xxx.md`; update `changelog-goals.md` and audit log `docs/06_raw/`.
8. **SHIP (PR-First):** Commit and push all changes directly to `origin/feature/G-xxx`. Generate GitHub PR to `develop` (`gh pr create` or `soda-os pr G-xxx`), and output direct PR URL + structured checklist for human review and merge.

Full workflow: [docs/06-workflows/dev-loop.md](docs/06-workflows/dev-loop.md)

## Dev agent roles

| Role | Reads | Does |
|------|-------|------|
| **Planner** | brief, digest, assumptions | Break work into goals |
| **Implementer** | active goal + architecture + skill | Code in scope on `feature/G-xxx` |
| **Tester** | acceptance contract + test plan | Tests green (`soda-testing`) |
| **Reviewer** | DoD + diff | Approve (`soda-code-review`) |
| **Shipper** | deploy / PR goal | PR generation & staging deploy (`soda-deploy-staging`) |

Details: [docs/04-agents/dev-roles.md](docs/04-agents/dev-roles.md)

## Hard rules

- **Branch Isolation** — all work on dedicated `feature/G-xxx` branch; never switch to `develop` or `main`.
- **Zero Local Integration Merging** — agent never merges locally; all integration into `develop` occurs via GitHub PRs.
- **Commit & Push on Feature Branch** — all code, tests, acceptance contracts, archived goals, ClickUp syncs, and `docs/06_raw/` logs pushed to `origin/feature/G-xxx`.
- **Only `ready` goals** — do not self-pick or implement `draft` / `planned`.
- **One goal per commit** — no drive-by refactors or multi-goal commits.
- **Touch map only** — no repo-wide changes outside goal scope.
- **Spec stability** — do not guess; Intent is WHAT/WHY; **`analyze G-xxx`** before first execute.
- **External tools / MCP** — consumer connects; agent calls them only when the goal step names them ([external-tools.md](docs/06-workflows/external-tools.md)).
- **Tests before goal status `review`** — do not mark complete if tests or analyzer fail.
- **Human before `done`** — status must reach `approved` with explicit human sign-off.
- **Respect Project Scope** — no out-of-scope features without a new goal row.
- **Minimize diff** — smallest change that satisfies acceptance criteria.
- **Do not deploy to production** unless goal explicitly includes it and human confirms.
- **No secrets** — never commit or expose `.env`, tokens, keys (see `security.md`).

## Operating modes

Governance overlay — not collaboration phases. See [design-spec.md](docs/03-architecture/design-spec.md) §8.

| Operating mode | Rules |
|------|-------|
| **Normal** | Full review; no hotfix without goal + review |
| **Incident** | Human declares; follow `soda-incident-response`; emergency path requires explicit authorization |

## Standard commands

```bash
# Replace with your stack — run from repo root; app lives in code/
# cd code && npm test && npm run lint
# cd code && dart analyze && flutter test
# cd code && go test ./... && golangci-lint run
npm run lint:check
npm run test
npm run build
```

## Soda standard skills (v1.6.0)

| Skill | Command triggers |
|-------|------|
| [soda-discovery](.agents/skills/soda-discovery/SKILL.md) | `discover`, `coverage`, `knowledge audit` (DEFINE) |
| [soda-learning-loop](.agents/skills/soda-learning-loop/SKILL.md) | `observe`, `learn`, `post-ship G-xxx` (evolve map) |
| [soda-goal-workflow](.agents/skills/soda-goal-workflow/SKILL.md) | Any G-PAY-001 / G-xxx work · `clarify` · `spec check` · `analyze` · `soda-os goal next` |
| [soda-design](.agents/skills/soda-design/SKILL.md) | `design G-xxx`, `ux flow`, `tokens`, `ui spec`, `design review` (UI/UX goals) |
| [soda-rest-api](.agents/skills/soda-rest-api/SKILL.md) | API endpoints |
| [soda-testing](.agents/skills/soda-testing/SKILL.md) | Tests & CI |
| [soda-code-review](.agents/skills/soda-code-review/SKILL.md) | Before done / PR |
| [soda-deploy-staging](.agents/skills/soda-deploy-staging/SKILL.md) | Staging deploy |
| [soda-upgrade-os](.agents/skills/soda-upgrade-os/SKILL.md) | Upgrade OS in existing projects (Phase 2) |
| [soda-incident-response](.agents/skills/soda-incident-response/SKILL.md) | Incidents |
| [soda-db-migration](.agents/skills/soda-db-migration/SKILL.md) | Schema migrations |
| [soda-iso29110](.agents/skills/soda-iso29110/SKILL.md) | `iso scan`, `iso generate all\|wave-a…d\|WPnn`, `iso validate` — all 23 WPs |

Catalog & versions: [docs/04-agents/skills-library.md](docs/04-agents/skills-library.md)

Add `{project}-*` skills only for project-specific conventions; register in the catalog.

## Cursor rules

Persistent constraints: [.agents/rules/](.agents/rules/) — `core`, `governance`, `security`, `guidelines`, stack-specific `{stack}.md`.

## CI & GitHub hard guards

| Asset | Purpose |
|-------|---------|
| [docs/06-workflows/github-governance.md](docs/06-workflows/github-governance.md) | Protected branches + setup |
| [.github/workflows/governance.yml](.github/workflows/governance.yml) | Goal reference, commit format, secret scan |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | App test/lint |
| [.github/pull_request_template.md](.github/pull_request_template.md) | PR checklist |

Copy [.github/ci-config.example.yml](.github/ci-config.example.yml) → `ci-config.yml` at G-001 bootstrap.

Run locally: `bash scripts/ci/governance-check.sh` · `bash scripts/ci/app-ci.sh`

**Existing projects:** [soda-os upgrade](soda-os upgrade) — two-phase: Phase 1 script, Phase 2 [soda-upgrade-os](.agents/skills/soda-upgrade-os/SKILL.md) · [upgrade-agent-os.md](docs/06-workflows/upgrade-agent-os.md) · [framework-manifest.yml](framework-manifest.yml)
