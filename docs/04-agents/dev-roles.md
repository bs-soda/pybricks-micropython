# Dev agent roles (Cursor)

How humans and Cursor agents collaborate using the Soda goal-driven framework.

Framework: [design-spec.md](../03-architecture/design-spec.md) · Skills: [skills-library.md](skills-library.md)

## Planner

**When:** New project, new feature area, unclear scope, change intake, or backlog empty.

**Reads:** [../01-vision.md](../01-vision.md), [../02-product/project-brief.md](../02-product/project-brief.md), [../02-product/knowledge-digest.md](../02-product/knowledge-digest.md), [../02-product/assumptions.md](../02-product/assumptions.md), architecture overview.

**Does:**

- Run discovery interview via [soda-discovery](../../.agents/skills/soda-discovery/SKILL.md) — distill knowledge, manage assumptions, write PDRs
- Break work into goals using [../02-product/acceptance-template.md](../02-product/acceptance-template.md)
- Order dependencies in [../07-backlog/goals.md](../07-backlog/goals.md)
- Flag open technical decisions for ADR; product scope cuts for PDR in [../05-decisions/](../05-decisions/)

**Does not:** Write production code without a goal; store raw meeting transcripts in docs.

**Handoff:** Brief locked; critical assumptions validated or tracked; goal `ready` with acceptance criteria and test plan.

---

## Implementer

**When:** Goal status is `ready` or `in_progress`.

**Reads:** Active goal + linked architecture docs + matching **soda-** skill.

**Does:** Implement **In** scope only; small diffs; update `api/` or `data/` docs when applicable.

**Does not:** Expand project scope; combine goals in one commit.

**Skills:** [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md), [soda-rest-api](../../.agents/skills/soda-rest-api/SKILL.md), [soda-db-migration](../../.agents/skills/soda-db-migration/SKILL.md)

---

## Tester

**When:** Implementer declares code complete for a goal.

**Does:** Follow [soda-testing](../../.agents/skills/soda-testing/SKILL.md) and [definition-of-done.md](../06-workflows/definition-of-done.md).

---

## Reviewer

**When:** Before marking goal `done` or merging.

**Does:** Run [soda-code-review](../../.agents/skills/soda-code-review/SKILL.md); verify one goal ↔ one commit; touch map respected.

**Handoff:** Human approval before commit / close.

---

## Shipper

**When:** Goal **In** scope includes staging deploy or SHIP phase.

**Reads:** Deploy notes in goal; [soda-deploy-staging](../../.agents/skills/soda-deploy-staging/SKILL.md).

**Does:** Approve staging deploy; run smoke tests; confirm rollback path.

**Does not:** Production deploy without explicit goal + human confirmation.

---

## Incident lead (human)

**When:** Production or staging incident.

**Agent support:** [soda-incident-response](../../.agents/skills/soda-incident-response/SKILL.md) — triage, evidence, postmortem draft.

Human owns communication, production actions, and final decisions.

---

## Cursor setup

| Role | Mechanism |
|------|-----------|
| All | `AGENTS.md` + `.agents/rules/` |
| Workflow | `soda-goal-workflow` |
| Task-specific | Other `soda-*` skills via `guidelines.md` |
| Team diagrams | [team-workflow.md](../06-workflows/team-workflow.md) |

Add stack rules (`.agents/rules/{stack}.md`) and `{project}-*` skills at bootstrap when needed.

## Related

- [../../AGENTS.md](../../AGENTS.md)
- [../06-workflows/dev-loop.md](../06-workflows/dev-loop.md)
- [skills-library.md](skills-library.md)
