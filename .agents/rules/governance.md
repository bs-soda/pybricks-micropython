---
description: AI governance — approval gates, execution boundaries, goal status flow
alwaysApply: true
---

# Governance

Hard guardrails for human-approved AI delivery. See [docs/03-architecture/design-spec.md](../../docs/03-architecture/design-spec.md) §5 and §8 (terminology).

**Knowledge governance** (artifacts, traceability, patterns): [knowledge-governance.md](../../docs/06-workflows/knowledge-governance.md) — owner/approver matrix; agents draft, humans accept PDR/ADR/promotions.

## Approval gates — NO AI MAY (without explicit human approval)

- Merge to `develop`, `main` / `master`, or any protected integration branch
- Switch to integration branches (`develop` / `main`) or execute `git merge` / `git rebase` locally
- Deploy to **production**
- Modify infrastructure (IaC, cloud config, DNS, CDN, k8s manifests)
- Run **destructive** database migrations (drop column/table, irreversible data change)
- Change auth, security, or permission boundaries
- Rotate secrets or write credentials to repo
- Force-push, hard reset, or other irreversible git operations
- Close a goal as `done` while status is not `approved`

Agent may: implement within goal touch map on dedicated working branch (`feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`, etc.), run tests/lint, commit and push to `origin/<working-branch>`, generate PR targeting the defined target branch (`develop` for features/fixes, `main` for hotfixes, or spec-defined), and deploy **staging** only when goal explicitly includes SHIP and human approves.

## PR-First Governance & Branch Isolation (Non-Negotiable Invariants)

1. **Strict Branch Isolation:** Every goal `G-xxx` operates exclusively on its dedicated working branch matching the archetype:
   - `feature/G-xxx` (e.g. `feature/G-001`, `feature/G-086`) -> for standard features, branching from and targeting `develop`.
   - `fix/G-xxx` or `bugfix/G-xxx` (e.g. `fix/G-105`) -> for bugfixes, branching from and targeting `develop`.
   - `hotfix/G-xxx` (e.g. `hotfix/G-106`) -> for urgent production hotfixes, branching from and targeting `main`.
   - `refactor/G-xxx` or `chore/G-xxx` -> for maintenance tasks, targeting `develop`.
2. **Zero Local Integration Merging:** The agent is strictly forbidden from switching to `develop` or `main`, or running `git merge` locally. Integration into integration branches happens exclusively in the cloud on GitHub via Pull Requests reviewed and merged by humans.
3. **Commit & Push on Working Branch:** All code changes, unit/integration tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions & goal archiving (`goals/_archived/G-xxx.md`), ClickUp sync metadata, and ISO audit logs (`docs/06_raw/`) MUST be committed and pushed directly to `origin/<working-branch>`.
4. **Pull Request Generation:** On `ship G-xxx` (or `open PR G-xxx`), the agent creates/generates the GitHub PR targeting the defined target integration branch (default: `develop`, or `main` for hotfix) using the filled PR template, and outputs the direct GitHub PR link alongside a structured checklist for human review and merge.

## External tools / MCP

Connectors (browser automation, design-file MCP, extra trackers, …) are **consumer-owned**. Soda OS does not ship `mcp.json` or named servers. How to connect: [external-tools.md](../../docs/06-workflows/external-tools.md).

**Agent may call an external tool only when:**

- Goal is `ready` or `in_progress` (PLAN read-only design tools: also on **`design G-xxx`** if Notes for AI list them)
- Human started the work (**`เริ่ม step N`**, or the design PLAN trigger above)
- The **current Work step** and/or **Test plan** (or Notes for AI) names the tool, target, and pass/fail
- Code goals: **Spec stability** `analyze` is `done` or `n/a`
- Target is **not production** unless **In** + human say so

**Default posture:** observe / read first. Clicks, form fills, file writes, comments, and publishes need an explicit **In** / Test plan line.

**Forbidden:** invent which MCP to use; pass `.env` secrets as tool args; use a tool to skip `ready` / `analyze` / human `done`; dump tool output as a new OS layer.

If the step needs a tool but none is named → **`clarify G-xxx`**. Do not guess Chrome vs Playwright vs Figma.

## Execution boundaries

**Allowed (within active goal touch map):**

- Edit files listed in goal **Touch map**
- Write or update tests for goal behavior
- Update goal docs, acceptance contract, API/data docs when goal requires
- Create PR (human merges)

**Forbidden:**

