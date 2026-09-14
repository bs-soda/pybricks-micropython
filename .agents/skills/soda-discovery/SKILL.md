---
name: soda-discovery
version: "1.3.5"
description: >-
  Product discovery + core invariants + os health dashboard. Interview, evidence,
  traceability, conflicts, coverage, pattern search. Blocks promote on invariant
  violation. Does not guess — marks [NEEDS CLARIFICATION] on drafted goals.
  discover, os health, trace G-xxx, knowledge audit — DEFINE only.
  Core: os-core-invariants.md. Tune extensions from project data — no new layers.
---

# Product discovery

**Model:** Conversation → Evidence → Knowledge → Decision → Execution → *(Observation → Learning ↺)*

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md)

| Layer | Agent job | Artifacts |
|-------|-----------|-----------|
| 1 Conversation | Interview human | (ephemeral — never store transcript) |
| 2 Evidence | Record provenance | DiscoveryService → `recordEvidence()` |
| 3 Knowledge | Distill + confidence | DiscoveryService + projections (`knowledge-digest.md`, `assumptions.md`) |
| 4 Decision | Link dependencies | PDR, ADR + DecisionService → `linkDecision()` |
| 5 Execution | Goals with traceability | `goals/G-xxx.md`, acceptance, TraceabilityService → `traceGoal()` |

Full reference: [knowledge-loop.md](../../../docs/06-workflows/knowledge-loop.md) · **Core:** [os-core-invariants.md](../../../docs/06-workflows/os-core-invariants.md) · **Services:** [knowledge-services.md](../../../docs/03-architecture/knowledge-services.md)

## Knowledge services (mandatory — do not bypass storage)

Skills call **business capabilities** — never `load()` / `save()` / file paths. See [knowledge-services.md](../../../docs/03-architecture/knowledge-services.md).

| Service | Capabilities used in this skill |
|---------|--------------------------------|
| **DiscoveryService** | `recordEvidence()`, `distillPain()`, `registerAssumption()`, `updateCoverage()`, `runKnowledgeAudit()` |
| **DecisionService** | `proposePDR()`, `linkDecision()`, `checkReviewable()` |
| **TraceabilityService** | `traceGoal(G-xxx)`, `scoreTraceability()`, `blockOrphanPromote()` |
| **PatternService** | `searchPatterns()`, `recommendPattern()`, `recordPatternReuse()` |
| **HealthService** | `calculateOsHealth()`, `calculateKnowledgeRoi()`, `syncHealthProjection()` |

**Phase 1:** services persist via KnowledgeStore → [knowledge-map.json](../../../docs/02-product/knowledge-map.json). Skills do not edit JSON directly.

After service mutations, sync human **projections**: digest, assumptions, os-health table.

## Core invariants (enforce — do not extend)

[os-core-invariants.md](../../../docs/06-workflows/os-core-invariants.md)

| # | Invariant | Agent gate |
|---|-----------|------------|
| 1 | No orphan goals | Block `ready` if Goal ← Pain ← Evidence broken |
| 2 | Reviewable decisions | PDR/ADR need Why + Evidence + Trade-offs + review date; agent only `proposed` |
| 3 | Temporal knowledge | `needs_review` blocks promote; validate/supersede/retire |
| 4 | Learning changes something | Route to [soda-learning-loop](../soda-learning-loop/SKILL.md) |

**Framework creep:** do not add layers — tune `_extensions` in map from project data.

---

## Knowledge governance (mandatory)

Follow [knowledge-governance.md](../../../docs/06-workflows/knowledge-governance.md) authority matrix:

| Agent may | Agent must not |
|-----------|----------------|
| Draft E/P/A/C, open CF-xxx | Accept PDR/ADR; promote to brief without human |
| Propose PDR/ADR `proposed` | Set goal `ready`/`done`; close conflicts alone |
| Run trace + audit | Apply learning without human review |
| Search org patterns (hypothesis) | Publish ORG-xxx without Architect |

Human approvers: PO (knowledge/brief) · Product Lead (PDR) · Architect (ADR/patterns) · Tech Lead (goal ready/done).

---

| Rule | Agent must |
|------|------------|
| No goal ID + vague product ask | Run discovery — **no `code/`** |
| User says **"discover"** / **"intake change"** / **"coverage"** / **"knowledge audit"** | This skill — collaboration phase DEFINE; docs + map only |
| User says **"ทำ G-xxx"** | [soda-goal-workflow](../soda-goal-workflow/SKILL.md) |
| User says **"brief G-xxx"** | Goal Plan briefing — **not** this skill |
| Promote goals → `ready` | **coverage + audit + `trace G-xxx` + spec stability** (clarify, spec check; no `[NEEDS CLARIFICATION]`); human Tech Lead approves |
| User says **`clarify G-xxx`** / **`analyze G-xxx`** / **`spec check G-xxx`** | [soda-goal-workflow](../soda-goal-workflow/SKILL.md) §0.5 |

