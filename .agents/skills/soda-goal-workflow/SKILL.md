---
name: soda-goal-workflow
version: "1.10.0"
description: >-
  Executes the Soda one-goal-per-round dev workflow: 1 goal = 1 file in
  docs/07-backlog/goals/G-PAY-001.md (legacy G-001.md); on done move to goals/_archived/.
  Allocate IDs with soda-os goal next <EPIC> before drafting. Pick or draft
  a goal first, confirm scope, implement only after an explicit goal ID is approved,
  run tests, close goal with changelog. Spec stability: clarify / spec check /
  analyze before ready+execute. All generated goals must pass the automated
  goal-template-conformance-harness. Use when the user mentions G-xxx / G-PAY-001 goals,
  backlog items, "next goal", "ต่อ G-", closing a goal, committing goal work,
  "set goal", or describes feature work without a goal ID (draft goal only).
---

# Goal workflow

One round = **one goal** = **one commit** (when possible) + green tests + human approval.

Always read first during collaboration phase EXECUTE: **compiled action bundle** — not AGENTS.md + full repo. See §0.4 [context-compiler.md](../../../docs/03-architecture/context-compiler.md). Terminology: [design-spec.md](../../../docs/03-architecture/design-spec.md) §8.

**Layout:** 1 goal = 1 file = 1 outcome. Filename **equals the ID** (`G-PAY-001.md` or legacy `G-001.md`). Active → `docs/07-backlog/goals/`. On `done` → move to `docs/07-backlog/goals/_archived/` and update [goals.md](../../../docs/07-backlog/goals.md) queue. IDs: [goal-id.md](../../../docs/06-workflows/goal-id.md).

## 0. Goal gate (mandatory — read before any code)

**No goal → no application code.**

| Situation | Agent must |
|-----------|------------|
| User describes a change **without** `G-xxx` | **Stop.** No `code/`. If new product / empty brief / command trigger `discover` → [soda-discovery](../soda-discovery/SKILL.md). Else create or update `docs/07-backlog/goals/G-xxx.md` (`draft` / `planned`) per `_template.md`, run `node scripts/harness/goal-template-conformance-harness.mjs G-xxx`, and index row in `goals.md`. Summarize In/Out/touch map/acceptance criteria. |
| Command trigger `discover` / `สัมภาษณ์` / `intake change` | [soda-discovery](../soda-discovery/SKILL.md) — collaboration phase DEFINE; docs only |
| User says "อยากให้…", "ช่วยทำ…", workflow skill only | Treat as collaboration phase **PLAN** — goal doc only unless they also say **"ทำ G-xxx"** / **"implement G-xxx"** / **"เริ่มทำ G-xxx"**. |
| User says **"ทำ G-xxx"** / **"เริ่มทำ G-xxx"** | **Fast path** (§0.2): read goal file → **TodoWrite** → ≤3 lines in chat. **No `code/`**. **No promote nag.** |
| User says **"ทำต่อ G-xxx"** / **"เริ่ม step N"** | Compile step bundle if missing (§0.4) → read `step-N.md` + `action-step-N.yaml` → execute **if** `ready`+ **and** analyze `done`/`n/a` (§0.5) |
| User says **`clarify G-xxx`** / **`spec check G-xxx`** / **`analyze G-xxx`** | §0.5 — goal docs only; no `code/` |
| User says **"compile G-xxx"** / **hydrate** / **resolve** | ContextCompilerService → `.bundle/G-xxx/` — no code |
| User says **"continue G-xxx"** | `delta()` only — no full recompile |
| User says **"set goal"** / **"สร้าง goal"** | Copy `_template.md` (all 25 sections) → edit `docs/07-backlog/goals/G-xxx.md` → run `node scripts/harness/goal-template-conformance-harness.mjs G-xxx` → update `goals.md` index. No `code/`. |
| Goal is `draft` / `planned` | **"ทำ G-xxx"** still shows todos. Block **code** only on **"เริ่ม step N"** — not on todo display |
| Goal is `blocked` | Stop — wait for human to unblock. |
| Goal is `done` (in `_archived/`) | Do not re-implement unless user opens a new goal. |
| Goal not **`ready`** | Do **not** self-pick. **"ทำ G-xxx"** on a named goal → show todos anyway. **"เริ่ม step N"** → stop if not `ready` **or** analyze still `pending` (§0.5) |

