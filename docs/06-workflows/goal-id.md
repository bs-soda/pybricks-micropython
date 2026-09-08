# Goal IDs — epic namespace

> Canonical ID grammar for Soda goals. When docs disagree, this file and [design-spec.md](../03-architecture/design-spec.md) §8 win.

## Grammar

```text
GOAL_ID := G-{EPIC}-{SEQ}     example: G-PAY-001, G-AUTH-012
LEGACY  := G-{SEQ}            example: G-001   (existing projects + bootstrap)
```

| Part | Rule |
|------|------|
| **EPIC** | 2–8 characters, `A-Z` only (`PAY`, `AUTH`, `ONBOARD`) |
| **SEQ** | 3 digits per epic (`001`–`999`) — not per project |
| **Legacy** | `G-001` … `G-999` stay valid and map to implicit epic **`CORE`** |
| **Filename** | Equals the ID exactly: `docs/07-backlog/goals/G-PAY-001.md` |
| **H1** | `# G-PAY-001: Short title` — title after the colon; title may change, ID must not |
| **Key** | The ID is the only lookup key (paths, commits, PRs, ClickUp, schemas) |

Do **not** put a title slug in the filename (`G-001-bootstrap.md` is invalid).

Do **not** use `E-` for epics. `E-xxx` is Evidence in the knowledge map.

ISO **`F-xx`** is a feature register, not an epic. One epic may list many `F-xx` (and the reverse).

Regex (namespaced or legacy):

```text
^(G-[A-Z]{2,8}-[0-9]{3}|G-[0-9]{3})$
```

## Epic = namespace, not a goal

Register the stream before allocating a goal:

1. Add a row to [../07-backlog/epics.md](../07-backlog/epics.md)
2. Copy [../07-backlog/epics/_template.md](../07-backlog/epics/_template.md) → `epics/PAY.md` (optional one-paragraph intent)
3. Add the slug to [../07-backlog/goal-id-registry.yaml](../07-backlog/goal-id-registry.yaml)

Epics have no `ready` / `done` status machine. They do not replace goals.

`CORE` is implicit for leftover `G-001`-style IDs. New work on the unscoped stream should use `G-CORE-NNN` via `soda-os goal next CORE`.

## Allocate when you create the card (default)

Do **not** guess how many goals the epic will need. Create IDs one at a time.

On branch **`epic/PAY`** (or `epic/pay`) the slug is taken from the branch — saying **"สร้าง goal"** / `soda-os goal next` is enough:

```bash
git checkout epic/PAY
soda-os goal next            # → G-PAY-001, then G-PAY-002, …
```

On `main` or any other branch, pass the slug (or check out `epic/PAY` first):

```bash
soda-os goal next PAY
```

Then copy [../07-backlog/goals/_template.md](../07-backlog/goals/_template.md) → `goals/G-PAY-001.md`. Repeat `goal next` whenever you need another card.

If you pass a slug that does not match `epic/{SLUG}`, allocation fails — do not create CORE goals while sitting on `epic/PAY`.

`soda-os goal reserve PAY --count N` is **optional** — only when two people on the **same** epic must claim IDs before either file exists. Skip it if one stream just keeps opening goals.

Creating a namespaced goal whose epic is missing from the registry fails governance.

## Keep goal docs merge-safe

The conflict is never the card `goals/G-PAY-001.md`. It is the **shared index files**. Split writes so `main` → `epic/PAY` and the later PR `epic/PAY` → `main` do not edit the same tables.

| File | Who edits | Why |
|------|-----------|-----|
| `goals/G-{EPIC}-{NNN}.md` | The epic that owns the ID | Unique filename — merge adds a file |
| `queues/{EPIC}.md` | That epic only | Rows do not share a table with `main` |
| `goals.md` Dashboard link | **`main` only**, when the epic is opened | Epic branch never adds rows here |
| `epics.md` | **`main` only**, when the epic is opened | Same |
| `goal-id-registry.yaml` | Each side touches **only its epic key** | Git 3-way merge stays clean |
| `changelog-goals.md` / `changelog.md` | **`main` after the PR lands** | Both sides appending at EOF always conflicts |

### Open an out-of-band epic on `main` first

Do this on `main` **before** cutting `epic/PAY`:

1. Row in [../07-backlog/epics.md](../07-backlog/epics.md)
2. Add `PAY:` to the registry (`next_seq: 1`, `reserved: []`) — no batch of IDs
3. Copy [../07-backlog/queues/_template.md](../07-backlog/queues/_template.md) → `queues/PAY.md`
4. One Dashboard link on [../07-backlog/goals.md](../07-backlog/goals.md)

Then branch `epic/PAY`. On that branch, run `soda-os goal next PAY` each time a new card is needed. Only `G-PAY-*` cards + `queues/PAY.md` + the `PAY:` registry key. Never `goal next CORE` on that branch.

### Merge protocol

```text
main  --(merge)-->  epic/PAY     stay current; expect no goals.md / CORE queue conflicts
epic/PAY  --(merge main, then PR)-->  main
```

Before the PR to `main`:

1. Merge `main` into `epic/PAY` and resolve anything outside goal docs (usually `code/`)
2. Goal docs should be clean: new `G-PAY-*.md`, updates only in `queues/PAY.md`, registry only under `PAY:`
3. Open the PR

If a goal-doc file still conflicts, someone edited the wrong queue or reformatted `goal-id-registry.yaml` / `goals.md`. Fix by keeping both epic keys; for `next_seq` take the **higher** number; for `reserved` take the **union**.

## Commands and commits

Use the **full** ID:

- `ทำ G-PAY-001` · `clarify G-PAY-001` · `analyze G-PAY-001` · `compile G-PAY-001`
- Commit: `G-PAY-001: add checkout session`
- Acceptance: `docs/02-product/acceptance/G-PAY-001.md`
- ClickUp task name: `[repo] G-PAY-001: title`

Legacy `G-001` commands and commits stay valid.

## Related

- [goal-spec-guide.md](goal-spec-guide.md)
- [../07-backlog/goals.md](../07-backlog/goals.md)
- [soda-goal-workflow](../../.agents/skills/soda-goal-workflow/SKILL.md)
