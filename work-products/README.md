# work-products/

Formal ISO/IEC 29110 work products for **client delivery**.

| Path | Role |
|------|------|
| `_meta/` | Context, F/REQ registers, per-WP status |
| `01_Management/` … `09_Deliverables/` | Generated WP `.md` files (skill creates these) |

**SSOT for the team** remains under `docs/` (brief, goals, acceptance).  
**Templates** (framework-owned): [`docs/08-iso29110/`](../docs/08-iso29110/README.md)

## Commands

See [soda-iso29110](../.agents/skills/soda-iso29110/SKILL.md):

```text
iso scan
iso generate wave-a
iso validate
iso status
```

Upgrade never overwrites filled `_meta` (create_if_missing) or generated WP bodies (not in framework template).

**Full package:** all **23** work products — filenames `WP{nn}-{Name}.md` (e.g. `WP02-Agreement.md`).  
See `.agents/skills/soda-iso29110/wp-catalog.md`.
