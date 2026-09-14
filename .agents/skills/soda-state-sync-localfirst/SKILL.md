---
name: soda-state-sync-localfirst
version: "1.0.0"
description: >-
  Local-First state synchronization, Conflict-Free Replicated Data Types (CRDTs via Yjs/Automerge),
  Optimistic UI mutations with instant rollback compensation, and real-time WebSocket/SSE delta streaming.
  Use on goals implementing real-time collaborative editing, offline-first client storage, optimistic UI
  writebacks, or live agent execution streams. Triggers: local first, crdt, state sync, optimistic ui,
  yjs, automerge, websocket, sse, live stream, offline sync. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Local-First State Synchronization, CRDTs & Optimistic UI

**Model:** Client Mutation → **Instant Optimistic UI Render → Local CRDT/IndexedDB Commit → Async Network Delta Stream → Conflict Resolution & Rollback Guard**

This skill architects **instant-response, offline-capable, and real-time collaborative user interfaces**, guaranteeing sub-16ms UI interactions via optimistic mutations and zero-data-loss synchronization over CRDTs.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-event-driven-architecture](../soda-event-driven-architecture/SKILL.md).

```
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                       LOCAL-FIRST OPTIMISTIC UI STATE PIPELINE                          │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│ 1. USER ACTION   │                 │ 2. OPTIMISTIC UI │                 │ 3. LOCAL CRDT DB │
│    TRIGGER       │ ──────────────> │    RENDER (0ms)  │ ──────────────> │    COMMIT (2ms)  │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│ Click / Keypress │                 │ Update DOM state │                 │ Write to Yjs doc │
│ mutation event   │                 │ with pending tag │                 │ & IndexedDB disk │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
                                                                                    │
                                                                                    ▼
                                                                          ┌──────────────────┐
                                                                          │ 4. NETWORK SYNC  │
                                                                          │    (WS / SSE)    │
                                                                          ├──────────────────┤
                                                                          │ Push diff delta  │
                                                                          │ to NATS/Backend  │
                                                                          └──────────────────┘
                                                                                    │
                                                      ┌─────────────────────────────┴────────┐
                                                      ▼                                      ▼
                                             ┌──────────────────┐                  ┌──────────────────┐
                                             │ 5A. SERVER ACK   │                  │ 5B. SERVER ERROR │
                                             │     (Confirm)    │                  │     (Rollback)   │
                                             ├──────────────────┤                  ├──────────────────┤
                                             │ Clear pending    │                  │ Compensate state │
                                             │ state badge      │                  │ & show retry CTA │
                                             └──────────────────┘                  └──────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Zero-latency optimistic render** | User interactions MUST reflect in the UI immediately ($< 16\text{ms}$, within 1 frame) before awaiting network round-trips. |
| **Local storage as source of truth** | The client's local database (IndexedDB / SQLite WASM / Yjs document) is the immediate read/write target; the cloud is a sync mesh. |
| **Automated conflict resolution (CRDTs)** | Concurrent edits from multiple users or AI agents MUST merge deterministically using state-based or operation-based CRDTs without merge locks. |
| **Graceful rollback compensation** | If the backend rejects a mutation, the UI MUST roll back to the last confirmed state without corrupting unrelated local edits. |
| **Human approves offline conflict overrides** | If a semantic business conflict occurs (e.g. concurrent budget over-allocation), prompt the human with a side-by-side diff. |

## Where state sync artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **State architecture & sync spec** | `docs/03-architecture/state-sync-architecture.md` | product |
| **CRDT document schemas** | `docs/03-architecture/crdt-schemas.json` | product |
| **Client sync store** | `code/**/store/sync/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal implements real-time sync, collaborative editing, offline caching, or optimistic writebacks | **Auto-run this skill during PLAN & EXECUTE.** Author CRDT schemas, optimistic store reducers, and WebSocket sync handlers |
| User says **"state sync G-xxx"** / **"local first G-xxx"** | Produce or refine the state synchronization specification for that goal |
| User says **"crdt"** / **"yjs"** / **"automerge"** | Stage 2 — scaffold CRDT documents and delta merge reducers |
| User says **"optimistic ui"** / **"instant feedback"** | Stage 3 — build optimistic mutation actions with rollback compensation hooks |
| User says **"websocket"** / **"sse sync"** | Stage 4 — configure duplex delta streaming over NATS JetStream / WebSocket |
| User says **"offline test"** / **"network partition"** | Stage 5 — verify seamless offline mutation queuing and re-connection reconciliation |