---

## Evidence layer (mandatory)

Every distilled insight must trace to **who/what said it**.

### Register evidence first

Before adding pain/assumption/constraint, create or reuse `E-xxx`:

```json
{
  "id": "E-001",
  "type": "interview",
  "title": "PO discovery session",
  "date": "2026-06-27",
  "source": "human:PO",
  "ref": "knowledge-digest.md#session-2026-06-27"
}
```

| type | Use when |
|------|----------|
| `interview` | Live conversation with stakeholder/user |
| `analytics` | Dashboard, metrics export |
| `support_ticket` | Helpdesk / CS record |
| `screen_recording` | Observed workflow |
| `survey` | Structured responses |
| `document` | Existing spec, SOP, email (no secrets in repo) |
| `observation` | Agent/human saw behavior directly |
| `other` | — |

**Ask if missing:** "Who did you hear this pain from — user, CEO, support, or analytics?"

**Never** invent missing facts (auth, stack, Out, success metric). Write `[NEEDS CLARIFICATION: …]` on the goal or map blocker — do not pick a plausible default.

**Never** create knowledge nodes without ≥1 `evidence` ID (assumptions may start with 0 evidence but confidence must be `low`).

### Temporal fields (every E-xxx and knowledge node)

| Field | Rule |
|-------|------|
| `date` / `last_validated` | When captured or last confirmed |
| `expires_after` | `last_validated + freshness_days` (default **180** from `temporal_defaults`) |
| `needs_review` | `true` if past expiry OR contradicted by new E-xxx |

Revalidation: new E-xxx → update `last_validated`, recalc `expires_after`, clear `needs_review`.

Block `promote digest` when critical nodes have `needs_review: true` (human may waive → changelog).

---

## Conflict graph (mandatory)

When sources **disagree** — do not promote until resolved.

```json
{
  "id": "CF-001",
  "status": "open",
  "topic": "Dark mode demand",
  "summary": "E-001 wants; E-002 hates; E-003 analytics 5%",
  "nodes": ["P-001", "P-002"],
  "evidence": ["E-001", "E-002", "E-003"],
  "opened": "2026-06-27"
}
```

| Resolution | When |
|------------|------|
| `evidence_wins` | Stronger/newer evidence (e.g. analytics over one interview) |
| `pdr` | Explicit product choice |
| `supersede` | Replace old node with new |
| `defer` | Park for later — log in PDR |

Block promote while `conflicts[].status === "open"`. Ask human — never silent merge.

---

## Confidence (all knowledge nodes)

| Level | Criteria | Agent |
|-------|----------|-------|
| **low** | 1 source, single role, inferred, or "probably" / guesswork | **Must** ask follow-up before promote |
| **medium** | 2+ evidence IDs or partial validation | OK for brief; human sign-off for `ready` |
| **high** | 3+ sources, analytics, or conflicting stakeholders resolved | Stable for goals |

Bump confidence when new `E-xxx` links to the same node. Log changes in digest session note.

---

## Interview framework (7 steps)

Ask **one step at a time**. After each answer → **Evidence → Classify → Confidence → Map + digest → Coverage %**.

### Step 1 — Business → `coverage.business`, `coverage.users`

```
What does the business do?
Who are the customers?
Where does revenue come from (revenue model)?
```

### Step 2 — Workflow → `coverage.workflow`

```
How do you work today — step by step?
What tools do you use (Excel, Line, paper, legacy system)?
Who does what — where are the handoffs?
```

### Step 3 — Pain → `coverage.pain`

```
What wastes the most time?
What fails or goes wrong most often?
What is repeated work (manual / duplicate)?
```

### Step 4 — Dream → `coverage.dream`

```
If you woke up tomorrow and the problems were gone — what would you see?
What does Before → After look like in one working day?
```

### Step 5 — Scope → `coverage.scope`

```
What core capabilities and user outcomes define the target release?
```

### Step 6 — Boundary → `coverage.boundary`

```
What is explicitly Out of v1?
```

### Step 7 — Success + Constraints → `coverage.success`, `coverage.constraints`

```
How do you measure success?
What constraints apply — timeline / budget / compliance / stack?
```

---

## Requirement refinement

| Human says | Agent asks |
|------------|------------|
| "Make it faster" | Faster = load <N sec, or task X min → Y min? Can we measure it from analytics? |
| "Customers are unhappy" | From support tickets, survey, or interview? Do we have an E-xxx? |

