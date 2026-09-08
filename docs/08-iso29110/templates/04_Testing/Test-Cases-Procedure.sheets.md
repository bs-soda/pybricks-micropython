# Test Cases and Test Procedure (WP19) — template guide

**Canonical template:** `Test-Cases-Procedure.template.md`

**Legacy Excel reference:** `WorkFlow/SW19_Test_cases.xlsx` (tabs Summary, V1.1 QA, V2.0, V3.0, V4.0) — merged into one register with a **Release** column.

## Columns

| Column | Purpose |
| ------ | ------- |
| Release | Test round (e.g. V1.1 QA, V2.0, V4.0, or `{{release_version}}`) |
| REQ ID | Link to WP13 |
| Test Case ID | e.g. `TC_FEATURE_001` |
| Feature / Title / Expected / Steps | Test definition |
| Priority / Status / Fixing status / Tester | Execution tracking |

## Agent notes

- One markdown table for all releases.
- Regenerate shell: `node scripts/extract-sheet-templates-md.js`
