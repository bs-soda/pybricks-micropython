---
name: soda-iso29110
version: "1.0.0"
description: >-
  Generate all 23 ISO/IEC 29110 SoftWare Basic Profile work products for client
  delivery from soda-os SSOT. Templates under docs/08-iso29110/. Types: doc,
  link (ClickUp/GitHub/IP), register (WP14), derived (WP20 from WP19).
  Triggers: iso scan, iso generate WP01-WP23|wave-a|wave-b|wave-c|wave-d|all,
  iso validate, iso status. Output under work-products/. Human approves baselines.
---

# ISO/IEC 29110 — all 23 work products (client delivery)

**Model:** soda-os SSOT → `_meta` → fill templates → `work-products/` → validate → human approve

| Resource | Path |
|----------|------|
| Manifest + templates | [`docs/08-iso29110/`](../../../docs/08-iso29110/README.md) |
| Wave A detail map | [wave-a-mapping.md](wave-a-mapping.md) |
| Full catalog | [wp-catalog.md](wp-catalog.md) |
| Output | [`work-products/`](../../../work-products/README.md) |

## First principles

| Principle | Meaning |
|-----------|---------|
| **All 23 are in scope** | Every WP has a template and a generate path (doc, link, register, or derived) |
| **Not every WP is a long doc** | WP03/04 = ClickUp; WP11/15 = GitHub; WP12 = backup IP/path; WP14 = artifact register; WP20 = graph/summary from WP19 |
| **ID chain** | WP02 F-xx → WP13 REQ-xxx → WP19 TC-xxx → WP21 RTM; WP20 tallies WP19 |
| **Order** | Follow `generation_order` in the manifest (and `depends_on`) |
| **No invented commercial / URL facts** | Ask or `TODO` for ClickUp URLs, IPs, budgets, signatures |
| **Human gates** | Agent → `draft`; human → `in_review` / `approved` / `baseline` |

## Output types

| Type | WPs | How to generate |
|------|-----|-----------------|
| **doc** | WP01,02,05–10,13,16–19,21–23 | Fill `.template.md` from SSOT + context |
| **link** | WP03,04,11,12,15 | Fill thin register from `_meta` URL/IP fields |
| **register** | WP14 | Artifact table (repo/build/release) |
| **derived** | WP20 | Read WP19 rows → summary counts + Mermaid pie; same evidence set |

## Resolve paths

```text
manifest = docs/08-iso29110/template-manifest.yaml
input    = docs/08-iso29110/templates/{folder}/{template_file}
output   = work-products/{folder}/WP{nn}-{Basename}.md
# Example: Agreement.template.md → WP02-Agreement.md
```

## Commands

| Trigger | Action |
|---------|--------|
| `iso scan` | Update `project-context.yaml` + `links-register.yaml`; list HUMAN gaps |
| `iso generate WPnn` | One WP if deps satisfied |
| `iso generate wave-a` | WP02, WP10, WP13 |
| `iso generate wave-b` | WP09,16,15,05,11,19,21,23,14,20 |
| `iso generate wave-c` | WP08,18,06,12,17 |
| `iso generate wave-d` | WP22, WP01 |
| `iso generate event` | Prompt which: WP03 / WP07 / WP04 (need meeting notes or URLs) |
| `iso generate all` | Full `generation_order` then remind event WPs |
| `iso validate` / `iso validate all` | All present WPs + link fields + ID chain |
| `iso status` | Status table |
| `iso refresh WP13` \| `WP19` \| `WP20` | Regen from SSOT / WP19; keep sign-off unless force |

## Lifecycle

### 1 — `iso scan`

Read brief, snapshot, overview, git remote, design docs.  
Write `_meta/project-context.yaml` and sync `_meta/links-register.yaml`.  
Report empty **link** fields: ClickUp CR/defect, `repository_url`, components URL, `backup_server`/`backup_path`.

### 2 — Generate by type

**doc:** Load template → replace `{{placeholders}}` → fill sections per [wp-catalog.md](wp-catalog.md) / [wave-a-mapping.md](wave-a-mapping.md) → write output → status `draft`.

