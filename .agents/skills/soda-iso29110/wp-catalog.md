# ISO 29110 — WP catalog (all 23)

Quick reference for `soda-iso29110`.

**Output naming:** `WP{nn}-{Basename}.md` (e.g. `WP02-Agreement.md`). Detail for Wave A sections: [wave-a-mapping.md](wave-a-mapping.md).  
Manifest: `docs/08-iso29110/template-manifest.yaml`.

| WP | Name | Type | Wave | Template | Output |
|----|------|------|------|----------|--------|
| WP01 | Acceptance Record | doc | D | `05_CM_QA/Acceptance-Record.template.md` | `05_CM_QA/Acceptance-Record.md` |
| WP02 | Agreement | doc | A | `01_Management/Agreement.template.md` | `01_Management/WP02-Agreement.md` |
| WP03 | Change Request | **link** | event | `05_CM_QA/Change-Request.template.md` | `WP03-Change-Request.md` |
| WP04 | Correction Register | **link** | event | `05_CM_QA/Correction-Register.template.md` | `WP03-Change-Request.md` |
| WP05 | Implementation Environment | doc | B | `06_Environment/Implementation-Environment.template.md` | … |
| WP06 | Maintenance Documentation | doc | C | `07_Operations/Maintenance-Documentation.template.md` | … |
| WP07 | Meeting Record | doc | event | `01_Management/Meeting-Record.template.md` | … |
| WP08 | Product Operation Guideline | doc | C | `07_Operations/Product-Operation-Guideline.template.md` | … |
| WP09 | Progress Status Record | doc | B | `01_Management/Progress-Status-Record.template.md` | … |
| WP10 | Project Plan | doc | A | `01_Management/Project-Plan.template.md` | … |
| WP11 | Project Repository | **link** | B | `08_Repository/Project-Repository.template.md` | GitHub `repository_url` |
| WP12 | Project Repository Backup | **link** | C | `08_Repository/Project-Repository-Backup.template.md` | IP + path |
| WP13 | Requirement Specification | doc | A | `02_Requirements/Requirement-Specification.template.md` | … |
| WP14 | Software | **register** | B | `09_Deliverables/Software.template.md` | Artifact table |
| WP15 | Software Components | **link** | B | `03_Design/Software-Components.template.md` | GitHub components URL |
| WP16 | Software Design | doc | B | `03_Design/Software-Design.template.md` | … |
| WP17 | Software Product | doc | C | `09_Deliverables/Software-Product.template.md` | 23-row delivery table |
| WP18 | Software User Document | doc | C | `07_Operations/Software-User-Document.template.md` | … |
| WP19 | Test Cases and Procedure | doc | B | `04_Testing/Test-Cases-Procedure.template.md` | TC register |
| WP20 | Test Report | **derived** | B | `04_Testing/Test-Report.template.md` | Summary + graph from WP19 |
| WP21 | Traceability Record | doc | B | `02_Requirements/Traceability-Record.template.md` | RTM |
| WP22 | Validation Record | doc | D | `04_Testing/Validation-Record.template.md` | UAT |
| WP23 | Verification Record | doc | B | `04_Testing/Verification-Record.template.md` | … |

## Link field map

| WP | Context fields |
|----|----------------|
| WP03 | `change_request_clickup_url` (fallback `project_tool_url`) |
| WP04 | `correction_register_clickup_url` |
| WP11 | `repository_url` |
| WP12 | `backup_server`, `backup_path` |
| WP15 | `components_repository_url` (fallback `repository_url`) |

## Generate order (sequential package)

`WP02 → WP10 → WP13 → WP09 → WP16 → WP15 → WP05 → WP11 → WP19 → WP21 → WP23 → WP14 → WP20 → WP22 → WP08 → WP18 → WP06 → WP12 → WP17 → WP01`

Event (when needed): `WP03`, `WP07`, `WP04`.
