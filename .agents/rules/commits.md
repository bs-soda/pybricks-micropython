---
description: PR-First commits — feature branch isolation, zero local merge, and PR generation
alwaysApply: true
---

# Commits & Branch Isolation (PR-First Governance)

- **Branch Isolation:** Each goal operates exclusively on its dedicated working branch (`feature/G-xxx`, `feature/G-PAY-001`, `fix/G-xxx`, `hotfix/G-xxx`, etc.).
  - Epic Features: branch from `epic/<EPIC>` or `feature/<EPIC>` (`git checkout -b feature/G-PAY-001`).
  - Standard Features/Fixes: branch from `develop` (`git checkout -b feature/G-xxx` or `git checkout -b fix/G-xxx`).
  - Production Hotfixes: branch from `main` (`git checkout -b hotfix/G-xxx`).
- **Zero Local Integration Merging:** The agent will **NEVER** switch to `develop`, `main`, or `epic/<EPIC>` to run `git merge` locally. Integration happens exclusively in the cloud on GitHub via Pull Requests reviewed and merged by humans.
- **Commit on Working Branch:** One goal (`G-PAY-001` or legacy `G-001`) per commit when possible. Message format: `G-PAY-001: imperative description` (e.g. `G-PAY-001: implement enterprise payment auth service`, legacy `G-004: add user auth service`).
- **Single Branch Push:** All code changes, unit & integration tests, acceptance contracts (`docs/02-product/acceptance/G-xxx.md`), backlog transitions (`goals/_archived/G-xxx.md`), ClickUp sync metadata, and ISO audit logs / LLM Wiki notes (`docs/06_raw/`) MUST be committed and pushed directly to `origin/<working-branch>`.
- **Pull Request Generation:** On `ship G-xxx` (or `open PR G-xxx` / `soda-os pr G-xxx`), the agent creates the Pull Request targeting the defined target branch (`epic/<EPIC>` or `feature/<EPIC>` for epics, `develop` for features/fixes, `main` for hotfixes), filling `.github/pull_request_template.md` with zero placeholder leaks, and outputs the direct GitHub PR link and structured review checklist for human review and merge.
- Do not commit unless the user asked, or when completing goal closure and shipping, or hooks require it after a successful run.
- Do not combine multiple goals or unrelated file changes.

