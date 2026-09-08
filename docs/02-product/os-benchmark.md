# OS Benchmark — per-goal execution metrics

> **Measure the OS**, not the developer. Record on goal close or after compile sessions.  
> Stored: [knowledge-map.json](knowledge-map.json) → `os_benchmark.goals[G-xxx]`  
> Command: **`os benchmark G-xxx`** · rollup: **`os dashboard`**

Reference implementation: [reference-implementation.md](../06-workflows/reference-implementation.md)

---

## Why

Without benchmarks, OS tuning is guesswork. With them:

```text
REC-001  avg compile 1.2s · 1800 tokens · acceptance 96% · failure 3%
PB-003   reuse 43 projects · saved 127 hours
```

Patterns and recipes get **ROI**, not just narrative.

---

## Per-goal metrics (record on close or step batch)

| Field | Meaning |
|-------|---------|
| `compile_time_ms` | Context compiler wall time |
| `bundle_tokens` | IR size after score/trim |
| `input_tokens` | Agent input for EXECUTE session(s) |
| `output_tokens` | Agent output (planning + code + chat) |
| `continue_tokens` | Tokens on `continue` turns only |
| `recipe_id` | REC-xxx used |
| `playbook_id` | PB-xxx matched |
| `pattern_ids` | ORG-xxx cited |
| `human_interruptions` | Human corrected agent mid-step |
| `replanning_count` | Agent deviated from recipe checklist |
| `completion_time_minutes` | Goal start → done |
| `acceptance_pass_percent` | Acceptance criteria passed / total × 100 |
| `framework_version` | framework-manifest version at record time |

Early projects: estimate with `notes`; refine from Cursor/session logs when available.

---

## Dashboard (human scan — this project)

> Agent updates from map after **`os benchmark`** / goal close.

| Metric | G-xxx avg | Target |
|--------|-----------|--------|
| Compile time | — ms | track |
| Bundle tokens | — | ≤ 2500 |
| Continue tokens | — | minimize |
| Human interruptions | — | ↓ over time |
| Replanning count | — | → 0 |
| Acceptance pass | — % | ≥ 95% |

---

## Report format (agent)

```markdown
### OS Benchmark — G-001 (closed)

| Metric | Value |
|--------|-------|
| Compile | 1180 ms |
| Bundle tokens | 1640 |
| Input / output | 4200 / 8900 |
| Continue tokens | 380 |
| Recipe | REC-001 |
| Playbook | PB-001 |
| Patterns | ORG-001 |
| Human interruptions | 1 |
| Replanning | 0 |
| Completion | 47 min |
| Acceptance | 100% |
| Framework | 1.13.0 |
```

---

## When to record

| Event | Action |
|-------|--------|
| Goal → `review` / `approved` | **`os benchmark G-xxx`** — full row |
| After compile + long EXECUTE | Optional mid-goal snapshot |
| OS reference project (consumer repo) | **Required** on every closed goal when snapshot marks reference role |

Rollup → studio-wide metrics via [os-health.md](os-health.md) on project export.

---

## Recipe / playbook stats (rollup)

Compiler aggregates into recipe files when human approves:

```yaml
stats:
  used: 142
  avg_bundle_tokens: 1780
  avg_acceptance_pass: 96
  failure_rate: 0.03
```

See [execution-recipes/README.md](../04-agents/execution-recipes/README.md).

---

## Related

- [os-health.md](os-health.md) — knowledge quality KPIs
- [os-evolution.md](os-evolution.md) — OS version deltas
