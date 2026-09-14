---
name: soda-micro-frontend-plugins
version: "1.0.0"
description: >-
  Micro-Frontend architecture, Webpack 5 / Vite Module Federation, Shadow DOM encapsulation,
  and dynamic AI Agent widget sandboxes. Use on goals implementing multi-team frontend modularization,
  pluggable agent extensions, isolated third-party widgets, or independent micro-app deployments.
  Triggers: micro frontend, module federation, plugin architecture, widget sandbox, shadow dom,
  pluggable ui, remote module, iframe sandbox. Collaboration phases PLAN → EXECUTE → REVIEW.
---

# Micro-Frontend Architecture, Module Federation & Widget Sandboxes

**Model:** Host Shell Initialization → **Remote Module Discovery & Federation → Shadow DOM / Sandbox Isolation → Inter-App EventBus & IPC → Version Independence Audit**

This skill architects **scalable, multi-team Micro-Frontend applications and dynamic AI Agent plugin sandboxes**, enabling independent team deployments and secure third-party UI extension execution with zero stylesheet collisions.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-system-architecture](../soda-system-architecture/SKILL.md) and [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md).

```
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                       SODA OS MICRO-FRONTEND & PLUGIN TOPOLOGY                          │
 └────────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
┌───────────────────────────────────┐                     ┌───────────────────────────────────┐
│ HOST SHELL CONTAINER (App Root)   │                     │ DYNAMIC AGENT PLUGIN SANDBOX      │
├───────────────────────────────────┤                     ├───────────────────────────────────┤
│ • Global Auth & Tenant Session    │                     │ • Untrusted Agent UI Widgets      │
│ • Universal Cmd+K Navigation      │                     │ • Shadow DOM / Web Components     │
│ • Design Token Provider           │                     │ • Fuel-metered WASM Runtime       │
│ • Shared Cross-App EventBus       │                     │ • Strict PostMessage IPC Boundary │
└─────────────────┬─────────────────┘                     └─────────────────▲─────────────────┘
                  │                                                         │
                  │ (Module Federation / Dynamic Remote Load)               │
                  ▼                                                         │
 ┌───────────────────────────────────┐                                      │
 │ INDEPENDENT MICRO-APPS (Remotes)  │                                      │
 ├───────────────────────────────────┤                                      │
 │ • Project Management App (Team A) │ ─────────────────────────────────────┘
 │ • Financials & Billing (Team B)   │ (Publish/Subscribe over EventBus)
 │ • Autonomous AI Swarm (Team C)    │
 └───────────────────────────────────┘
```

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Independent deployability** | Each Micro-App / Remote module MUST build and deploy independently without requiring a rebuild of the Host Shell. |
| **Strict CSS & DOM isolation** | Remote widgets MUST NOT leak global CSS styles or pollute the window object (use Shadow DOM or CSS Modules). |
| **Zero-Trust Plugin Sandboxing** | Third-party or agent-generated UI widgets MUST execute inside isolated Shadow DOM boundaries with restricted API permissions. |
| **Shared singleton dependencies** | Core libraries (`react`, `react-dom`, `rxjs`, design token themes) MUST be shared singletons via Module Federation to prevent bundle duplication. |
| **Human approves remote manifest changes** | Adding external CDN remote endpoints or granting elevated iframe/WASM permissions requires human sign-off. |

