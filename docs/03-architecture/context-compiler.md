# Context compiler — action bundles

> **Goal:** reduce **cognitive load** — not only tokens. Agent executes a recipe; does not re-plan.  
> **IR model:** [compiler-ir.md](compiler-ir.md) · **Coordination:** [coordination.md](coordination.md)  
> Skills: [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) · Services: [knowledge-services.md](knowledge-services.md)  
> Terminology: [design-spec.md](design-spec.md) §8 (`bundle mode`, collaboration phase)

**Status:** Roadmap phase 1 — agent compiles in procedure; optional `scripts/context/compile.sh` later.

*Former name: Context Resolver — [context-resolver.md](context-resolver.md) (redirect).*

---

## Token vs cognitive load

| | Token optimization | Cognitive load optimization |
|--|-------------------|----------------------------|
| Problem | Too many files read | Agent must **translate** bundle → plan |
| Fix | Smaller bundle | **Recipe + checklist** — follow, don't invent |
| Metric | Files / tokens | Steps pre-ordered; working memory |

```text
Knowledge (permanent)
      ↓ compile (pass pipeline — compiler-ir.md)
IR / Action Bundle (cached)
      ↓
Shared Working Memory (multi-agent)
      ↓ continue
Delta → Agent
```

**Three OS levels:** Knowledge · Execution · [Coordination](coordination.md)

Selection stack: **Pattern (ORG) → Playbook (PB) → Recipe (REC) → IR**

---

## Capability-aware compilation

Compile from **four inputs** — not knowledge alone:

```text
compile(
  goal,
  step?,
  role?,
  agent?,              # cursor | claude | …
  mode?,               # bundle mode: execute | review | discover | plan (see § Bundle mode)
  task_type?,          # add_api | db_migration | qa_verify
  profile?,            # backend-api | qa | …
  agent_capability?    # strong | weak | { refactor: weak }
)
```

| Input | Example effect |
|-------|----------------|
| `task_type: modify_existing_api` | Attach REC-001 checklist |
| `profile: backend-api` | Import REST + security; exclude UI |
| `agent` weak at refactor | `weak_agent_guardrails` from recipe |
| `role: qa` | profile qa → REC-004, no code paths |

Same goal — **different bundles** per agent capability.

Recipes: [execution-recipes/](../04-agents/execution-recipes/README.md) · Playbooks: [playbooks/](../04-agents/playbooks/README.md) · Capabilities: [agent-capabilities/](../04-agents/agent-capabilities/README.md)

---

## Two token problems (still true)

| Problem | Fix |
|---------|-----|
| **Input bloat** — 30–50 files per session | Compile → bundle (~5% of repo) |
| **Reasoning bloat** — agent re-plans every step | **Action bundle** — objective, allowed files, exit criteria pre-decided |

```text
TypeScript  →  Compiler  →  JavaScript

Knowledge   →  Compiler  →  Action Bundle
```

```text
Knowledge Graph
      ↓
Knowledge Services
      ↓
Context Compiler          ← analyze · select · trim · order · score
      ↓
Action Bundle (per step, per role)
      ↓
Agent                     ← execute, minimal planning
```

Agent does **not** read graph. Compiler does.

---

## Compile signature

```text
compile(
  goal,
  step?,
  role?,
  agent?,
  mode?,
  task_type?,
  profile?,
  agent_capability?
)
```

| Human command | Compile call |
|---------------|--------------|
| **compile G-001** / **hydrate G-001** | `compile(G-001)` — all step stubs + cache |
| **เริ่ม step 2** | `compile(G-001, step=2, role=developer, mode=execute)` — `mode` = **bundle mode** |
| **continue G-001** | `delta(G-001)` — no full recompile |
| **compile G-001 qa** | `compile(G-001, role=qa)` |

Aliases: `hydrate` / `resolve` = `compile` (backward compatible).

---

## Role-based bundles

Same goal — different compiled output. Agent never sees full context.

