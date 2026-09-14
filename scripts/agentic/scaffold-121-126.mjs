import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  {
    id: "G-INFRA-121",
    title: "TikTok Shop Listing Prerequisites & Shop Qualification Gate",
    kind: "api",
    depends: "G-INFRA-036",
    blocks: "G-INFRA-061",
    why: "Verifying seller onboarding prerequisites (warehouse address setup, bank accounts, and category permissions) before attempting product creation prevents unhelpful platform API error cascades.",
    unblocks: "Pre-Listing Store Readiness & Qualification Gate.",
    endpoints: "/product/202309/prerequisites, /product/202312/prerequisites",
    files: "code/apps/backend/api/src/product_prerequisites_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-122",
    title: "Multi-Shop Batch Product Listing & Cross-Shop Replication Orchestrator",
    kind: "api",
    depends: "G-INFRA-061, G-INFRA-050",
    blocks: "—",
    why: "Multi-shop brand agencies must publish a single catalog across dozens of regional and partner shops concurrently without hitting rate limits.",
    unblocks: "Multi-Shop Concurrent Batch Listing Orchestrator.",
    endpoints: "/product/202409/candidate_products/batch, /product/202507/products/{product_id}/global_replicate",
    files: "code/apps/backend/api/src/batch_listing_orchestrator.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-123",
    title: "US 7-Level (L7) Category Tree (V2) & Shopify Metafield Attribute Mapper",
    kind: "api",
    depends: "G-INFRA-063, G-INFRA-064",
    blocks: "—",
    why: "US TikTok Shop listings mandate the 7-level deep V2 category tree and automated mapping of external ERP/Shopify metafield attributes to TikTok properties.",
    unblocks: "US L7 Deep Taxonomy & Shopify Metafield Adapter.",
    endpoints: "/product/202309/categories?category_version=v2, /product/202309/categories/{category_id}/attributes?category_version=v2",
    files: "code/apps/backend/api/src/us_category_mapper_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-124",
    title: "Product Status & Audit Result Webhook Ingestion Consumer",
    kind: "api",
    depends: "G-INFRA-055, G-INFRA-050",
    blocks: "—",
    why: "TikTok audits products asynchronously; consuming product status change webhooks via JetStream instantly alerts sellers to compliance rejections or approvals.",
    unblocks: "Real-Time Product Audit & Status Transition Ingestion.",
    endpoints: "WEBHOOK:product_status_change, WEBHOOK:product_audit_result",
    files: "code/apps/backend/api/src/product_audit_webhook_consumer.rs, crates/transport-kit/src/tiktok_webhook_client.rs"
  },
  {
    id: "G-INFRA-125",
    title: "Hazmat, Battery & Dangerous Goods Safety Certification Introspector",
    kind: "api",
    depends: "G-INFRA-064, G-INFRA-066",
    blocks: "G-INFRA-069",
    why: "Listing products containing lithium batteries or flammable liquids requires mandatory UN38.3/SDS safety certification uploads (`CAT-PRE-HAZMAT`).",
    unblocks: "Hazmat & Battery Safety Qualification Guard.",
    endpoints: "/product/202309/categories/{category_id}/rules, /product/202309/files/upload",
    files: "code/apps/backend/api/src/hazmat_compliance_gateway.rs, crates/transport-kit/src/tiktok_compliance_client.rs"
  },
  {
    id: "G-INFRA-126",
    title: "Cash-on-Delivery (COD) & Regional Fulfillment Restrictions Validator",
    kind: "api",
    depends: "G-INFRA-064, G-INFRA-068",
    blocks: "—",
    why: "Certain categories and island regions in SEA and LATAM forbid Cash-on-Delivery (COD) or enforce strict volumetric limits.",
    unblocks: "COD Policy & Volumetric Dimension Guard.",
    endpoints: "/product/202309/categories/{category_id}/rules",
    files: "code/apps/backend/api/src/cod_rules_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
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
| **Decisions** | ADR-0004, DOC-RAW-20260902-PRODUCT-SOLUTION-GUIDES-BLUEPRINT |
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
