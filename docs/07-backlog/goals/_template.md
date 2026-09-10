# G-PAY-001: [Short title]

**Status:** draft | planned | ready | in_progress | review | blocked | approved
**Kind:** feature *(feature | design | api | migration | qa | chore — a `design` goal routes to the `soda-design` skill)*
**Atomic outcome:** [One independently verifiable outcome; one goal must not contain multiple deliverables]
**Epic:** PAY *(slug from [epics.md](../epics.md); legacy `G-001` = CORE; base integration branch `epic/PAY` or `feature/PAY` — PR target, NEVER develop)*
**Depends on:** G-PAY-002 or —
**Blocks:** G-AUTH-001 or — *(optional — goals waiting on this one)*
**Spec stability:** clarify pending | done · spec check pending | done · analyze pending | done | n/a
*(clarify + spec check before `ready`. analyze before first **เริ่ม step N**. `n/a` = docs-only / no `code/`.)*

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP *(alias: Soda phase)*

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | [Mirror work step 1 below] | pending |
| 2 | [Mirror work step 2 below] | pending |
| 3 | [Verify test plan] | pending |

`pending` · `current` · `done` · `blocked` — mark one step `current` during EXECUTE.

## Context

1–3 sentences: where this goal sits (initiative, legacy gap, linked ADR or parent goal). Link specs the agent must read first.