**link:** Require `link_field` (or documented fallback) non-empty or mark `TODO` visibly → write thin register → update `links-register.yaml`.

**register (WP14):** Fill artifact table from context release/repo URLs.

**derived (WP20):** Parse WP19 Status column → fill summary + Mermaid pie counts → list open fails → link WP04 for defects.

### 3 — Waves (recommended)

```text
wave-a  → sellable core (Agreement, Plan, Requirements)
wave-b  → design, repo links, test, verify, software register, test report
wave-c  → ops docs, backup link, Software Product (23-row register)
wave-d  → validation + acceptance (human-heavy)
event   → CR / meeting / corrections when they happen
```

### 4 — `iso validate` (full package)

Fail if any apply:

| Check | Rule |
|-------|------|
| Count | All 23 have an output file **or** explicit waived event WP with status note |
| Placeholders | No stray `{{…}}` / unreplaced `[bracket prompts]` in committed drafts |
| WP02 | No `REQ-` in Agreement |
| Chain | WP13 F set = WP02 F set; each F ≥1 REQ; WP19 covers REQs; WP21 links REQ↔TC |
| Links | WP03/04/11/12/15 have URL/IP filled or labeled TODO |
| WP20 | Summary exists and references WP19; graph counts match tallies when numbers present |
| WP17 | Table lists all 23 with pointers |

Event WPs (WP03/07/04): if never occurred, status may stay `missing` with note `not_applicable_yet` — still document in WP17 as “n/a / tool URL pending”. For **client delivery package complete**, prefer generating link registers with URLs even before first CR.

### 5 — Human approve

Signatures and `approved`/`baseline` = human only (especially WP02, WP01).

## SSOT cheat sheet (beyond Wave A)

| WP | Primary soda-os / meta sources |
|----|--------------------------------|
| WP05 | overview, stack rules, deploy docs |
| WP06 | ops notes, backup fields, WP05 |
| WP07 | meeting agenda/notes from human (event) |
| WP08 | overview + WP16 |
| WP09 | goals queue + schedule_link / WP10 phases |
| WP11 | `repository_url` / git remote |
| WP12 | `backup_server`, `backup_path` |
| WP14 | release_* + repo + store URLs |
| WP15 | `components_repository_url` or monorepo paths |
| WP16 | `docs/03-architecture/`, soda-design outputs, ADRs |
| WP17 | all WP outputs + context |
| WP18 | brief journeys + F-xx (+ design if UI) |
| WP19 | WP13 REQ + acceptance contracts |
| WP20 | **WP19 only** (derived) |
| WP21 | WP13 + WP19 (+ design refs) |
| WP22 | UAT evidence / human + WP13/19/20 |
| WP23 | verification checklist vs WP13/16/19/21 |
| WP01 | human acceptance of delivery |
| WP03/04 | ClickUp URLs from context |

## Governance

| Agent may | Agent must not |
|-----------|----------------|
| Create/update all `work-products/**` drafts | Overwrite living `docs/02-product/**` |
| Fill link registers from known remotes/URLs | Invent ClickUp/IP/budget/signatures |
| Derive WP20 from WP19 | Maintain a second disconnected TC list in WP20 |
| `iso validate` | Self-approve `baseline` |

## Definition of done — full 23 draft package

- [ ] `iso generate all` (or waves A–D) completed  
- [ ] Link WPs (03,04,11,12,15) point at real URLs/IP or explicit TODO  
- [ ] WP14 register filled for current release  
- [ ] WP20 derived from WP19 with summary + graph  
- [ ] WP17 lists all 23  
- [ ] `iso validate all` passes  
- [ ] Human reviewed WP02 / WP13 / WP01 path  

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-08-05 | Full 23 WPs; link/register/derived types; waves A–D + event |
| 0.2.0 | 2026-08-04 | Templates in-repo; Wave A only |
| 0.1.0 | 2026-08-04 | Initial draft |
