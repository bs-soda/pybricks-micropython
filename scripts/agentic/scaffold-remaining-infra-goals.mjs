import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  {
    id: "G-INFRA-085",
    title: "TikTok Shop Order Search, Detail & Status Ingestion BFF Proxy",
    kind: "api",
    depends: "G-INFRA-036",
    blocks: "G-INFRA-087, G-INFRA-089",
    why: "Order ingestion is the foundational data stream for order tracking, fulfillment, and revenue allocation across shops.",
    unblocks: "Order Management System in Brand Portal.",
    endpoints: "/order/202309/orders, /order/202309/orders/search, /order/202309/privileged_orders",
    files: "code/apps/backend/api/src/order_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs"
  },
  {
    id: "G-INFRA-086",
    title: "TikTok Shop External Marketplace Order Synchronization Client",
    kind: "api",
    depends: "G-INFRA-085",
    blocks: "—",
    why: "Merchants operating multi-channel storefronts need consolidated external order mapping to avoid inventory sync conflicts.",
    unblocks: "Multi-Channel External Order Sync in Brand Portal.",
    endpoints: "/order/202406/orders/external_orders, /order/202406/orders/external_order_search",
    files: "code/apps/backend/api/src/order_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs"
  },
  {
    id: "G-INFRA-087",
    title: "TikTok Shop Order Price Breakdown, Taxes & Satang Line-Item Calculator",
    kind: "api",
    depends: "G-INFRA-085",
    blocks: "G-INFRA-099",
    why: "Monetary reconciliation requires exact itemized tax, shipping fee, voucher discount, and creator commission calculations with zero float precision.",
    unblocks: "Line-Item Financial Breakdown & Tax Auditor.",
    endpoints: "/order/202407/orders/{order_id}/price_detail",
    files: "code/apps/backend/api/src/order_pricing_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs"
  },
  {
    id: "G-INFRA-088",
    title: "TikTok Shop Blind Box & Mystery SKU Callback Processing Worker",
    kind: "api",
    depends: "G-INFRA-085",
    blocks: "—",
    why: "Gamified mystery box orders require deterministic callback acknowledgement and inventory reservation on TikTok Shop.",
    unblocks: "Blind Box & Mystery SKU Fulfillment Handler.",
    endpoints: "/order/202511/orders/blind_box_result/callback",
    files: "code/apps/backend/api/src/order_blindbox_worker.rs, crates/transport-kit/src/tiktok_order_client.rs"
  },
  {
    id: "G-INFRA-089",
    title: "TikTok Shop Package Creation, Schedule & Shipping Label PDF Generator",
    kind: "api",
    depends: "G-INFRA-085, G-INFRA-036",
    blocks: "G-INFRA-091",
    why: "Automating package creation and PDF thermal shipping label rendering speeds up warehouse dispatch velocity by 80%.",
    unblocks: "1-Click Shipping Label Printing in Warehouse Dispatch Portal.",
    endpoints: "/fulfillment/202309/packages, /fulfillment/202309/packages/schedule, /fulfillment/202309/packages/{package_id}/shipping_documents",
    files: "code/apps/backend/api/src/fulfillment_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-090",
    title: "TikTok Shop Order Splitting, Package Combining & Uncombine Gateway",
    kind: "api",
    depends: "G-INFRA-089",
    blocks: "—",
    why: "Multi-item orders spanning different warehouses require multi-package splitting and cross-order parcel consolidation.",
    unblocks: "Smart Multi-Warehouse Package Splitter & Combiner.",
    endpoints: "/fulfillment/202309/orders/{order_id}/split, /fulfillment/202309/packages/combine, /fulfillment/202309/packages/{package_id}/uncombine",
    files: "code/apps/backend/api/src/fulfillment_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-091",
    title: "TikTok Shop Carrier Handover Time Slot Booking & Delivery Dispatch Client",
    kind: "api",
    depends: "G-INFRA-089",
    blocks: "—",
    why: "Booking courier pickup slots directly through OpenAPI prevents warehouse bottleneck delays and carrier SLA breaches.",
    unblocks: "Automated Courier Handover Scheduler.",
    endpoints: "/fulfillment/202309/packages/ship, /fulfillment/202309/orders/{order_id}/handover_time_slots",
    files: "code/apps/backend/api/src/fulfillment_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-092",
    title: "TikTok Shop First-Mile & Last-Mile Package Bundles Consolidator",
    kind: "api",
    depends: "G-INFRA-089",
    blocks: "—",
    why: "Consolidating multiple packages into first-mile/last-mile bag bundles is mandatory for high-volume cross-border fulfillment.",
    unblocks: "First-Mile & Last-Mile Bag Consolidation Gateway.",
    endpoints: "/fulfillment/202408/last_mile_bundles, /fulfillment/202510/first_mile_bundle",
    files: "code/apps/backend/api/src/fulfillment_bundle_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-093",
    title: "TikTok Shop E-Tax Invoice Upload & Digital VAT Document Gateway",
    kind: "api",
    depends: "G-INFRA-003, G-INFRA-085",
    blocks: "—",
    why: "Statutory tax compliance in Southeast Asia and Europe requires transmitting certified PDF e-Tax invoices directly to buyers on TikTok Shop.",
    unblocks: "Automated e-Tax Invoice Dispatch to TikTok Buyers.",
    endpoints: "/fulfillment/202502/invoice/upload",
    files: "code/apps/backend/api/src/etax_fulfillment_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-094",
    title: "TikTok Shop Carrier Tracking Real-Time Validation & Delivery Status Client",
    kind: "api",
    depends: "G-INFRA-089",
    blocks: "—",
    why: "Real-time carrier tracking validation ensures automatic delivery confirmation and triggers escrow settlement release.",
    unblocks: "Live Delivery Status & Tracking Validator.",
    endpoints: "/fulfillment/202508/tts_tracking_validation, /fulfillment/202309/orders/{order_id}/tracking",
    files: "code/apps/backend/api/src/tracking_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs"
  },
  {
    id: "G-INFRA-095",
    title: "TikTok Shop Order Cancellation Review, Approval & Auto-Reject Client",
    kind: "api",
    depends: "G-INFRA-085",
    blocks: "G-INFRA-097",
    why: "Handling buyer cancellation requests within TikTok's 48-hour SLA prevents automatic platform cancellation penalties.",
    unblocks: "Order Cancellation Triage & Auto-Approval Rules Engine.",
    endpoints: "/return_refund/202309/cancellations, /return_refund/202309/cancellations/{cancel_id}/approve, /reject",
    files: "code/apps/backend/api/src/cancellation_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs"
  },
  {
    id: "G-INFRA-096",
    title: "TikTok Shop Returns & Reverse Logistics RMA Management Gateway",
    kind: "api",
    depends: "G-INFRA-019, G-INFRA-085",
    blocks: "G-INFRA-097",
    why: "Managing customer return requests, RMA authorizations, and warehouse receipt inspections protects merchant revenue against fraud.",
    unblocks: "Reverse Logistics & Customer Return Portal.",
    endpoints: "/return_refund/202309/returns, /return_refund/202309/returns/search, /return_refund/202309/returns/{return_id}/approve",
    files: "code/apps/backend/api/src/return_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs"
  },
  {
    id: "G-INFRA-097",
    title: "TikTok Shop Refund Satang Calculation & Aftersale Eligibility Checker",
    kind: "api",
    depends: "G-INFRA-095, G-INFRA-096",
    blocks: "G-INFRA-007",
    why: "Partial returns and price adjustments require exact mathematical refund calculations to prevent financial breakage.",
    unblocks: "Automated Refund Calculation Engine & Eligibility Guard.",
    endpoints: "/return_refund/202309/refunds/calculate, /return_refund/202309/orders/{order_id}/aftersale_eligibility",
    files: "code/apps/backend/api/src/refund_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs"
  },
  {
    id: "G-INFRA-098",
    title: "TikTok Shop Return Shipping Documents & Reverse Logistics Tracking Client",
    kind: "api",
    depends: "G-INFRA-096",
    blocks: "—",
    why: "Tracking buyer return shipments and downloading return shipping waybills ensures timely warehouse restocking.",
    unblocks: "Return Waybill Generator & Reverse Inbound Tracker.",
    endpoints: "/return_refund/202405/returns/shipping_documents, /return_refund/202309/returns/{return_id}/records",
    files: "code/apps/backend/api/src/return_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs"
  },
  {
    id: "G-INFRA-099",
    title: "TikTok Shop Financial Statements & Daily Settlement Journal Ingestion Client",
    kind: "api",
    depends: "G-INFRA-001, G-INFRA-036",
    blocks: "G-INFRA-102",
    why: "Daily settlement journal ingestion is required for ERP double-entry general ledger synchronization and IFRS 15 revenue recognition.",
    unblocks: "Daily Financial Settlement Ingestion & General Ledger Sync.",
    endpoints: "/finance/202309/statements, /finance/202309/statements/{statement_id}/statement_transactions",
    files: "code/apps/backend/api/src/finance_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs"
  },
  {
    id: "G-INFRA-100",
    title: "TikTok Shop Unsettled Escrow Balance & Merchant Withdrawal Telemetry Client",
    kind: "api",
    depends: "G-INFRA-099",
    blocks: "—",
    why: "Tracking unsettled escrow funds and bank withdrawal events gives merchants accurate cash-flow forecasts.",
    unblocks: "Escrow Pipeline & Bank Withdrawal Telemetry Dashboard.",
    endpoints: "/finance/202507/orders/unsettled, /finance/202309/withdrawals",
    files: "code/apps/backend/api/src/finance_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs"
  },
  {
    id: "G-INFRA-101",
    title: "TikTok Shop Merchant Statutory Tax Information & Withholding VAT Client",
    kind: "api",
    depends: "G-INFRA-099",
    blocks: "—",
    why: "Retrieving official TikTok platform tax withholding certificates and VAT breakdowns is mandatory for monthly tax filings.",
    unblocks: "Statutory Tax Withholding & VAT Filing Exporter.",
    endpoints: "/finance/202504/tax_information",
    files: "code/apps/backend/api/src/tax_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs"
  },
  {
    id: "G-INFRA-102",
    title: "Cross-Platform Order & Financial Ledger Reconciliation Worker",
    kind: "api",
    depends: "G-INFRA-085, G-INFRA-099",
    blocks: "—",
    why: "Continuous automated reconciliation between TikTok Shop orders, 3PL shipments, and bank payouts eliminates ledger drift.",
    unblocks: "Autonomous Ledger Reconciliation Worker & Audit Trail.",
    endpoints: "/data_reconciliation/202309/orders/sync, /data_reconciliation/202401/orders/import",
    files: "code/apps/backend/api/src/reconciliation_worker.rs, crates/transport-kit/src/tiktok_finance_client.rs"
  },
  {
    id: "G-INFRA-103",
    title: "TikTok Shop Live Stream Real-Time Traffic & GMV Pulse Telemetry Engine",
    kind: "api",
    depends: "G-INFRA-036",
    blocks: "—",
    why: "Real-time live room metrics (viewers, GMV velocity, conversion rate, interactive comments) drive live-stream co-pilot coaching.",
    unblocks: "Live Stream War Room & Real-Time GMV Telemetry in Creator Hub.",
    endpoints: "/analytics/202309/live_rooms/{live_room_id}/core_stats, /gmv_trend_performances, /traffic_performances",
    files: "code/apps/backend/api/src/analytics_livestream_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  },
  {
    id: "G-INFRA-104",
    title: "TikTok Shop Video & Short-Form Content Sales Attribution Ingestion Client",
    kind: "api",
    depends: "G-INFRA-036",
    blocks: "—",
    why: "Attributing creator video views and shares directly to product GMV enables dynamic rev-share bonuses and ROI calculations.",
    unblocks: "Creator Video Performance & GMV Attribution Engine.",
    endpoints: "/analytics/202403/videos/performances, /analytics/202409/shop_videos/performance",
    files: "code/apps/backend/api/src/analytics_video_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  },
  {
    id: "G-INFRA-105",
    title: "TikTok Shop Product & SKU Conversion Velocity Analytics Engine",
    kind: "api",
    depends: "G-INFRA-060, G-INFRA-036",
    blocks: "—",
    why: "Tracking SKU-level impressions, click-through rates, and cart-addition velocity identifies winning products for creator campaigns.",
    unblocks: "Product Conversion Funnel & SKU Velocity Analytics.",
    endpoints: "/analytics/202405/shop_products/performance, /analytics/202406/shop_skus/performance",
    files: "code/apps/backend/api/src/analytics_product_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  },
  {
    id: "G-INFRA-106",
    title: "TikTok Shop Hourly & Per-Minute Performance Aggregation Worker",
    kind: "api",
    depends: "G-INFRA-103, G-INFRA-104",
    blocks: "—",
    why: "High-density time-series data requires minute-level aggregation to render responsive sparklines and heatmaps without database overload.",
    unblocks: "Minute-Level Time-Series Aggregation Daemon.",
    endpoints: "/analytics/202510/shop/performance/{date}/performance_per_hour, /analytics/202510/shop_lives/{live_id}/performance_per_minutes",
    files: "code/apps/backend/api/src/analytics_aggregation_worker.rs, crates/transport-kit/src/tiktok_analytics_client.rs"
  },
  {
    id: "G-INFRA-107",
    title: "TikTok Shop Real-Time Customer Chat & Live Agent Messaging Bridge",
    kind: "api",
    depends: "G-INFRA-036",
    blocks: "G-INFRA-108",
    why: "Integrating TikTok Shop buyer chat directly into the admin desk enables AI support agents to resolve buyer inquiries within seconds.",
    unblocks: "Omnichannel Customer Support Chat & AI Agent Copilot.",
    endpoints: "/customer_service/202309/conversations, /customer_service/202309/conversations/{conversation_id}/messages",
    files: "code/apps/backend/api/src/customer_service_gateway.rs, crates/transport-kit/src/tiktok_chat_client.rs"
  },
  {
    id: "G-INFRA-108",
    title: "TikTok Shop Agent Performance & CSAT Analytics Gateway",
    kind: "api",
    depends: "G-INFRA-107",
    blocks: "—",
    why: "Monitoring agent first-response time (FRT), resolution time, and customer satisfaction prevents store health rating penalties.",
    unblocks: "Support Agent Performance & SLA Governance Dashboard.",
    endpoints: "/customer_service/202407/performance, /customer_service/202309/agents/settings",
    files: "code/apps/backend/api/src/customer_service_gateway.rs, crates/transport-kit/src/tiktok_chat_client.rs"
  },
  {
    id: "G-INFRA-109",
    title: "TikTok Shop Product Customer Reviews & Rating Moderation Gateway",
    kind: "api",
    depends: "G-INFRA-060, G-INFRA-036",
    blocks: "—",
    why: "Monitoring buyer reviews, rating sentiments, and customer media uploads enables automated replies and rapid quality triage.",
    unblocks: "Customer Review Management & AI Sentiment Analyzer.",
    endpoints: "/review_rating/202410/product_reviews, /review_rating/202410/media/upload",
    files: "code/apps/backend/api/src/review_gateway.rs, crates/transport-kit/src/tiktok_review_client.rs"
  },
  {
    id: "G-INFRA-110",
    title: "TikTok Shop Customer Engagement Tasks & Automated Message Campaign Client",
    kind: "api",
    depends: "G-INFRA-085, G-INFRA-036",
    blocks: "—",
    why: "Automated post-purchase messages, repurchase reminders, and abandoned cart follow-ups increase repeat purchase rates by 25-35%.",
    unblocks: "Automated Customer Engagement & Retention Campaign Engine.",
    endpoints: "/customer_engagement/202412/engagement_tasks, /customer_engagement/202412/messages, /customer_engagement/202412/performances",
    files: "code/apps/backend/api/src/customer_engagement_gateway.rs, crates/transport-kit/src/tiktok_engagement_client.rs"
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
