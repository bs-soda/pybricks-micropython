#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════════════════
# 🚀  MASTER GOAL RUNNER: GOAL G-208
#     Brand Self-Service Refund Portal, Campaign Stage Eligibility Engine & Promo Reinstatement
# ════════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "================================================================================"
echo "🎯  EXECUTING GOAL G-208 PIPELINE"
echo "    Brand Self-Service Refund Portal & Campaign Stage Eligibility Engine"
echo "================================================================================"

echo ""
echo "[Step 1/5] Running Socratic 5-Why Dialectic Engine across 5 branches..."
node "${REPO_ROOT}/scripts/agentic/g208-brand-refund-eligibility-5why-socratic-engine.mjs"

echo ""
echo "[Step 2/5] Running Zero-Mock Production Test Harness..."
node "${REPO_ROOT}/scripts/harness/g208-brand-refund-eligibility-harness.mjs"

echo ""
echo "[Step 3/5] Running Rust Backend Unit & Integration Tests..."
cd "${REPO_ROOT}/code"
cargo test -p api --test brand_refund_api

echo ""
echo "================================================================================"
echo "🏆  GOAL G-208 EXECUTION & VERIFICATION COMPLETE!"
echo "================================================================================"
