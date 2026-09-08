# Working memory — runtime + shared coordination

> **Bundle** = IR (compile once). **Working memory** = runtime. **Shared memory** = multi-agent handoff.  
> Parent: [context-compiler.md](context-compiler.md) · Coordination: [coordination.md](coordination.md)

---

## Five artifacts (do not collapse)

| Artifact | Lifetime | Purpose |
|----------|----------|---------|
| **Knowledge** | Permanent | Graph, ADR, patterns |
| **Bundle (IR)** | Compile once (cache) | action-step-N.yaml + recipe |
| **Working memory** | Per agent/session (optional) | Private scratch |
| **Shared memory** | Per goal, all agents | Handoff without copy-paste |
| **Delta** | Per `continue` | What changed since last turn |

```text
Knowledge → Compiler → IR (bundle) → Shared Memory → Agent
                              ↑              ↑
                         (cache)      (architecture / execution / qa)
```

---

## Shared working memory (primary — Sprint C)

Path: `.bundle/G-xxx/shared-memory.yaml` (gitignored)

**One file per goal.** All agents read/write **scoped sections** — no re-sending full context in chat.

```yaml
goal_id: G-001
updated_at: "2026-06-27T11:00:00Z"

architecture:
  author: claude
  updated_at: "2026-06-27T10:30:00Z"
  summary: JWT refresh rotation per ADR-001
  decisions:
    - 15m access token, 7d refresh
    - use existing jwt helper module

execution:
  author: cursor
  step: 2
  current_file: code/src/auth/auth.service.ts
  checklist_done:
    - Read auth.service.ts
  checklist_remaining:
    - Add refresh endpoint
    - Update tests

qa:
  pending_acceptance: [A-004]
  blocked_until_step: 2
```

| Handoff | Flow |
|---------|------|
| Claude → Cursor | Cursor reads `architecture`; writes `execution` |
| Cursor → QA | QA reads `execution`; writes `qa` |
| **continue** | Any agent: shared-memory + delta only |

Future event bus: `ArchitectureUpdated` → patch `architecture` section — see [coordination.md](coordination.md).

---

## Per-agent working memory (optional)

Path: `.bundle/G-xxx/working-memory.yaml`

Use when agent needs private scratch not shared yet. **Shared memory wins** on conflict for handoff fields.

On **เริ่ม step N**: init `execution` in shared-memory from recipe checklist.

On **continue**: update shared-memory; emit delta.

---

## Schema

[working-memory.schema.json](working-memory.schema.json) — extend with `shared-memory` sections in Phase 2 schema bump.

---

## Related

- [compiler-ir.md](compiler-ir.md)
- [agent-capabilities/README.md](../04-agents/agent-capabilities/README.md)
