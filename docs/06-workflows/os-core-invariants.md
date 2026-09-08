# OS core invariants — Core vs Extension

> **Stability contract for Soda Knowledge OS.**  
> Stop adding layers; tune **extensions** from real project data (10–20 projects).

When in doubt: **protect Core · tune Extension · measure with [OS Health](../02-product/os-health.md)**

Related: [knowledge-governance.md](knowledge-governance.md) · [knowledge-loop.md](knowledge-loop.md)

---

## Framework era shift

| Era | Approach | Question |
|-------|----------|----------|
| **Done** | Architecture-driven | "What layer is missing?" |
| **Now** | Evidence-driven | "What do 10–20 projects tell us to tune?" |

**Do not** add new collaboration phases or artifact types without a **framework ADR** and manifest major version bump.

---

## Core (immutable)

Changing Core requires **Soda Agent OS major version** + documented migration — not a single-project tweak.

### C1 — Closed loop (structure)

```text
Conversation → Evidence → Knowledge → Decision → Execution
                                                    ↓
                                              Observation → Learning ↺
```

Plus **Knowledge Governance** above artifacts (owner / approver / agent limits).

### C2 — Graph primitives (ID types)

| ID | Role |
|----|------|
| `E-xxx` | Evidence |
| `P/A/C/R-xxx` | Knowledge |
| `CF-xxx` | Conflict |
| `O-xxx` | Observation |
| `PDR/ADR` | Decision |
| `G-{EPIC}-{NNN}` / `G-xxx` | Execution (filename = ID; [goal-id.md](goal-id.md)) |
| `ORG-xxx` | Pattern (studio extension file, core *concept*) |

### C3 — Goal gate (code)

**No `ready` goal → no application code.** ([soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md))

### C4 — Human acceptance (decisions)

Agents **draft** PDR/ADR/goals; humans **accept**. No autonomous `accepted` / `done` / brief promotion.

### C5 — Dual graph

**Knowledge Services** (runtime) + **projections** (human) — same IDs, no raw transcripts in repo.  
Phase 1 backend: `knowledge-map.json`. Phase 2+: `.os/knowledge.db` — see [knowledge-services.md](../03-architecture/knowledge-services.md).

**Upgrade:** `knowledge-map.json` = product data (`never_touch`). `knowledge-map.schema.json` = framework (synced on upgrade). Missing map → Phase 1 `--ignore-existing` scaffold.

---

## Core invariants (enforced)

Agents **must** enforce these on every promote, audit, and learning session.

### Invariant 1 — No orphan goals

Every goal must trace backward:

```text
Goal ← Decision ← Knowledge ← Evidence
```

(at minimum: **Goal ← Pain ← Evidence**; PDR/ADR when applicable)

| Check | Block |
|-------|-------|
| Goal without `pains` / Intent Why | `ready` |
| Pain without `evidence[]` | promote digest |
| Traceability below gate | `ready` / `done` per [traceability](knowledge-governance.md) |

Command: **`trace G-xxx`** · **`knowledge audit`**

---

### Invariant 2 — Every decision is reviewable

Every **accepted** PDR/ADR must answer:

| Required | Field |
|----------|-------|
| Why | Reason / Context |
| Evidence | `E-xxx` links in map + Dependency graph |
| Trade-offs | Alternatives + negative consequences |
| Review date | `last_validated` / `expires_after` (temporal) |

**Forbidden:** "เพราะหัวหน้าบอก" without evidence or trade-off table.

Agent may set **`proposed`** only until human accept.

---

### Invariant 3 — Knowledge is temporal

**No permanent knowledge.** Every node must support:

| Action | When |
|--------|------|
| **validate** | New `E-xxx`, bump `last_validated` |
| **supersede** | Contradicted by newer evidence |
| **retire** | `expired` / `superseded` / removed after promote |

`needs_review: true` → block promote until revalidated or superseded (human may waive → changelog).

Default TTL is **Extension** (`evidence_freshness_days`) — temporal *requirement* is Core.

---

### Invariant 4 — Learning must change something

Registering `O-xxx` alone is **not** learning.

Every processed observation must include ≥1 **`learning_action`**:

| Action | Counts as learning |
|--------|-------------------|
| `update_pain` / `supersede_pain` / `new_pain` | ✅ |
| `validate_assumption` / `invalidate_assumption` | ✅ |
| `new_pdr` / `update_decision_review` | ✅ |
| `new_goal` | ✅ |
| Export **ORG-xxx** draft | ✅ |
| `resolve_conflict` | ✅ |
| *(none)* | ❌ — observation stays `pending` |

[soda-learning-loop](../../.agents/skills/soda-learning-loop/SKILL.md) — do not mark `processed` without actions.

---

## Extension (evidence-driven — tune freely)

Change per project or after studio metrics — log rationale in [changelog.md](../07-backlog/changelog.md).

| Extension | Default | Tune when |
|-----------|---------|-----------|
| `evidence_freshness_days` | 180 | Domains with fast market change |
| `traceability.min_score_ready` | 67 | After 10+ projects — false positive rate |
| `traceability.min_score_done` | 83 | Same |
| `coverage` promote gates | pain/boundary 100%, avg 80% | Discovery drop-off data |
| Spec stability gates | clarify + spec check before `ready`; analyze before execute | Guess/drift rate on consumer goals |
| External tools / MCP | Consumer `mcp.json`; OS gates when | Tool-bypass / secret leak rate |
| `promote_gates.warn_below` | success, constraints | Retro on skipped areas |
| Interview step wording | 7 steps | UX only — not structure |
| `pattern-index.json` contents | ORG-001 example | Studio library growth |
| `recommend_threshold` (v6) | 80 | Pattern false-positive rate |
| OS Health warn thresholds | see [os-health.md](../02-product/os-health.md) | Studio dashboard review |
| Maturity v5/v6 feature depth | spec in organizational-learning | Real reuse data |

### What to measure (10–20 projects)

- Is **67%** traceability gate too low/high?
- Is **180-day** TTL right per domain?
- Which **patterns** get reused?
- Which **coverage** areas fail most?
- Is **learning velocity** > 0 when goals complete?

---

## Framework creep guard

Before adding anything, ask:

1. Is it **Core** (needs OS major bump)?
2. Is it **Extension** (config/doc)?
3. Can existing **OS Health** metric expose the problem instead?

If none — **do not add**; use learning loop + changelog.

**Next work is evidence, not layers:** Sprint A (10 projects) → B (extract PB/REC/capability) → C (shared memory) — [coordination.md](../03-architecture/coordination.md).

---

## Agent commands (stability)

| Command | Purpose |
|---------|---------|
| `os health` | Recalculate + print dashboard |
| `knowledge audit` | Invariants 1–3 checks |
| `trace G-xxx` | Invariant 1 per goal |
| `clarify G-xxx` | Don't guess — `[NEEDS CLARIFICATION]` |
| `spec check G-xxx` | Spec checklist (unit tests for the card) |
| `analyze G-xxx` | Cross-artifact before first execute |
| `learn` | Invariant 4 enforcement |

---

## Related

- [os-health.md](../02-product/os-health.md)
- [organizational-learning.md](organizational-learning.md)
- [framework-manifest.yml](../../framework-manifest.yml)