Refined statement → new/updated map node with evidence + confidence.

---

## Knowledge map sync (after every answer)

Update [knowledge-map.json](../../../docs/02-product/knowledge-map.json) **and** [knowledge-digest.md](../../../docs/02-product/knowledge-digest.md).

### Agent loop

```text
Human answers
    ↓
Register E-xxx (or reuse)
    ↓
Classify → P / A / C / R / decision-needed
    ↓
Assign confidence + link evidence[]
    ↓
Refine if ambiguous OR confidence low
    ↓
Update knowledge-map.json + digest (same IDs)
    ↓
Recalculate coverage.*
    ↓
Highlight conflicts + orphan/broken links
    ↓
Promote stable high/medium items → brief
    ↓
Next step OR coverage report
```

### Digest row (include IDs)

```markdown
| Category | ID | Insight | Evidence | Confidence | Step |
| Pain | P-001 | … | E-001, E-002 | medium | 3 |
```

---

## Discovery coverage

Recalculate `coverage.*.percent` after each step — see [knowledge-map.README.md](../../../docs/02-product/knowledge-map.README.md).

### Report format (on `coverage`, session end, `promote digest`)

```markdown
### Discovery coverage

| Area | % | Blockers |
|------|---|----------|
| Business | 100% | — |
| Success | 40% | No metric in brief |
| Boundary | 0% | Scope Out empty |

**Promote gates:** pain ✓ · boundary ✗ · avg 62% (min 80%)
**Warn:** Success metric missing; Constraints not documented
```

### Block promote → `ready` when

- Any `promote_gates.required_at_100` area < 100%
- Average coverage < `promote_gates.min_percent`
- **`trace G-xxx` score** < `traceability.min_score_ready` (default 67)
- Open `CF-xxx` or critical `needs_review`
- Critical-path `A-xxx` still `open` + `low`
- `[NEEDS CLARIFICATION]` remains, Spec checklist incomplete, or Intent mixed HOW (spec stability)
- Decision `accepted` without human (agent must not set accepted)

Human override → [changelog.md](../../../docs/07-backlog/changelog.md).

---

## Traceability score (`trace G-xxx`)

Calculate chain: **Evidence → Pain → PDR → ADR → Goal → Observation**

1. Read goal **Knowledge links** + map `goals[]`, `pain[]`, `decisions[]`, `observations[]`
2. For each chain link, mark satisfied / missing / `optional_skipped`
3. Exclude `observation` from denominator until goal `approved`/`done`
4. `score = round(satisfied / applicable × 100)`
5. Write `traceability.goals["G-xxx"]` in [knowledge-map.json](../../../docs/02-product/knowledge-map.json)

Print report — see [knowledge-map.README.md](../../../docs/02-product/knowledge-map.README.md) § Traceability.

Run before **`promote G-xxx ready`** and on **`knowledge audit`**.

**Block `done`** if score < `min_score_done` (default 83) — observation required.

---

## Pattern library search (v5 / v6)

Read [pattern-index.json](../../../docs/04-agents/org-patterns/pattern-index.json) on discover / ADR draft.

| Command | Action |
|---------|--------|
| `pattern search {tags}` | Filter published patterns by tags |
| `pattern recommend` | v6 — rank by `reusable_score` + context match; cite ORG-xxx as **hypothesis only** |

Rules ([organizational-learning.md](../../../docs/06-workflows/organizational-learning.md)):

- Never auto-accept ADR from pattern alone
- Present: pattern ID, score, N projects, works_when / avoid_when
- Require local `E-xxx` before ADR `accepted`
- Agent may **draft** ORG-xxx `proposed` from learning-log — human publishes

---

## Knowledge audit (queries)

Run on **`knowledge audit`**, before **`promote digest`**, or session end.

| Query | Fix |
|-------|-----|
| Pains without goals | Propose goal draft or mark deferred in PDR |
| Decisions without evidence | Block accept; gather E-xxx |
| Goals without pains | Add Intent Why + link P-xxx or flag scope creep |
| Open assumptions + low confidence | Ask validation plan |
| Orphan evidence | Link to node or remove |
| Open conflicts | `conflicts[]` status `open` |
| Stale `needs_review` | temporal audit on E/P/A/decisions |
| Unprocessed observations | `observations[]` status `pending` → route to learning-loop |

Print findings table; offer to fix in same session.

---

## Decision dependency graph

When creating PDR/ADR, fill **Dependency graph** section and mirror in `knowledge-map.json` → `decisions[]`:

