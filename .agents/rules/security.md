---
description: Secrets, environment, and production command guardrails
alwaysApply: true
---

# Security & environment

## Never expose or commit

- `.env`, `.env.*`, `credentials.json`, `*.pem`, `*.key`, service account files
- API tokens, passwords, connection strings, private keys
- Production URLs with embedded credentials
- Do not pass tokens, passwords, or production URLs into MCP / external-tool arguments

If secrets appear in diff → **stop**, warn human, do not commit.

## Never execute (unless human explicitly instructs for a named environment)

- Production deploy commands
- Production database migrations or destructive SQL
- `kubectl apply` / terraform apply against production
- Secret rotation or IAM policy changes in prod

## Safe defaults

- Use `.env.example` patterns — never fill real values in tracked files
- Prefer staging/local commands from goal **Test plan** and `AGENTS.md`
- Redact secrets in logs, reports, and audit entries

## Auth / security boundary changes

Require human approval **and** a goal that lists auth/security in **Touch map**. Update ADR or link existing decision.
