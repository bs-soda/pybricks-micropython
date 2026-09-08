# GitHub governance — hard guards

> **For humans.** Soft guards live in `.agents/rules/governance.md`. This doc wires **GitHub** to enforce them.

## What ships in Agent OS

| Asset | Purpose |
|-------|---------|
| [.github/workflows/governance.yml](../../.github/workflows/governance.yml) | PR goal reference, commit format, secret path scan |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | App test/lint from `ci-config.yml` |
| [.github/pull_request_template.md](../../.github/pull_request_template.md) | Human + agent PR checklist |
| [scripts/ci/governance-check.sh](../../scripts/ci/governance-check.sh) | Runnable locally |
| [scripts/ci/app-ci.sh](../../scripts/ci/app-ci.sh) | App CI runner |
| [goal-id.md](goal-id.md) | Epic-namespaced IDs (`G-PAY-001`) + legacy `G-001` |
| [.github/ci-config.example.yml](../../.github/ci-config.example.yml) | Stack commands (copy at G-001) |

## Setup after bootstrap

### 1. App CI (G-001)

```bash
cp .github/ci-config.example.yml .github/ci-config.yml
# Edit test: and lint: for your stack
```

Align commands with `AGENTS.md` **Standard commands**.

### 2. PR-First Branch Topology & Protection Rules

Soda OS enforces strict **Branch Isolation** and **PR-First** governance:
- **Feature Branches (`feature/G-xxx` or `feature/G-PAY-001`):** Every goal operates in complete isolation on its feature branch.
- **Epic Branches (`epic/<EPIC>` or `feature/<EPIC>`):** Intermediate integration base branch for multi-goal epics (e.g. `epic/PAY`).
- **Integration Branch (`develop`):** Default base branch for general feature PRs and merged epic releases.
- **Production Release Branch (`main`):** Protected release branch promoted only from `develop` by humans.

**Settings → Branches → Add branch protection rule** for `develop`, `epic/*`, and `main`:

| Setting | `epic/*` (Epic Base) | `develop` (Integration) | `main` (Production) |
|---------|----------------------|-------------------------|---------------------|
| Require pull request before merging | ✅ | ✅ | ✅ |
| Require approvals | ✅ (≥ 1) | ✅ (≥ 1) | ✅ (≥ 2) |
| Require status checks to pass | ✅ | ✅ | ✅ |
| Required checks | `Governance / Goal & secret guardrails`, `CI / Test & lint` | `Governance / Guardrails`, `CI / Test & lint` | `Governance / Guardrails`, `CI / Full Test Matrix` |
| Do not allow bypassing | ✅ | ✅ | ✅ |
| Restrict who can push | ✅ (humans only — no bots/agents) | ✅ (humans only — no bots/agents) | ✅ (admins/leads only) |

**Invariant:** Agents create PRs on `feature/G-xxx` targeting `epic/<EPIC>` or `develop`; **humans review and merge**. Local merging by AI agents is strictly prohibited.

## CI rules

### Pull requests

1. **Title or body** must contain a goal ID (`G-PAY-001` or legacy `G-003`)
2. **Body must be filled** — not the raw template (CI rejects `G-___`, HTML comments `<!--`, empty Summary / Test plan)
3. **Commit messages** must match `G-PAY-001: imperative description` (legacy `G-003: …`)
4. **Goal files** must be named exactly as the ID; H1 must match; namespaced epics must exist in `goal-id-registry.yaml`; duplicate IDs fail
5. **No forbidden paths** in diff (`.env`, `*.pem`, `credentials.json`, …)

**Bypass:** Process-only PRs (Agent OS / governance docs) — add `[governance]` to the PR title.

### Push to main

- Secret path scan on changed files
- Commit message format on commits in push range

## Run locally & Generate PR

```bash
# Generate PR payload and create Pull Request on GitHub
soda-os pr G-003

# Simulate PR checks locally
PR_TITLE="G-003: add health endpoint" PR_BODY="Closes G-003" \
  GITHUB_EVENT_NAME=pull_request GITHUB_BASE_REF=develop \
  bash scripts/ci/governance-check.sh

bash scripts/ci/app-ci.sh
```

## Operating mode: Incident

During incidents, human may authorize emergency merge under **Operating mode: Incident**. Prefer:

1. Human merges with explicit approval
2. Log in [changelog.md](../07-backlog/changelog.md)
3. Follow [soda-incident-response](../../.agents/skills/soda-incident-response/SKILL.md)

Do not disable branch protection permanently for convenience.

## Related

- [upgrade-agent-os.md](upgrade-agent-os.md) — sync framework into existing repos
- [governance.md](../../.agents/rules/governance.md)
- [team-workflow.md](team-workflow.md)
- [definition-of-done.md](definition-of-done.md)