| Role | Bundle includes | Excludes |
|------|-----------------|----------|
| **developer** / **backend** | Code paths, ADR excerpts, acceptance for step, action.yaml | Full PDR narrative, interview pains |
| **qa** | Acceptance, test plan, known risks, exit criteria | Implementation files unless testing |
| **designer** | PRD/brief journey, UI constraints, pains | Code, migrations |
| **product** | Pains, PDR, metrics, assumptions | Code touch map |

Default on **`เริ่ม step N`** in code goals: `role=developer`, **`bundle mode: execute`**.

---

## Bundle mode (compile parameter)

Values match [context-bundle.schema.json](context-bundle.schema.json) `compile.mode` and action bundle `mode`. Each maps to a **collaboration phase** — not an operating mode or response level.

| Bundle mode | Collaboration phase | Typical compile |
|-------------|---------------------|-----------------|
| `execute` | EXECUTE | **"เริ่ม step N"** — step md + action yaml + recipe |
| `review` | REVIEW | Acceptance + code-review checklist; no new features |
| `discover` | DEFINE | Discovery checklist; no `code/` |
| `plan` | PLAN | Goal spec, In/Out, acceptance draft; no `code/` |

Phase 1 default is **`execute`** only on step execution. Other bundle modes apply when compiling non-step bundles (e.g. discovery intake) with the same phase constraints as the matching skill.

---

## Action bundle + execution recipe

Per step: `action-step-N.yaml` includes **recipe** — ordered checklist agent follows without replanning.

Example: [action-bundle.example.yaml](action-bundle.example.yaml) · REC-001: [REC-001-rest-api-update.yaml](../04-agents/execution-recipes/REC-001-rest-api-update.yaml)

```yaml
execution_mode: modify_existing_api
task_type: add_api
profile: backend-api
recipe: REC-001

objective: เพิ่ม JWT refresh token endpoint

checklist:              # merged from recipe + step
  - Read auth.service.ts
  - Add refresh endpoint
  - Update tests
  - Run lint

completion:
  - Acceptance A-004
  - Tests pass

allowed_files: [...]
exit_when: [...]
```

**Objective** = what. **Recipe/checklist** = how — agent does not invent order.

### `step-N.md` (progressive)

One file per Plan step. Step 2 **must not** contain step 9 work.

```markdown
# G-001 — Step 2: Add refresh endpoint

## Do
- Implement refresh per action-step-2.yaml

## Decisions (one line)
- ADR-001: JWT access 15m, refresh 7d

## Exit
- See action-step-2.yaml exit_when
```

On **`เริ่ม step 2`**, agent reads:

```text
step-2.md
action-step-2.yaml    # includes recipe checklist
working-memory.yaml   # init from checklist — update each turn
```

On **`continue`**, agent reads:

```text
working-memory.yaml
delta.md
+ changed files only
```

Do **not** re-read full bundle on continue.

---

## Working memory (runtime)

Separate from bundle. Path: `.bundle/G-xxx/working-memory.yaml`

Full spec: [working-memory.md](working-memory.md)

| Field | Purpose |
|-------|---------|
| `current_file` | Active edit target |
| `checklist_done` / `checklist_remaining` | Recipe progress |
| `last_decision` | Avoid re-deriving from ADR |

Update memory after each meaningful action — not full recompile.

---

## Progressive compile (stages)

| Compile stage | Output |
|-------|--------|
| **compile G-001** | `step-1.md` … `step-N.md` stubs + `action-step-N.yaml` per work step |
| **compile G-001 step=2** | Refine step-2 only; other steps unchanged |
| **เริ่ม step 2** | Read step-2 bundle only |

Do **not** put all steps in one `context.md`.

---

## Bundle cache

Multiple agents (Cursor, Claude, …) must not recompile identical bundles.

```text
.bundle/G-001/
  source_hash          # hash(goal.md + manifest + linked ADR/PDR ids)
  cache/
    G-001-a82f1c/      # immutable when source_hash matches
      step-1.md
      action-step-1.yaml
      score.json
      …
  current -> cache/G-001-a82f1c   # pointer (conceptual)
```

