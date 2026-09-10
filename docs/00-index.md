# Documentation index

> Soda Agent OS — replace product placeholders when bootstrapping a new project.
> **Do not remove** process docs, `design-spec.md`, or `soda-*` skills.

## Project status

| Field | Value |
|-------|--------|
| **Project stage** | Agent OS scaffold — fill product docs before coding |
| **Framework** | [03-architecture/design-spec.md](03-architecture/design-spec.md) |
| **Active goal** | — ([07-backlog/goals.md](07-backlog/goals.md)) |
| **Stack** | {STACK} |
| **Last updated** | {DATE} |

## Read before writing code

1. [00-project-snapshot.md](00-project-snapshot.md) — TL;DR state
2. [02-product/knowledge-digest.md](02-product/knowledge-digest.md) — distilled discovery (if filled)
3. [02-product/project-brief.md](02-product/project-brief.md)
4. [02-product/assumptions.md](02-product/assumptions.md) — open assumptions block critical work
5. [03-architecture/overview.md](03-architecture/overview.md)
6. [03-architecture/design-spec.md](03-architecture/design-spec.md)
7. Active goal in [07-backlog/goals.md](07-backlog/goals.md)
8. [06-workflows/definition-of-done.md](06-workflows/definition-of-done.md)

## Team onboarding

- **[06-workflows/team-workflow.md](06-workflows/team-workflow.md)** — collaboration cycle (DEFINE → SHIP)
- [06-workflows/team-workflow.md](06-workflows/team-workflow.md) — Human + Agent cycle (Mermaid)
- [../AGENTS.md](../AGENTS.md) — AI entry point
- [../README.md](../README.md) — bootstrap checklist

## Document map

### Product

| Doc | Purpose |
|-----|---------|
| [00-project-snapshot.md](00-project-snapshot.md) | Agent reload — architecture, goals, constraints |
| [02-product/project-brief.md](02-product/project-brief.md) | Canonical product spec |
| [02-product/knowledge-digest.md](02-product/knowledge-digest.md) | Distilled discovery (human scan) |
| [02-product/knowledge-map.json](02-product/knowledge-map.json) | Runtime graph (KnowledgeStore Phase 1 backend) ([README](02-product/knowledge-map.README.md)) |
| [02-product/learning-log.md](02-product/learning-log.md) | Post-ship observations + learning outcomes |
| [02-product/assumptions.md](02-product/assumptions.md) | Assumption register — validate before `ready` |
| [02-product/acceptance-template.md](02-product/acceptance-template.md) | Goal block template |
| [02-product/acceptance/](02-product/acceptance/) | Per-goal acceptance test contracts |
| [01-vision.md](01-vision.md) | Vision & principles (optional) |

### Architecture

| Doc | Purpose |
|-----|---------|
| [03-architecture/design-spec.md](03-architecture/design-spec.md) | Framework map (Soda standard) |
| [03-architecture/knowledge-services.md](03-architecture/knowledge-services.md) | Business capabilities — skills call services, not storage |
| [03-architecture/context-compiler.md](03-architecture/context-compiler.md) | Compile knowledge → action bundle (per step, per role) |
| [03-architecture/coordination.md](03-architecture/coordination.md) | Multi-agent — shared memory, capability, playbooks |
| [03-architecture/compiler-ir.md](03-architecture/compiler-ir.md) | Bundle as IR — optimization passes |
| [04-agents/playbooks/](04-agents/playbooks/README.md) | PB-xxx — pattern → recipe selection |
| [04-agents/agent-capabilities/](04-agents/agent-capabilities/README.md) | Capability matrix per agent |
| [04-agents/bundle-profiles/](04-agents/bundle-profiles/README.md) | Compile presets (backend-api, qa) |
| [03-architecture/working-memory.md](03-architecture/working-memory.md) | Runtime state — continue without full bundle |
| [03-architecture/overview.md](03-architecture/overview.md) | System context |
| [03-architecture/folder-structure.md](03-architecture/folder-structure.md) | Code layout |
| [03-architecture/api/README.md](03-architecture/api/README.md) | API contracts |
| [03-architecture/data/README.md](03-architecture/data/README.md) | Business rules |
| [06-workflows/team-workflow.md](06-workflows/team-workflow.md) | Human + Agent cycle (Mermaid) |

