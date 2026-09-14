---
description: Laravel stack conventions — rename to {stack}.md at bootstrap and set alwaysApply
alwaysApply: false
---

# Laravel (example — enable at bootstrap)

Copy to `.agents/rules/laravel.md` (or your stack name) and set `alwaysApply: true`.

- **Controllers:** thin — delegate to services/actions
- **Validation:** Form Request or equivalent — mandatory for HTTP input
- **Business logic:** service layer or domain classes — not in controllers
- **Database:** migrations via [soda-db-migration](../skills/soda-db-migration/SKILL.md); no raw destructive SQL in app code
- **Tests:** feature tests for HTTP endpoints; unit tests for non-trivial domain logic
- **Auth:** policies/gates per ADR — do not change guard without goal + human approval