### Scorecard & Baseline Evidence
- **Current score:** X/10 · **Expected score:** Y/10
- **Exact evidence:** [`path/to/file.c:line`](file:///absolute/path/to/file.c#L10-L20)
- **Root cause:** [Detailed mechanical root cause analysis]
- **Reproduction steps:**
  1. [Step 1 to trigger the defect]
  2. [Step 2 observing defect or crash]
  3. [Expected vs actual behavior]


## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** [Problem or opportunity — what breaks if we skip this?]

**Done when:** [Concrete deliverable — observable behaviour or doc state, not an implementation recipe]

**Unblocks:** [Downstream goals, repos, or teams]

## Atomicity & Zero-Mock Contract

- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.
- **No decomposition leakage:** Any second independently deployable outcome becomes a separate goal.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, hardcoded success responses, or string simulations in implementation or acceptance evidence.
- **Real boundary verification:** External dependencies use an approved sandbox, local executable implementation, recorded contract fixture, or integration environment that exercises the real boundary; a test double cannot be used to claim completion.
- **Failure behavior:** Missing dependency, unavailable model, or failed tool call must produce an explicit error/unknown state and must not be converted into success or safety.

## How *(PLAN only — leave empty while `draft`)*

> Fill after **`clarify G-PAY-001`**. Stack, ADR, and approach live here — never in Intent.

**Stack / approach:** —

### Proposed implementation strategy
- [Strategy step 1]
- [Strategy step 2]


## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

> Agent **must not guess**. Mark unknowns. Resolve here or in an ADR before **`promote G-xxx ready`**.

- [ ] [NEEDS CLARIFICATION: …]

## Knowledge links

> Sync to [knowledge-map.json](../../02-product/knowledge-map.json) → `goals[]`. **Why** must trace to at least one `P-xxx` or accepted PDR.

| Type | IDs |
|------|-----|
| **Pains addressed** | P-xxx |
| **Decisions** | PDR-xxx, ADR-xxx |
| **Assumptions required** *(must be validated before `ready`)* | A-xxx or — |
| **Evidence** | E-xxx *(optional — supporting)* |

## Context manifest

> **Compiler input** — like `package.json` for compile dependencies. [context-compiler.md](../../03-architecture/context-compiler.md)
> On `compile G-PAY-001`, compiler builds progressive `.bundle/G-PAY-001/cache/G-PAY-001-{hash}/`.

| Kind | IDs / paths |
|------|-------------|
| **ADR** | ADR-xxx or — |
| **PDR** | PDR-xxx or — |
| **Patterns** | ORG-xxx or — |
| **Acceptance** | `docs/02-product/acceptance/G-PAY-001.md` |
| **Skills** | `soda-rest-api` \| `soda-design` \| — |
| **Profile** | `backend-api` \| `qa` \| `product` \| `designer` |
| **Task type** | `add_api` \| `modify_existing_api` \| `db_migration` \| `qa_verify` \| `design_ui` \| `add_ui` \| `modify_ui` |
| **Playbook** | PB-xxx or — (compiler selects from tags) |
| **Default role** | `developer` \| `qa` \| … |
| **Files** | touch map globs (e.g. `code/src/auth/*`) |
| **Constraints** | C-xxx, scope boundary or — |

## Work steps

Ordered execution contract for **this card only** — Antigravity or another agent executes the same list. Do not label steps as "human" vs "AI". Every implementation step must be atomic and include its allowed files, ordered actions, completion gate, and failure/stop condition. Do not use broad instructions such as “implement the feature” or “run tests”.

### Step 1 — [Observable objective]

**Allowed files:** `path/to/file`
**Actions:**

1. [One concrete action]
2. [One concrete action]

**Completion gate:** [Exact test, invariant, or artifact that must pass]
**Stop condition:** [Failure that blocks the next step]

### Step 2 — [Observable objective]

**Allowed files:** `path/to/file`
**Actions:**

1. [One concrete action]
2. [One concrete action]

**Completion gate:** [Exact test, invariant, or artifact that must pass]
**Stop condition:** [Failure that blocks the next step]

### Step 3 — [Verification objective]

**Allowed files:** `path/to/test-or-report`
**Actions:**

1. [Run the scoped verification command]
2. [Record output and exit code]

**Completion gate:** [Exact green result required]
**Stop condition:** [Failure or human approval requirement]

## In

- ...

## Out

- ...

## Change delta *(brownfield — required when this goal touches existing behaviour)*

> Skip on pure greenfield. Forces ADD / CHANGE / REMOVE vs what exists — do not invent extra behaviour.

| Area | Action | Path / behaviour |
|------|--------|------------------|
| … | ADD / CHANGE / REMOVE | … |

## Software & Architecture Design *(AI Agent — PLAN phase)*

> Populated during PLAN by AI Agent using `soda-system-architecture` & `soda-agentic-discovery`.
> Enforces Domain-Driven Design (DDD), Hexagonal Ports & Adapters, Zero-Mock contracts, and Socratic Dialectic decomposition.

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/<Epic>` (PR Target — NEVER `develop`) |
| **System Archetype** | `backend-service` \| `event-stream` \| `api-gateway` \| `database-engine` \| `sre-control-plane` \| `web-ui` \| `mobile-app` \| `robot-kinematics-engine` \| `embedded-firmware` \| `pbio-device-driver` \| `micropython-binding` |
| **Bounded Context & Domain** | Core Domain \| Supporting Domain \| Generic Subdomain \| Robotics Kinematics \| Motor Control |
| **Ports & Adapters Topology** | Driving Inbound Ports: MicroPython QSTR API / Cooperative Async Poller <br> Driven Outbound Ports: PBIO Servos / IMU Gyro / Motor Drivers |
| **State Machine & Invariants** | FSM States: Idle -> Navigating -> Turning -> Pivoting -> Complete / Stalled / TimedOut <br> Compensation: Coordinated emergency stop & velocity ramping reset |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/<date_timestamp>_<topic>_socratic_5why.md` |

## Contract draft *(optional — API / schema design goals)*

> Remove this section if not applicable. Delta only — link [api/README.md](../../03-architecture/api/README.md) or project contract guide.

| Field / path | Action | Location |
|--------------|--------|----------|
| `...` | ADD / CHANGE / REMOVE | `...` |

## Spec checklist *(required `[x]` before `ready` — unit tests for this card)*

- [ ] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [ ] How is empty while `draft`; filled in PLAN after clarify
- [ ] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [ ] No `[NEEDS CLARIFICATION]` left in Open questions
- [ ] In / Out unambiguous; Out matches Scope Out
- [ ] Acceptance criteria each testable or reviewable
- [ ] Touch map is real repo paths
- [ ] Knowledge links: Why traces to `P-xxx` or accepted PDR
- [ ] Change delta filled if modifying existing behaviour
- [ ] Zero Mocks, Zero Stubs, Zero String Simulations (Article I non-negotiable invariant)
- [ ] Atomic Work Steps Contract (Allowed files, Ordered actions, Completion gate, Stop condition)
- [ ] Empirical Evidence Grounding (Measured raw trials, confidence intervals, no static score retention)
- [ ] FSM Single Source of Truth (State transitions routed strictly through transition helpers, zero direct mutation)
- [ ] Submodule & Repository Cleanliness (Submodules verified against .gitmodules with zero uncommitted working tree drift)
- [ ] Dispatcher Modularity (Complexity decoupled into isolated sub-controllers with shared conversion utilities)
- [ ] Multi-Environment Runtime Proof (Concrete build and test command outputs recorded in release artifacts)
- [ ] Sensor Calibration & Color Science Invariants (Two-point black/white reference calibration, circular hue topology, perceptual CIE Lab mapping)
- [ ] Statistical Prototype Modeling (Running mean, intra-class variance, sample count, and outlier rejection)
- [ ] Ambiguity & Margin Protection (Second-best margin calculation, confidence scoring, and fail-safe Color.NONE rejection)

## Acceptance criteria

- [ ] Testable criterion 1
- [ ] Testable criterion 2

## Test plan

- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `code/...`

## Touch map

- `path/to/...`
- `docs/03-architecture/api/...` (if API changes)
- `docs/03-architecture/data/...` (if domain rules change)

## Notes for AI

- Read: [link to architecture doc or ADR]
- Acceptance contract: [_template.md](../../02-product/acceptance/_template.md) (copy to `G-xxx.md` when `ready`)
- Skill: `soda-rest-api` | `soda-design` | `soda-db-migration` | `soda-deploy-staging` | —
- **Design goal** (`Kind: design` / `Profile: designer`): agent runs [soda-design](../../../.agents/skills/soda-design/SKILL.md) in PLAN — produce UX flow + UI spec, get human approval **before** build. See [design-loop.md](../../06-workflows/design-loop.md).
- Constraints: [non-obvious boundaries — what not to change]
- **"ทำ G-xxx"** → TodoWrite from Plan steps (chat UI); **`compile G-xxx`** before first **`เริ่ม step N`**
- **`clarify G-xxx`** → mark `[NEEDS CLARIFICATION]` — do not guess; required before `ready`
- **`spec check G-xxx`** → tick Spec checklist; required before `ready`
- **`analyze G-xxx`** → cross brief / ADR / goal / existing paths — required before first **`เริ่ม step N`**
- **`เริ่ม step N`** → read `step-N.md` + `action-step-N.yaml` only — execute, do not replan
- **External tools / MCP** (browser, Figma, …): only if this card names them — [external-tools.md](../../06-workflows/external-tools.md). Consumer connects the server; OS does not.
- Steps requiring human (UAT, prod verify): note here — agent marks `done` only after human confirms
- Update **Plan** table and [goals.md](../goals.md) **Dashboard** when phase or step changes

Writing guide: [goal-spec-guide.md](../../06-workflows/goal-spec-guide.md)

---

## 🏛️ Comprehensive Spec Design Appendix *(Mandatory Architecture & Contract Blueprint)*

> **Invariant:** Goal definition MUST include complete Spec Design before execution starts (`Zero-Mock & Deterministic Contract`).

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `State::Idle` | System bootstrap / Intent intake | Validated schema input | Transition to `State::Pending` | Reject with 400 Bad Request / `PBIO_ERROR_INVALID_ARG` |
| `State::Pending` | Authorization & Pre-flight check | Auth & rate-limit / motor setup valid | Transition to `State::Processing` | Return 401 Unauthorized / `PBIO_ERROR_BUSY` |
| `State::Processing` | Domain execution / Motion iteration | Invariant: Zero float math / Exact tick odometry | Transition to `State::Success` | Trigger Saga Compensation / Coordinated motor stop |
| `State::Success` | Event published / Motion target reached | 100% concrete types & tolerance met | Disburse / Persist outcome / Hold position | Audit ledger / Odometry log entry written |
| `State::DisputeFrozen` | Customer dispute / Motor stall / Timeout | Fault detected | Freeze release daemon / Stop motors | Human review gate / Raise `OSError(ETIMEDOUT)` |

### 2. Mathematical & Data Invariants

| Dimension | Standard / Specification |
|---|---|
| **Currency & Monetary Math** | Exact Satang integer arithmetic (`i64`/`u64` Satang/Cents). **ZERO float math**. |
| **Kinematic & Odometry Invariants** | Gear-ratio-scaled arc distance: $d_{wheel} = \frac{\Delta \theta_{motor}}{R_{gear}} \cdot \frac{\pi \cdot D}{360}$. Non-zero axle track and wheel diameter ($> 0$). |
| **Coordinate Frame & Angle Orientation** | ISO Standard CCW positive rotation ($\theta$), heading wrapped in $[-180^\circ, +180^\circ]$. Zero coordinate jump on state reset. |
| **Identifiers & Keys** | Time-ordered UUIDv7 (`uuid::Uuid::now_v7()`) or nanoid prefix (`ord_xxx`, `usr_xxx`). |
| **Timestamps & Temporal** | Strict UTC RFC 3339 with millisecond precision (`chrono::Utc::now()`) or monotonic milliseconds (`pbdrv_clock_get_ms()`). |
| **Idempotency & Deduplication** | `Idempotency-Key` header with 24-hour lease or single active motion lock per robot base instance. |

### 3. Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location |
|---|---|---|---|
| **Driving (Inbound)** | `HttpServerPort` / `MicroPythonBindingPort` | Axum HTTP/2 / MicroPython QSTR C dispatch | `pybricks/robotics/pb_type_mdrobotbase.c` |
| **Driven (Outbound)** | `DatabasePort` / `ServoActuatorPort` | SQLx PostgreSQL / PBIO Servo Motor Driver | `lib/pbio/src/mdrobotbase.c` & `lib/pbio/src/servo.c` |

### 4. UI/UX 5-State Matrix *(Applies when Kind is `design` or UI component)*

| UI State | Rendering Contract | Design Token / Tailwind Specs |
|---|---|---|
| **1. Default / Idle** | Primary component surface rendered with baseline data | `bg-surface-elevated text-content-primary rounded-lg border border-border-subtle` |
| **2. Loading / Pending** | Accessible shimmer skeleton sweep (`aria-busy="true"`) | `animate-pulse bg-surface-muted rounded` |
| **3. Empty State** | Helpful illustration + actionable call-to-action button | `text-content-secondary flex flex-col items-center justify-center p-8` |
| **4. Error State** | Human-readable error message + Retry trigger button | `bg-status-error-subtle text-status-error border-status-error rounded-md p-4` |
| **5. Success State** | Celebratory / updated state with spring micro-animation | `bg-status-success-subtle text-status-success transition-all duration-200` |

### 5. Mathematical Model & Numerical Invariants *(kinematics / control goals)*

- **Mathematical Model:** [Equations, coordinate frame orientation, units]
- **Invariants:**
  - Round-trip: $f^{-1}(f(x)) \approx x$
  - Pure spin: $\Delta x \approx 0, \Delta y \approx 0$
  - Pivot turn: locked wheel $d \approx 0$
  - Heading normalization: $\theta \in [-180.0^\circ, +180.0^\circ]$
- **Numerical Examples & Tolerances:**
  - Example: Input parameters -> Calculated motor targets $\pm$ tolerance

### 6. Failure Dynamics & Preemption Proof

- **Motor command silence on invalid input:** Proof that invalid arguments issue no motor commands and preserve active motions.
- **Consistent state on failure:** Proof that failure paths leave system in deterministic safe state.
- **Regression scenarios:** Scenarios tested to prevent reintroduction of the defect.

### 7. Optical Sensor Calibration & Perceptual Color Science Invariants *(color / sensor goals)*

- **Two-Point Calibration Model:**
  - Black reference: Dark current offset subtraction: $R' = R - R_0, G' = G - G_0, B' = B - B_0$.
  - White reference: Per-channel gain normalization: $R_{norm} = \text{clamp}\left(\frac{R - R_0}{R_w - R_0}, 0.0, 1.0\right)$.
- **Circular Hue Topology:**
  - Invariant: $dh(h_1, h_2) = \min(|h_1 - h_2|, 360^\circ - |h_1 - h_2|) \le 180^\circ$.
- **Perceptual Color Space:**
  - Standard CIE $L^*a^*b^*$ transformation for illumination-invariant Euclidean color distance $\Delta E_{ab}$.
- **Statistical Prototype Modeling (`color_class_t`):**
  - Online Welford's algorithm tracking mean vector $[\mu_h, \mu_s, \mu_v, \mu_L, \mu_a, \mu_b]$, intra-class variance $[\sigma_h^2, \sigma_s^2, \sigma_v^2, \sigma_{lab}^2]$, and sample count $N \ge 10$.
  - Outlier rejection: Discard samples exceeding $2.5\sigma$.
- **Ambiguity Margin & Confidence Guard:**
  - Margin invariant: $\text{Margin} = D_{\text{second\_best}} - D_{\text{best}}$.
  - Confidence calculation: $\text{Confidence} = \text{clamp}\left(\frac{\text{Margin}}{\text{Margin}_{\text{threshold}}}, 0.0, 1.0\right)$.
  - Fail-safe rejection: If $D_{\text{best}} > D_{\text{cutoff}}$ or $\text{Margin} < \text{Margin}_{\text{min}} \implies \text{Classify as } \text{Color.NONE} (0)$.
