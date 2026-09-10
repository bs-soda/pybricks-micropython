# Bundle profiles — reusable compile presets

> Compiler applies a **profile** to select imports, recipes, and exclusions.
> Recipes: [execution-recipes/](../execution-recipes/README.md)

---

## Profiles

| Profile | Role | Imports | Exclude |
|---------|------|---------|---------|
| **backend-api** | developer / backend | REST recipe, API checklist, security checklist | UI, UX, design files |
| **qa** | qa | Acceptance, regression recipe | implementation unless testing |
| **product** | product | Pains, PDR, metrics | code/, migrations |
| **designer** | designer / frontend | UX flow, design tokens, UI spec, components ([soda-design](../../../.agents/skills/soda-design/SKILL.md)) | backend code, API/data, migrations |

Declare in goal Context manifest: `profile: backend-api`

---

## Example: backend-api

See [backend-api.yaml](backend-api.yaml)

Compiler merges profile `imports` with step `recipe` and goal manifest.

---

## Example: qa

See [qa.yaml](qa.yaml)

---

## Example: designer

See [designer.yaml](designer.yaml) · recipe [REC-005](../execution-recipes/REC-005-ui-component.yaml) · skill [soda-design](../../../.agents/skills/soda-design/SKILL.md)
