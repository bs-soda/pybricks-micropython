import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  {
    id: "G-INFRA-428",
    title: "TikTok Shop Live Room Real-Time GMV Trend Points Gateway",
    kind: "api",
    depends: "G-INFRA-103",
    blocks: "—",
    why: "Fetches minute-by-minute granular GMV trend performance data points during active live streams.",
    unblocks: "Live Stream Real-Time GMV Curve Visualizer.",
    endpoints: "/analytics/202309/live_rooms/{live_room_id}/gmv_trend_performances",
    files: "code/apps/backend/api/src/analytics_livestream_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  },
  {
    id: "G-INFRA-429",
    title: "TikTok Shop Live Stream Traffic Channel Distribution Gateway",
    kind: "api",
    depends: "G-INFRA-103",
    blocks: "—",
    why: "Retrieves traffic channel performance metrics (For You Page, Following feed, Live tab) for live stream attribution analysis.",
    unblocks: "Live Stream Traffic Source Distribution Analytics.",
    endpoints: "/analytics/202309/live_rooms/{live_room_id}/traffic_performances",
    files: "code/apps/backend/api/src/analytics_livestream_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  }
];

const basePath = resolve(process.cwd(), 'docs/07-backlog/goals');

for (const g of GOALS) {
  const content = `# ${g.id}: ${g.title}

**Status:** draft  
**Kind:** ${g.kind}  
**Epic:** INFRA  
**Depends on:** ${g.depends}  
**Blocks:** ${g.blocks}  
**Spec stability:** clarify pending · spec check pending · analyze pending  

#### Plan

**Collaboration phase:** DEFINE

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Create API client methods in \`${g.files.split(',')[1].trim()}\` targeting \`${g.endpoints.split(',')[0].trim()}\` | pending |
| 2 | Expose REST endpoints in \`${g.files.split(',')[0].trim()}\` | pending |
| 3 | Map domain models and enforce Satang integer / RFC 3339 data invariants | pending |
| 4 | Write integration unit tests verifying payload formatting and error translation | pending |

## Context

Powers enterprise TikTok Shop integration for Sodality Creator Hub. Implements \`${g.endpoints}\`.

## Intent

**Why:** ${g.why}

**Done when:** BFF exposes REST endpoints and client communicates with TikTok Shop OpenAPI.

**Unblocks:** ${g.unblocks}

## How

> Fill after \`clarify ${g.id}\`.

**Stack / approach:** Rust Axum, \`crates/transport-kit\`, \`crates/domain\`.

## Open questions

- [ ] [NEEDS CLARIFICATION: What rate limit token bucket allocation should be assigned to this endpoint cluster?]

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-TIKTOK-OPENAPI-INTEGRATION |
| **Decisions** | ADR-0004, DOC-RAW-20260902-COMPLETE-OPENAPI-BLUEPRINT |
| **Assumptions required** | A-TIKTOK-SELLER-TOKEN-ACTIVE |
| **Evidence** | E-TIKTOK-OPENAPI-DOCV2-SPEC |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | ADR-0004 |
| **Acceptance** | \`docs/02-product/acceptance/${g.id}.md\` |
| **Skills** | \`soda-rest-api\`, \`tts-openapi-guide\` |
| **Profile** | \`backend-api\` |
| **Task type** | \`add_api\` |
| **Files** | \`${g.files}\` |
| **Constraints** | Zero Mocks, Zero Stubs |

## Work steps

1. Add routes in \`${g.files.split(',')[0].trim()}\`.
2. Implement client methods in \`${g.files.split(',')[1].trim()}\`.
3. Add contract tests for endpoint validation.
`;

  writeFileSync(resolve(basePath, `${g.id}.md`), content, 'utf8');
  console.log(`Created ${g.id}.md`);
}
