---
name: soda-testing
version: "1.1.0"
description: >-
  Soda testing procedure for unit and integration tests, plus goal-scoped E2E
  (including consumer browser MCP) when the Test plan names it. Use when adding
  tests, fixing test failures, or when a goal test plan requires new coverage.
---

# Testing procedure

## When to test

- Every goal before marking `done`
- After any fix for failing CI or local tests
- When logic is non-trivial (not for trivial constants or config-only changes)

## Commands

Run from repo root using commands in `AGENTS.md` **Standard commands** and the goal **Test plan**.

Typical pattern:

```bash
cd code && {test command}
cd code && {lint/analyze command}
```

Fill stack-specific commands at project bootstrap.

## What to test

| Layer | Focus | Web Tooling (React) | Mobile / Native Tooling (Flutter) |
|-------|-------|--------------------|-----------------------------------|
| **Unit** | Business logic, validators, state reducers | Vitest / Jest | Flutter Test / Mockito |
| **Component** | 5-State isolated visual & interaction tests | Storybook + `@testing-library` | Widgetbook + Widget Golden Tests |
| **Integration** | API clients, DB repos, state orchestration | Supertest / MSW | Integration Test |
| **E2E & Native** | Full user journeys & native OS permissions | **Playwright** (Chromium/WebKit/FF) | **Patrol** (iOS / Android / Huawei HMS) |

### 1. Web App E2E & Visual Regression (Playwright)
- **Visual Regression:** Run `npx playwright test` against Storybook canvas to catch unapproved visual diffs.
- **Cross-Browser:** Automated CI validation across Chromium, Safari (WebKit), and Firefox.
- **Accessibility:** Mandatory `@axe-core/playwright` automated scan for WCAG 2.1 AA violations.

### 2. Mobile App Native Automation (Patrol)
- **Native OS Interactions:** Run `patrol test` to automate native permission prompts (Camera, Biometrics, Push Notifications).
- **Multi-Platform Native Matrix:** Test execution verified on iOS Simulators, Android Emulators, and Huawei Device Cloud / HarmonyOS.
- **Biometric & Webview Flow:** Verify Face ID / Fingerprint fallback and in-app browser auth flows natively.

### 3. External / browser MCP (consumer)

If the Test plan says to use a **browser MCP** (or similar) in the consumer repo:

1. Same gates as [governance.md](../../rules/governance.md) § External tools — goal in progress, **`เริ่ม step N`**, named tool, staging/local, no secrets.
2. Follow the Test plan allowlist (navigate / snapshot / click). Do not invent extra journeys.
3. MCP does **not** replace unit/integration commands in `AGENTS.md` unless the Test plan says this goal is E2E-only.
4. Write results into the goal / changelog — not a new OS doc.

How to connect the server: [external-tools.md](../../../docs/06-workflows/external-tools.md). The OS never ships Chrome or Playwright MCP.

**Test behavior, not implementation details.** Avoid tests that only assert constants.

## Adding tests

1. Place tests per [folder-structure.md](../../../docs/03-architecture/folder-structure.md) under `code/`
2. Name tests after behavior: `returns_404_when_user_not_found`
3. Cover happy path + primary failure modes from acceptance criteria
4. No flaky timing; mock external services

## Failure loop

```text
Run tests → fail → fix smallest cause → re-run full test plan → pass
```

Do not mark goal `done` while any test or analyzer command fails.

## Related

- [external-tools.md](../../../docs/06-workflows/external-tools.md) — consumer browser MCP
- [testing.md](../../rules/testing.md)
- [definition-of-done.md](../../../docs/06-workflows/definition-of-done.md)
- [soda-rest-api](../soda-rest-api/SKILL.md) — API test minimums
