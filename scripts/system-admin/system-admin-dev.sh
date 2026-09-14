#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — System Admin One-Shot Local Development Starter
#
# Usage:
#   bash scripts/system-admin/system-admin-dev.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🚀  STARTING SYSTEM ADMIN CONTROL PLANE DEVELOPMENT ENVIRONMENT"
echo "════════════════════════════════════════════════════════════════════════════════"

# 1. Boot Infra
echo "▶ [1/3] Verifying Infrastructure..."
bash "${REPO_ROOT}/scripts/system-admin/system-admin-local-dev-up.sh"

# 2. Check Rust Backend
echo "▶ [2/3] Checking Rust Backend API on port 4001..."
if lsof -i :4001 >/dev/null 2>&1; then
  echo "  ✓ Backend API is already active on port 4001."
else
  echo "  Starting Rust Axum API Gateway in background on port 4001..."
  (cd "${REPO_ROOT}/code" && API_BIND=127.0.0.1:4001 AGENCY_IN_MEMORY=1 cargo run --manifest-path Cargo.toml --package api > /tmp/axum-dev.log 2>&1 &) || true
  sleep 2
fi

# 3. Start Next.js System Admin
echo "▶ [3/3] Starting System Admin Portal on http://localhost:4005..."
echo "  URL: http://localhost:4005"
echo "  Credentials: admin@sodality.local / secret12"
echo "════════════════════════════════════════════════════════════════════════════════"

cd "${REPO_ROOT}/code/apps/system-admin"
if command -v pnpm >/dev/null 2>&1; then
  pnpm dev
else
  npm run dev
fi