**Compile procedure:**

1. Compute `source_hash` from goal + manifest + decision ids
2. If `cache/G-001-{hash[:6]}/` exists → **reuse** (0 compile tokens)
3. Else compile → write cache → update pointer

`agent` in compile() adds suffix only when agent-specific trimming differs (rare in roadmap phase 1).

---

## Bundle score (auto-trim)

Before handing to agent, compiler runs `scoreBundle()`:

```json
{
  "estimated_tokens": 1780,
  "files": 4,
  "confidence_percent": 96,
  "redundant_percent": 2,
  "max_tokens": 2500,
  "trimmed": false
}
```

| Field | Rule |
|-------|------|
| `estimated_tokens` | Sum step md + action yaml + refs |
| `confidence_percent` | Manifest coverage vs knowledge links |
| `redundant_percent` | Duplicate ADR/acceptance text |
| **Trim** | If `estimated_tokens` > **2500** → drop redundant sections, shorten ADR to one-liners, never drop `exit_when` / `allowed_files` |

Write `score.json` beside bundle. Log trim actions in `score.json` → `trimmed_sections[]`.

---

## Runtime layout

```text
.bundle/G-xxx/
  source_hash
  working-memory.yaml    # runtime — not cached with bundle
  cache/G-xxx-{hash}/    # immutable compile output
    step-{n}.md
    action-step-{n}.yaml
    score.json
  delta.md
```

Schema: [context-bundle.schema.json](context-bundle.schema.json) · [working-memory.schema.json](working-memory.schema.json)

---

## Context manifest (compiler input)

In `goals/G-xxx.md` — like `package.json` for compile dependencies.

Compiler expands empty manifest from Knowledge links + Touch map + Work steps.

---

## Token budget

| Command | Agent reads | Plans? |
|---------|-------------|--------|
| ทำ G-xxx | goal file | No |
| compile G-xxx | (compiler only) | No |
| เริ่ม step N | step-N + action + init working memory | **Follow recipe** |
| continue | working memory + delta | **Resume checklist** |

**Forbidden during collaboration phase EXECUTE:** full goal re-read, knowledge-map, broad search, re-planning from ADR.

---

## ContextCompilerService (roadmap phase 1 — agent)

| Capability | Purpose |
|------------|---------|
| `selectRecipe(task_type, profile)` | Map to REC-xxx from recipe-index |
| `applyProfile(profile)` | Imports + exclude from bundle-profiles |
| `initWorkingMemory(goal, step)` | From action checklist |
| `updateWorkingMemory(patch)` | After each turn |
| `compile(goal, …)` | Full or step compile |
| `compileStep(goal, step, role)` | Progressive step bundle |
| `scoreBundle(path)` | Score + trim to ≤2500 |
| `cacheLookup(source_hash)` | Reuse cache |
| `delta(goal)` | Incremental continue |

---

## Priority (roadmap)

| # | Layer | Status |
|---|-------|--------|
| 1 | Knowledge OS | Done |
| 2 | Context compiler | Done (roadmap phase 1) |
| 3 | **Execution recipes + playbooks + capability matrix** | Catalog started — tune Sprint B |
| 4 | **Shared working memory + delta** | Spec — Sprint C before SQLite |
| 5 | SQLite | When git hurts |
| 6 | Event bus | When handoff at scale hurts |

**Next:** Sprint A (10 projects) — extract data; **no new layers.**

See [coordination.md](coordination.md) roadmap.

---

## Related

- [working-memory.md](working-memory.md)
- [execution-recipes/README.md](../04-agents/execution-recipes/README.md)
- [bundle-profiles/README.md](../04-agents/bundle-profiles/README.md)
- [knowledge-services.md](knowledge-services.md) — `ContextCompilerService` · `RecipeService`
- [goal-spec-guide.md](../06-workflows/goal-spec-guide.md)
- [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md) §0.4
