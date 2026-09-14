import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  {
    id: "G-INFRA-117",
    title: "TikTok Shop Live Stream Showcase Product Pinning & Top Ranking Gateway",
    kind: "api",
    depends: "G-INFRA-046, G-INFRA-036",
    blocks: "—",
    why: "Affiliate creators and live stream hosts dynamically pin featured products and reorder showcase items to maximize in-stream conversion rates.",
    unblocks: "Live Stream Product Pinning & Real-Time Ranking Controller.",
    endpoints: "/affiliate/202309/live_rooms/products/pin, /affiliate/202309/live_rooms/products/{product_id}/unpin, /affiliate/202309/live_rooms/products/top",
    files: "code/apps/backend/api/src/affiliate_livestream_gateway.rs, crates/transport-kit/src/tiktok_affiliate_client.rs"
  },
  {
    id: "G-INFRA-118",
    title: "TikTok Shop Affiliate Open Collaboration Commission Rules & Auto-Approval Engine",
    kind: "api",
    depends: "G-INFRA-038, G-INFRA-036",
    blocks: "—",
    why: "Sellers need granular commission tiering and creator auto-approval filters to recruit affiliate creators at scale without manual vetting.",
    unblocks: "Affiliate Open Collaboration Policy & Auto-Approval Rules Engine.",
    endpoints: "/affiliate_seller/202405/open_collaboration_settings, /affiliate_seller/202405/open_collaborations/{id}/remove_creator",
    files: "code/apps/backend/api/src/affiliate_policy_gateway.rs, crates/transport-kit/src/tiktok_affiliate_client.rs"
  },
  {
    id: "G-INFRA-119",
    title: "TikTok Shop Creator Free Sample Application Quota & Logistics Pipeline",
    kind: "api",
    depends: "G-INFRA-048, G-INFRA-019",
    blocks: "—",
    why: "Creators apply for free product samples based on monthly quota tiers; automated validation and shipment tracking streamline creator sampling.",
    unblocks: "Creator Sample Quota Introspector & Inbound Delivery Pipeline.",
    endpoints: "/affiliate_creator/202501/free_samples/apply, /affiliate_creator/202501/free_samples/records",
    files: "code/apps/backend/api/src/affiliate_sample_gateway.rs, crates/transport-kit/src/tiktok_affiliate_client.rs"
  },
  {
    id: "G-INFRA-120",
    title: "TikTok Shop ePharmacy Regulated Product & Digital Prescription Validator",
    kind: "api",
    depends: "G-INFRA-069, G-INFRA-036",
    blocks: "—",
    why: "Healthcare and pharmaceutical items listed on TikTok Shop require statutory prescription verification and license validation before checkout.",
    unblocks: "ePharmacy Regulated Healthcare & License Compliance Guard.",
    endpoints: "/epharmacy/202409/prescriptions/verify",
    files: "code/apps/backend/api/src/epharmacy_gateway.rs, crates/transport-kit/src/tiktok_epharmacy_client.rs"
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
