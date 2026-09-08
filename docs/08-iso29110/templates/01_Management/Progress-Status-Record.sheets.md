# Progress Status Record (WP09) — template guide

**Canonical template:** `Progress-Status-Record.template.md` (single-page markdown)

**Legacy Excel reference:** `WorkFlow/SW9_Progress_Status_Record.xlsx` (tabs Summary, PHASE 1–7, Data) — structure was merged into one scheduler table.

## Sections in the `.md` template

| Section | Purpose |
| ------- | ------- |
| **Phase overview** | One row per phase — name, schedule window, focus |
| **Project scheduler** | All tasks: Phase, Task ID, name, dependencies, owner, status, days, start, end |
| **Phase status summary** | Rollup counts per phase |

## Agent / generate notes

- Keep **one table** for all tasks — do not split by phase into separate files.
- Align dates and phases with **WP10 Project Plan**.
- Regenerate structure from Excel: `node scripts/extract-sw9-scheduler.js`
