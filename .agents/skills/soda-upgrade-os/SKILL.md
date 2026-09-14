---
name: soda-upgrade-os
version: "1.0.0"
description: >-
  Two-phase Soda Agent OS upgrade for existing projects: Phase 1 mechanical
  sync via soda-os upgrade; Phase 2 AI semantic merge per framework-manifest.yml.
  Use when upgrading framework, syncing soda-* skills, merging goals.md or
  AGENTS.md after OS update, or when soda-os upgrade --report shows drift.
---

# Upgrade Soda Agent OS (existing project)

**Human owns the outcome** — agent prepares report, runs mechanical sync when approved, merges hybrid files, verifies CI.

Always read: [framework-manifest.yml](../../../framework-manifest.yml), [upgrade-agent-os.md](../../../docs/06-workflows/upgrade-agent-os.md), target `AGENTS.md`, target `docs/07-backlog/goals.md`.

## Two phases

| Phase | Who | What |
|-------|-----|------|
| **1 — Mechanical** | `soda-os upgrade` | Overwrite deterministic framework paths (skills, rules, CI, `_template.md`) |
| **2 — Semantic** | Agent (this skill) | Merge hybrid files per manifest; **never** blind overwrite product content |

**No goal → no merge edits** unless human opened an upgrade goal (recommended: **G-xxx: Upgrade Agent OS**).

## 0. Preconditions

- [ ] Human named target project path and OS source path (Agent OS clone)
- [ ] Upgrade goal exists OR human explicitly said **"upgrade OS"** / **"อัปเกรด Agent OS"**
- [ ] Target is a Soda project (`AGENTS.md` + `docs/07-backlog/goals.md`)

## 1. Report (always first)

From **Agent OS repo root**:

```bash
soda-os upgrade /path/to/target-project --report
```

Read output sections:

- **VERSION** — OS vs target `.soda-os-version`
- **MECHANICAL** — files Phase 1 will change
- **DRIFT** — semantic gaps (goals structure, AGENTS.md, legacy `_archive/`)
- **SAFE** — product paths untouched

Optional preview:

```bash
soda-os upgrade /path/to/target-project --dry-run
```

Summarize for human before any writes.

## 2. Phase 1 — Mechanical sync (human approves)

Only after human confirms:

```bash
soda-os upgrade /path/to/target-project --yes
```

This **does not** complete the upgrade — proceed to Phase 2.

## 3. Phase 2 — Semantic merge

Follow [framework-manifest.yml](../../../framework-manifest.yml) `merge:` entries. Rules:

| Rule | Action |
|------|--------|
| **keep_local** | Preserve project-specific content |
| **sections_from_os** | Copy/update only these sections from OS repo |
| **never_touch** | Do not edit — report only |

### AGENTS.md

- Keep: `{PROJECT_NAME}`, mission, `{TEST_COMMANDS}`, project-specific notes
- Merge from OS: governance gates, skills table, CI section, Goals row (`goals/G-xxx.md`, `_archived/`)

### docs/07-backlog/goals.md

- **Keep:** Dashboard blocks, Active queue rows, Archived rows, changelog references
- **Merge from OS:** Layout, Status flow, Create/Close, Plan legend, intro line
- **Do not** delete or rewrite goal titles, statuses, or links to `goals/G-xxx.md`

### docs/07-backlog/goals/_template.md

- Overwritten by Phase 1 — verify target active goals still match new Plan format (no bulk rewrite; note for human if old goals lack Plan section)

### docs/07-backlog/goals/_archive/ → _archived/

If drift reports legacy `_archive/`:

1. If `_archived/` missing: `mv docs/07-backlog/goals/_archive docs/07-backlog/goals/_archived`
2. Update links in `goals.md` and `AGENTS.md` only
3. Do **not** move or edit `G-*.md` content except path references

### docs/00-index.md, README.md

- Merge new doc links / upgrade workflow from OS
- Keep project status table values

### docs/02-product/knowledge-map.json (if drift: missing `os_health` or schema version lag)

Phase 1 **never** overwrites this file. If `--report` flags `knowledge-map` drift:

1. Read OS template `docs/02-product/knowledge-map.json` and target file
2. **Merge missing top-level keys only** (`os_health`, `traceability`, `_extensions`, `temporal_defaults`, `promote_gates.spec_stability`, etc.)
3. **Preserve** all product arrays: `evidence`, `pain`, `goals`, `decisions`, …
4. Bump `version` in map only if schema requires — note in changelog

If file **missing entirely**, Phase 1 `--yes` should have created it via `--ignore-existing`; if not, copy OS template once.

## 4. Verify

```bash
cd /path/to/target-project
bash scripts/ci/governance-check.sh
```

Re-run if needed:

```bash
node /path/to/soda-os/cli.js upgrade . --report
```

Drift section should be empty or only intentional project deviations (document in goal notes).

## 5. Handoff

Report to human:

- Mechanical files synced (count / highlights)
- Semantic merges performed (file list)
- Remaining manual items (e.g. `ci-config.yml` if new keys in example)
- Suggested commit: `G-xxx: upgrade Soda Agent OS to <version>`

Do not commit unless human asks.

## User says → Do

| User says | Do |
|-----------|-----|
| "upgrade OS" / "อัปเกรด Agent OS" + target path | §1 report → summarize → wait for approve Phase 1 |
| "รัน upgrade เลย" / "ทำ phase 1" | `soda-os upgrade --yes` → Phase 2 merge |
| "merge goals.md" after Phase 1 | §3 goals.md merge only |
| "check drift" | `--report` only |
| No target path | Ask for target + OS source paths |

## Related

- [soda-goal-workflow](../soda-goal-workflow/SKILL.md) — open upgrade as a goal
- [upgrade-agent-os.md](../../../docs/06-workflows/upgrade-agent-os.md)
- [soda-os upgrade](../../.soda-os upgrade)