**Wrong:** User asks for `/store/products` skeleton → agent edits `page.tsx` immediately.  
**Right:** Add **G-113** as `draft`, run conformance harness, show acceptance criteria, wait for **"ทำ G-113"**.

If agent already changed code without a goal → report that to the user; offer to revert or fold changes under a new goal after human approves.

## 0.5 Spec stability & Goal Conformance (mandatory — no new layers)

Close guess / mix-HOW / drift **on the goal card**. Full rules: [goal-spec-guide.md](../../../docs/06-workflows/goal-spec-guide.md) § Spec stability gates.

| Command trigger | Do | Writes | Blocks |
|-----------------|----|--------|--------|
| **`clarify G-xxx`** | Scan underspecified areas; add `[NEEDS CLARIFICATION: …]`; ask **one** question | Goal **Open questions** + **Spec stability** `clarify` | — |
| **`spec check G-xxx`** | Tick or fail **Spec checklist**; run `node scripts/harness/goal-template-conformance-harness.mjs G-xxx` & `node scripts/harness/architecture-design-conformance-harness.mjs G-xxx` | Goal checklist + `spec check` | — |
| **`analyze G-xxx`** | Cross brief, ADR/PDR, Intent/How/In/Out/touch map, existing paths (read-only) | Open questions / Work steps if gaps; `analyze` | — |

**Do not guess.** If auth, stack, API shape, or Out is unspecified → `[NEEDS CLARIFICATION]` — never a plausible default.

**WHAT vs HOW:** **Intent** = why / done when / unblocks. **How** = stack and approach, filled in PLAN after clarify. If Intent names Next, Postgres, folders-as-recipe → fail spec check.

| Transition | Also require (unless header `n/a` or human waiver in changelog) |
|------------|------------------------------------------------------------------|
| **`promote G-xxx ready`** | `clarify` + `spec check` = `done`; zero `[NEEDS CLARIFICATION]`; How filled if the goal will execute code; `## Software & Architecture Design` specified; Change delta filled if brownfield; Both Goal & Architecture Conformance harnesses 100% pass; **Sync ClickUp status → ready** (`soda-os sync-clickup G-xxx --status-only`) |
| First **`เริ่ม step N`** | **Spec stability** `analyze` = `done` or `n/a`; **Sync ClickUp status → in_progress** |

`n/a` only for docs-only goals that never edit `code/`.

### Draft a new goal — WHAT first & Conformance Harnesses

On **"set goal"** / feature with no G-xxx:

1. Copy full template `docs/07-backlog/goals/_template.md` → `goals/G-xxx.md` (`draft` / `planned` by default)
2. Fill all 26 sections including `## Software & Architecture Design` (Header, 5-phase Plan, Context, Intent WHAT/WHY, How, Open questions, Knowledge links, Context manifest, Work steps, In/Out, Change delta, Software & Architecture Design, Spec checklist, Acceptance criteria, Test plan, Touch map, Notes for AI)
3. **Execute Conformance Harnesses:**
   - Run `node scripts/harness/goal-template-conformance-harness.mjs G-xxx` (26/26 checks)
   - Run `node scripts/harness/architecture-design-conformance-harness.mjs G-xxx` (9/9 checks)
4. Update [goals.md](../../../docs/07-backlog/goals.md) Dashboard, Active goals queue, and Feature tracks
5. Stop for **`clarify G-xxx`**. Do not invent stack.

Then PLAN: How + Work steps + touch map → **`spec check`** → human **`promote G-xxx ready`** (syncs ClickUp status) → **`analyze G-xxx`** → first **`เริ่ม step N`**.


## 0.2 "ทำ G-xxx" = show step todos (fast path)

**Deliverable:** Cursor **todo list** at the top of chat — human reads progress there. Chat text is **short**.

When the user says **"ทำ G-xxx"** / **"เริ่มทำ G-xxx"**:

1. Read **only** `docs/07-backlog/goals/G-xxx.md` — **Plan** step table (or **Work steps** if no Plan table)
2. **TodoWrite** (`merge: true`) — one todo per step (§0.3) — **first tool call**
3. Reply **≤3 lines** — e.g. `G-xxx · {status} · step {n}/{total} — {current title}`
4. **Stop.** No `code/` edits unless the same message also says **"เริ่ม step N"** / **"ทำต่อ G-xxx"**

### Do NOT on "ทำ G-xxx" (saves tokens)