- Unrelated refactors or repo-wide style sweeps
- Edits outside goal **Touch map** (except linked docs above)
- Reading or committing `.env`, credentials, tokens, or key files
- Passing secrets or production URLs into external tools / MCP arguments
- Major dependency upgrades unless goal **In** scope says so
- Picking or starting goals that are not `ready`
- Implementing `draft` / `planned` goals
- Declaring `done` without DoD + human approval
- Filling unspecified requirements with a guessed stack, API, or auth scheme (use `[NEEDS CLARIFICATION]` + **`clarify G-xxx`**)
- First **`เริ่ม step N`** on a code goal while **Spec stability** `analyze` is still `pending`

## Goal status flow

Only execute **`ready`** goals. Status flow (alias: goal state machine):

```text
draft → ready → in_progress → review → approved → done
              ↘ blocked ↗
```

| Goal status | Agent may | ClickUp Sync State |
|--------|-----------|--------------------|
| `draft` / `planned` | Edit goal spec only — **no application code**. **Intent** = WHAT/WHY; do not guess How. | `TO DO` / `Draft / Backlog` (Initial task created) |
| `ready` | Wait for human **"ทำ G-xxx"** — do not self-start. Require **`analyze G-xxx`** before first execute. | `TO DO` / `Ready / To Do` (Sync on `promote ready`) |
| `in_progress` | Implement within touch map | `IN PROGRESS` (Sync on first **`เริ่ม step N`**) |
| `blocked` | Stop — document blocker; wait for human | `BLOCKED` (Sync immediately when blocked) |
| `review` | Report diff; run code-review skill — **no new features** | `IN REVIEW` (Sync when entering review) |
| `approved` | Human approval granted → prepare goal closure, archive, and commit on `feature/G-xxx` | `COMPLETE` / `Approved` (Sync on human approval) |
| `done` | Goal closed + archived. Push to `origin/feature/G-xxx`, generate PR to `develop` (`ship G-xxx`), and output review checklist. Human merges PR into `develop`. | `COMPLETE` / `Done` (Sync when goal archived) |

### ClickUp Synchronization Invariant (Mandatory)

Every goal state change across the lifecycle above MUST be synchronized to ClickUp using `soda-os sync-clickup G-xxx --status-only` (or `node scripts/goals/sync-clickup.js G-xxx --status-only`).
- **Trigger Points:** (1) `draft`/`planned` creation, (2) promotion to `ready`, (3) first step execution (`in_progress`), (4) blocker encountered (`blocked`), (5) handoff to `review`, (6) human `approved`, (7) goal closed to `done` / archived.
- **Invariant:** Changing a goal's status markdown file without executing ClickUp status sync violates framework governance when ClickUp configuration (`scripts/clickup.config.json`) is active.

## Context loading (before collaboration phase EXECUTE)

Load in order:

1. [AGENTS.md](../../AGENTS.md)
2. [docs/00-project-snapshot.md](../../docs/00-project-snapshot.md) (if present)
3. [docs/02-product/knowledge-map.json](../../docs/02-product/knowledge-map.json) (if filled — graph + coverage)
4. [docs/02-product/knowledge-digest.md](../../docs/02-product/knowledge-digest.md) (if filled)
5. [docs/02-product/assumptions.md](../../docs/02-product/assumptions.md) — block if open assumptions on critical path
6. [docs/02-product/project-brief.md](../../docs/02-product/project-brief.md)
7. Active goal in [docs/07-backlog/goals.md](../../docs/07-backlog/goals.md)
8. Acceptance contract `docs/02-product/acceptance/G-xxx.md` (if present)
9. Linked ADR / PDR in `docs/05-decisions/`
10. Relevant API/data docs in `docs/03-architecture/`
11. Matching `soda-*` skill for the task

Stop and ask if context is missing or goal scope is ambiguous. Do **not** guess — **`clarify G-xxx`**.

## Operating modes

Governance overlay — not collaboration phases. Canonical definitions: [design-spec.md](../../docs/03-architecture/design-spec.md) §8.

| Operating mode | When | Rules |
|------|------|-------|
| **Normal** | Default | Full review; no hotfix without goal + review |
| **Incident** | Human declares incident | [soda-incident-response](../skills/soda-incident-response/SKILL.md); human may authorize emergency path |

## Audit

After significant agent actions, human may append to [docs/07-backlog/changelog.md](../../docs/07-backlog/changelog.md).

## CI enforcement

GitHub Actions run [scripts/ci/governance-check.sh](../../scripts/ci/governance-check.sh) on PRs — see [github-governance.md](../../docs/06-workflows/github-governance.md). Humans enable protected branches; agents do not merge.
