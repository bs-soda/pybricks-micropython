# Traceability Record (WP21) — template guide

**Canonical template:** `Traceability-Record.template.md`

**Legacy Excel reference:** `WorkFlow/SW21_Traceability_Record.xlsx` (tab **RTM**).

## RTM columns

| Column | Links to |
| ------ | -------- |
| Agreement ID | F-xx features |
| Requirement ID | WP13 REQ-xxx |
| Software Design ID / components | WP16 / WP15 |
| Unit test ID / result | Dev unit tests |
| Functional TC ID | WP19 test cases |

## Agent notes

- Single RTM table in markdown.
- Requires WP13 and WP19 (draft OK).
- Regenerate shell: `node scripts/extract-sheet-templates-md.js`
