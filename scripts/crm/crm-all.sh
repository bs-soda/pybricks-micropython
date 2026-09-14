#!/usr/bin/env bash
set -e

echo "🚀 ================================================================"
echo "   Sodality Creator Hub — Internal CRM Master 8-Phase Suite"
echo "=================================================================="

echo ""
echo "▶ Phase 1: Running Hierarchical Socratic Q&A Tree Search Benchmark..."
node scripts/harness/crm-hierarchical-search-harness.mjs

echo ""
echo "▶ Phase 2: Running Rust Axum CRM Gateway & In-Memory Store Suite..."
node scripts/harness/crm-backend-harness.mjs
cargo test --manifest-path code/Cargo.toml --package api --test crm_gateway_api

echo ""
echo "▶ Phase 3: Running Atomic UI & Design System Harness..."
node scripts/harness/crm-ui-harness.mjs

echo ""
echo "▶ Phase 4: Running Storybook 8 CDD Stories Harness (16 Stories across 9 Primitives & 7 Desks)..."
node scripts/harness/crm-storybook-cdd-harness.mjs

echo ""
echo "▶ Phase 5: Running Zero-Mock Live System Integration Harness..."
node scripts/harness/crm-live-integration-harness.mjs

echo ""
echo "▶ Phase 6: Running CRM Desk Crawler & Playwright E2E Harness..."
node scripts/harness/crm-desk-crawler-harness.mjs
node scripts/harness/crm-playwright-harness.mjs

echo ""
echo "▶ Phase 7: Running Internal CRM Lifecycle & Daemon Verification Harness..."
node scripts/harness/crm-lifecycle-harness.mjs

echo ""
echo "▶ Phase 8: Building Next.js Internal CRM Application..."
cd code && pnpm --filter internal-crm build

echo ""
echo "🏆 ================================================================"
echo "   All 8 Internal CRM Verification Passes Succeeded 100%!"
echo "=================================================================="
