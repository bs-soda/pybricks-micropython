# Wave A — soda-os artifact → ISO 29110 WP sections

**Wave A:** WP02 Agreement → WP10 Project Plan → WP13 Requirement Specification  
**Status:** Mapping for `soda-iso29110` skill (v0.2)  
**Templates (in-repo):** `docs/08-iso29110/templates/` + `docs/08-iso29110/template-manifest.yaml` (v1.2 — all 23)  
**Full catalog:** [wp-catalog.md](wp-catalog.md)  

## ID policy (hard)

```text
brief Scope In / feature clusters  →  F-xx   (WP02 only at contract level)
F-xx + goals + acceptance        →  REQ-xxx / NFR-xxx  (WP13 only)
REQ-xxx                          →  TC-xxx / RTM       (Wave B — not this doc)
```

- Never write **REQ-xxx** in WP02.
- Never invent new **F-xx** in WP13; new features require WP03 Change Request after SOW baseline.
- Prefer stable F-xx assignment table in `work-products/_meta/feature-register.yaml` once first generated.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **P** | Primary source — copy / distill first |
| **S** | Secondary — enrich or cross-check |
| **H** | Human / commercial input — do not invent; ask or `TODO` |
| **G** | Generate structural defaults from ISO template (phases, process groups) |
| **—** | No soda-os source; leave TBD or omit optional block |

**Refresh rule:** regenerate may overwrite **structural** tables (F-xx, REQ, schedule skeleton). Preserve human-edited narrative and sign-off signatures unless `--force` + human confirm.

---

## Shared context (`project-context.yaml`)

Built by `iso scan` before any WP generate. Maps soda-os → Mustache globals.

| Placeholder / field | soda-os source | Notes |
|---------------------|----------------|-------|
| `template_version` | `docs/08-iso29110/template-manifest.yaml` → `version` | Pin what shipped with this OS |
| `project_name` | `AGENTS.md` / brief title | |
| `project_code` | **H** or convention from repo name | e.g. `SODA-PATH` |
| `project_description` | `docs/02-product/project-brief.md` → Vision + Solution | 1–2 paragraphs |
| `objective` | brief Vision + Solution → Project goal | |
| `client_name` | **H** | |
| `vendor_name` | **H** (org default ok) | |
| `author` | **H** (PM / author of WP) | |
| `product_owner_name` | **H** | |
| `date` / `agreement_date` | **H** or session date for Draft only | |
| `agreement_id` | **H** or `{company_code}_{project_code}_SOW_v0.1` | |
| `project_duration_start` / `end` | **H** | |
| `stakeholders` | brief Target users + **H** named stakeholders | |
| `communication_methods` | **H** or `docs/04-agents/` / team norms if present | |
| `company_code` | **H** | |
| `repository_url` | git remote | |
| `schedule_link` | **H** / ClickUp if synced | |

Also read: `docs/00-project-snapshot.md`, `docs/01-vision.md` (if present), `docs/03-architecture/overview.md`.

---

## WP02 — Agreement (SOW)

**Template:** `docs/08-iso29110/templates/01_Management/Agreement.template.md`  
**Output:** `work-products/01_Management/WP02-Agreement.md`  
**Depends on:** context pack ready; brief locked preferred  
**Gate before `in_review`:** human PO signs Feature table; no REQ-xxx in file

| WP02 section | Content | soda-os source | Mode |
|--------------|---------|----------------|------|
| Header (name, dates, agreement ID) | Metadata | `project-context.yaml` | P / H |
| Parties (Client / Vendor) | Intro paragraph | context `client_name`, `vendor_name` | H |
| **§1 Features in scope (F-xx)** | Feature table | **`project-brief.md` → In scope** clustered into F-xx; names/descriptions from brief Solution + journey; optional cluster of related `G-xxx` under one F | P |
| §1 Out of scope | Exclusion table | **`project-brief.md` → Out of scope**; brief Is/Is not (Is not column) | P |
| §1 Requirements detail note | Pointer to WP13 | G (template text) | G |
| **§2 Intermediate deliverables** | Phase × WP list | G default ISO phases; windows from context dates; refine with goals roadmap if phases exist in backlog | G / S |
| **§3 Estimated effort** | Hours by phase | **H** (or — leave `[hrs]`) | H |
| **§4 Change control** | WP03 pointer | G | G |
| **§5 Sign-off** | Signature block | context `author`, `product_owner_name`, `date` — signatures blank until human | H |

