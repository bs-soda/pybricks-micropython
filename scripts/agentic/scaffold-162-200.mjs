import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GOALS = [
  { id: "G-INFRA-162", title: "TikTok Shop Seller Order Cancellation Dispatcher", depends: "G-INFRA-085", blocks: "—", why: "Dispatches seller-initiated order cancellations and single line-item stock-out cancellations.", unblocks: "Seller Cancellation Dispatcher.", endpoints: "/return_refund/202309/cancellations", files: "code/apps/backend/api/src/cancellation_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-163", title: "TikTok Shop Order Cancellation Search & Filter Gateway", depends: "G-INFRA-085", blocks: "—", why: "Searches buyer- and seller-initiated order cancellations by time range and status.", unblocks: "Cancellation Search Gateway.", endpoints: "/return_refund/202309/cancellations/search", files: "code/apps/backend/api/src/cancellation_search_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-164", title: "TikTok Shop Buyer Cancellation Request Approval Gateway", depends: "G-INFRA-163", blocks: "—", why: "Approves buyer cancellation requests with idempotency key deduplication.", unblocks: "Cancellation Approval Gateway.", endpoints: "/return_refund/202309/cancellations/{cancel_id}/approve", files: "code/apps/backend/api/src/cancellation_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-165", title: "TikTok Shop Buyer Cancellation Request Rejection Gateway", depends: "G-INFRA-163", blocks: "—", why: "Rejects buyer cancellation requests when goods have already packed, attaching proof photos.", unblocks: "Cancellation Rejection Gateway.", endpoints: "/return_refund/202309/cancellations/{cancel_id}/reject", files: "code/apps/backend/api/src/cancellation_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-166", title: "TikTok Shop Aftersale Solution Eligibility Introspector", depends: "G-INFRA-085", blocks: "—", why: "Queries whether an order line-item is legally eligible for return, refund, or exchange.", unblocks: "Aftersale Eligibility Introspector.", endpoints: "/return_refund/202309/orders/{order_id}/aftersale_eligibility", files: "code/apps/backend/api/src/aftersale_eligibility_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-167", title: "TikTok Shop Exact Satang Refund Amount Policy Calculator", depends: "G-INFRA-085", blocks: "—", why: "Calculates precise refundable amounts including buyer service fees, shipping fees, and taxes.", unblocks: "Refund Policy Calculator.", endpoints: "/return_refund/202309/refunds/calculate", files: "code/apps/backend/api/src/refund_calculate_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-168", title: "TikTok Shop Rejection Reason Appendix & Localized Description Resolver", depends: "G-INFRA-036", blocks: "—", why: "Fetches official localized rejection reason codes for return and cancellation disputes.", unblocks: "Rejection Reason Resolver.", endpoints: "/return_refund/202309/reject_reasons", files: "code/apps/backend/api/src/reject_reasons_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-169", title: "TikTok Shop RMA Return Request Initiator", depends: "G-INFRA-085", blocks: "G-INFRA-171", why: "Initiates reverse logistics return requests for single or split packages with handover type.", unblocks: "RMA Return Initiator.", endpoints: "/return_refund/202309/returns", files: "code/apps/backend/api/src/return_create_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-170", title: "TikTok Shop RMA Return Orders Search & Status Filter Gateway", depends: "G-INFRA-085", blocks: "—", why: "Filters RMA return cases by arbitration status, return type, and creation time.", unblocks: "RMA Search Gateway.", endpoints: "/return_refund/202309/returns/search", files: "code/apps/backend/api/src/return_search_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-171", title: "TikTok Shop RMA Return & Refund Approval Gateway", depends: "G-INFRA-169", blocks: "—", why: "Approves return requests and triggers returnless refund or return-and-refund shipping labels.", unblocks: "RMA Approval Gateway.", endpoints: "/return_refund/202309/returns/{return_id}/approve", files: "code/apps/backend/api/src/return_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-172", title: "TikTok Shop RMA Return Inspection & Goods Rejection Gateway", depends: "G-INFRA-169", blocks: "—", why: "Rejects buyer returned items upon warehouse inspection with evidence photos and comment.", unblocks: "RMA Rejection Gateway.", endpoints: "/return_refund/202309/returns/{return_id}/reject", files: "code/apps/backend/api/src/return_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-173", title: "TikTok Shop RMA Return Audit History & Dispute Timeline Introspector", depends: "G-INFRA-169", blocks: "—", why: "Retrieves complete audit histories and platform arbitration deadlines for return disputes.", unblocks: "RMA Audit History Introspector.", endpoints: "/return_refund/202309/returns/{return_id}/records", files: "code/apps/backend/api/src/return_records_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-174", title: "TikTok Shop Reverse Logistics Courier Tracking Waybill Gateway", depends: "G-INFRA-169", blocks: "—", why: "Tracks return parcel shipments across J&T, Flash, Kerry, and platform reverse logistics.", unblocks: "Reverse Logistics Tracking Gateway.", endpoints: "/return_refund/202309/returns/{return_id}/tracking", files: "code/apps/backend/api/src/return_tracking_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-175", title: "TikTok Shop Warehouse Return Goods Receipt Confirmation Gateway", depends: "G-INFRA-169", blocks: "—", why: "Confirms receipt of returned items at warehouse to immediately unblock final refund release.", unblocks: "Return Receipt Confirmation Gateway.", endpoints: "/return_refund/202309/returns/{return_id}/confirm_received", files: "code/apps/backend/api/src/return_gateway.rs, crates/transport-kit/src/tiktok_return_client.rs" },
  { id: "G-INFRA-176", title: "TikTok Shop High-Throughput Order Search & Status Filter Adapter", depends: "G-INFRA-036", blocks: "—", why: "Searches thousands of orders concurrently across UNPAID, AWAITING_SHIPMENT, and DELIVERED states.", unblocks: "Order Search Adapter.", endpoints: "/order/202309/orders/search", files: "code/apps/backend/api/src/order_search_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-177", title: "TikTok Shop Single Order Line-Item & Customer Delivery Introspector", depends: "G-INFRA-036", blocks: "—", why: "Fetches full order details including masked PII addresses, buyer notes, and SKU price breakdown.", unblocks: "Order Detail Introspector.", endpoints: "/order/202309/orders/{order_id}", files: "code/apps/backend/api/src/order_detail_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-178", title: "TikTok Shop Order Statutory Tax, Commission & Price Breakdown Client", depends: "G-INFRA-036", blocks: "—", why: "Computes seller discount shares, platform subsidies, affiliate commissions, and tax withholding.", unblocks: "Order Price Breakdown Client.", endpoints: "/order/202309/orders/price_breakdown", files: "code/apps/backend/api/src/order_price_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-179", title: "TikTok Shop Blind Box SKU Order Attribution Callback Gateway", depends: "G-INFRA-036", blocks: "—", why: "Receives real-time blind box SKU selection reveals and maps physical inventory.", unblocks: "Blind Box Attribution Callback Gateway.", endpoints: "/order/202404/blind_box/callback", files: "code/apps/backend/api/src/blindbox_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-180", title: "TikTok Shop Multi-Order Consolidator & Combine Package Dispatcher", depends: "G-INFRA-176", blocks: "—", why: "Merges multiple orders for the same customer into a single consolidated fulfillment parcel.", unblocks: "Order Consolidator Dispatcher.", endpoints: "/order/202406/orders/combine_pkg", files: "code/apps/backend/api/src/order_combine_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-181", title: "TikTok Shop Multi-SKU Order Line-Item Splitter & Sub-Package Dispatcher", depends: "G-INFRA-176", blocks: "—", why: "Splits multi-item orders across different warehouse dispatch centers into separate parcels.", unblocks: "Order Splitter Dispatcher.", endpoints: "/order/202406/orders/split_pkg", files: "code/apps/backend/api/src/order_split_gateway.rs, crates/transport-kit/src/tiktok_order_client.rs" },
  { id: "G-INFRA-182", title: "TikTok Shop Fulfillment Package List & Dispatch Queue Gateway", depends: "G-INFRA-036", blocks: "—", why: "Retrieves pending fulfillment packages ready for pick, pack, and label printing.", unblocks: "Fulfillment Package Queue Gateway.", endpoints: "/fulfillment/202309/packages", files: "code/apps/backend/api/src/package_list_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-183", title: "TikTok Shop Single Package Weight, Dimension & Carrier Introspector", depends: "G-INFRA-036", blocks: "—", why: "Introspects package physical dimensions, volumetric weight, and assigned shipping provider.", unblocks: "Package Detail Introspector.", endpoints: "/fulfillment/202309/packages/{package_id}", files: "code/apps/backend/api/src/package_detail_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-184", title: "TikTok Shop Carrier Pre-Shipment Weight & Dimension Verifier", depends: "G-INFRA-183", blocks: "G-INFRA-185", why: "Submits pre-shipment package verification to validate carrier weight surcharges before handover.", unblocks: "Package Pre-Shipment Verifier.", endpoints: "/fulfillment/202309/packages/{package_id}/verify", files: "code/apps/backend/api/src/package_verify_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-185", title: "TikTok Shop Package Dispatch & Carrier Handover Sign-Off Gateway", depends: "G-INFRA-184", blocks: "—", why: "Signals package dispatched and locks tracking waybill with the 3PL carrier.", unblocks: "Package Dispatch Sign-Off Gateway.", endpoints: "/fulfillment/202309/packages/{package_id}/ship", files: "code/apps/backend/api/src/package_ship_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-186", title: "TikTok Shop Thermal Shipping Label 4x6 PDF & ZPL Generator Client", depends: "G-INFRA-183", blocks: "—", why: "Generates high-resolution 4x6 thermal shipping label PDF and ZPL streams for barcode printing.", unblocks: "Thermal Shipping Label Generator.", endpoints: "/fulfillment/202309/packages/shipping_documents", files: "code/apps/backend/api/src/shipping_label_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-187", title: "TikTok Shop Logistics 3PL Pickup Window & Slot Reservation Gateway", depends: "G-INFRA-036", blocks: "—", why: "Schedules warehouse pickup windows with 3PL carriers (DHL, J&T, Flash Express).", unblocks: "3PL Pickup Slot Reservation Gateway.", endpoints: "/fulfillment/202309/packages/handover_time_slots", files: "code/apps/backend/api/src/handover_slots_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-188", title: "TikTok Shop Courier Manifest Batch Handover Confirmation Client", depends: "G-INFRA-187", blocks: "—", why: "Confirms batch handover of parcels upon courier driver arrival, signing the digital manifest.", unblocks: "Courier Manifest Handover Confirmation Client.", endpoints: "/fulfillment/202309/packages/handover", files: "code/apps/backend/api/src/handover_confirm_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-189", title: "TikTok Shop Outbound Real-Time Last-Mile Tracking Events Stream", depends: "G-INFRA-183", blocks: "—", why: "Streams real-time milestone events (In Transit, Out for Delivery, Delivered, Failed Delivery).", unblocks: "Real-Time Tracking Events Stream.", endpoints: "/fulfillment/202309/packages/{package_id}/tracking", files: "code/apps/backend/api/src/package_tracking_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-190", title: "TikTok Shop Official e-Tax Invoice & VAT Document Dispatcher", depends: "G-INFRA-085", blocks: "—", why: "Generates and transmits compliant statutory e-Tax invoices and VAT receipts to buyers.", unblocks: "Official e-Tax Invoice Dispatcher.", endpoints: "/fulfillment/202409/packages/tax_invoices", files: "code/apps/backend/api/src/tax_invoice_gateway.rs, crates/transport-kit/src/tiktok_fulfillment_client.rs" },
  { id: "G-INFRA-191", title: "TikTok Shop Settlement Statement Journal Search & Period Filter Gateway", depends: "G-INFRA-036", blocks: "—", why: "Searches daily and bi-weekly settlement journals across accounting periods.", unblocks: "Settlement Statement Search Gateway.", endpoints: "/finance/202309/statements/search", files: "code/apps/backend/api/src/finance_statement_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-192", title: "TikTok Shop Settlement Statement Journal Line-Item Breakdown Introspector", depends: "G-INFRA-191", blocks: "—", why: "Provides row-by-row accounting breakdown of GMV, commissions, platform vouchers, and logistics fees.", unblocks: "Statement Breakdown Introspector.", endpoints: "/finance/202309/statements/{statement_id}", files: "code/apps/backend/api/src/finance_statement_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-193", title: "TikTok Shop Net Payment Settlement Batches Search BFF Adapter", depends: "G-INFRA-036", blocks: "—", why: "Searches disbursed payment settlements transferred to the seller's commercial bank account.", unblocks: "Net Settlement Batches Search Adapter.", endpoints: "/finance/202309/settlements/search", files: "code/apps/backend/api/src/finance_settlement_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-194", title: "TikTok Shop Net Payment Settlement Detail & Bank Transfer Introspector", depends: "G-INFRA-193", blocks: "—", why: "Fetches bank transfer reference numbers, bank clearing codes, and exact net paid amounts.", unblocks: "Payment Settlement Detail Introspector.", endpoints: "/finance/202309/settlements/{settlement_id}", files: "code/apps/backend/api/src/finance_settlement_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-195", title: "TikTok Shop Financial Order Transaction Escrow Search Client", depends: "G-INFRA-036", blocks: "—", why: "Searches financial order escrow holdings and unearned revenue balances.", unblocks: "Financial Order Escrow Search Client.", endpoints: "/finance/202309/orders/search", files: "code/apps/backend/api/src/finance_order_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-196", title: "TikTok Shop Financial Order Escrow & Fee Breakdown Introspector", depends: "G-INFRA-195", blocks: "—", why: "Inspects order-level escrow release timelines and deductions prior to settlement closing.", unblocks: "Order Escrow Breakdown Introspector.", endpoints: "/finance/202309/orders/{order_id}", files: "code/apps/backend/api/src/finance_order_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-197", title: "TikTok Shop Seller Escrow Balance Withdrawal Search Gateway", depends: "G-INFRA-036", blocks: "—", why: "Searches merchant manual and automated fund withdrawal requests.", unblocks: "Escrow Balance Withdrawal Search Gateway.", endpoints: "/finance/202309/withdrawals/search", files: "code/apps/backend/api/src/finance_withdrawal_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-198", title: "TikTok Shop Seller Escrow Balance Withdrawal Status Introspector", depends: "G-INFRA-197", blocks: "—", why: "Tracks real-time bank clearing and disbursement states for seller withdrawals.", unblocks: "Withdrawal Status Introspector.", endpoints: "/finance/202309/withdrawals/{withdrawal_id}", files: "code/apps/backend/api/src/finance_withdrawal_gateway.rs, crates/transport-kit/src/tiktok_finance_client.rs" },
  { id: "G-INFRA-199", title: "TikTok Shop High-Level KPI & GMV Telemetry Aggregator", depends: "G-INFRA-036", blocks: "—", why: "Aggregates overall shop GMV, order volume, return rate, and buyer impressions into executive dashboards.", unblocks: "Shop KPI Telemetry Aggregator.", endpoints: "/analytics/202309/shops/core_stats", files: "code/apps/backend/api/src/analytics_shop_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs" },
  { id: "G-INFRA-200", title: "TikTok Shop SKU Product Conversion Rate & Page View Telemetry Client", depends: "G-INFRA-036", blocks: "—", why: "Tracks product-level conversion funnels (Impressions -> Click-Through -> Add-to-Cart -> Purchase).", unblocks: "SKU Conversion Telemetry Client.", endpoints: "/analytics/202309/products/{product_id}/core_stats", files: "code/apps/backend/api/src/analytics_product_gateway.rs, crates/transport-kit/src/tiktok_analytics_client.rs" }
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
| **Decisions** | ADR-0004, DOC-RAW-20260902-ORDERS-RETURNS-FINANCE-BLUEPRINT |
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
