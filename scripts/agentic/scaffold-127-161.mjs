import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  { id: "G-INFRA-127", title: "TikTok Shop Product Creation Microservice Gateway", depends: "G-INFRA-063, G-INFRA-064, G-INFRA-036", blocks: "G-INFRA-128", why: "Isolates initial product listing creation into an independent microservice with pre-flight schema validation.", unblocks: "Single-SKU Creation Pipeline.", endpoints: "/product/202309/products", files: "code/apps/backend/api/src/product_create_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-128", title: "TikTok Shop Product Full Update Microservice Gateway", depends: "G-INFRA-127", blocks: "—", why: "Handles full product entity rewrites with multi-attribute validation and conflict detection.", unblocks: "Full Product Update Pipeline.", endpoints: "/product/202309/products/{product_id}", files: "code/apps/backend/api/src/product_update_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-129", title: "TikTok Shop Product Bulk Deletion Microservice Gateway", depends: "G-INFRA-127", blocks: "—", why: "Allows bulk catalog pruning and purge operations with distributed safety locks.", unblocks: "Product Bulk Deletion Handler.", endpoints: "/product/202309/products", files: "code/apps/backend/api/src/product_delete_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-130", title: "TikTok Shop Product High-Performance Search & Filter BFF Adapter", depends: "G-INFRA-036", blocks: "—", why: "Powers high-speed faceted catalog filtering across shop ciphers and status states.", unblocks: "High-Performance Catalog Search BFF.", endpoints: "/product/202502/products/search", files: "code/apps/backend/api/src/product_search_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-131", title: "TikTok Shop Product Single-SKU Detail & Variant Metadata Introspector", depends: "G-INFRA-036", blocks: "—", why: "Fetches full variant matrices, package dimensions, warranty details, and media URIs.", unblocks: "Single-SKU Deep Introspector.", endpoints: "/product/202509/products/{product_id}", files: "code/apps/backend/api/src/product_detail_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-132", title: "TikTok Shop Atomic SKU Inventory Delta Synchronization Client", depends: "G-INFRA-036", blocks: "—", why: "Executes atomic inventory updates per warehouse with optimistic concurrency locks.", unblocks: "Atomic Stock Delta Synchronizer.", endpoints: "/product/202309/products/{product_id}/inventory/update", files: "code/apps/backend/api/src/product_inventory_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-133", title: "TikTok Shop Atomic SKU Price & Satang Currency Update Client", depends: "G-INFRA-036", blocks: "—", why: "Updates original and discounted prices with exact Satang integer precision.", unblocks: "Atomic Price & Satang Synchronizer.", endpoints: "/product/202309/products/{product_id}/prices/update", files: "code/apps/backend/api/src/product_price_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-134", title: "TikTok Shop AI Category Prediction & Auto-Assignment Client", depends: "G-INFRA-036", blocks: "—", why: "Predicts leaf categories using NLP on product titles, descriptions, and OCR image tags.", unblocks: "AI Category Auto-Assigner.", endpoints: "/product/202309/categories/recommend", files: "code/apps/backend/api/src/category_ai_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-135", title: "TikTok Shop Category Mandatory Rule & Size Chart Requirement Introspector", depends: "G-INFRA-063", blocks: "—", why: "Extracts category-specific mandatory requirements like COD, size charts, and certifications.", unblocks: "Category Rule Introspector.", endpoints: "/product/202309/categories/{category_id}/rules", files: "code/apps/backend/api/src/category_rules_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-136", title: "TikTok Shop Cross-Border Global Category Taxonomy Resolver", depends: "G-INFRA-036", blocks: "—", why: "Resolves global cross-border category trees applicable across multiple target countries.", unblocks: "Global Category Taxonomy Resolver.", endpoints: "/product/202309/global_categories", files: "code/apps/backend/api/src/global_category_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-137", title: "TikTok Shop Cross-Border Global Category AI Recommendation Engine", depends: "G-INFRA-136", blocks: "—", why: "Recommends standardized global categories for international multi-region product drafts.", unblocks: "Global Category AI Recommender.", endpoints: "/product/202309/global_categories/recommend", files: "code/apps/backend/api/src/global_category_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-138", title: "TikTok Shop Global Category Attribute Requirements Client", depends: "G-INFRA-136", blocks: "—", why: "Fetches global product properties and optional regional attribute requirements.", unblocks: "Global Category Attribute Client.", endpoints: "/product/202309/categories/{category_id}/global_attributes", files: "code/apps/backend/api/src/global_attribute_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-139", title: "TikTok Shop Global Category Compliance & Certification Rules Client", depends: "G-INFRA-136", blocks: "—", why: "Introspects EU/UK manufacturer, responsible person, and certification requirements for global categories.", unblocks: "Global Category Rules Client.", endpoints: "/product/202309/categories/{category_id}/global_rules", files: "code/apps/backend/api/src/global_rules_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-140", title: "TikTok Shop AI Brand Recognition & Auto-Attribution Client", depends: "G-INFRA-036", blocks: "—", why: "Automatically attributes authorized brand IDs based on title text and brand dictionary matching.", unblocks: "AI Brand Auto-Attribution Client.", endpoints: "/product/202309/brands/recommend", files: "code/apps/backend/api/src/brand_ai_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-141", title: "TikTok Shop Custom Brand Onboarding & Trademark Registry Gateway", depends: "G-INFRA-036", blocks: "—", why: "Enables private-label merchants to register custom brands directly on TikTok Shop.", unblocks: "Custom Brand Registry Gateway.", endpoints: "/product/202309/brands", files: "code/apps/backend/api/src/brand_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-142", title: "TikTok Shop Regulatory Qualification File & Certificate PDF CDN Upload Gateway", depends: "G-INFRA-036", blocks: "—", why: "Uploads legal qualification certificates, MSDS PDFs, and test reports to TikTok CDN.", unblocks: "Qualification File Upload Gateway.", endpoints: "/product/202309/files/upload", files: "code/apps/backend/api/src/file_upload_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-143", title: "TikTok Shop Product Image Super-Resolution & Clarity AI Optimizer", depends: "G-INFRA-066", blocks: "—", why: "Enhances product image clarity, contrast, and resolution via TikTok AI image enhancement.", unblocks: "Image Super-Resolution AI Optimizer.", endpoints: "/product/202404/images/optimize", files: "code/apps/backend/api/src/image_optimizer_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-144", title: "TikTok Shop Standard Size Chart Template Search & Filter Client", depends: "G-INFRA-036", blocks: "—", why: "Searches pre-existing size chart templates by category to bind to new apparel listings.", unblocks: "Size Chart Template Search Client.", endpoints: "/product/202407/sizecharts/search", files: "code/apps/backend/api/src/sizechart_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-145", title: "TikTok Shop Master Global Product Creation Gateway", depends: "G-INFRA-136, G-INFRA-036", blocks: "G-INFRA-146", why: "Creates the top-level parent Global Product entity in TikTok's cross-border catalog.", unblocks: "Master Global Product Creator.", endpoints: "/product/202309/global_products", files: "code/apps/backend/api/src/global_product_create_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-146", title: "TikTok Shop Master Global Product Full Update Gateway", depends: "G-INFRA-145", blocks: "—", why: "Updates master global product specifications, global SKUs, and global media assets.", unblocks: "Master Global Product Updater.", endpoints: "/product/202309/global_products/{global_product_id}", files: "code/apps/backend/api/src/global_product_update_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-147", title: "TikTok Shop Master Global Product Bulk Deletion Gateway", depends: "G-INFRA-145", blocks: "—", why: "Deletes master global products and handles cascading de-linking of regional products.", unblocks: "Master Global Product Deletion Gateway.", endpoints: "/product/202309/global_products", files: "code/apps/backend/api/src/global_product_delete_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-148", title: "TikTok Shop Master Global Product Multi-Region Publishing Dispatcher", depends: "G-INFRA-145", blocks: "—", why: "Publishes a global parent product into specific local country markets (TH, MY, SG, etc.).", unblocks: "Global Multi-Region Publishing Dispatcher.", endpoints: "/product/202309/global_products/{global_product_id}/publish", files: "code/apps/backend/api/src/global_product_publish_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-149", title: "TikTok Shop Global Product Pre-Publish Compliance Validator", depends: "G-INFRA-145", blocks: "—", why: "Runs pre-flight validation on global product drafts before triggering multi-region publishing.", unblocks: "Global Product Compliance Validator.", endpoints: "/product/202404/global_products/listing_check", files: "code/apps/backend/api/src/global_product_check_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-150", title: "TikTok Shop Global Master Product Catalog Search BFF Adapter", depends: "G-INFRA-036", blocks: "—", why: "Searches and filters the global master product catalog across international brands.", unblocks: "Global Catalog Search BFF Adapter.", endpoints: "/product/202312/global_products/search", files: "code/apps/backend/api/src/global_product_search_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-151", title: "TikTok Shop Global Master Product Detail & Linked Shops Introspector", depends: "G-INFRA-036", blocks: "—", why: "Retrieves complete global product specs along with a breakdown of linked local shops.", unblocks: "Global Product Detail Introspector.", endpoints: "/product/202309/global_products/{global_product_id}", files: "code/apps/backend/api/src/global_product_detail_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-152", title: "TikTok Shop Global Master Product Multi-Warehouse Inventory Synchronizer", depends: "G-INFRA-145", blocks: "—", why: "Updates inventory quantities for global SKUs across regional warehouse nodes.", unblocks: "Global Multi-Warehouse Stock Synchronizer.", endpoints: "/product/202309/global_products/{global_product_id}/inventory/update", files: "code/apps/backend/api/src/global_inventory_gateway.rs, crates/transport-kit/src/tiktok_global_product_client.rs" },
  { id: "G-INFRA-153", title: "TikTok Shop Product Title & Description AI Optimization Suggester", depends: "G-INFRA-036", blocks: "—", why: "Generates AI suggestions for titles, bullet points, and keywords to improve listing conversion.", unblocks: "AI Listing Title & Description Suggester.", endpoints: "/product/202405/products/suggestions", files: "code/apps/backend/api/src/product_suggestions_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-154", title: "TikTok Shop Product 100-Point Listing Quality Score Diagnostic Gateway", depends: "G-INFRA-036", blocks: "—", why: "Fetches granular diagnostic scores across image dimensions, title length, and attribute completeness.", unblocks: "Listing Quality Diagnostic Gateway.", endpoints: "/product/202405/products/diagnoses", files: "code/apps/backend/api/src/product_diagnoses_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-155", title: "TikTok Shop Listing Quality 1-Click Automated Auto-Repair Engine", depends: "G-INFRA-154", blocks: "—", why: "Automatically applies diagnostic recommendations to fix listing quality defects in 1 click.", unblocks: "Listing Quality Auto-Repair Engine.", endpoints: "/product/202411/products/diagnose_optimize", files: "code/apps/backend/api/src/product_diagnose_optimize_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-156", title: "TikTok Shop EU GPSR Responsible Person Differential Patching Gateway", depends: "G-INFRA-077", blocks: "—", why: "Allows atomic partial updates to EU Responsible Person legal entity records without re-submission.", unblocks: "EU Responsible Person Patching Gateway.", endpoints: "/product/202409/compliance/responsible_persons/{responsible_person_id}/partial_edit", files: "code/apps/backend/api/src/compliance_patch_gateway.rs, crates/transport-kit/src/tiktok_compliance_client.rs" },
  { id: "G-INFRA-157", title: "TikTok Shop EU GPSR Responsible Persons Search & Registry Explorer", depends: "G-INFRA-077", blocks: "—", why: "Searches and filters registered EU Responsible Persons to bind to compliant listings.", unblocks: "EU Responsible Persons Search Explorer.", endpoints: "/product/202501/compliance/responsible_persons/search", files: "code/apps/backend/api/src/compliance_search_gateway.rs, crates/transport-kit/src/tiktok_compliance_client.rs" },
  { id: "G-INFRA-158", title: "TikTok Shop EU GPSR Manufacturer Entity Differential Patching Gateway", depends: "G-INFRA-077", blocks: "—", why: "Allows atomic partial updates to EU Manufacturer legal entity records.", unblocks: "EU Manufacturer Patching Gateway.", endpoints: "/product/202409/compliance/manufacturers/{manufacturer_id}/partial_edit", files: "code/apps/backend/api/src/compliance_patch_gateway.rs, crates/transport-kit/src/tiktok_compliance_client.rs" },
  { id: "G-INFRA-159", title: "TikTok Shop EU GPSR Manufacturers Search & Registry Explorer", depends: "G-INFRA-077", blocks: "—", why: "Searches and filters registered EU Manufacturers to bind to compliant listings.", unblocks: "EU Manufacturers Search Explorer.", endpoints: "/product/202501/compliance/manufacturers/search", files: "code/apps/backend/api/src/compliance_search_gateway.rs, crates/transport-kit/src/tiktok_compliance_client.rs" },
  { id: "G-INFRA-160", title: "TikTok Shop Candidate External Product Batch Differential Editor", depends: "G-INFRA-076", blocks: "—", why: "Executes batch partial modifications to external candidate listings before publishing.", unblocks: "Candidate Product Batch Differential Editor.", endpoints: "/product/202409/candidate_products/partial_edit/batch", files: "code/apps/backend/api/src/candidate_batch_editor_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" },
  { id: "G-INFRA-161", title: "TikTok Shop External Store Catalog Mapping & Sync Status Query Client", depends: "G-INFRA-076", blocks: "—", why: "Queries external store catalog mapping status and synchronization sync health.", unblocks: "External Catalog Mapping Query Client.", endpoints: "/product/202506/external_products", files: "code/apps/backend/api/src/external_products_query_gateway.rs, crates/transport-kit/src/tiktok_product_client.rs" }
];

const basePath = resolve(process.cwd(), 'docs/07-backlog/goals');

for (const g of GOALS) {
  const content = `# ${g.id}: ${g.title}

**Status:** draft  
**Kind:** api  
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
| **Decisions** | ADR-0004, DOC-RAW-20260902-100-PERCENT-ATOMIC-PRODUCT-BLUEPRINT |
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
