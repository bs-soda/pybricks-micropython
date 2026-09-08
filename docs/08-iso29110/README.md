# ISO/IEC 29110 — templates (Soda OS)

Framework-owned templates for **all 23** SoftWare Basic Profile work products.  
Shipped with **soda-os**; landed by `soda-os init` / `upgrade`.

| Path | Purpose |
|------|---------|
| [template-manifest.yaml](template-manifest.yaml) | WP registry, waves, `output_type`, generation order |
| [templates/](templates/) | `*.template.md` (docs, link registers, WP14 register, WP20 derived) |

**Output:** [`work-products/`](../../work-products/README.md)  
**Skill:** [soda-iso29110](../../.agents/skills/soda-iso29110/SKILL.md) (v1.0 — full 23)

## Output types

| Type | Meaning | Examples |
|------|---------|----------|
| `doc` | Full Markdown WP | WP02, WP10, WP13, … |
| `link` | Thin pointer register | WP03/04 ClickUp; WP11/15 GitHub; WP12 backup IP |
| `register` | Artifact checklist | WP14 Software |
| `derived` | Built from another WP | WP20 summary + graph ← WP19 |

## Resolve a template

```text
docs/08-iso29110/templates/{folder}/{template_file}
→ work-products/{folder}/WP{nn}-{Basename}.md
```

## Commands

```text
iso scan
iso generate wave-a | wave-b | wave-c | wave-d | all
iso generate WP03   # etc.
iso validate all
iso status
```
