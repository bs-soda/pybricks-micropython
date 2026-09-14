---
description: Artifact Conservation — discussion ≠ implementation; no new files without explicit command
alwaysApply: true
---

# Artifact Conservation Principle

> Every new artifact must prove lifetime value > lifetime maintenance cost.  
> If not proven → **do not create**.

Framework changes follow the same loop as product work: **Idea → Evidence → ADR → Implementation** — not Idea → Implementation.

See [os-core-invariants.md](../../docs/06-workflows/os-core-invariants.md) (Architecture freeze)

---

## Default behavior

**Default = do NOT create artifacts.**

```text
Discussion  ≠  Implementation
```

Analysis, opinion, critique, and recommendations in chat are **allowed**.  
Creating or editing repo files is **forbidden** unless the human uses an explicit implementation command.

### Explicit implementation triggers (examples)

`implement` · `scaffold` · `create` · `generate` · `write` · `add to repo` · `promote` · `ลง rule` · `commit` · goal execution (**"เริ่ม step N"** on a `ready` goal)

### Not implementation triggers

`คิดเห็นยังไง` · `ควรทำไหม` · `what do you think` · architecture discussion · roadmap · `should we` · brainstorming

When unsure → **ask once**, or stay at response **Level 0–1** (answer only).

Canonical terms (collaboration phase, goal status, operating mode, bundle mode): [design-spec.md](../../docs/03-architecture/design-spec.md) §8. **Response level** is separate — it gates chat vs repo edits, not DEFINE/EXECUTE routing.

---

## Response levels (no skipping)

| Response level | Action |
|-------|--------|
| **0 Answer** | Respond in chat — default for opinions and architecture questions |
| **1 Recommendation** | Options + trade-offs — no repo |
| **2 Draft** | Paste draft in chat — only if human asks for a draft |
| **3 Repository change** | Edit files — only on explicit implementation trigger |

**Never jump** Question → Repository change.

For architecture questions with no evidence:

```text
Architecture: no change
Evidence: none
Decision: Deferred
```

---

## Cost model (before any new artifact)

Each new item adds **lifetime** cost, not one-time cost:

- File · schema · rule · skill · template · workflow doc
- Upgrade path · manifest drift · merge on `soda-os upgrade`
- Human + agent context to read forever

Prefer: project logs, chat discussions, or (when explicitly requested) `docs/proposals/P-xxx`.  
Do not create proposals or scaffolding by default.

---

## Architecture freeze

Do **not** add framework layers, architecture docs, schemas, or skills because an idea "sounds good."

Change architecture only with evidence from:

- repeated real-world pain
- validated usage
- OS metrics

Tune existing Extension params from data before adding new artifacts.

---

## Agent OS work priority

When the human is not explicitly implementing:

1. Use existing skills and docs
2. Answer / recommend
3. Execute goals only via goal workflow gates

**Evidence first from production use** — not more specification in this framework repository.

Works with [platform-consumer.md](platform-consumer.md) — no consumer product names in this repo.

---
