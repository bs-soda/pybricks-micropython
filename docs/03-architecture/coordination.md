# Coordination — multi-agent layer

> **Three OS levels:** Knowledge (รู้) · Execution (ทำ) · **Coordination (ร่วมกันทำ)**
> Execution stack: [context-compiler.md](context-compiler.md) · IR: [compiler-ir.md](compiler-ir.md)

**Status:** Phase 1 — shared working memory spec; event bus documented, not implemented.

---

## Three levels

| Level | Question | Artifacts |
|-------|----------|-----------|
| **Knowledge** | What is true? Why? | Graph, ADR, PDR, ORG patterns |
| **Execution** | What to do now? | Compiler → IR bundle → recipe checklist |
| **Coordination** | Who does what? How share state? | Capability matrix, playbooks, **shared memory** |

```text
Knowledge          Execution              Coordination
    │                  │                        │
    ▼                  ▼                        ▼
Pattern ──► Playbook ──► Recipe ──► IR ──► Shared Memory ──► Agents
              (select)   (how)      (compile)   (runtime bus)
```

**Do not add new top-level layers** — coordinate with what exists.

---

## Agent skill progression

Recipes are **not static forever**. Two evolution loops:

### 1. Capability matrix (per agent)

Same recipe, **different compile output** per agent.

See [agent-capabilities/capability-matrix.yaml](../04-agents/agent-capabilities/capability-matrix.yaml)

```yaml
cursor:
  rest_api: 0.95
  flutter: 0.82
  refactor: 0.91
claude:
  architecture: 0.98
  reasoning: 0.99
  qa: 0.83
```

Compiler pass: **capability-aware recipe variant** — more guardrails when score < 0.85; shorter checklist when score > 0.95.

### 2. Recipe learning (from outcomes)

Recipes accumulate stats from real goals:

```yaml
stats:
  used: 142
  success: 131
  failure: 11
evolution:
  - change: "Move 'Run lint' before 'Update tests'"
    success_delta: "+8%"
    approved: 2026-05-01
```

Human approves evolution — same governance as ORG patterns. See [execution-recipes/README.md](../04-agents/execution-recipes/README.md).

---

## Playbook — between Pattern and Recipe

| Layer | Answers |
|-------|---------|
| **Pattern (ORG)** | What worked across projects? |
| **Playbook (PB)** | *Given context*, which recipes? |
| **Recipe (REC)** | Ordered steps for one task type |

Example: [playbooks/PB-001-backend-api-jwt.yaml](../04-agents/playbooks/PB-001-backend-api-jwt.yaml)

```yaml
when:
  domain: backend_api
  auth: jwt
  context: existing_project
use_recipes: [REC-001, REC-011]
avoid_recipes: [REC-099-greenfield-scaffold]
```

Compiler: `Pattern → Playbook.match() → Recipe[] → IR`

---

## Shared working memory

**Problem:** Claude architects → Cursor implements → QA verifies — today = copy-paste prompts = token waste.

**Fix:** One runtime file per goal, all agents read/write scoped sections.

Path: `.bundle/G-xxx/shared-memory.yaml` (gitignored)

```yaml
goal_id: G-001
updated_at: "2026-06-27T11:00:00Z"

architecture:
  author: claude
  summary: JWT refresh via ADR-001 rotation
  decisions: [use jwt helper, 15m access / 7d refresh]

execution:
  author: cursor
  step: 2
  current_file: auth.service.ts
  checklist_remaining: [Update tests, Run lint]

qa:
  author: —
  pending: [A-004 scenario after step 2]
```

| Agent | Reads | Writes |
|-------|-------|--------|
| Claude (architect) | playbook, ADR | `architecture` section |
| Cursor (dev) | `architecture`, action bundle | `execution` section |
| QA | `execution`, acceptance | `qa` section |

**continue** any agent → shared memory + delta — not full bundle re-send.

Per-agent scratch still allowed in `working-memory.yaml` if needed; **shared-memory.yaml** is source of truth for handoff.

---

## Event bus (Phase 2 — after shared memory proves value)

Today: agents update shared memory synchronously in procedure.

Future:

```text
ArchitectureUpdated  →  SharedMemory.patch(architecture)
GoalStepCompleted    →  LearningService + RecipeService.stats
AgentHandoff         →  compile(next_role) from shared memory only
```

Shared memory is the **minimal bus** until real pub/sub hurts.

---

## Roadmap — stop adding layers

| Sprint | Focus | Not |
|--------|-------|-----|
| **A** | 10 real projects — run full loop | New architecture docs |
| **B** | Extract ORG patterns, REC recipes, capability scores from data | SQLite |
| **C** | **Shared working memory** in practice | Event bus until handoff hurts |

SQLite and Event Bus **after** coordination proven — shared memory saves more tokens than storage migration.

---

## Related

- [compiler-ir.md](compiler-ir.md) — bundle as IR, optimization passes
- [working-memory.md](working-memory.md) — runtime state (→ shared memory)
- [playbooks/README.md](../04-agents/playbooks/README.md)
- [agent-capabilities/README.md](../04-agents/agent-capabilities/README.md)
