# OS Evolution — release notes for the OS

> **Not code changelog** — how the **framework** improved between versions, measured on real projects.  
> Compare: [os-benchmark.md](os-benchmark.md) aggregates · Source: [framework-manifest.yml](../../framework-manifest.yml) `version`

---

## Purpose

```text
v1.12 → v1.13

Compile tokens     -31%
Human interruptions -22%
Acceptance         +4%
Recipe reuse       +18%
```

Decisions from **data**, not feel.

---

## Evolution entry template

Add a row when bumping `framework-manifest.yml` after **validated usage** evidence:

```markdown
## v1.14.0 — YYYY-MM-DD

**Evidence:** G-003..G-007 (reference implementation project)

| Metric | v1.13 avg | v1.14 avg | Δ |
|--------|-----------|-----------|---|
| Bundle tokens | 2100 | 1450 | -31% |
| Continue tokens | 340 | 210 | -38% |
| Human interruptions | 2.1/goal | 1.6/goal | -24% |
| Acceptance pass | 91% | 95% | +4pp |
| Recipe reuse | 52% | 68% | +16pp |

**Shipped:** shared-memory handoff spec, os benchmark schema  
**Tuned:** capability matrix cursor.rest_api 0.93→0.95  
**Not changed:** Core invariants
```

Do not name consumer products in this file — use goal IDs and metric deltas only.

---

## What to include

| Include | Skip |
|---------|------|
| Benchmark deltas from validated projects | Code-only refactors |
| Recipe/playbook changes with stats | Internal doc typos |
| Threshold tuning (_extensions) | Speculative features |
| Regression (metric got worse) | Marketing language |

---

## Process

1. Run goals on a consumer project with the new OS version
2. Compare `os_benchmark` rollup to previous version window
3. Append section to this file + brief note in [changelog-goals.md](../07-backlog/changelog-goals.md)
4. Bump `framework-manifest.yml`

---

## v1.22.0 — 2026-08-17

**Shipped:** generic **external tools / MCP** gates — consumer connects Chrome, Figma, etc.; OS does not name or ship servers (`docs/06-workflows/external-tools.md`).

**Not changed:** MCP still not locked into OS install.

---

## v1.21.0 — 2026-08-17

**Evidence:** stability gates from Spec Kit / OpenSpec comparison (no-guess, WHAT≠HOW, analyze-before-execute) — measure on consumer goals after upgrade.

| Gate | Where |
|------|--------|
| `clarify G-xxx` | Open questions · `[NEEDS CLARIFICATION]` |
| `spec check G-xxx` | Spec checklist on the goal card |
| `analyze G-xxx` | Before first **เริ่ม step N** |

**Shipped:** spec stability as Extension (`promote_gates.spec_stability`) — not a new OS layer  
**Not changed:** Core invariants C1–C5; MCP still not in OS

---

## v1.23.0 — 2026-08-31

**Shipped:** epic-namespaced goal IDs (`G-PAY-001`), `soda-os goal next|reserve`, `goal-id-registry.yaml`, filename = ID. Legacy `G-001` remains valid (epic `CORE`).

**Evidence:** parallel epic work collided on a single `G-NNN` sequence when IDs were assigned by scanning files.

---

## History

| Version | Date | Headline |
|---------|------|----------|
| 1.23.0 | 2026-08-31 | Epic-namespaced goal IDs + allocation registry |
| 1.22.0 | 2026-08-17 | External tools / MCP — consumer connects; OS gates when |
| 1.21.0 | 2026-08-17 | Spec stability — clarify / spec check / analyze |
| 1.13.0 | 2026-06-27 | Coordination — playbooks, capability IR, shared memory spec |
| 1.12.0 | 2026-06-27 | Context compiler — recipes, working memory |
| 1.10.0 | 2026-06-27 | Context resolver / compile pipeline |

*(Fill metric deltas when benchmark data from production use exists.)*

---

## Related

- [platform-consumer rule](../../.agents/rules/platform-consumer.md)
- [reference-implementation.md](../06-workflows/reference-implementation.md)
- [os-health.md](os-health.md)