```json
{
  "id": "PDR-001",
  "type": "pdr",
  "file": "docs/05-decisions/pdr-0001-slug.md",
  "status": "accepted",
  "depends_on": ["P-001", "E-001"],
  "unblocks": ["ADR-004", "G-012"],
  "evidence": ["E-001", "E-002"],
  "pains_addressed": ["P-001"],
  "goals": ["G-012"]
}
```

**Chain:** Evidence → Pain → **PDR** → **ADR** → **Goal** → code

Opening PDR/ADR: agent reads map and lists impacted goals + downstream ADRs.

When creating goal, add **Knowledge links** section + `goals[]` map entry with `pains`, `decisions`, `assumptions_required`.

---

## Assumption management

Sync [assumptions.md](../../../docs/02-product/assumptions.md) ↔ map `assumptions[]`.

| ID | Assumption | Confidence | Evidence | Validation | Status |
|----|------------|------------|----------|------------|--------|

Lifecycle: `open` → `validated` (promote, remove) · `invalidated` (PDR + Out)

Never `ready` goal if `assumptions_required` contains open low-confidence items.

---

## Modes

### A — Greenfield

Steps 1–7 → map + coverage → lock brief/scope → goals `planned`

### B — Scope refinement

Steps 5–7 → update coverage → PDR for cuts → map links

### C — Change intake

Trigger → impact on map (goals, decisions) → trade-off → PDR → goal `draft`

---

## OS Health (`os health`)

HealthService → `calculateOsHealth()` + `calculateKnowledgeRoi()` → persist → `syncHealthProjection()` to [os-health.md](../../../docs/02-product/os-health.md).

### System KPIs

| Metric | Calculation |
|--------|-------------|
| Knowledge freshness | % active nodes NOT `needs_review` |
| Traceability | avg `traceability.goals[*].score` |
| Open conflicts | count `CF-xxx` open |
| Open assumptions | count `A-xxx` open |
| Pattern reuse | % goals with ORG-xxx reference |
| Learning velocity | processed `O-xxx` in 30d → per month |

### Knowledge ROI (executive — Extension)

| Metric | Calculation / source |
|--------|---------------------|
| Pattern reuse % | Same as system KPI (also in `knowledge_roi`) |
| Time saved (hours) | Studio estimate: baseline discovery hours − actual; or sum from pattern reuse × avg hours saved per pattern |
| Discovery questions avoided | Count questions skipped because PatternService `recommendPattern()` covered them (log in learning-log or `_extensions`) |
| Decisions reused | PDR/ADR citing prior project pattern or ORG-xxx without new interview |
| ADR suggested | Count `recommendPattern()` → ADR draft proposals accepted or filed |

Store in `os_health.knowledge_roi`. Early projects: estimate with human sign-off — refine from 10–20 projects.

Compare system KPIs to `os_health.thresholds` → fill `warnings[]`.

Run: weekly retro · before promote batch · after `learn` · project close (export ROI for studio).

Tune thresholds as **Extension** only — do not change Core invariants from metrics alone.

---

## Session end checklist

- [ ] `E-xxx` registered for new sources
- [ ] `knowledge-map.json` updated (`updated` date, nodes, coverage, decisions, goals)
- [ ] `knowledge-digest.md` synced (IDs match map)
- [ ] `assumptions.md` synced
- [ ] Coverage report printed; blockers listed
- [ ] **Knowledge audit** run — zero critical orphans
- [ ] Stable items promoted to brief
- [ ] **Temporal audit** — `needs_review` handled or waived
- [ ] **Conflicts** — no open CF-xxx (or waived in changelog)
- [ ] PDR/ADR dependency graphs + map `decisions[]`
- [ ] `changelog.md` for significant decisions
- [ ] **`os health`** recalculated if map changed
- [ ] **No `code/`**

## Prompt triggers

| Human says | Action |
|------------|--------|
| discover / สัมภาษณ์ | Step 1 or resume from coverage blockers |
| coverage | Print coverage table only |
| knowledge audit | Run all queries |
| promote digest | Audit + coverage gates → then brief/scope/goals |
| intake change | Mode C |
| trace G-xxx | Traceability score + update map |
| os health | OS Health dashboard + sync os-health.md |
| pattern search / pattern recommend | Query org pattern-index |

---

## Related

- [knowledge-governance.md](../../../docs/06-workflows/knowledge-governance.md)
- [organizational-learning.md](../../../docs/06-workflows/organizational-learning.md)
- [org-patterns/README.md](../../../docs/04-agents/org-patterns/README.md)
- [soda-learning-loop](../soda-learning-loop/SKILL.md) — post-ship ↺
- [soda-goal-workflow](../soda-goal-workflow/SKILL.md) — Layer 5
