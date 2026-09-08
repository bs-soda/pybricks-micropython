# Compiler IR — intermediate representation

> Action bundle = **IR**. Knowledge graph = **source program**. Compiler = **pass pipeline**.  
> Parent: [context-compiler.md](context-compiler.md) · Coordination: [coordination.md](coordination.md)

---

## Mapping

| CS concept | Agent OS |
|------------|----------|
| Source program | Knowledge graph + goal + manifest |
| Compiler | Context compiler |
| **IR** | Action bundle (`action-step-N.yaml`) |
| Runtime state | Shared working memory |
| Optimization passes | Capability trim, dedupe, playbook select |
| Object code | Agent execution (minimal planning) |

```text
Source (Knowledge + Goal)
        ↓
  [Pass 1] Resolve manifest
  [Pass 2] Playbook → recipe selection
  [Pass 3] Capability matrix → variant
  [Pass 4] Score + trim (≤2500)
  [Pass 5] Emit IR (action-step-N.yaml)
        ↓
IR (cached in .bundle/cache/)
        ↓
Runtime (shared-memory.yaml)
        ↓
Agent
```

**Change IR passes without changing knowledge graph or agent skills.**

---

## Optimization passes (extensible)

| Pass | Input | Output |
|------|-------|--------|
| **manifest** | goal file | dependency list |
| **playbook** | context tags (domain, auth, stack) | REC-xxx list |
| **capability** | agent + capability-matrix | checklist variant, guardrails |
| **dedupe** | ADR + acceptance text | one-liners in IR |
| **score** | IR size | trim redundant; keep exit_when |
| **progressive** | step N | step-N IR only |

Future passes (evidence-driven):

- Merge adjacent REC steps when same agent session
- Split checklist when capability score < threshold
- Validate IR against touch map before emit

---

## IR contract (action-step-N.yaml)

Required for valid IR:

```yaml
goal_id, current_step, recipe, checklist, completion
objective, allowed_files, avoid, exit_when
profile, task_type
```

Optional: `agent`, `agent_capability`, `playbook: PB-xxx`

Schema: [context-bundle.schema.json](context-bundle.schema.json)

---

## Recipe learning → IR pass update

When REC-001 stats show step reorder improves success +8%:

1. Human approves evolution in recipe file
2. Next **compile** uses updated checklist — no agent skill change
3. Cache invalidates on `source_hash` + recipe version bump

---

## Related

- [execution-recipes/README.md](../04-agents/execution-recipes/README.md)
- [action-bundle.example.yaml](action-bundle.example.yaml)
