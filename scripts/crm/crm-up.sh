#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Internal CRM One-Shot Startup Daemon
#
# Launches:
# 1. Rust Axum Backend Gateway (Port 4001) in background -> logs/crm-backend.log
# 2. Next.js Internal CRM Portal (Port 4006) in background -> logs/crm-frontend.log
#
# Usage:
#   bash scripts/crm/crm-up.sh
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

mkdir -p logs

PID_BACKEND="$REPO_ROOT/.crm-backend.pid"
PID_FRONTEND="$REPO_ROOT/.crm-frontend.pid"
LOG_BACKEND="$REPO_ROOT/logs/crm-backend.log"
LOG_FRONTEND="$REPO_ROOT/logs/crm-frontend.log"

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🚀  STARTING SODALITY INTERNAL CRM STACK (PORTS 4001 & 4006)                     ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

# 1. Pre-flight: Check if previous instances or ports are active
if [ -f "$PID_BACKEND" ] && kill -0 "$(cat "$PID_BACKEND")" 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Backend already running with PID $(cat "$PID_BACKEND")${RESET}"
else
  # Clear any stale port 4001 process
  if lsof -ti:4001 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 4001 in use. Terminating stale process...${RESET}"
    kill -9 $(lsof -ti:4001) 2>/dev/null || true
    sleep 1
  fi

  echo -e "${BOLD}${MAGENTA}[1/2] Booting Rust Axum Backend Gateway on port 4001...${RESET}"
  cargo run --manifest-path code/Cargo.toml --bin api > "$LOG_BACKEND" 2>&1 &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$PID_BACKEND"
  echo -e "      ${BOLD}${GREEN}✓ Rust Backend spawned with PID $BACKEND_PID (Log: $LOG_BACKEND)${RESET}"
fi

if [ -f "$PID_FRONTEND" ] && kill -0 "$(cat "$PID_FRONTEND")" 2>/dev/null; then
  echo -e "${YELLOW}⚠️  Frontend already running with PID $(cat "$PID_FRONTEND")${RESET}"
else
  # Clear any stale port 4006 process
  if lsof -ti:4006 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 4006 in use. Terminating stale process...${RESET}"
    kill -9 $(lsof -ti:4006) 2>/dev/null || true
    sleep 1
  fi

  echo -e "${BOLD}${MAGENTA}[2/2] Booting Next.js Internal CRM Portal on port 4006...${RESET}"
  (cd code/apps/internal-crm && pnpm dev --port 4006) > "$LOG_FRONTEND" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" > "$PID_FRONTEND"
  echo -e "      ${BOLD}${GREEN}✓ Next.js Frontend spawned with PID $FRONTEND_PID (Log: $LOG_FRONTEND)${RESET}"
fi

echo -e "\n${BOLD}${CYAN}⏳ Probing HTTP Health Readiness...${RESET}"

# Probe Backend (Port 4001)
BACKEND_HEALTHY=0
for i in {1..30}; do
  if curl -sf http://127.0.0.1:4001/v1/crm/overview >/dev/null 2>&1; then
    BACKEND_HEALTHY=1
    echo -e "   ${BOLD}${GREEN}✓ Backend live & healthy at http://127.0.0.1:4001/v1/crm/overview (Attempt $i)${RESET}"
    break
  fi
  sleep 1
done

if [ $BACKEND_HEALTHY -eq 0 ]; then
  echo -e "   ${RED}❌ Backend failed to respond on port 4001 within 30s. Check $LOG_BACKEND${RESET}"
  exit 1
fi

# Probe Frontend (Port 4006)
FRONTEND_HEALTHY=0
for i in {1..30}; do
  if curl -sf http://127.0.0.1:4006 >/dev/null 2>&1; then
    FRONTEND_HEALTHY=1
    echo -e "   ${BOLD}${GREEN}✓ Frontend live & healthy at http://127.0.0.1:4006 (Attempt $i)${RESET}"
    break
  fi
  sleep 1
done

if [ $FRONTEND_HEALTHY -eq 0 ]; then
  echo -e "   ${RED}❌ Frontend failed to respond on port 4006 within 30s. Check $LOG_FRONTEND${RESET}"
  exit 1
fi

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}✅ INTERNAL CRM OPERATIONS STACK IS 100% LIVE & READY${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "• CRM Frontend Portal:   ${BOLD}http://localhost:4006${RESET}"
echo -e "• CRM Axum REST API:    ${BOLD}http://127.0.0.1:4001/v1/crm/overview${RESET}"
echo -e "• Backend Log:           ${BOLD}$LOG_BACKEND${RESET}"
echo -e "• Frontend Log:          ${BOLD}$LOG_FRONTEND${RESET}"
echo -e "• Stop Command:          ${BOLD}bash scripts/crm/crm-down.sh${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