### F-xx derivation algorithm (WP02)

1. Start from `project-brief.md` **In scope** checklist items.
2. Merge items that are the same client-facing capability (one F per capability, not one F per goal).
3. Attach supporting `G-xxx` IDs in `_meta/feature-register.yaml` only (not in SOW body).
4. Description = one client-readable paragraph (brief + knowledge-digest pains OK).
5. In-scope bullets = capabilities, **no** Given/When/Then, **no** REQ IDs.
6. Persist register before writing WP13.

---

## WP10 — Project Plan

**Template:** `docs/08-iso29110/templates/01_Management/Project-Plan.template.md`  
**Output:** `work-products/01_Management/WP10-Project-Plan.md`  
**Depends on:** WP02 draft or approved (F-xx stable)  
**Gate:** no invented budget/names; open **H** fields marked `TODO`

| WP10 section | Content | soda-os source | Mode |
|--------------|---------|----------------|------|
| Revision History | Draft → Approved rows | context + generate | G |
| **§1 Project Title** | Name, code, description | context + brief Vision | P |
| **§2 General Information** | Client, vendor, agreement, dates, comms, stakeholders | context (**H** heavy) | H / P |
| **§3.1 Product & UX objectives** | Measurable outcomes | brief Vision/Problem; brief Scope / Release goals; link F-xx from WP02 | P |
| **§3.2 Technical objectives** | Architecture outcomes | `docs/03-architecture/overview.md`; ADRs; brief Technical direction | P |
| **§3.3 Business objectives** | Growth / conversion | brief; knowledge-digest; **H** if commercial | S / H |
| **§4.1 In Scope** | Per-F table (objective, funcs, NFR hints) | WP02 F-xx + brief In + clustered goal **In** / Intent | P |
| **§4.2 Out of Scope** | Per-F exclusions | brief Out + goal **Out** + brief Is not | P |
| **§5.1 Application deliverables** | App / repo | overview + platform from brief Technical direction | P |
| **§5.2 Documentation deliverables** | WP list | G (ISO set) | G |
| **§5.3 PM deliverables** | Plan, ceremonies, closure | G + soda workflows (`dev-loop`, `team-workflow`) as process flavour | G / S |
| **§6.1 Roles** | Named RACI table | **H**; optional `docs/04-agents/dev-roles.md` for role *definitions* only | H / S |
| **§6.2 Communication plan** | Channels / cadence | **H** / context `communication_methods` | H |
| **§7 Schedule** | Phases + dates | context duration + **H**; goal dependency order as soft signal for feature milestones | H / S |
| **§8.1 Human resources** | FTE table | **H** | H |
| **§8.2 Software & services** | Tools | overview, stack rules, ClickUp sync if used | S / H |
| **§8.3 Cost** | Budget | **H** only — never invent | H |
| **§9 Risk register** | R01… | `assumptions.md` (risks if A fails); knowledge-map conflicts `CF-xxx`; constraints `C-xxx`; ADRs trade-offs | S / H |
| **§10 Version control** | Naming + backup | G naming from context; backup **H** or later WP05/12 | G / H |
| **§11 Work process flow** | PMI groups ↔ ISO WPs | G; optionally note Soda DEFINE→SHIP as team execution model | G / S |

---

## WP13 — Requirement Specification

**Template:** `docs/08-iso29110/templates/02_Requirements/Requirement-Specification.template.md`  
**Output:** `work-products/02_Requirements/WP13-Requirement-Specification.md`  
**Depends on:** WP02 (F-xx locked); WP10 recommended  
**Gate:** every F-xx from WP02 has ≥1 REQ; every REQ has testable AC; no orphan G without F mapping

