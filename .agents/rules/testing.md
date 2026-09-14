---
description: Tests required before goal is done
alwaysApply: true
---

# Testing

Before marking a goal done, run the commands listed in:

- The active goal **Test plan**
- `AGENTS.md` **Standard commands**
- [docs/06-workflows/definition-of-done.md](docs/06-workflows/definition-of-done.md)

- Add tests for non-trivial logic per goal test plan.
- Do not mark goal complete if analyzer or tests fail.
- Avoid trivial tests that only assert constants; test behavior.
- Browser / MCP E2E only when the goal **Test plan** names the tool — [external-tools.md](../../docs/06-workflows/external-tools.md).
