# Playbooks — recipe selection

> **Pattern** = what worked · **Playbook** = when to use which recipes · **Recipe** = how to execute  
> Compiler: [context-compiler.md](../../03-architecture/context-compiler.md) · IR: [compiler-ir.md](../../03-architecture/compiler-ir.md)

---

## Stack

```text
ORG-xxx (Pattern)     knowledge — cross-project decision
       ↓
PB-xxx (Playbook)     selection — match context → REC list
       ↓
REC-xxx (Recipe)      procedure — ordered checklist
       ↓
IR (action-step-N)    compiled output
```

Playbooks are **reusable across goals** — like bundle profiles but context-aware.

---

## Playbook structure

```yaml
id: PB-001
slug: backend-api-jwt-existing

when:
  domain: backend_api
  auth: jwt
  context: existing_project

use_recipes:
  - REC-001
patterns:
  - ORG-001

avoid_recipes:
  - REC-099

preferred_agents:
  architecture: claude
  execute: cursor
  qa: cursor
```

Index: [playbook-index.json](playbook-index.json)

---

## Compiler flow

```text
compile(G-001, agent=cursor)
  → match playbooks from goal tags + manifest
  → select REC-001 from PB-001
  → apply capability-matrix for cursor.rest_api
  → emit IR
```

---

## Export (Sprint B)

From done goals with high reuse:

1. Generalize context tags → `when`
2. List recipes that succeeded → `use_recipes`
3. Link ORG pattern if applicable
4. Human approves PB-xxx before index update

---

## Related

- [execution-recipes/README.md](../execution-recipes/README.md)
- [org-patterns/README.md](../org-patterns/README.md)
- [agent-capabilities/README.md](../agent-capabilities/README.md)
