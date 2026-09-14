---
description: Core standards for all work in this project
alwaysApply: true
---

# Core

- Read `AGENTS.md`, [governance.md](governance.md), [goal-execution.md](goal-execution.md), and the active goal file `docs/07-backlog/goals/G-PAY-001.md` (legacy `G-001.md`; index: `docs/07-backlog/goals.md`) before coding. IDs: [goal-id.md](../../docs/06-workflows/goal-id.md).
- Respect `project-brief.md` (In / Out Scope) — do not build out-of-scope features without a new goal.
- **Only execute `ready` goals** — see goal status flow in [governance.md](governance.md).
- **Spec stability** — [goal-spec-guide.md](../../docs/06-workflows/goal-spec-guide.md): no guess (`clarify`); Intent ≠ How; **`analyze G-xxx`** before first execute.
- Smallest correct diff; no drive-by refactors; stay within goal **Touch map**.
- Follow [security.md](security.md) — no secrets in repo; no prod commands without human approval.
- External tools / MCP: [external-tools.md](../../docs/06-workflows/external-tools.md) — consumer connects; OS only gates when.
- Follow [artifact-conservation.md](artifact-conservation.md) — discussion ≠ implementation; no new artifacts without explicit command.
- Follow [platform-consumer.md](platform-consumer.md) — platform stays generic; no consumer product names in this repo.
