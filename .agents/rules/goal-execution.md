---
description: "ทำ G-xxx" = TodoWrite step tracker in chat (fast, read-only)
alwaysApply: true
---

# Goal execution — todos first

See [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.2–§0.3. Terminology: [design-spec.md](../../docs/03-architecture/design-spec.md) §8. IDs: [goal-id.md](../../docs/06-workflows/goal-id.md) (`G-PAY-001` or legacy `G-001`).

| User says | Agent must |
|-----------|------------|
| **"ทำ G-xxx"** / **"ทำ G-PAY-001"** | Read `goals/<ID>.md` → **TodoWrite** → **≤3 lines** chat. **No code. No promote nag. No repo explore.** |
| **"compile G-xxx"** / hydrate / resolve | Build `.bundle/` per [context-compiler.md](../../docs/03-architecture/context-compiler.md) — no code |
| **"promote G-xxx ready"** | Goal docs only — no `code/`. Block if `[NEEDS CLARIFICATION]` or spec check incomplete. **Sync ClickUp status → ready**. |
| **"clarify G-xxx"** / **"spec check G-xxx"** / **"analyze G-xxx"** | Goal docs only — [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.5 |
| **"เริ่ม step N"** / **"ทำต่อ G-xxx"** | Ensure on working branch `(feature|fix|hotfix)/G-xxx` → compileStep if missing → `step-N.md` + `action-step-N.yaml` → execute if `ready`/`in_progress` **and** analyze `done`/`n/a`. **On first step: sync ClickUp status → in_progress**. |
| **"continue G-xxx"** | `shared-memory.yaml` + `delta.md` + changed files — no full bundle |
| **"set goal"** / **"set new goal"** / **"สร้าง goal"** / feature without G-xxx | Follow [goal-creation.md](goal-creation.md) — Draft `docs/07-backlog/goals/G-xxx.md` from `_template.md` (`draft`/`planned`), Intent (WHAT/WHY only), `[NEEDS CLARIFICATION]` in Open questions, register in `goals.md` (Active queue + DEFINE Dashboard). **Zero application code.** |
| **"brief G-xxx"** | Full Plan briefing (optional) |
| **"ship G-xxx"** / **"open PR G-xxx"** / **"สร้าง PR"** | Commit and push to `origin/<working-branch>`, create GitHub PR targeting defined target branch (`develop` for features/fixes, `main` for hotfixes), output direct PR link + structured checklist for human review and merge. |

Hard rules:

- **"ทำ G-xxx"** → **TodoWrite is the UI** — do not paste long briefing tables
- Read **one file** (`goals/G-xxx.md`) on **"ทำ G-xxx"** — not AGENTS.md, not `code/`, not broad search
- **EXECUTE** follows **recipe checklist** — update `shared-memory.yaml` each turn (`EXECUTE` = collaboration phase, not bundle mode alone)
- Never nag promote on **"ทำ G-xxx"** — block code on **"เริ่ม step N"** when not `ready` **or** analyze still `pending`
- One `in_progress` todo at a time during execution
- After step done: next stays `pending` until **"เริ่ม step N+1"**
- **Branch Isolation (Mandatory Invariant):** All work for `G-xxx` MUST execute on dedicated working branch `feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`, etc. Never work on integration branches (`develop` or `main`).
- **Zero Local Integration Merging (Mandatory Invariant):** The agent will NEVER switch to `develop` or `main`, and will NEVER execute `git merge` or `git rebase` locally. All integration occurs via GitHub PRs reviewed and merged by humans.
- **Single Branch Push (Mandatory Invariant):** All code, tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions (`goals/_archived/G-xxx.md`), ClickUp sync records, and ISO audit logs (`docs/06_raw/`) MUST be committed and pushed directly to `origin/<working-branch>`.
- **ClickUp State Synchronization (Mandatory Invariant):** Every goal state change (`draft`/`planned` → `ready` → `in_progress` → `blocked` → `review` → `approved` → `done`) MUST synchronize status to ClickUp (`soda-os sync-clickup G-xxx --status-only` or `node scripts/goals/sync-clickup.js G-xxx --status-only`). Never leave ClickUp out of sync with goal state.
