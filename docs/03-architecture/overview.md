# Architecture overview

> Replace with your stack and diagram when the project starts.

## System context

```text
┌─────────────────────────────────────┐
│           Client / App              │
│  presentation → application →       │
│  domain ← data                      │
└─────────────────┬───────────────────┘
                  │ when online (optional)
                  ▼
            {Backend / BaaS / API}
```

## Layers

| Layer | Responsibility |
|-------|------------------|
| **Presentation** | UI, routing, user input |
| **Application** | Use cases, orchestration |
| **Domain** | Business rules, entities — no framework imports |
| **Data** | APIs, DB, local storage |

## Key choices (fill in)

| Area | Choice |
|------|--------|
| UI | {…} |
| State | {…} |
| Persistence | {…} |
| Backend | {…} |

## Related

- [folder-structure.md](folder-structure.md)
- [../02-product/project-brief.md](../02-product/project-brief.md)
