# Team workflow — goal-driven development with AI agents

> **For humans.** AI agents: read [AGENTS.md](../../AGENTS.md) and [dev-loop.md](dev-loop.md).

This document explains how **Sodality** runs every project with Cursor agents — goals, rules, and versioned skills so Human + Agent collaboration stays scoped and reviewable.

Framework reference: [design-spec.md](../03-architecture/design-spec.md) · Collaboration cycle: [team-workflow.md](team-workflow.md)

---

## 1. Human + Agent cycle (PR-First)

```mermaid
flowchart TB
  subgraph human["Human"]
    H1["Define goal & scope"]
    H2["Approve plan & spec"]
    H3["Review code & diff"]
    H4["Merge PR into develop"]
    H5["Approve staging release"]
  end

  subgraph agent["AI Agent"]
    A1["Discover context & map"]
    A2["Draft spec & contract"]
    A3["Execute on feature/G-xxx"]
    A4["Test & verify (zero mocks)"]
    A5["Push & generate PR"]
  end

  D["DEFINE"] --> P["PLAN"] --> E["EXECUTE"] --> R["REVIEW"] --> S["SHIP (PR-First)"]
  D --- H1 & A1
  P --- H2 & A2
  E --- A3 & A4
  R --- H3
  S --- H4 & H5 & A5
  S --> D
```

| Collaboration phase | Human | Agent | Docs / skills |
|-------|-------|-------|---------------|
| DEFINE | Scope, priority, discovery | Interview → evidence → map → PDR | `knowledge-map.json`, `knowledge-digest`, `assumptions`, brief, `soda-discovery` |
| PLAN | ADR, goal breakdown, **clarify / spec check** | Confirm scope, branch isolation on `feature/G-xxx`, ClickUp sync `ready` | `soda-goal-workflow` |
| EXECUTE | — | Code & test in touch map on `feature/G-xxx` after **`analyze G-xxx`**; ClickUp sync `in_progress` | `soda-rest-api`, `soda-db-migration`, `soda-testing`, … |
| REVIEW | Approve / request changes | Report diff, 5-lens audit, ClickUp sync `review` → `approved` | `soda-code-review` |
| SHIP (PR-First) | Review PR & merge into `develop`; approve staging deploy | Archive goal, ClickUp sync `done`, push to `origin/feature/G-xxx`, generate PR & checklist | `soda-goal-workflow` §8, `soda-deploy-staging` |

---

## 2. Big picture — where everything lives

```mermaid
flowchart TB
  subgraph humanTeam["Team (humans)"]
    PO["PO / Lead<br/>brief, scope, goals"]
    Dev["Developer<br/>prompt, review, merge PR"]
  end

  subgraph docsLayer["docs — source of truth"]
    Brief["02-product/"]
    API["03-architecture/api/"]
    Data["03-architecture/data/"]
    GoalsFile["07-backlog/goals.md"]
    ADR["05-decisions/"]
    DoDNode["definition-of-done.md"]
  end

  subgraph agentLayers["Cursor agent layers"]
    Rules[".agents/rules/\ngovernance + security + commits"]
    Skills[".agents/skills/soda-*/"]
    AgentsMD["AGENTS.md"]
  end

  PO --> Brief
  PO --> GoalsFile
  Dev -->|"ทำ G-xxx"| AgentsMD
  AgentsMD --> Rules
  AgentsMD --> GoalsFile
  AgentsMD --> Skills
  Skills --> API
  Skills --> Data
  GoalsFile --> DoDNode
  ADR --> Skills
```

| Layer | Who writes it | Who consumes it |
|-------|---------------|-----------------|
| `docs/02-product/` | PO / lead | Everyone + agent |
| `docs/03-architecture/api/`, `data/` | Dev + agent (per goal) | Everyone + agent |
| `docs/07-backlog/goals.md` | Planner | Agent picks **one** `ready` goal |
| `docs/05-decisions/` | Tech lead | Agent when linked in goal |
| `.agents/rules/` | Soda Agent OS + stack | Agent always |
| `.agents/skills/soda-*/` | Soda Agent OS | Agent when task matches |
| `AGENTS.md` | Bootstrap customize | Agent first read |

---

## 3. Goal lifecycle

```mermaid
stateDiagram-v2
  [*] --> draft: PO drafts goal\nspec only
  draft --> ready: Dependencies done\nacceptance contract clear
  ready --> in_progress: Dev assigns\n"ทำ G-xxx" (feature/G-xxx)
  in_progress --> review: Tests green\nimplementation complete
  review --> approved: Human approves\ncode-review skill
  review --> in_progress: Changes requested
  review --> blocked: External blocker
  approved --> done: Goal close + archive\npush to origin/feature/G-xxx
  done --> ship: Generate PR to develop\nHuman merges PR
  in_progress --> blocked: Blocked
  blocked --> ready: Unblocked
  ship --> [*]

  note right of draft
    Agent must NOT implement
  end note
  note right of ready
    Agent may pick when human starts
  end note
  note right of review
    Agent reports — no new features
  end note
  note right of approved
    Human signed off — ready to archive & ship
  end note
```

---

## 4. One dev round (one goal — PR-First)

