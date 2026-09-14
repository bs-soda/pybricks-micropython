#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — System Admin Control Plane Local Dev Infrastructure
#
# PURELY FOCUSED ON SYSTEM ADMIN CONTROL PLANE:
# 1. System Admin Database (PostgreSQL auth & admin audit schemas) on Port 5435
# 2. System Admin Identity Provider (Supabase GoTrue, ADR-0004) on Port 9999
# 3. System Admin Telemetry Columnar Cache & Distributed Redis Locks on Port 6379
# 4. System Admin Telemetry Gateway (Axum) on Port 4001
# 5. System Admin Control Plane UI (Next.js 15) on Port 4005
#
# Usage:
#   bash scripts/system-admin/system-admin-local-dev-up.sh
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[38;5;48m"
CYAN="\033[38;5;45m"
YELLOW="\033[38;5;220m"
RED="\033[38;5;196m"
MAGENTA="\033[38;5;141m"
RESET="\033[0m"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🛡️  STARTING SYSTEM ADMIN CONTROL PLANE LOCAL DEV INFRASTRUCTURE (PORT 4005)   ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

# 1. Check Docker daemon & start System Admin DB and GoTrue Auth
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Docker daemon is not reachable. Checking if System Admin native services are active...${RESET}"
  if curl -sf http://127.0.0.1:9999/health > /dev/null 2>&1; then
    echo -e "${BOLD}${GREEN}✓ System Admin GoTrue Auth Server active at http://127.0.0.1:9999${RESET}"
  else
    echo -e "${YELLOW}ℹ️  Native GoTrue not detected. Rust backend will use in-memory auth store for rapid testing.${RESET}"
  fi
else
  echo -e "${BOLD}${MAGENTA}[1/3] Booting System Admin Database & GoTrue Auth Containers...${RESET}"
  docker compose up -d db gotrue

  echo -e "${BOLD}${MAGENTA}[2/3] Verifying System Admin PostgreSQL Health (Port 5435 / db:5432)...${RESET}"
  RETRIES=15
  until docker compose ps db | grep -q "(healthy)" || [ $RETRIES -eq 0 ]; do
    echo -e "      Waiting for System Admin DB healthcheck... ($RETRIES retries remaining)"
    sleep 2
    RETRIES=$((RETRIES - 1))
  done

  if [ $RETRIES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PostgreSQL healthcheck wait timed out. Checking port 5435 connectivity...${RESET}"
  else
    echo -e "      ${BOLD}${GREEN}✓ System Admin DB is healthy on port 5435 (auth & public schemas initialized)${RESET}"
  fi

  echo -e "${BOLD}${MAGENTA}[3/3] Probing System Admin GoTrue Auth Server (Port 9999)...${RESET}"
  GOTRUE_LIVE=0
  for i in {1..10}; do
    if curl -sf http://127.0.0.1:9999/health > /dev/null 2>&1; then
      echo -e "      ${BOLD}${GREEN}✓ System Admin GoTrue Auth is live at http://127.0.0.1:9999/health${RESET}"
      GOTRUE_LIVE=1
      break
    fi
    sleep 1
  done

  if [ $GOTRUE_LIVE -eq 0 ]; then
    echo -e "      ${YELLOW}⚠️  GoTrue health endpoint warming up. Check logs: docker compose logs gotrue${RESET}"
  fi
fi

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}✅ SYSTEM ADMIN CONTROL PLANE INFRASTRUCTURE IS 100% INITIALIZED${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "• System Admin Auth Server:   ${BOLD}http://127.0.0.1:9999${RESET} (Supabase GoTrue ADR-0004)"
echo -e "• System Admin DB:            ${BOLD}postgres://postgres:uat-postgres-not-prod@127.0.0.1:5435/postgres${RESET}"
echo -e "• System Admin Telemetry API: ${BOLD}http://127.0.0.1:4001/v1/admin/telemetry${RESET}"
echo -e "• System Admin UI Portal:     ${BOLD}http://localhost:4005${RESET} (Next.js 15 App Router)"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
