#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Internal CRM Teardown & Port Release Script
#
# Gracefully stops:
# 1. Rust Axum Backend Gateway (Port 4001)
# 2. Next.js Internal CRM Portal (Port 4006)
#
# Usage:
#   bash scripts/crm/crm-down.sh
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

PID_BACKEND="$REPO_ROOT/.crm-backend.pid"
PID_FRONTEND="$REPO_ROOT/.crm-frontend.pid"

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🛑  SHUTTING DOWN SODALITY INTERNAL CRM STACK (PORTS 4001 & 4006)                ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

terminate_process() {
  local name="$1"
  local pid_file="$2"
  local port="$3"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo -e "${BOLD}${MAGENTA}• Stopping $name (PID $pid)...${RESET}"
      kill "$pid" 2>/dev/null || true
      
      # Wait up to 5 seconds for graceful exit
      local wait_sec=5
      while kill -0 "$pid" 2>/dev/null && [ $wait_sec -gt 0 ]; do
        sleep 1
        wait_sec=$((wait_sec - 1))
      done

      # Force kill if still lingering
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠️  $name did not exit gracefully, issuing SIGKILL...${RESET}"
        kill -9 "$pid" 2>/dev/null || true
      fi
      echo -e "  ${BOLD}${GREEN}✓ $name stopped${RESET}"
    fi
    rm -f "$pid_file"
  fi

  # Release any orphaned process on the port
  if lsof -ti:"$port" >/dev/null 2>&1; then
    local port_pids
    port_pids=$(lsof -ti:"$port")
    echo -e "  ${YELLOW}⚠️  Releasing lingering port $port (PIDs: $port_pids)...${RESET}"
    kill -9 $port_pids 2>/dev/null || true
    echo -e "  ${BOLD}${GREEN}✓ Port $port freed${RESET}"
  fi
}

terminate_process "Rust Backend" "$PID_BACKEND" 4001
terminate_process "Next.js Frontend" "$PID_FRONTEND" 4006

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}✅ ALL INTERNAL CRM PROCESSES TERMINATED & PORTS FREED (4001 & 4006)${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
