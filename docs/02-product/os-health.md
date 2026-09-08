# OS Health

> **System KPIs — not people KPIs.** One dashboard for knowledge debt and learning rate.  
> Agent recalculates on **`os health`** · stored in [knowledge-map.json](knowledge-map.json) → `os_health`.

Invariants: [os-core-invariants.md](../06-workflows/os-core-invariants.md)

---

## Dashboard (human scan)

> Agent copies latest metrics from map after `os health`. Update this table for standups / retro.

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Knowledge freshness** | — | ≥ 85% | — |
| **Traceability** | — | ≥ 85% | — |
| **Open conflicts** | — | 0 | — |
| **Open assumptions** | — | track | — |
| **Pattern reuse** | — | studio metric | — |
| **Learning velocity** | — / month | > 0 when shipping | — |

### Knowledge ROI (executive)

> Answers: *"What did we get back from investing in Knowledge OS?"*  
> Agent fills on **`os health`** → `os_health.metrics.knowledge_roi`. Early projects: estimate + human `notes`.

| Metric | Value | Notes |
|--------|-------|-------|
| **Pattern reuse** | — | % goals citing ORG-xxx |
| **Time saved** | — hours | Discovery/execution hours avoided vs baseline |
| **Discovery questions avoided** | — | Covered by pattern recommend without re-interview |
| **Decisions reused** | — | PDR/ADR from prior patterns without new evidence |
| **ADR suggested** | — | Pattern recommend → ADR proposals filed |

**Last calculated:** —  
**Warnings:** *(none)*

---

## Metric definitions

### Knowledge freshness (%)

```text
active nodes NOT needs_review / active knowledge nodes × 100
```

**Active nodes:** `pain`, `assumptions` (open), `constraints`, `decisions` (accepted) in map.

Low freshness → temporal debt; run revalidation or supersede.

---

### Traceability (%)

```text
average(traceability.goals[*].score) for goals in map with status planned|ready|in_progress|review|approved
```

If no scored goals → `—`. Per-goal detail: **`trace G-xxx`**.

---

### Open conflicts (count)

`conflicts[]` where `status === "open"`. **Target: 0** before batch promote.

---

### Open assumptions (count)

`assumptions[]` where `status === "open"`. Track — critical-path low-confidence block `ready`.

---

### Pattern reuse (%)

```text
goals citing ORG-xxx or pattern-index id in Knowledge links / map / goals[].patterns × 100
```

On early projects without patterns → 0% is normal. Studio tunes from aggregate.

---

### Learning velocity (per month)

```text
observations with status processed in last 30 days × (30 / window_days)
```

Also count from [learning-log.md](learning-log.md) session rows. **Target:** > 0 when goals completed in period — Invariant 4.

---

## Knowledge ROI

Executive metrics — not people KPIs. Tune estimation method in `_extensions` as studio learns.

| Field | Meaning |
|-------|---------|
| `pattern_reuse_percent` | Goals with ORG-xxx / pattern-index reference |
| `time_saved_hours` | Estimated hours saved (discovery + rework avoided) |
| `discovery_questions_avoided` | Interview questions skipped via pattern coverage |
| `decisions_reused` | Decisions citing org patterns without new E-xxx |
| `adr_suggested` | ADR drafts from `recommendPattern()` (accepted or filed) |
| `notes` | Estimation method or human sign-off |

**Early projects:** null or rough estimate is OK. **Target:** defensible numbers after 10–20 projects for studio rollup.

Include ROI block in `os health` report when any value is non-null.

---

## Warn thresholds (Extension — tune from data)

Defaults in `knowledge-map.json` → `os_health.thresholds`:

| Metric | Warn below |
|--------|------------|
| knowledge_freshness | 85 |
| traceability | 85 |
| open_conflicts | 1 (any) |
| learning_velocity | 1/month (when ≥1 goal done in 30d) |

Warnings → `os_health.warnings[]` + chat on **`os health`**.

---

## Report format (agent)

```markdown
### OS Health — YYYY-MM-DD

| Metric | Value | Target | |
|--------|-------|--------|--|
| Knowledge freshness | 92% | ≥85% | ✓ |
| Traceability | 95% | ≥85% | ✓ |
| Open conflicts | 1 | 0 | ✗ |
| Open assumptions | 4 | — | · |
| Pattern reuse | 73% | — | · |
| Learning velocity | 8/mo | >0 | ✓ |

**Knowledge ROI:** pattern reuse 68% · time saved ~142h · 91 questions avoided · 34 decisions reused · 12 ADR suggested

**Warnings:** 1 open conflict (CF-001). Resolve before promote batch.
```

---

## When to run

| Event | Command |
|-------|---------|
| Weekly retro | `os health` |
| Before promote batch | `os health` + `knowledge audit` |
| After learning session | `os health` |
| Project close | Export metrics to studio changelog for cross-project tuning |

---

## Evidence-driven tuning loop

```text
Ship projects → os health history → adjust Extension thresholds → changelog
```

Do **not** change Core invariants from metrics alone — propose framework ADR if invariant wrong.

---

## Related

- [knowledge-map.json](knowledge-map.json)
- [learning-log.md](learning-log.md)
- [os-core-invariants.md](../06-workflows/os-core-invariants.md)
