# Agent capability matrix

> **Agent skill progression** — same recipe, different IR per agent.  
> Compiler pass: [compiler-ir.md](../../03-architecture/compiler-ir.md) · Coordination: [coordination.md](../../03-architecture/coordination.md)

---

## Purpose

Recipes (REC) are templates. **Capability matrix** tunes IR:

| Score | Compiler behavior |
|-------|-------------------|
| ≥ 0.90 | Full checklist; optional advanced steps |
| 0.75–0.89 | Standard checklist + guardrails |
| < 0.75 | Split steps; smaller `allowed_files`; human checkpoint |

Scores are **studio data** — tune from Sprint B (10 projects), not guesses.

---

## Matrix file

[capability-matrix.yaml](capability-matrix.yaml) — versioned, human-approved updates.

Declare in goal manifest or compile command:

```text
compile G-001 agent=cursor
compile G-001 agent=claude role=architecture
```

---

## Updating scores

After goal `done` + learning loop:

1. Record outcome (success / partial / fail) per agent + task_type
2. Propose score adjustment in changelog — human approves
3. Never auto-change matrix without evidence (Extension, not Core)

---

## Related

- [execution-recipes/README.md](../execution-recipes/README.md)
- [playbooks/README.md](../playbooks/README.md)