- Do **not** explore `code/`, run broad searches, or re-read `AGENTS.md` / `goals.md` Dashboard
- Do **not** output the full Plan briefing template — todos **are** the UI
- Do **not** nag **"promote ready"** — that is only for **"promote G-xxx ready"**
- Do **not** change goal status, Dashboard, or Plan rows — **read-only** display turn

| Goal status | On "ทำ G-xxx" |
|-------------|---------------|
| any (incl. `draft` / `planned`) | TodoWrite from file → ≤3 lines |
| `blocked` | Same + one line: blocker |
| archived / `done` | One line: goal archived |

**Wrong:** User says "ทำ G-022" → agent reads 10 files, explores repo, lectures promote, pastes long briefing.  
**Right:** Read `G-022.md` → TodoWrite → `G-022 · in_progress · step 2/6 — Add migration`.

### Optional full briefing

Only when human asks **"brief G-xxx"** / **"สรุป G-xxx"** — then use [Plan briefing template](#plan-briefing-template-optional).

## 0.4 Context compiler — recipes + working memory (mandatory in collaboration phase EXECUTE)

**Goal:** reduce **cognitive load** — agent follows recipe checklist; does not translate bundle → plan.

```text
Knowledge → Bundle (compile once) → Working Memory (runtime) → Delta → Agent
```

Full spec: [context-compiler.md](../../../docs/03-architecture/context-compiler.md) · [working-memory.md](../../../docs/03-architecture/working-memory.md)  
Recipes: [execution-recipes](../../../docs/04-agents/execution-recipes/README.md) · Playbooks: [playbooks](../../../docs/04-agents/playbooks/README.md)  
Capabilities: [agent-capabilities](../../../docs/04-agents/agent-capabilities/README.md) · IR: [compiler-ir.md](../../../docs/03-architecture/compiler-ir.md)  
Coordination: [coordination.md](../../../docs/03-architecture/coordination.md) · Shared memory: [working-memory.md](../../../docs/03-architecture/working-memory.md)

### Compile inputs (capability-aware)

```text
compile(goal, step?, role?, agent?, mode?, task_type?, profile?, agent_capability?)
```

`mode` = **bundle mode** (`execute` default on **"เริ่ม step N"**). See [context-compiler.md](../../../docs/03-architecture/context-compiler.md) § Bundle mode.

| Capability | When |
|------------|------|
| `matchPlaybook(tags)` | PB-xxx → REC list |
| `getAgentScore(agent, skill)` | Capability matrix variant |
| `compile(...)` | IR pass pipeline |
| `patchSharedMemory(section)` | Multi-agent handoff |
| `initSharedMemory(G-xxx, N)` | From recipe checklist |
| `updateSharedMemory(patch)` | After each turn |
| `scoreBundle()` | Trim if >2500 tokens |
| `cacheLookup(source_hash)` | Reuse compile cache |
| `delta(G-xxx)` | **continue** — delta + memory only |

### Action bundle + recipe (per step)

`action-step-N.yaml` must include: `recipe`, `checklist`, `completion`, `objective`, `allowed_files`, `exit_when`.

Agent **follows checklist in order** — do not invent steps.

### เริ่ม step N — agent reads

```text
step-N.md
action-step-N.yaml
shared-memory.yaml   (init execution section from checklist)
+ allowed_files (≤5)
```

### continue G-xxx — agent reads

```text
shared-memory.yaml
delta.md
+ changed files only
```

**Do not** re-read full bundle or goal on continue.

### Runtime layout

```text
.bundle/G-xxx/
  shared-memory.yaml      # multi-agent handoff (primary)
  cache/G-xxx-{hash}/     # IR — stable compile output
    step-N.md
    action-step-N.yaml
    score.json
  delta.md
```

### Token / cognition rules

| Command | Read | Plan? |
|---------|------|-------|
| **ทำ G-xxx** | goal file | No |
| **compile G-xxx** | compiler only | No |
| **เริ่ม step N** | step + action + init memory | **Follow recipe** |
| **continue** | memory + delta | **Resume checklist** |

**Forbidden during collaboration phase EXECUTE:** replan from ADR, full bundle re-read on continue, knowledge-map.

### Sync flow

```text
"ทำ G-xxx"       →  goal  →  TodoWrite
"compile G-xxx"  →  bundle cache + recipes
"เริ่ม step N"   →  compileStep  →  initWorkingMemory  →  execute checklist
"continue G-xxx" →  working-memory + delta  →  execute
```

### Plan briefing template (optional)

Copy this structure into every briefing reply (fill from the goal file):

```markdown
### G-xxx — {title}
**Status:** `{status}` · **Collaboration phase:** {DEFINE|PLAN|EXECUTE|REVIEW|SHIP} · **Step:** {n} / {total} — {step title}

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| {● or ○} | ... | ... | ... | ... |

| # | Step | Status |
|---|------|--------|
| 1 | {step title} | pending / **current** / done |
| 2 | ... | ... |

**Acceptance (unchecked):**
- [ ] ...

**Touch map:** `path1`, `path2`, ...

**Gaps before work:** {e.g. still draft, missing acceptance contract, blocked dep}

**Next:** พิมพ์ `เริ่ม step {n}` เพื่อให้ agent ลงมือ step นี้ (หรือ `promote G-xxx ready` ถ้ายังไม่ ready)
```

**Next:** `เริ่ม step {n}` · `promote G-xxx ready` · `brief G-xxx`
```

## 0.3 Cursor todo list = Plan progress UI (mandatory on "ทำ G-xxx")

The **step tracker at the top of chat** (`2/6`, ✓ done, → current) = **TodoWrite** synced from the goal **Plan** table.

### Build todos (do this immediately)

1. Parse **Plan** step table in `goals/G-xxx.md` (or **Work steps** if Plan empty).
2. **TodoWrite** (`merge: true`) — one todo per step:

| Todo `id` | Todo `content` | Todo `status` |
|-----------|----------------|---------------|
| `G-xxx-step-1` | `Step 1: {title}` | from plan row |
| `G-xxx-step-2` | `Step 2: …` | … |

| Plan row | TodoWrite |
|----------|-----------|
| `done` | `completed` |
| `current` | `in_progress` |
| `pending` | `pending` |

If no step is `current` yet, all todos `pending` (or `completed` for done rows). **Do not** auto-mark step 1 `in_progress` on display-only **"ทำ G-xxx"**.

### When to call TodoWrite

| Event | Action |
|-------|--------|
| **"ทำ G-xxx"** | TodoWrite from file — **read-only**; ≤3 lines chat |
| **"เริ่ม step N"** (goal `ready`+) | Set step N `in_progress` in todos + Plan; then implement |
| **Step N done** | Todo + Plan row → `completed`/`done`; next stays `pending` until **"เริ่ม step N+1"** |
| **Goal closed** | All todos `completed` |

### Sync on execution only

```text
"ทำ G-xxx"     →  goals/G-xxx.md (read)  →  TodoWrite  →  short chat
"compile G-xxx" →  .bundle/ cache (write)
"เริ่ม step N"  →  step-N.md + action-step-N.yaml  →  implement  →  TodoWrite + Plan
"continue G-xxx" →  delta.md + changed files only
```

**Wrong:** Long briefing + promote lecture + codebase explore on **"ทำ G-xxx"**.  
**Right:** TodoWrite visible in chat; human says **"เริ่ม step 3"** when ready to code.

## 1. Select goal

1. Open [goals.md](../../../docs/07-backlog/goals.md) index → open the goal file `docs/07-backlog/goals/G-xxx.md`
2. Pick highest **`ready`** goal whose **Depends on** goals are **`done`** (archived = done; skip **`draft`** / **`planned`**)
3. On **"ทำ G-xxx"** → fast path (§0.2): todos only — do not auto-set `in_progress` or change Dashboard
4. Load `docs/02-product/acceptance/G-xxx.md` if linked
5. **Branch Isolation Setup:** Ensure git branch is `<working-branch>` matching goal archetype (`feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`, etc.). Never work on integration branches (`develop` or `main`).

If scope is unclear → stop and clarify; do not implement.

1. If the epic is new, register it on **`main`** first ([epics.md](../../../docs/07-backlog/epics.md), registry `PAY:` key, `queues/PAY.md`, Dashboard link). See [goal-id.md](../../../docs/06-workflows/goal-id.md).
2. If git branch is **`epic/PAY`** (or `feature/PAY`), **"สร้าง goal"** / **`soda-os goal next`** allocates in **PAY** — do not ask which epic. On any other branch, require the slug (`goal next PAY`) or switch branch. Do not pick a number by scanning files; do not allocate another epic; do not `reserve` a count unless two people share this epic.
3. Copy full [_template.md](../../../docs/07-backlog/goals/_template.md) (all 31 sections) → `goals/G-PAY-001.md` (or `goals/G-xxx.md`); filename equals the ID; follow [goal-spec-guide.md](../../../docs/06-workflows/goal-spec-guide.md).
4. Fill **Intent**, **In**, **Out**, **Open questions**, **Context manifest**, **Work steps**, **Spec checklist**, **Acceptance criteria**, **Test plan**, **Touch map** — **not** How/stack until clarify.
5. **Execute Conformance Harness:** Run `node scripts/harness/goal-template-conformance-harness.mjs G-xxx` to certify 31/31 sections and invariants pass before proceeding.
6. Add a row to [queues/PAY.md](../../../docs/07-backlog/queues/_template.md) and/or [goals.md](../../../docs/07-backlog/goals.md).
7. Run **`clarify G-xxx`** then fill **How** / Work steps / touch map; **`spec check G-xxx`** (reruns harness).
8. When promoting to `ready` (§0.5 gates), create acceptance contract from [_template.md](../../../docs/02-product/acceptance/_template.md) (`docs/02-product/acceptance/G-xxx.md`).
9. **Sync ClickUp status → ready:** `soda-os sync-clickup G-xxx --status-only` (or full `soda-os sync-clickup G-xxx`).
10. Tell human: **`analyze G-xxx`** then **"ทำ G-xxx"** when approved.

## 2. Confirm scope (before coding)

Run after compile — from **action-step-N.yaml** + `step-N.md`, not repo crawl.

| Field | Source |
|-------|--------|
| **Objective** | `action.objective` |
| **Files** | `allowed_files` only |
| **Avoid** | `avoid` globs — hard boundary |
| **Exit** | `exit_when` — step done when all true |
| **Task skill** | `action.skills` only |

**Stop** if acceptance criteria are ambiguous — update goal first (Planner role).

## 3. Implement

**Only after** human says **"เริ่ม step N"** / **"ทำต่อ G-xxx"** (goal **`ready`** or **`in_progress`**).

If **Spec stability** `analyze` is `pending` (not `done` / `n/a`) → **stop**. One line: run **`analyze G-xxx`** first — **no `code/`**.

1. **Branch Check:** Ensure active branch is `<working-branch>` (`feature/G-xxx`, `fix/G-xxx`, `hotfix/G-xxx`). If on an integration branch, switch to the dedicated working branch (`git checkout -b <working-branch>`).
2. On first step starting execution: set goal status → **`in_progress`** and **Sync ClickUp status → in_progress:** `soda-os sync-clickup G-xxx --status-only`
3. **compileStep** if `action-step-N.yaml` missing or `source_hash` changed
4. **scoreBundle** — trim if >2500 tokens
5. **initWorkingMemory** from recipe `checklist`
6. Read **`step-N.md`** + **`action-step-N.yaml`** — follow checklist in order
7. **continue G-xxx** → **`shared-memory.yaml`** + `delta.md` only
8. **patchSharedMemory** after each meaningful action

- If goal not `ready` → one line: not ready; use **"promote G-xxx ready"** — **do not** re-show todos or re-explore
- If `analyze` still `pending` on a code goal → one line: **`analyze G-xxx`** first
- If blocked during execution: set status → **`blocked`** and **Sync ClickUp status → blocked:** `soda-os sync-clickup G-xxx --status-only`

- Execute **only** the step marked `current` — do not mark multiple steps `done` in one turn
- **TodoWrite:** step N → `in_progress` at start, → `completed` when step finishes (§0.3)
- Smallest correct diff; no drive-by refactors
- Match `docs/03-architecture/folder-structure.md`
- Follow [governance.md](../../../.agents/rules/governance.md) execution boundaries
- Follow constraints in goal **Notes for AI**
- **Update Plan & `queues/{EPIC}.md`** when starting, finishing, or blocking a plan step (see below)
- Load task skill when applicable:

| Goal type | Skill |
|-----------|-------|
| API endpoints | [soda-rest-api](../soda-rest-api/SKILL.md) |
| Schema / DB | [soda-db-migration](../soda-db-migration/SKILL.md) |
| Deploy / staging | [soda-deploy-staging](../soda-deploy-staging/SKILL.md) |

## 4. Test (IMPROVE / Verification)

Run [soda-testing](../soda-testing/SKILL.md) — commands from goal **Test plan** and `AGENTS.md` **Standard commands**.

- Verify acceptance contract scenarios (`docs/02-product/acceptance/G-xxx.md`)
- Add tests from goal **Test plan**; test real operational behavior (Zero Mocks / Zero Stubs)
- Fix all failures and linter errors before proceeding

## 5. Review (collaboration phase REVIEW)

1. Set goal status → **`review`**
2. **Sync ClickUp status → review:** `soda-os sync-clickup G-xxx --status-only`
3. Run [soda-code-review](../soda-code-review/SKILL.md) (5-lens evaluation)
4. Human approves → set status **`approved`**
5. **Sync ClickUp status → approved:** `soda-os sync-clickup G-xxx --status-only`

Do not mark `done` without explicit human approval.

## 6. Commit & Push on Feature Branch

- **Branch:** Always operate on `feature/G-xxx`.
- **Zero Local Integration Merging:** Agent **NEVER** switches to `develop` or `main` and **NEVER** runs `git merge` locally.
- **Commit:** Stage and commit all goal changes:
  - Source code and configuration
  - Tests (unit, integration, E2E)
  - Acceptance contract (`docs/02-product/acceptance/G-xxx.md`)
  - Goal archiving (`goals/_archived/G-xxx.md`) and changelogs
  - ISO audit logs / LLM Wiki blueprints in `docs/06_raw/`
- **Message format:** `G-xxx: imperative description`
- **Push:** Push directly to `origin/feature/G-xxx`:
  ```bash
  git push -u origin feature/G-xxx
  ```

## 7. Close goal

1. Check acceptance criteria `[x]` in `docs/07-backlog/goals/G-xxx.md` (or `G-PAY-001.md`); all **Plan** steps `done`.
2. Set status → **`done`** (only from **`approved`**).
3. **Move** `G-xxx.md` → `docs/07-backlog/goals/_archived/G-xxx.md`; move the row in `queues/{EPIC}.md` Active → Archived, or update [goals.md](../../../docs/07-backlog/goals.md) if on main/core.
4. **Sync ClickUp status → done:** `soda-os sync-clickup G-xxx --status-only`.
5. On an epic branch, do **not** append [changelog-goals.md](../../../docs/07-backlog/changelog-goals.md) or [changelog.md](../../../docs/07-backlog/changelog.md) (EOF conflicts). Roll up on `main` after the PR.
6. Export technical audit report to `docs/06_raw/<date_timestamp>_G-xxx_<topic>.md`; update `docs/06_raw/index.md` and `docs/06_raw/log.md`.
7. **Learning hook:** One line → **`post-ship G-xxx`** or **`learn`** ([soda-learning-loop](../soda-learning-loop/SKILL.md)). Do not auto-run unless asked.
8. TraceabilityService → sync goal trace for G-xxx — see [knowledge-services.md](../../../docs/03-architecture/knowledge-services.md).
9. Update [00-project-snapshot.md](../../../docs/00-project-snapshot.md) if architecture or active goals changed.
10. Commit and push all closeout artifacts directly on the working branch (`origin/<working-branch>`).

## 8. Ship (PR-First Delivery)

On **`ship G-xxx`** (or **`open PR G-xxx`** / **`soda-os pr G-xxx`**):

1. **Verify Branch & Remote:** Ensure active branch is `<working-branch>` (`feature/G-xxx`, `feature/G-PAY-001`, `fix/G-xxx`, `hotfix/G-xxx`, etc.) and all commits are pushed to `origin/<working-branch>`.
2. **Resolve Target Integration Branch:**
   - Epic branch target: `epic/<EPIC>` or `feature/<EPIC>` for epics (NEVER develop).
   - Standard defaults: `develop` for features/fixes/refactors; `main` for hotfixes.
   - Overrideable via goal metadata or CLI flag (`soda-os pr G-xxx --target feature/PAY`).
3. **Generate PR Payload:** Pre-fill `.github/pull_request_template.md` (replace every placeholder):
   - PR Title: `G-xxx: <imperative summary>`
   - Summary & Background extracted from goal spec and acceptance contract
   - Acceptance Contract Checklist with all verification items checked
   - Test Plan and empirical test execution results
   - Governance & Security confirmations (Zero Secrets, Zero Mocks, ClickUp synced)
   - Zero placeholder leaks (no `<!-- ... -->` or `G-___`)
4. **Invoke PR Creation:**
   ```bash
   # Using Soda OS PR helper (auto-detects active working branch & target)
   soda-os pr G-xxx
   
   # Or with explicit target/head branch
   soda-os pr G-xxx --head feature/G-PAY-001 --target epic/PAY
   soda-os pr G-xxx --head fix/G-xxx --target develop
   soda-os pr G-xxx --head hotfix/G-xxx --target main
   
   # Using GitHub CLI directly
   gh pr create --base <target-branch> --head <working-branch> --title "G-xxx: {summary}" --body-file /tmp/pr-body.md
   ```
5. **Output PR URL & Structured Review Checklist:**
   Provide the direct clickable PR URL (`https://github.com/{owner}/{repo}/pull/{pr_number}`) and render the structured human review checklist:

```markdown
### 🚀 Pull Request Generated (PR-First Governance)
- **PR URL:** [https://github.com/owner/repo/pull/123](https://github.com/owner/repo/pull/123)
- **Base Branch:** `<target-branch>` ◀ **Head Branch:** `<working-branch>`

#### 📋 Human Review & Merge Checklist
- [ ] **Acceptance Contract:** Scenarios in `docs/02-product/acceptance/G-xxx.md` verified
- [ ] **Automated CI:** Test & lint suites green on GitHub Actions
- [ ] **Zero Stubs / Zero Mocks:** 100% production logic implemented
- [ ] **Traceability:** ClickUp status synced to `COMPLETE / Done`, audit logged in `docs/06_raw/`
- [ ] **Human Merge Gate:** Merge PR into `<target-branch>` on GitHub
```

6. **Staging Deploy (if applicable):** If goal **In** includes staging deploy → follow [soda-deploy-staging](../soda-deploy-staging/SKILL.md) after PR is merged into target branch.

## Plan & epic queue (update every session)

Keep progress visible in:

| Place | When to update |
|-------|----------------|
| **Cursor TodoWrite** | **"ทำ G-xxx"** (read sync) + after each **"เริ่ม step N"** |
| `goals/G-xxx.md` → **Plan** | On step execution only — not on display-only **"ทำ G-xxx"** |
| `goals.md` → **Dashboard** / `queues/{EPIC}.md` | When phase/status actually changes (promote, execute, review, done) |
| **ClickUp Task** | On **every status transition** (`ready`, `in_progress`, `review`, `approved`, `done`, `blocked`) |

**When to update & Sync**

| Event | Queue / Dashboard collaboration phase | Plan step | ClickUp Status Sync Command |
|-------|---------------------------------------|-----------|-----------------------------|
| Goal drafted | DEFINE **●** | all `pending` | `soda-os sync-clickup G-xxx` (initial card) |
| Promoted `ready` | PLAN **●** | — | `soda-os sync-clickup G-xxx --status-only` |
| Human **"ทำ G-xxx"** | (unchanged) | (unchanged) — todos only | — (read-only turn) |
| Human **"เริ่ม step N"** (first on `ready`) | EXECUTE **●**; goal status → `in_progress` | step N → `current`, then `done` | `soda-os sync-clickup G-xxx --status-only` |
| Blocked during work | add ⏸ on step; status → `blocked` | status `blocked` | `soda-os sync-clickup G-xxx --status-only` |
| Tests green, handoff | REVIEW **●**; goal status → `review` | — | `soda-os sync-clickup G-xxx --status-only` |
| Human `approved` | REVIEW ✓; goal status → `approved` | — | `soda-os sync-clickup G-xxx --status-only` |
| `done` + archived | move row to queue Archived / remove Dashboard row; status → `done` | all `done` | `soda-os sync-clickup G-xxx --status-only` |

Only one step `current` at a time. Add brief audit notes under **Plan** when a step produces findings.

## 9. ClickUp Status Synchronization (Mandatory Invariant)

Every goal state change MUST be synchronized to ClickUp to guarantee 100% real-time alignment between local Markdown repository records and the team's project tracking board.

### Setup & Credentials
- Config file: `scripts/clickup.config.json` (copied from `scripts/clickup.config.example.json`).
- Environment variable: `CLICKUP_API_TOKEN` (or `CLICKUP_API_KEY`).

### Default Status Mapping
| Soda Goal Status | ClickUp List Column | Trigger Event |
|:-----------------|:-------------------|:--------------|
| `draft` / `planned` | `TO DO` / `Draft` | Goal card initialized |
| `ready` | `TO DO` / `Ready` | `promote G-xxx ready` executed |
| `in_progress` | `IN PROGRESS` | First `เริ่ม step N` started |
| `blocked` | `BLOCKED` | Dependency / issue halts progress |
| `review` | `IN REVIEW` | Implementation complete, code review underway |
| `approved` | `COMPLETE` / `Approved` | Human signs off on review / UAT |
| `done` | `COMPLETE` / `Done` | Goal closed and moved to `_archived/` |

### CLI Synchronization Commands
```bash
# Push status update only (fast, lightweight, preserves manual ClickUp descriptions)
soda-os sync-clickup G-xxx --status-only

# Push full goal body and status update
soda-os sync-clickup G-xxx

# Refresh all active goals status across the repository
soda-os sync-clickup --all --status-only

# Preview ClickUp JSON payload without making network calls
soda-os sync-clickup G-xxx --dry-run
```

## 10. PR-First Governance & Branch Invariants (Mandatory)

1. **Branch Isolation:** Each goal operates exclusively on its dedicated feature branch (`feature/G-xxx`). The agent branches from `develop` (`git checkout -b feature/G-xxx`) and stays on `feature/G-xxx`.
2. **Zero Local Integration Merging:** The agent will **NEVER** switch to `develop` or `main` and will **NEVER** execute `git merge` locally. Integration into `develop` occurs exclusively in the cloud on GitHub via Pull Requests.
3. **Commit & Push on Feature Branch:** All code changes, unit & integration tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions (`goals/_archived/`), ClickUp state updates, and ISO audit logs (`docs/06_raw/`) are committed and pushed directly to `origin/feature/G-xxx`.
4. **Pull Request Generation:** On `ship G-xxx`, the agent generates the direct GitHub PR link and structured checklist for human review and merge into `develop`.

## Command triggers (user says → do)

| Command trigger | Do |
|-----------|-----|
| "ทำ G-xxx" / "เริ่มทำ G-xxx" | §0.2 **TodoWrite + ≤3 lines** — read-only; no promote nag |
| "clarify G-xxx" / "ชี้แจง G-xxx" | §0.5 — `[NEEDS CLARIFICATION]`; one question; no code |
| "spec check G-xxx" | §0.5 — tick Spec checklist; no code |
| "analyze G-xxx" / "ตรวจสเปก G-xxx" | §0.5 — cross-artifact; no code |
| "brief G-xxx" / "สรุป G-xxx" | Optional full Plan briefing template |
| "ทำต่อ G-xxx" / "เริ่ม step N" | Ensure on `feature/G-xxx` → Execute step (§3) if `ready`+ **and** analyze `done`/`n/a` → TodoWrite + Plan + ClickUp sync |
| "promote G-xxx ready" | Set `ready` only if §0.5 + **trace G-xxx** + coverage; acceptance contract; **Sync ClickUp status → ready** — human approves |
| "sync-clickup G-xxx" / "sync clickup" | Push goal status and metadata to ClickUp (`soda-os sync-clickup G-xxx`) |
| "set goal" / "สร้าง goal" / describes feature, no G-xxx | Draft `G-xxx.md` + index row only — **no code** |
| "commit G-xxx" | Commit and push to `origin/feature/G-xxx`; follow `commits.md` |
| "ship G-xxx" / "สร้าง PR" / "open PR G-xxx" | §8 — Push to `origin/feature/G-xxx`, create PR to `develop`, generate PR link & checklist |
| `review G-xxx` | Set goal status `review`; **Sync ClickUp status → review**; run code-review skill |
| "approve G-xxx" / "UAT pass G-xxx" | Human decision → `approved`; **Sync ClickUp status → approved** |
| "post-ship G-xxx" / "observe" / "learn" | [soda-learning-loop](../soda-learning-loop/SKILL.md) — no unscoped code |
| "ทำให้สวย / refactor ทั้ง repo" | Stop — ask for goal ID or draft new goal |
| Attaches this skill + feature request, no G-xxx | **Goal first** (§0) — do not implement |

## Related

- [docs/06-workflows/goal-spec-guide.md](../../../docs/06-workflows/goal-spec-guide.md)
- [docs/06-workflows/external-tools.md](../../../docs/06-workflows/external-tools.md)
- [docs/06-workflows/team-workflow.md](../../../docs/06-workflows/team-workflow.md)
- [docs/06-workflows/dev-loop.md](../../../docs/06-workflows/dev-loop.md)
- [docs/06-workflows/github-governance.md](../../../docs/06-workflows/github-governance.md)
- [docs/06-workflows/definition-of-done.md](../../../docs/06-workflows/definition-of-done.md)
- [governance.md](../../../.agents/rules/governance.md)
- [commits.md](../../../.agents/rules/commits.md)
