---
description: Soda coding standards and skill routing
alwaysApply: true
---

# Guidelines

- Follow [docs/03-architecture/design-spec.md](../../docs/03-architecture/design-spec.md) for Human + Agent framework.
- Product discovery → `soda-discovery`; learning → `soda-learning-loop`; follow [knowledge-governance.md](../../docs/06-workflows/knowledge-governance.md).
- Autonomous Socratic Discovery Loops (Product Scope -> IA Tree -> Atomic UI Hierarchy) → `soda-agentic-discovery` skill + `.agents/rules/agentic-discovery-loops.md`. Execute 3 progressive loops (Q1-Q6) for deep architectural and UI alignment before goal authoring.
- Tests → `soda-testing` skill + goal test plan. Browser/E2E MCP only if the Test plan names it — [external-tools.md](../../docs/06-workflows/external-tools.md).
- UI/UX goals (**`Kind: design`** / **`Profile: designer`** / screen, flow, component) → auto-run `soda-design` in PLAN: produce UX flow + UI spec, human-approve before build; see [design-loop.md](../../docs/06-workflows/design-loop.md). Design-file MCP (Figma, …) is **consumer-optional** and read-only unless **In** says otherwise.
- API work → read `soda-rest-api` skill; update `docs/03-architecture/api/`.
- Before closing a goal → `soda-code-review` checklist.
- Deploy / staging goals → `soda-deploy-staging` skill.
- Upgrade OS in existing projects → `soda-upgrade-os` skill (Phase 2 after `soda-os upgrade`).
- **"ทำ G-xxx"** → TodoWrite only ([goal-execution.md](goal-execution.md)); **"เริ่ม step N"** → execute.
- **`clarify G-xxx`** / **`spec check G-xxx`** / **`analyze G-xxx`** → [soda-goal-workflow](../skills/soda-goal-workflow/SKILL.md) §0.5 — no `code/`.
- Goal status transitions → execute ClickUp sync (`soda-os sync-clickup G-xxx --status-only`) on every state change (`ready`, `in_progress`, `review`, `approved`, `done`, `blocked`) per [governance.md](governance.md) and [goal-execution.md](goal-execution.md).
- **PR-First Workflow (`DEFINE → PLAN → EXECUTE → REVIEW → SHIP`):** Work exclusively on `feature/G-xxx`; commit & push directly to `origin/feature/G-xxx`; never switch to `develop` or `main`; never merge locally; generate GitHub PR on `ship G-xxx` (`soda-os pr G-xxx`) for human review and merge into `develop`.
- Schema changes → `soda-db-migration` skill + `docs/03-architecture/data/`.
- Third-party API integrations (TikTok, Meta, LINE, Stripe, AWS, OpenAI, etc.) → `soda-thirdparty-api-resilience` skill + `.agents/rules/third-party-api-resilience.md`. Enforce Outbound TokenBucket Governors, Ephemeral Caching with Single-Flight locks, Outbox Workers with Preemptive Schedulers, Circuit Breakers, and RFC 6585 HTTP 429 translation.
- Incidents → `soda-incident-response` skill; human owns comms and production actions.
- Stack-specific rules: copy `.agents/rules/stack-*.example.md` → `{stack}.md` at bootstrap.
- Governance: [governance.md](governance.md) · Commits: [commits.md](commits.md) · Security: [security.md](security.md)

Full skill catalog: [docs/04-agents/skills-library.md](../../docs/04-agents/skills-library.md).
