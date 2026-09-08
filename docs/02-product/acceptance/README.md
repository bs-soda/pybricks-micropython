# Acceptance test contracts

One file per goal: `G-PAY-001.md` (legacy `G-001.md`). Filename equals the goal ID. Gives agents **testable** expected behavior — not vibes.

## When to create

- When promoting a goal from `draft` → `ready`
- Required for user-facing or API goals; optional for pure infra bootstrap

## Template

Copy [_template.md](_template.md) → `G-PAY-001.md` and fill every section.

## Link from goal

In `docs/07-backlog/goals.md` **Notes for AI**:

```markdown
- Acceptance contract: [_template.md](_template.md) *(copy to `G-xxx.md` when `ready`)*
```

## Related

- [../acceptance-template.md](../acceptance-template.md) — goal block in goals.md
- [../../06-workflows/definition-of-done.md](../../06-workflows/definition-of-done.md)