| WP13 section | Content | soda-os source | Mode |
|--------------|---------|----------------|------|
| Header + Revision History | Metadata | context | P / G |
| **§1 Purpose** | Boilerplate + project name | G + context | G |
| **§2 Scope reference** | F-xx table | **Copy names from WP02** only | P |
| **§3 Requirements format** | User story + GWT convention | G (align with soda acceptance style) | G |
| **§4 Traceability note** | F→REQ→TC→RTM | G; mention soda `G-xxx` only in `_meta`, not as ISO IDs | G |
| **§5 Functional requirements** | Per-F blocks: REQ-xxx rows | See algorithm below | P |
| **§6 Non-functional (NFR-xx)** | Performance, security, … | brief **Quality bar**; constraints `C-xxx`; overview/ADR non-functionals; template defaults only if no project data (mark as draft defaults) | P / S |

### REQ-xxx derivation algorithm (WP13)

For each **F-xx** in WP02:

1. Collect linked `G-xxx` from `feature-register.yaml` (status ≥ `planned` preferred).
2. For each goal, prefer in order:
   - `docs/02-product/acceptance/G-xxx.md` scenarios → REQ rows (1 scenario ≈ 1 REQ, or split if multiple independent behaviours)
   - else goal **Acceptance criteria** + **In** list → REQ + GWT
   - else goal **Intent / Done when** → draft REQ (status note: needs human refine)
3. User story voice: As a / I want / so that — use brief Target users + goal Context.
4. Acceptance Criteria: Given / When / Then from acceptance contract fields (Input/Output/Preconditions → GWT).
5. Assign sequential **REQ-001…** globally (not per feature). Record `G-xxx` ↔ `REQ-xxx` in `_meta/req-register.yaml`.
6. Do **not** invent features outside WP02 F-xx.

### NFR derivation

| NFR category | Prefer source |
|--------------|---------------|
| Performance | `C-xxx`, ADR, quality bar |
| Security | `.agents/rules/security.md`, ADRs, overview Auth |
| Reliability | quality bar / DoD |
| Compatibility | brief Technical direction (OS/platform) |
| Accessibility | design tokens / soda-design a11y bar if UI project |

---

## Cross-walk cheat sheet (artifact → which WP)

| soda-os artifact | WP02 | WP10 | WP13 |
|------------------|:----:|:----:|:----:|
| `docs/02-product/project-brief.md` | **§1 F-xx + Out** | §1–4 | scope boundary, users for stories |
| `docs/02-product/knowledge-digest.md` | §1 enrich | §3, §9 | story rationale |
| `docs/02-product/assumptions.md` | — | **§9** | — |
| `docs/02-product/knowledge-map.json` | F cluster aid | risks/conflicts | pain→REQ check |
| `docs/02-product/acceptance/G-*.md` | — | — | **§5 primary** |
| `docs/07-backlog/goals/G-*.md` | F attach (meta) | §4, §7 soft | **§5** |
| `docs/07-backlog/goals.md` | — | schedule signal | completeness |
| `docs/03-architecture/overview.md` | — | §3.2, §5.1, §8.2 | NFR |
| `docs/05-decisions/*` | — | §3.2, §9 | NFR / constraints |
| `docs/00-project-snapshot.md` | header check | §2 enrich | — |
| `docs/06-workflows/*` | — | §5.3, §11 colour | — |
| `AGENTS.md` / mission | parties context | §1 | purpose |
| Human commercial pack | dates, $$, names, sign-off | §2,6–8 | approve |

---

## Gaps checklist (ask before Wave A `package`)

- [ ] Client / vendor / PO / PM names  
- [ ] Agreement ID + project duration  
- [ ] Effort hours (WP02 §3) and/or budget (WP10 §8) — or explicit “TBD in commercial annex”  
- [ ] Named team roster (WP10 §6)  
- [ ] Schedule dates (WP10 §7)  
- [ ] F-xx list reviewed by human (no REQ leakage in WP02)  
- [ ] Every In-scope item mapped to exactly one F-xx  
- [ ] Every F-xx has ≥1 REQ in WP13 draft  

---

## Meta files written by the skill

| File | Purpose |
|------|---------|
| `work-products/_meta/project-context.yaml` | Placeholders + language + template version pin |
| `work-products/_meta/feature-register.yaml` | F-xx ↔ scope items ↔ G-xxx |
| `work-products/_meta/req-register.yaml` | REQ-xxx ↔ F-xx ↔ G-xxx ↔ acceptance path |
| `work-products/_meta/work-product-status.yaml` | per-WP status: `missing` \| `draft` \| `in_review` \| `approved` \| `baseline` |