```mermaid
flowchart LR
  A["1. Pick goal\nfeature/G-xxx"] --> B["2. Confirm scope\nacceptance contract"]
  B --> C["3. Execute\n+ skill"]
  C --> D["4. Test\nzero mocks"]
  D --> E{"Pass?"}
  E -->|No| C
  E -->|Yes| F["5. Review\nstatus → review\ncode-review skill"]
  F --> F2{"Human\napproves?"}
  F2 -->|No| C
  F2 -->|Yes| F3["status → approved"]
  F3 --> G["6. Close goal\narchive & docs/06_raw/"]
  G --> H["7. Commit & Push\norigin/feature/G-xxx"]
  H --> I["8. SHIP (PR-First)\ngenerate PR to develop"]
  I --> J["Human merges PR on GitHub"]
```

**Rule:** One goal = dedicated `feature/G-xxx` branch = zero local merge = one reviewable PR slice into `develop`.

---

## 5. Roles in one session

```mermaid
flowchart TB
  subgraph Planner["Planner"]
    P1["Write brief & scope"]
    P2["Break into G-001…"]
    P3["Set planned / ready"]
  end

  subgraph Implementer["Implementer (agent + dev)"]
    I1["Read active goal + skill"]
    I2["Code in touch map"]
  end

  subgraph Tester["Tester"]
    T1["soda-testing"]
    T2["Fix until green"]
  end

  subgraph Reviewer["Reviewer (human)"]
    R1["soda-code-review"]
    R2["Approve commit"]
  end

  subgraph Shipper["Shipper (human-led)"]
    S1["Approve staging deploy"]
    S2["Smoke test"]
  end

  Planner --> Implementer --> Tester --> Reviewer
  Reviewer --> Shipper
```

Same person can wear all hats — the **documents and skills** keep roles explicit.

---

## 6. How to talk to the agent

```mermaid
flowchart TD
  Start(["Developer opens Cursor"]) --> Read["Agent reads AGENTS.md\n+ active goal + skill"]
  Read --> Good{"Clear G-xxx?"}
  Good -->|Yes| Work["Implement goal"]
  Good -->|No| Vague{"Vague request?"}
  Vague -->|Yes| Stop["Stop — ask goal ID\nor draft planned goal"]
  Vague -->|No| Pick["Pick next ready goal"]
  Work --> Test["soda-testing"]
  Test --> Review["soda-code-review"]
  Review --> Commit{"User says commit?"}
  Commit -->|Yes| Done["G-xxx commit + close"]
  Commit -->|No| Wait["Wait for user"]
```

### Prompt cheat sheet

| ✅ Good | ❌ Avoid |
|---------|----------|
| discover — เริ่มสัมภาษณ์ Step 1 | ทำแอปให้เสร็จ (ไม่มี goal) |
| os health | OS KPI dashboard |
| trace G-xxx | Traceability % |
| pattern search | auto-accept ADR จาก pattern โดยไม่มี E-xxx |
| intake change — {อธิบายการเปลี่ยน} | promote goal ready โดยไม่ audit |
| ทำ G-005 ตาม goals.md | brief G-005 สับสนกับ discover |
| review diff G-005 | merge ให้เลย |
| approve G-005 | agent ปิด done เอง |
| deploy staging ตาม G-010 | deploy prod เอง |
| ต่อ goal ready ถัดไป | refactor ทั้ง repo |
| commit G-005 | commit ทุกอย่างที่แก้ |

### Bootstrap prompts (new project)

**Discovery (no code yet):**

```
discover
อ่าน soda-discovery skill และ knowledge-loop.md
เริ่ม Step 1 — Business — ถามทีละ step
บันทึก Evidence (E-xxx) + sync knowledge-map.json และ knowledge-digest.md
ยังไม่เขียน production code ยังไม่ promote goals เป็น ready
```

**Planner (after discovery locked):**

```
อ่าน AGENTS.md, project-brief.md, knowledge-digest.md
ช่วยแตก goals G-001… (planned) — บันทึก PDR สำหรับการตัด scope ที่ตัดไปแล้ว
ยังไม่เขียน production code
```

**First implementation:**

```
อ่าน AGENTS.md แล้วทำ G-001 ตาม goals.md
ใช้ soda-testing + soda-code-review ก่อนปิด goal
อย่า commit จนกว่าฉันจะสั่ง
```

---

## 7. Standard skills (always available)

See [skills-library.md](../04-agents/skills-library.md) for versions and changelog.

| Skill | Command triggers |
|-------|---------|
| `soda-learning-loop` | `observe`, `learn`, `post-ship G-xxx` |
| `soda-discovery` | `discover`, `coverage`, `trace G-xxx`, `pattern search`, change intake |
| `soda-goal-workflow` | Any G-xxx work · `clarify G-xxx` · `spec check G-xxx` · `analyze G-xxx` |
| `soda-rest-api` | API endpoints |
| `soda-testing` | Tests |
| `soda-code-review` | Before done / PR |
| `soda-deploy-staging` | SHIP / staging |
| `soda-incident-response` | Incidents |
| `soda-db-migration` | Schema changes |

## GitHub hard guards

See [github-governance.md](../06-workflows/github-governance.md) — PR template, governance CI, protected branches.

Add `{project}-*` skills only for conventions unique to one product.

---

## Related

- [dev-loop.md](dev-loop.md)
- [definition-of-done.md](definition-of-done.md)
- [../07-backlog/changelog.md](../07-backlog/changelog.md) — audit trail
- [github-governance.md](github-governance.md)
- [../04-agents/dev-roles.md](../04-agents/dev-roles.md)
- [../04-agents/skills-library.md](../04-agents/skills-library.md)
- [../07-backlog/goals.md](../07-backlog/goals.md)
- [../../AGENTS.md](../../AGENTS.md)
