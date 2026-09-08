# Execution recipes — how to execute

> **Patterns** = what worked across projects (ORG-xxx). **Recipes** = ordered steps for *how* to execute a task type.  
> Compiler selects recipe → agent follows checklist — **minimal cognitive load**.

Index: [recipe-index.json](recipe-index.json) · Profiles: [bundle-profiles/](../bundle-profiles/README.md)  
Compiler: [context-compiler.md](../../03-architecture/context-compiler.md)

---

## Pattern vs Recipe

| | Org pattern (ORG) | Execution recipe (REC) |
|--|-------------------|------------------------|
| Question | What decision worked? | What steps in what order? |
| Example | ORG-003: JWT refresh rotation | REC-001: REST API update v2 |
| Used by | Discovery, PDR | Context compiler, EXECUTE |

Patterns inform **decisions**. Recipes inform **procedure**.

---

## Recipe structure

```yaml
id: REC-001
slug: rest-api-update-v2
task_type: add_api | modify_existing_api
execution_mode: modify_existing_api

checklist:
  - Read existing route + service
  - Update handler per ADR
  - Add/update tests
  - Run lint + test plan

completion:
  - acceptance scenarios for step
  - tests pass

imports:
  - security-api-checklist

weak_agent_notes:
  - Do not refactor unrelated modules
  - One file change at a time if agent capability weak
```

## Recipe learning (evolution from outcomes)

Recipes are **not static**. After real usage (Sprint B):

```yaml
stats:
  used: 142
  success: 131
  failure: 11
  last_used: "2026-06-01"

evolution:
  - date: "2026-05-01"
    change: "Move 'Run lint' before 'Update tests'"
    success_delta: "+8%"
    approved_by: human
    status: active
```

| Rule | Agent / human |
|------|---------------|
| Propose evolution | Learning loop after goal `done` |
| Approve | Human — same as ORG pattern export |
| Apply | Next compile reads updated REC version; bump recipe `version` |

Failed experiments stay in `evolution` with `status: reverted` — do not delete history.

---

## Playbook selects recipe

Compiler does not pick REC in isolation — [playbooks/](../playbooks/README.md) match context first.

```text
ORG (what) → PB (when/which REC) → REC (how) → IR
```

---

## Catalog (starter)

| ID | Task type | When |
|----|-----------|------|
| REC-001 | `modify_existing_api` | Add/change REST endpoint in existing service |
| REC-002 | `new_api_resource` | New resource + routes + tests |
| REC-003 | `db_migration` | Schema change — links `soda-db-migration` |
| REC-004 | `acceptance_qa` | QA role — regression + acceptance only |

Add recipes from **done goals** with high reuse — same export discipline as org-patterns.

---

## Capability-aware compilation

Compile inputs:

```text
Knowledge + Task Type + Agent Capability + Role + Profile
```

| Input | Effect on bundle |
|-------|------------------|
| `task_type: add_api` | Select REC-001 or REC-002 |
| `agent: cursor` + strong at code | Full checklist, fewer guardrails |
| `agent: X` + weak at refactor | `weak_agent_notes`, smaller `allowed_files`, split checklist |
| `profile: backend-api` | Import REST + security checklists; exclude UI |

Same goal G-001 — **different bundles** per agent capability.

Declare in goal **Context manifest**: `task_type`, `recipe`, `profile`.

---

## Related

- [bundle-profiles/](../bundle-profiles/README.md)
- [org-patterns/](../org-patterns/README.md)
- [action-bundle.example.yaml](../../03-architecture/action-bundle.example.yaml)
