# Reference implementation — prove, don't document

> **Shift:** You are not building a framework. You are building a **reference implementation** — one consumer project that proves the OS works in production.

Architecture is **complete enough to validate**. Next work is **measurement on real projects**, not new layers.

**Platform rule:** This framework repo stays **generic** — see [platform-consumer.md](../../.agents/rules/platform-consumer.md). Consumer repos declare reference role locally.

---

## Framework vs reference implementation

| | Framework | Reference implementation |
|--|-----------|---------------------------|
| Success | Docs complete | **One project ships with the full stack** |
| Risk | "We think it works" | "We measured it working" |
| Feedback | Speculative | **Pain is real** → tune OS from data |

```text
Framework only:     OS docs → assume it works

Reference impl:     OS docs → consumer project → benchmark → OS evolves
```

---

## Reference implementation project

Each studio **designates one consumer project** as the proof surface (any product — billing, ERP, IoT, etc.).

> Every new OS capability must be **validated on that project** before studio-wide rollout.

The framework does **not** name or hardcode which project — that lives in the **consumer repo** only.

### Full stack checklist (must pass on reference project)

| Capability | Validate on reference project |
|------------|------------------------------|
| Knowledge loop | Discovery → map → digest |
| Goals + acceptance | G-xxx end-to-end |
| Context compiler | `compile G-xxx` → IR |
| Recipes + playbooks | REC/PB on real tasks |
| Shared memory | Multi-agent handoff (when used) |
| OS Health | `os health` |
| **OS Benchmark** | Per-goal metrics — [os-benchmark.md](../02-product/os-benchmark.md) |
| Learning loop | Post-ship observe → learn |

New OS features: **validate on reference project first** → measure → export pattern/recipe/playbook to studio library.

---

## Operating model

```text
1. Bootstrap consumer repo from Soda Agent OS
2. Mark reference role in docs/00-project-snapshot.md (consumer repo)
3. Run goals with compile + benchmark on every significant G-xxx
4. Export ORG / PB / REC stats to studio when goals done
5. Roll OS improvements from measured evidence → framework-manifest bump → os evolution note
```

Do **not** add architecture until validated usage proves a gap.

---

## Sprints (engineering, not architecture)

| Sprint | Deliverable |
|--------|-------------|
| **A** | Reference project live — 3+ goals through full loop |
| **B** | [OS Benchmark](../02-product/os-benchmark.md) on every closed goal |
| **C** | Studio OS Health rollup via [os-health.md](../02-product/os-health.md) from aggregated exports |
| **D** | Shared memory on multi-agent workflow (when needed) |

---

## Marker (consumer project repo only)

In the **consumer** project's `docs/00-project-snapshot.md`:

```markdown
| **OS reference project** | yes — validates Soda Agent OS in production |
| **OS benchmark** | required on goal close |
```

---

## Related

- [os-benchmark.md](../02-product/os-benchmark.md)
- [os-evolution.md](../02-product/os-evolution.md)
- [os-health.md](../02-product/os-health.md)
- [coordination.md](../03-architecture/coordination.md)
- [os-core-invariants.md](os-core-invariants.md)
