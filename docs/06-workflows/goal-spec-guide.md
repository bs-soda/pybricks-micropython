# Writing executable goals

> **Goal:** Anyone opening `goals/G-PAY-001.md` (legacy `G-001.md`) — developer or agent — knows **why**, **what to deliver**, and **what to do in this card** without guessing.  
> **ID:** allocate with `soda-os goal next PAY` first. Filename equals the ID. Contract: [goal-id.md](goal-id.md).

Copy [_template.md](../07-backlog/goals/_template.md) when creating a goal. This guide explains each section.

## Two layers in every goal file (+ chat todo UI)

| Layer | Section | When to update |
|-------|---------|----------------|
| **Goal workflow** | **Plan** (collaboration phase row + step status) | Every session during DEFINE → SHIP |
| **Executable spec** | Context, Intent, Work steps, In/Out, … | When drafting; refine before `ready` |
| **Chat progress UI** | Cursor **TodoWrite** (one item per Plan step) | On **"ทำ G-xxx"** and after each **"เริ่ม step N"** |

**Plan** tracks *where you are in the process*. **Work steps** describe *what to do* — keep them aligned; Plan step 1 should mirror Work step 1. **TodoWrite** mirrors Plan in chat (`2/6`, current step highlighted) — see [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.3.

## Required sections

| Section | Purpose |
|---------|---------|
| **Context** | 1–3 sentences — placement in product, legacy gap, linked ADR/goal |
| **Intent** | **Why** / **Done when** / **Unblocks** — WHAT/WHY only, no stack |
| **How** | PLAN only — stack/ADR/approach after **`clarify G-xxx`** |
| **Open questions** | `[NEEDS CLARIFICATION]` markers — empty before `ready` |
| **Spec checklist** | Unit tests for this card — all `[x]` before `ready` |
| **Work steps** | Ordered checklist for **this card only** |
| **In / Out** | Scope boundary (no scope creep) |
| **Change delta** | ADD / CHANGE / REMOVE vs existing behaviour (brownfield) |
| **Acceptance criteria** | Verifiable — each item testable or reviewable |
| **Test plan** | Real commands from `AGENTS.md` |
| **Touch map** | Paths agent may edit |

## Spec stability gates

Close the guess / mix-how / drift failure modes **inside the existing goal card**. No new layers.

| Gate | Command trigger | Blocks |
|------|-----------------|--------|
| Don't guess | **`clarify G-xxx`** | `promote … ready` while `[NEEDS CLARIFICATION]` remains |
| WHAT ≠ HOW | Intent vs **How** | `ready` if Intent names stack, libraries, or folders-as-recipe |
| Spec complete | **`spec check G-xxx`** | `ready` if Spec checklist has unchecked required items |
| Cross-artifact | **`analyze G-xxx`** | first **`เริ่ม step N`** until analyze is `done` or `n/a` |
| Brownfield delta | Change delta table | `ready` when modifying existing behaviour with empty delta |

Header line **Spec stability:** `clarify` / `spec check` / `analyze` (`pending` · `done` · `n/a`).

Human may waive a gate → log [changelog.md](../07-backlog/changelog.md). Tune via `knowledge-map.json` → `promote_gates.spec_stability`.

### Clarify — do not guess

When drafting or before promote:

1. Scan Intent, In/Out, acceptance, assumptions — if unspecified, write `[NEEDS CLARIFICATION: concrete question]`.
2. Ask the human **one open question at a time**.
3. Never fill How, auth, stack, or API shape from a plausible default.

**Wrong:** "Login" → assume email/password + JWT.  
**Right:** `[NEEDS CLARIFICATION: auth method — email/password, SSO, or OAuth?]`

### Analyze — before first execute

Read-only. Compare:

| Artifact | Check |
|----------|--------|
| `project-brief.md` | Goal **In** is not an Out of scope item |
| Linked PDR/ADR | How and touch map match accepted decisions |
| Intent vs How vs Work steps | Same outcome; How does not contradict Intent |
| Touch map vs repo | Paths exist or are clearly new (ADD in delta) |
| Acceptance vs test plan | Every criterion has a way to fail |

Output a short table: **aligned** / **gap**. Gaps become Open questions or extra Work steps — **no `code/`**. Set **Spec stability** `analyze` → `done` only when no blocking gaps remain.

### Spec checklist

Treat the Spec checklist in the goal file as **unit tests for English**. **`spec check G-xxx`** ticks or fails it; do not promote on a partial list.

## Optional sections

| Section | Use when |
|---------|----------|
| **Knowledge links** | Always — pains, PDR/ADR, assumptions; sync [knowledge-map.json](../02-product/knowledge-map.json) |
| **Context manifest** | Always when `ready`+ — compiler input; see [context-compiler.md](../03-architecture/context-compiler.md) |
| **Blocks** (header metadata) | Other goals wait on this one |
| **Contract draft** | API/schema design — delta table + snippets only |
| **Open questions** | Required — `[NEEDS CLARIFICATION]` must be empty before `ready` |
| **Notes for AI** | Non-obvious constraints, anti-patterns |

Do **not** label steps as "human" or "AI" — the card owns the work.

## "ทำ G-xxx" vs "เริ่ม step N"

| Command trigger | Meaning |
|---------|---------|
| **ทำ G-xxx** | Read goal file → **TodoWrite** → ≤3 lines. **No code, no promote nag, no repo explore.** |
| **clarify G-xxx** | Mark `[NEEDS CLARIFICATION]`; ask one question at a time — **no code** |
| **spec check G-xxx** | Tick Spec checklist — **no code** |
| **analyze G-xxx** | Cross-artifact consistency — **no code**; required before first execute |
| **hydrate G-xxx** / **compile G-xxx** / **resolve G-xxx** | Compile progressive action bundles to `.bundle/` |
| **เริ่ม step N** / **ทำต่อ G-xxx** | `step-N.md` + `action-step-N.yaml` → execute (if `ready`+ **and** analyze `done`/`n/a`) |
| **continue G-xxx** | Incremental — [working-memory.md](../03-architecture/working-memory.md) |
| **brief G-xxx** | Full Plan briefing (optional) |

Add to goal **Notes for AI** which steps need human (UAT, approval) before marking `done`.

## Intent — bad vs good

**Bad:**

```markdown
## Intent
Add user auth with NextAuth and Postgres.
```

(Stack leaked into WHAT. Also guesses auth vendor.)

**Good:**

```markdown
## Intent

**Why:** Mobile clients cannot call protected routes — every feature goal is blocked.

**Done when:** Clients can obtain a session for protected routes; `GET /health` unchanged; contract in `docs/03-architecture/api/`.

**Unblocks:** G-004 (profile), G-005 (orders).
```

```markdown
## How
**Stack / approach:** JWT access token; store in existing auth module per ADR-003.
```

## Knowledge links — required for `ready`

Link **Intent → Why** to map IDs. Run **`knowledge audit`** before promote.

```markdown
## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-002 |
| **Decisions** | PDR-001, ADR-003 |
| **Assumptions required** | — |
```

## Work steps — contract/schema goal (docs only)

> This is a **docs/contract** design goal (API, schema). For **UI/UX** design goals, see [UI/UX goal](#uiux-goal--soda-design) below.

1. Read linked ADR and dependency goals.
2. Apply contract draft delta in touch map paths.
3. Cross-check with existing code or schema (read-only).
4. Update acceptance criteria if scope shifted.
5. Hand off for human review before implement goals start.

## Work steps — implement goal

1. Confirm goal is `ready` and dependencies are `done`.
2. Set Plan step 1 → `current`; execute Work steps in order.
3. Edit **touch map** only; run **test plan**.
4. Set goal → `review`; run [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md).
5. After human `approved` → `done` → move file to `goals/_archived/`.

## Contract draft (API projects)

For OpenAPI/GraphQL/protobuf goals, put **delta only** in the goal — not the full spec.

| Field / path | Action | Location |
|--------------|--------|----------|
| `User.email` | ADD | `components/schemas/User` |

Link the canonical contract doc in `docs/03-architecture/api/`. Implementation goals reference the frozen contract, not a duplicate paste.

Project-specific contract playbooks may live in `docs/03-architecture/api/` (e.g. `goal-openapi-draft-guide.md` at bootstrap).

## UI/UX goal — soda-design

For a goal that adds or changes a **screen, flow, or component**, mark it as a design goal so the agent
routes to the design skill and produces the design before any UI code.

**Mark the goal:**

| Field | Value |
|-------|-------|
| Header **Kind** | `design` |
| Context manifest **Profile** | `designer` |
| Context manifest **Task type** | `design_ui` \| `add_ui` \| `modify_ui` |
| Context manifest **Skills** | `soda-design` |

**Then the flow is:**

1. **"design G-xxx"** → agent runs [soda-design](../../.agents/skills/soda-design/SKILL.md): frame → UX flow + states → wireframe → tokens → UI spec. It **stops for human approval** — no production code yet.
2. Human approves the UX flow + UI spec → promote goal to `ready`.
3. **"เริ่ม step N"** → agent builds in React + Tailwind (token-backed) within the touch map.
4. **"design review"** / **"a11y check"** → UX + WCAG 2.1 AA gate, alongside [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md).

Requirements come first: a UI goal must link a pain `P-xxx` and name the user, job, and success — else
the skill sends you back to `soda-discovery`. Full lifecycle: [design-loop.md](design-loop.md).

## Sync goal state to ClickUp (Mandatory Invariant)

Every goal state transition (`draft` / `planned` → `ready` → `in_progress` → `review` → `approved` → `done`, or `blocked`) MUST sync to ClickUp to keep local repository records and board state in 100% agreement.

**Setup (once per project):**

```bash
cp scripts/clickup.config.example.json scripts/clickup.config.json
# Edit listId + statusMap to match your ClickUp List
export CLICKUP_API_TOKEN=pk_... # (or export CLICKUP_API_KEY=pk_...)
```

**Sync Commands:**

```bash
soda-os sync-clickup --list
soda-os sync-clickup G-029 --dry-run        # preview payload
soda-os sync-clickup G-029                  # create / update task and body
soda-os sync-clickup G-029 --status-only    # fast status-only sync on state change
soda-os sync-clickup --all --status-only    # refresh all statuses across repository
```

Or: `node scripts/goals/sync-clickup.js G-029 --status-only` (same flags).

| What syncs | Detail |
|------------|--------|
| Task name | `[repo] G-030: {title}` — e.g. `[litter-green-nextjs] G-030: …` |
| Description | From `## Context` to end of file — excludes H1, metadata, and `#### Plan` |
| Status | Soda `**Status:**` → ClickUp column |
|--------|--------------------------------------|
| `draft` / `planned` / `ready` | **TO DO** |
| `in_progress` | **IN PROGRESS** |
| `review` | **IN REVIEW** |
| `approved` / `done` | **COMPLETE** |
| `blocked` | **BLOCKED** |

Re-run `soda-os sync-clickup G-xxx --status-only` immediately upon transitioning goal status — updates existing task, logs `old → new`.

Script ships from Soda OS via `soda-os upgrade`. Secrets stay local (`CLICKUP_API_TOKEN`, `clickup.config.json`).

## Related

- [_template.md](../07-backlog/goals/_template.md)
- [acceptance-template.md](../02-product/acceptance-template.md)
- [goal-spec-guide.md](goal-spec-guide.md) (this file)
- [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md)
- [dev-loop.md](dev-loop.md)
