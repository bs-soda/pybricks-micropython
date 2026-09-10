# Knowledge services — business capability layer

> **Skills read this doc.** Storage/repository details: [knowledge-store.md](knowledge-store.md) (implementers only).
> **Status:** Phase 1 — capabilities implemented **in skill procedure**; no separate runtime yet.

---

## Stack (full)

```text
Knowledge Graph
      ↓
Knowledge Services     (recordEvidence, traceGoal, …)
      ↓
Context Compiler       (compile, score, cache)  ← input + reasoning token fix
      ↓
Execution Bundle       (.bundle/G-xxx/)
      ↓
Agent / Skills         (execute step)
```

Repository + storage (hidden): [knowledge-store.md](knowledge-store.md) · Compiler: [context-compiler.md](context-compiler.md)

---

## Three layers (repository — do not collapse)

```text
Layer 1 — Knowledge Services     ← Skills call capabilities here
Layer 2 — Knowledge Repository   ← Services delegate here (hidden from skills)
Layer 3 — Storage backends       ← JSON today · SQLite · API later
```

```text
soda-discovery  ──┐
soda-learning-loop├──► DiscoveryService · LearningService · …
soda-goal-workflow┘              │
                                    ▼
                         KnowledgeStore · PatternStore · …
                                    │
                                    ▼
                         knowledge-map.json · .os/knowledge.db · API
```

**Rule:** Skills **never** call `load()`, `save()`, `query()`, or name a file/DB path.
They call **business capabilities** on named services.

---

## Layer 1 — Services (skill-facing)

| Service | Skill owner | Capabilities (examples) |
|---------|-------------|-------------------------|
| **DiscoveryService** | `soda-discovery` | `recordEvidence()`, `distillPain()`, `updateCoverage()`, `runKnowledgeAudit()` |
| **DecisionService** | `soda-discovery`, `soda-goal-workflow` | `proposePDR()`, `linkDecision()`, `checkReviewable()` |
| **TraceabilityService** | `soda-discovery`, `soda-goal-workflow` | `traceGoal(G-xxx)`, `scoreTraceability()`, `blockOrphanPromote()` |
| **LearningService** | `soda-learning-loop` | `recordObservation()`, `applyLearningActions()`, `supersedeKnowledge()` |
| **PatternService** | `soda-discovery` | `searchPatterns()`, `recommendPattern()`, `recordPatternReuse()` |
| **HealthService** | `soda-discovery` | `calculateOsHealth()`, `calculateKnowledgeRoi()`, `syncHealthProjection()` |
| **PlaybookService** | `soda-goal-workflow` | `matchPlaybook()`, `selectRecipes()` — [playbooks](../04-agents/playbooks/README.md) |
| **ContextCompilerService** | `soda-goal-workflow` | `compile()`, IR passes — [compiler-ir.md](compiler-ir.md) |
| **RecipeService** | `soda-goal-workflow` | `loadRecipe()`, `recordOutcome()`, propose evolution |
| **CapabilityService** | `soda-goal-workflow` | `getAgentScore()`, `variantForCapability()` — [capability-matrix](../04-agents/agent-capabilities/capability-matrix.yaml) |
| **CoordinationService** | `soda-goal-workflow` | `readSharedMemory()`, `patchSharedMemory()` — [coordination.md](coordination.md) |

### Command → capability map

| Human / agent command | Service | Capability |
|----------------------|---------|------------|
| Interview answer | DiscoveryService | `recordEvidence()` |
| Distill step | DiscoveryService | `distillPain()` / `registerAssumption()` |
| `coverage` | DiscoveryService | `updateCoverage()` |
| `knowledge audit` | DiscoveryService | `runKnowledgeAudit()` |
| `trace G-xxx` | TraceabilityService | `traceGoal()` |
| Promote / PDR accept | DecisionService | `linkDecision()` |
| `post-ship G-xxx` | LearningService | `recordObservation()` |
| `learn` | LearningService | `applyLearningActions()` |
| `pattern search` | PatternService | `searchPatterns()` |
| `pattern recommend` | PatternService | `recommendPattern()` |
| `os health` | HealthService | `calculateOsHealth()` + `calculateKnowledgeRoi()` |
| `compile G-xxx` / hydrate / resolve | ContextCompilerService | `compile()` |
| `compile G-xxx step=N role=qa` | ContextCompilerService | `compile(goal, step, role)` |
| `continue G-xxx` | ContextCompilerService | `delta()` |
| `เริ่ม step N` | ContextCompilerService | `compileStep()` if missing → agent reads action bundle |

Skills **describe intent** in these terms — not storage operations.

---

## Layer 2 — Repository (hidden from skills)

Services persist via repositories — skills do not import this layer.

| Repository | Owns | Phase 1 backend |
|------------|------|-----------------|
| **KnowledgeStore** | Graph nodes, edges, coverage, traceability, os_health | `knowledge-map.json` |
| **PatternStore** | Org pattern index + reuse links | `docs/04-agents/org-patterns/pattern-index.json` |
| **EvidenceStore** | *(future split)* | Same JSON file today |

Repository contract (implementers): [knowledge-store.md](knowledge-store.md).

---

## Layer 3 — Storage (pluggable)

| Phase | Backend | When |
|-------|---------|------|
| 1 | `knowledge-map.json` in repo | Now — prove model |
| 2 | `.os/knowledge.db` (gitignored) | Scale pain (10–20 projects) |
| 3 | Remote Knowledge API | Org intelligence |

**Do not migrate** until [migration triggers](knowledge-store.md#migration-triggers-evidence-driven) fire.

---

## Projections (human-readable views)

Services update **projections** after mutations — not raw graph files in chat:

| Projection | Updated by |
|------------|------------|
| `knowledge-digest.md` | DiscoveryService, LearningService |
| `assumptions.md` | DiscoveryService |
| `os-health.md` | HealthService |
| `learning-log.md` | LearningService |

Git keeps ADR, PDR, goals, brief as **source of intent**. Runtime graph is **not** source long-term.

---

## Future — Event bus (do not implement yet)

Today skills call services **directly** (synchronous). At org scale, emit domain events instead:

```text
GoalCompleted(G-001)
    → LearningService.onGoalCompleted()
    → PatternService.onGoalCompleted()
    → HealthService.onGoalCompleted()
    → TraceabilityService.refresh()
```

| Event (future) | Listeners |
|----------------|-----------|
| `GoalCompleted` | LearningService, PatternService, HealthService |
| `DecisionAccepted` | TraceabilityService, PatternService |
| `ObservationRecorded` | LearningService, HealthService |
| `ConflictOpened` | DiscoveryService (block promote) |

**Roadmap:** prove capabilities on real projects → add bus when cross-service orchestration hurts — not before.

---

## What to build next (evidence-driven)

| Priority | Action | Not |
|----------|--------|-----|
| 1 | Use OS on 3+ real clients | New architecture layers |
| 2 | Measure discovery minutes, reject %, pattern reuse | SQLite migration |
| 3 | Tune Extension thresholds from data | New KPIs without ROI need |
| 4 | Phase 2 storage when git conflicts hurt | Event bus in Phase 1 |

Executive question: **Knowledge ROI** — see [os-health.md](../02-product/os-health.md#knowledge-roi).

---

## Related

- [knowledge-store.md](knowledge-store.md) — repository + storage (implementers)
- [knowledge-loop.md](../06-workflows/knowledge-loop.md)
- [os-core-invariants.md](../06-workflows/os-core-invariants.md)
- [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md)