## Where micro-frontend artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Micro-Frontend architecture spec** | `docs/03-architecture/micro-frontends.md` | product |
| **Federation manifest & remotes** | `docs/03-architecture/federation-manifest.json` | product |
| **Host shell & plugin loaders** | `code/**/host-shell/*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal partitions frontend into micro-apps, adds Module Federation, or builds a plugin system | **Auto-run this skill during PLAN & EXECUTE.** Author Module Federation configs, Shadow DOM wrappers, and EventBus bridges |
| User says **"micro frontend G-xxx"** / **"module federation G-xxx"** | Produce or refine the Micro-Frontend specification for that goal |
| User says **"module federation"** / **"vite remotes"** | Stage 2 — configure Module Federation plugin in Vite / Webpack 5 |
| User says **"plugin sandbox"** / **"shadow dom"** | Stage 3 — build secure Web Component / Shadow DOM container for dynamic agent widgets |
| User says **"eventbus"** / **"inter-app ipc"** | Stage 4 — implement type-safe PostMessage / EventBus communication channel |
| User says **"micro-app audit"** / **"federation check"** | Stage 5 — verify remote failover handling, bundle sizes, and CSS isolation |

---

## The Micro-Frontend Lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Domain partitioning & contract boundary planning (PLAN)

Map business bounded contexts to independent frontend remotes:
- **Host Shell:** Global header, routing orchestrator, design token context, authentication.
- **Remote A (`/projects`):** Project management workbench (Team A).
- **Remote B (`/financials`):** Financials, Cap Table, and DCF calculators (Team B).
- **Remote C (`/agent-swarm`):** Live agentic canvas and telemetry visualizer (Team C).

**Deliverable:** Micro-Frontend matrix in `docs/03-architecture/micro-frontends.md`.  
**Gate:** Host-Remote contracts and shared singleton dependencies strictly defined.

### Stage 2 — Module Federation configuration (PLAN → EXECUTE)

Configure Module Federation in `vite.config.ts` / `webpack.config.js`:
```typescript
// Host Shell Configuration
federation({
  name: "soda_host",
  remotes: {
    projectsRemote: "https://cdn.sodality.cc/remotes/projects/remoteEntry.js",
    financialsRemote: "https://cdn.sodality.cc/remotes/financials/remoteEntry.js",
  },
  shared: {
    react: { singleton: true, requiredVersion: "^19.0.0" },
    "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
  },
})
```

**Deliverable:** Build configuration for Host and Remotes.  
**Gate:** Host dynamically mounts remote components at runtime without page refresh.

### Stage 3 — Zero-Trust Plugin Sandbox & Shadow DOM encapsulation (EXECUTE)

1. Wrap dynamic/agentic widgets in standard Web Components (`customElements.define`).
2. Attach `element.attachShadow({ mode: "closed" })` to strictly prevent CSS styles from bleeding into the parent application.

**Deliverable:** Secure plugin wrapper component.  
**Gate:** Malicious CSS (`* { display: none !important }`) inside a plugin cannot affect host application DOM.

### Stage 4 — Type-Safe Inter-App EventBus & IPC (EXECUTE)

Implement decoupled inter-application communication:
```typescript
// Type-safe EventBus Contract
export interface SodaAppEventMap {
  "WORKSPACE_CHANGED": { workspaceId: string };
  "GOAL_CREATED": { goalId: string; title: string };
  "AGENT_STATUS_UPDATE": { agentId: string; status: "IDLE" | "RUNNING" };
}
```

**Deliverable:** EventBus client package.  
**Gate:** Remotes communicate strictly via typed events; zero direct global window object mutations.

### Stage 5 — Remote Failure Resilience & Performance Verification (REVIEW)

- [ ] Simulate Remote CDN outage $\to$ Verify Host Shell displays graceful error fallback card instead of white-screening.
- [ ] Shared singleton verification: Inspect network tab to confirm `react` and design token packages are downloaded exactly once.
- [ ] Sub-application route transitions complete with zero layout jitter.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Structure large frontends into independently deployable Module Federation remotes | Allow micro-apps to inject unbounded global CSS styles into the host application |
| Isolate dynamic or untrusted agent widgets within Shadow DOM boundaries | Create circular runtime dependencies between remotes that deadlock bundle loading |
| Share core framework packages as singletons to minimize network bundle sizes | Permit direct DOM manipulation of host shell elements from within child remotes |

---

## Related

- [soda-system-architecture](../soda-system-architecture/SKILL.md) — System boundaries & DDD
- [soda-security-threat-modeling](../soda-security-threat-modeling/SKILL.md) — Security & sandboxing
- [soda-web-vitals-performance](../soda-web-vitals-performance/SKILL.md) — Performance & bundling