### Process

| Doc | Purpose |
|-----|---------|
| [04-agents/dev-roles.md](04-agents/dev-roles.md) | Planner / implementer / tester / reviewer / shipper |
| [04-agents/org-patterns/](04-agents/org-patterns/README.md) | v5 Pattern library + [pattern-index.json](04-agents/org-patterns/pattern-index.json) |
| [04-agents/skills-library.md](04-agents/skills-library.md) | Soda standard skills (versioned) |
| [06-workflows/knowledge-governance.md](06-workflows/knowledge-governance.md) | Owner/approver matrix |
| [06-workflows/os-core-invariants.md](06-workflows/os-core-invariants.md) | **Core vs Extension** — 4 invariants, anti creep |
| [02-product/os-health.md](02-product/os-health.md) | OS Health dashboard · **`os health`** |
| [06-workflows/knowledge-loop.md](06-workflows/knowledge-loop.md) | Full loop + maturity v1–v6 |
| [06-workflows/organizational-learning.md](06-workflows/organizational-learning.md) | v5 patterns · v6 intelligence |
| [06-workflows/dev-loop.md](06-workflows/dev-loop.md) | One round workflow |
| [06-workflows/team-workflow.md](06-workflows/team-workflow.md) | Mermaid diagrams |
| [06-workflows/upgrade-agent-os.md](06-workflows/upgrade-agent-os.md) | Upgrade framework in existing repos |
| [06-workflows/github-governance.md](06-workflows/github-governance.md) | GitHub branch protection + CI setup |
| [06-workflows/goal-id.md](06-workflows/goal-id.md) | Goal ID grammar — `G-{EPIC}-{NNN}` + registry |
| [06-workflows/goal-spec-guide.md](06-workflows/goal-spec-guide.md) | Writing executable goal specs + spec stability gates |
| [06-workflows/external-tools.md](06-workflows/external-tools.md) | MCP / browser / Figma — consumer connects; OS gates when |
| [06-workflows/definition-of-done.md](06-workflows/definition-of-done.md) | Done checklist |
| [07-backlog/goals.md](07-backlog/goals.md) | Goal process + Dashboard links (no per-goal rows) |
| [07-backlog/queues/CORE.md](07-backlog/queues/CORE.md) | Per-epic active/archived rows |
| [07-backlog/epics.md](07-backlog/epics.md) | Epic namespaces for goal IDs |
| [07-backlog/goal-id-registry.yaml](07-backlog/goal-id-registry.yaml) | Reserved sequences (`soda-os goal next`) |
| [07-backlog/changelog-goals.md](07-backlog/changelog-goals.md) | Completed goals log |
| [07-backlog/changelog.md](07-backlog/changelog.md) | Agent audit trail |

### ISO 29110 (client delivery)

| Doc / path | Purpose |
|------------|---------|
| [08-iso29110/README.md](08-iso29110/README.md) | Framework templates + manifest |
| [08-iso29110/template-manifest.yaml](08-iso29110/template-manifest.yaml) | WP registry & generation order |
| [08-iso29110/templates/](08-iso29110/templates/) | `*.template.md` work-product templates |
| [../work-products/](../work-products/README.md) | Generated WP output + `_meta` |
| [../.agents/skills/soda-iso29110/SKILL.md](../.agents/skills/soda-iso29110/SKILL.md) | `iso scan` / `iso generate` / `iso validate` |

### Decisions

| Doc | Purpose |
|-----|---------|
| [05-decisions/0000-template.md](05-decisions/0000-template.md) | ADR template (architecture) |
| [05-decisions/pdr-0000-template.md](05-decisions/pdr-0000-template.md) | PDR template (product / scope) |
| [05-decisions/README.md](05-decisions/README.md) | ADR vs PDR |
| [05-decisions/0001-example-postgresql.md](05-decisions/0001-example-postgresql.md) | ADR format example (replace on bootstrap) |

### Agent layers (repo root)

| Path | Purpose |
|------|---------|
| [../AGENTS.md](../AGENTS.md) | Agent entry |
| [../.github/](../.github/) | PR template, CI workflows, ci-config |
| [../.agents/rules/](../.agents/rules/) | Always-on rules (core, governance, security) |
| [../.agents/skills/soda-*/](../.agents/skills/) | Standard skills |