---

## The Local-First State Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — State taxonomy & consistency boundary mapping (PLAN)

Classify application state into 3 distinct tiers:
1. **Ephemeral Local UI State:** Component focus, open drawers, active filter tabs (in-memory only).
2. **Collaborative CRDT State:** Canvases, documents, goal status, agent execution logs (multi-master CRDT sync).
3. **Strict ACID Server State:** Financial transfers, billing charges, license seat allocations (Server authoritative with optimistic client lock).

**Deliverable:** State classification matrix in `docs/03-architecture/state-sync-architecture.md`.  
**Gate:** Clear separation between CRDT-mergeable state and server-authoritative ACID state.

### Stage 2 — CRDT Document Schema & Local IndexedDB Persistence (PLAN → EXECUTE)

1. Define Yjs / Automerge document structures:
   ```typescript
   import * as Y from "yjs";
   import { IndexeddbPersistence } from "y-indexeddb";
   
   const ydoc = new Y.Doc();
   const provider = new IndexeddbPersistence("soda-workspace-123", ydoc);
   const yGoals = ydoc.getMap("goals");
   ```
2. Bind local document updates to IndexedDB for instant offline persistence.

**Deliverable:** CRDT store adapter.  
**Gate:** Local reads/writes complete in $< 5\text{ms}$ with zero network dependency.

### Stage 3 — Optimistic UI Mutations & Rollback Reducers (EXECUTE)

Implement the Optimistic Saga pattern:
1. Dispatch action $\to$ Apply local update immediately with `status: "PENDING_CONFIRMATION"`.
2. Send network request $\to$ If HTTP 200/ACK: transition status to `"CONFIRMED"`.
3. If HTTP 4xx/5xx/Timeout: trigger compensating reducer to revert optimistic update and show inline retry banner.

**Deliverable:** Optimistic mutation middleware in `code/**/store/sync/optimistic.*`.  
**Gate:** Injected network failure cleanly reverts UI state without UI freeze or data corruption.

### Stage 4 — Real-time Duplex Delta Streaming (EXECUTE)

1. Stream binary state vector updates (`Y.encodeStateAsUpdate(ydoc)`) over WebSocket / SSE.
2. Implement exponential backoff reconnection ($100\text{ms} \dots 5000\text{ms}$) with message deduplication headers.

**Deliverable:** Real-time WebSocket connection manager.  
**Gate:** Inter-client sync latency $< 50\text{ms}$ across active sessions.

### Stage 5 — Offline-to-Online Reconciliation Verification (REVIEW)

- [ ] Disconnect network $\to$ Perform 10 local mutations $\to$ Reconnect network $\to$ Verify all 10 mutations merge cleanly into server state.
- [ ] Concurrency test: 2 clients edit adjacent fields simultaneously $\to$ Verify zero overwritten data.
- [ ] Memory leak audit: Clean up unused CRDT undo-managers and delta listeners on component unmount.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Apply optimistic UI mutations to achieve sub-16ms instant feedback | Leave unconfirmed optimistic mutations in the UI if the backend server rejects the mutation |
| Merge collaborative state automatically using deterministic CRDT algorithms | Silently overwrite conflicting edits without preserving historical change vectors |
| Store local state in IndexedDB / SQLite WASM for offline resilience | Block user interactions while waiting for slow network API responses |

---

## Related

- [soda-design](../soda-design/SKILL.md) — 5-State Component UI
- [soda-event-driven-architecture](../soda-event-driven-architecture/SKILL.md) — Sagas & event streaming
- [soda-web-vitals-performance](../soda-web-vitals-performance/SKILL.md) — 60 FPS performance
