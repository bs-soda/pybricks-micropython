# External tools & MCP (consumer)

> **OS governs when. The consumer repo names which tool.**  
> Soda OS does **not** ship MCP servers, `mcp.json`, or tool credentials.  
> Policy: [governance.md](../../.agents/rules/governance.md) § External tools.

Chrome/browser automation, Figma, and similar assistants are **project connectors**. Connect them in the consumer repo. Do not add named servers to soda-os.

```text
soda-os  →  may the agent call an outside tool on this step?
consumer →  which MCP, which URL, which allowlist
```

## When the agent may call an external tool

All of these must be true (same as other EXECUTE work):

1. Goal is `ready` or `in_progress`
2. Human said **`เริ่ม step N`** (or PLAN command for design-read — see below)
3. The **current Work step** and/or **Test plan** names the tool and the pass/fail bar
4. **Spec stability** `analyze` is `done` or `n/a` on code goals
5. Target is **not production** unless the goal **In** + human explicitly allow it

**PLAN (design):** a read-only design-file tool (e.g. Figma) may run on **`design G-xxx`** / PLAN stages without `เริ่ม step N`, if Notes for AI list it. Still no secrets, no writes to the design file unless **In** says so.

## What lives where

| Lives in | What |
|----------|------|
| **soda-os (this doc + governance)** | Gates: goal, step, no-guess, no prod, no secrets |
| **Consumer `.cursor/mcp.json` (or agent equivalent)** | Server command / URL — **gitignored tokens** |
| **Consumer goal card** | Which step, allowlist of operations, staging URL / file ID |
| **Consumer `{project}-*` skill** | Optional, only if the same playbook repeats 3+ times |

**Never** commit MCP tokens, Figma PATs, or browser profiles with saved passwords.

## Consumer — how to connect

1. Add the MCP (or equivalent) in the **consumer** Cursor/agent config — not in soda-os.
2. On the goal that needs it, fill:

```markdown
## How
**External tools:** browser MCP on staging for smoke; Figma MCP read-only for frame `Abc123`.

## Work steps
4. Browser smoke — Chrome MCP, Test plan only.

## Test plan
- Base URL: https://staging.example.com (never production)
- Allowed MCP ops: navigate, snapshot, click on listed selectors
- Forbidden: fill real credentials from `.env`; download; prod hosts
```

3. **Notes for AI** — copy the allowlist; if unspecified, agent **`clarify G-xxx`** — does not guess a server.

## Capability classes (examples — not an OS install list)

| Class | Typical step | Default posture |
|-------|----------------|-----------------|
| **Browser / E2E** | IMPROVE — Test plan | Staging (or local). Observe then interact. [soda-testing](../../.agents/skills/soda-testing/SKILL.md) |
| **Design file (Figma, …)** | PLAN — soda-design | **Read** frames/tokens into `docs/`. No publish/comment unless **In** |
| **PM / tracker** | Sync after human asks | Prefer `soda-os sync-clickup` CLI; MCP is optional extra |
| **Other HTTP MCP** | Only if Work step names it | Same gates; write ops need **In** |

Figma (or any design MCP): **connect in the consumer repo**. OS does not need a Figma-specific rule. Put file IDs and “read-only” on the **design goal**. Human still approves the UI spec before `ready`.

## Forbidden (even if MCP is configured)

- Calling a tool that is **not** on the current step / Test plan / Notes for AI
- Using MCP to skip **`ready`**, **`analyze`**, touch map, or human **`done`**
- Production URLs, live customer data, or pasting secrets into tool arguments
- Writing MCP output as a new OS layer (no extra framework docs from a tool dump)

## Related

- [governance.md](../../.agents/rules/governance.md)
- [security.md](../../.agents/rules/security.md)
- [goal-spec-guide.md](goal-spec-guide.md)
- [soda-testing](../../.agents/skills/soda-testing/SKILL.md)
- [soda-design](../../.agents/skills/soda-design/SKILL.md)
- [platform-consumer.md](../../.agents/rules/platform-consumer.md)
