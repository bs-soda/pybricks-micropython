import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  {
    id: "G-INFRA-111",
    title: "TikTok Shop AI Attribute Recommendation Request Client",
    kind: "api",
    depends: "G-INFRA-063, G-INFRA-064",
    blocks: "G-INFRA-061",
    why: "Requesting real-time AI attribute recommendations ensures product attributes (materials, fit, pattern, power source) are populated accurately to boost search discoverability.",
    unblocks: "AI Auto-Complete Attribute Suggester in Brand Portal.",
    endpoints: "/product/202501/attribute_recommendation_request",
    files: "code/apps/backend/api/src/product_attribute_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-112",
    title: "TikTok Shop Global Listing Rules & Multi-Region Policy Introspector",
    kind: "api",
    depends: "G-INFRA-070",
    blocks: "G-INFRA-071",
    why: "Multi-market merchants must validate cross-border regional restrictions before publishing to avoid market-specific compliance suspensions.",
    unblocks: "Global Multi-Market Compliance Validator.",
    endpoints: "/product/202507/global_listing_rules",
    files: "code/apps/backend/api/src/global_product_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs"
  },
  {
    id: "G-INFRA-113",
    title: "TikTok Shop Product Partial Edit & Differential Patching Gateway",
    kind: "api",
    depends: "G-INFRA-061",
    blocks: "—",
    why: "Full product updates risk overwriting concurrent edits; JSON differential patching allows fast atomic updates to single fields.",
    unblocks: "Sub-100ms Atomic Product Partial Patching.",
    endpoints: "/product/202509/products/{product_id}/partial_edit",
    files: "code/apps/backend/api/src/product_patch_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-114",
    title: "TikTok Shop Global Product Partial Edit & Multi-Market Delta Gateway",
    kind: "api",
    depends: "G-INFRA-070, G-INFRA-113",
    blocks: "—",
    why: "Atomic field edits to a master global product must selectively propagate differential deltas to linked regional shop listings.",
    unblocks: "Global-to-Local Cascading Partial Patching.",
    endpoints: "/product/202509/global_products/{global_product_id}/partial_edit",
    files: "code/apps/backend/api/src/global_product_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs"
  },
  {
    id: "G-INFRA-115",
    title: "TikTok Shop Product Lifecycle State Transitions (Activate, Deactivate, Recover) Daemon",
    kind: "api",
    depends: "G-INFRA-061",
    blocks: "—",
    why: "Automating product deactivation on stock-outs and instant recovery on warehouse replenishment protects seller rating SLAs.",
    unblocks: "Autonomous Product State Machine Transition Daemon.",
    endpoints: "/product/202309/products/activate, /product/202309/products/deactivate, /product/202309/products/recover",
    files: "code/apps/backend/api/src/product_lifecycle_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs"
  },
  {
    id: "G-INFRA-116",
    title: "TikTok Shop Warehouse Multi-SKU Inventory Search & Allocation Daemon",
    kind: "api",
    depends: "G-INFRA-062",
    blocks: "—",
    why: "Querying live stock levels across multiple localized warehouses prevents overselling and routes orders to the closest fulfillment node.",
    unblocks: "Multi-Warehouse Real-Time Stock Allocation Engine.",
    endpoints: "/product/202309/inventory/search",
    files: "code/apps/backend/api/src/inventory_gateway.rs, crates/transport-kit/src/tiktok_inventory_client.rs"
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
