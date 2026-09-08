# Folder structure

> Adapt stack folders inside `code/`. Keep `docs/`, `.agents/`, and agent entry files at **repo root**.

Framework map: [design-spec.md](design-spec.md)

## Layout

```text
{repo}/
├── AGENTS.md                 ← AI entry point
├── README.md
├── .agents/
│   ├── rules/                ← always-on (incl. guidelines.md)
│   └── skills/soda-*/     ← Soda standard skills (10)
├── docs/
│   ├── 00-index.md … 07-backlog/
│   ├── 03-architecture/
│   │   ├── api/              ← API contracts (per goal)
│   │   └── data/             ← business rules (per goal)
│   └── assets/               ← diagrams, references
├── .github/
│   ├── workflows/            ← governance.yml + ci.yml (shipped)
│   ├── pull_request_template.md
│   ├── ci-config.example.yml ← copy at G-001
│   └── ci-config.yml         ← gitignore optional; fill at bootstrap
├── docker/
├── scripts/
└── code/                     ← application source
    ├── {stack root files}
    ├── src/ or lib/
    └── test/
```

## What lives where

| Location | Contents |
|----------|----------|
| **Repo root** | Agent docs, Soda skills & rules, infra, scripts |
| **`code/`** | Product code, app config, app tests |
| **`docs/`** | Specs, goals, API/data contracts — not shipped with app |
| **`docs/03-architecture/api/`** | HTTP/RPC contract docs |
| **`docs/03-architecture/data/`** | Domain rules and invariants |

## Rules

- Open the **repo root** in Cursor (not `code/` alone) so agents see `AGENTS.md` and `docs/`.
- Document build/test commands in `AGENTS.md` with paths (e.g. `cd code && npm test`).
- Update `api/` when changing endpoints; update `data/` when changing domain rules.
- Domain/business logic must not depend on UI frameworks.
- Feature code stays in feature folders; shared code in `core/` or `shared/` under `code/`.
- Document breaking layout changes in an ADR.

## Related

- [overview.md](overview.md)
- [api/README.md](api/README.md)
- [data/README.md](data/README.md)
