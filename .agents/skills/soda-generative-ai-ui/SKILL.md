---
name: soda-generative-ai-ui
version: "1.0.0"
description: >-
  Dynamic AI interface patterns, token byte-streaming UX, collapsible reasoning/thinking
  traces, interactive code artifacts with syntax highlighting & 1-click copy, dynamic form
  generators, prompt suggestion chips, and human-in-the-loop validation checkpoints.
  Use on goals building AI agent chat interfaces, streaming LLM outputs, or agentic dashboards.
  Triggers: generative ai ui, streaming ui, token stream, reasoning trace, prompt chips,
  ai chat, artifact card. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Generative AI & dynamic agentic UI patterns

**Model:** Stream Ingestion → **Speculative Chunking → Token Animation & Shimmer → Markdown Artifact Rendering → Human Action Checkpoint**

This skill crafts **state-of-the-art Generative AI and Agentic user interfaces**, optimizing for token streaming velocity, interactive code artifacts, explainable reasoning traces, and human-in-the-loop intervention.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Streaming perceived zero-latency** | Display the first token byte within $< 200\text{ms}$ via Server-Sent Events (SSE) or WebSocket chunks; never block on complete generation. |
| **Explainable cognitive traces** | Reasoning steps, subagent thoughts, and tool invocations must be grouped into collapsible, non-intrusive accordions. |
| **Interactive artifacts** | Code blocks, tables, and file diffs must render as self-contained interactive cards with 1-click copy, download, and diff view. |
| **Optimistic & cancelable** | User can pause, edit prompts, regenerate, or cancel streaming generation instantly (`AbortController`). |
| **Human authority gates** | Agent proposals that mutate state (file writes, bash commands) must render as explicit review checkpoints before execution. |

## Where AI UI artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **AI UI component spec** | `docs/03-architecture/ai-ui-patterns.md` | product |
| **Streaming & artifact components** | `code/**/components/ai/*` | product |
| **Prompt suggestion schemas** | `docs/02-product/prompts.json` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces AI chat, streaming token feeds, or agentic cards | **Auto-run this skill during PLAN & EXECUTE.** Specify stream protocols, markdown parsers, and artifact layouts |
| User says **"streaming ui G-xxx"** / **"ai ui G-xxx"** | Produce or refine the generative AI UI specification for that goal |
| User says **"reasoning trace"** / **"thought accordion"** | Stage 2 — design expandable cognitive chain-of-thought blocks |
| User says **"artifact card"** / **"code block"** | Stage 3 — build syntax-highlighted interactive artifact viewers |
| User says **"prompt chips"** / **"suggested actions"** | Stage 4 — formulate contextual prompt suggestions and dynamic forms |
| User says **"ai ui review"** / **"stream performance check"** | Stage 5 — verify 60 FPS markdown parsing and scroll anchoring |

---

## The AI UI engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Token byte-streaming & scroll anchoring (PLAN → EXECUTE)

1. Stream ingestion via SSE (`fetchEventSource`) or WebSocket.
2. Smooth character interpolation or word-by-word reveal.
3. **Smart Scroll Anchoring:** Auto-scroll down only if the user is already at the bottom; if the user scrolls up to read history, detach auto-scroll cleanly.

**Deliverable:** Streaming message component with floating "Scroll to bottom" pill.  
**Gate:** No janky scroll jumps during rapid token streaming ($50-100\text{ tokens/sec}$).

### Stage 2 — Collapsible reasoning & tool trace panels (EXECUTE)

1. Chain-of-thought steps enclosed in a styled translucent drawer (`Thinking for 4.2s...`).
2. Tool execution pills displaying:
   - Tool name (e.g. `run_command`, `replace_file_content`).
   - Latency badge (`120ms`) and execution status (🟢 Success / 🔴 Failed).
   - Click to expand payload and return output.

**Deliverable:** `ReasoningTrace` and `ToolCallBadge` components.  
**Gate:** Thinking traces collapsed by default in completed messages to reduce cognitive clutter.

### Stage 3 — Rich interactive markdown & code artifacts (EXECUTE)

1. Incrementally parse streaming Markdown using lightweight streaming AST parsers.
2. Code blocks include:
   - Language badge (e.g., `TypeScript`, `Rust`, `Python`).
   - Copy to clipboard button with animated checkmark feedback.
   - Unified diff view with line additions (`+`) and deletions (`-`).

**Deliverable:** `ArtifactCard` and `CodeBlock` components in Storybook / Widgetbook.  
**Gate:** Syntax highlighting applied without freezing the browser thread.

### Stage 4 — Dynamic action chips & form generators (EXECUTE)

1. Contextual prompt chips at the bottom of the feed (e.g., *Explain error*, *Run tests*, *Approve plan*).
2. Structured JSON schema rendered into interactive forms when the agent requests parameter clarification.

**Deliverable:** `ActionChipGroup` and `DynamicSchemaForm` components.  
**Gate:** Form inputs validate client-side before sending data back to the agent.

### Stage 5 — Abort controls & state recovery (REVIEW)

- [ ] Stop button immediately aborts active HTTP stream via `AbortController.abort()`.
- [ ] Partial outputs preserved cleanly with `[Generation stopped by user]` indicator.
- [ ] Network disconnects display inline retry button without losing conversation history.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Build high-speed token streaming with smooth scroll anchoring | Block the entire UI while waiting for multi-second LLM generations |
| Provide clear diff and execution inspection for agent tool calls | Execute state-modifying actions automatically without human visibility |
| Group long chain-of-thought traces into collapsible accordions | Overwhelm the user with raw unformatted JSON tool dumps |

---

## Related

- [soda-design](../soda-design/SKILL.md) — Component spec & design tokens
- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Micro-animations & haptics
- [soda-testing](../soda-testing/SKILL.md) — E2E & visual regression tests
