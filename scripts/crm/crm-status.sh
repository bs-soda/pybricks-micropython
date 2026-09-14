#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Internal CRM Diagnostic Status Probe
#
# Inspects:
# 1. Process Vitality & Memory (PID inspection)
# 2. Port Binding (Ports 4001 & 4006)
# 3. HTTP Latency SLA Probing (< 5.0ms target)
#
# Usage:
#   bash scripts/crm/crm-status.sh
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
echo -e "${BOLD}${CYAN}🔍  INTERNAL CRM STATUS & HEALTH DIAGNOSTIC PROBE                               ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

# 1. Backend Status
echo -e "${BOLD}${MAGENTA}[1/2] Rust Axum Backend Gateway (Port 4001)${RESET}"
if [ -f "$PID_BACKEND" ]; then
  BPID=$(cat "$PID_BACKEND")
  if kill -0 "$BPID" 2>/dev/null; then
    MEM=$(ps -o rss= -p "$BPID" 2>/dev/null | awk '{print int($1/1024) " MB"}' || echo "N/A")
    echo -e "   • Status:       ${BOLD}${GREEN}● ACTIVE${RESET} (PID $BPID)"
    echo -e "   • Memory (RSS): $MEM"
    
    # Latency Probe
    START_MS=$(python3 -c 'import time; print(time.time())')
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4001/v1/crm/overview 2>/dev/null || echo "000")
    END_MS=$(python3 -c 'import time; print(time.time())')
    LATENCY_MS=$(python3 -c "print(round(($END_MS - $START_MS) * 1000, 2))")

    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "   • Health Probe: ${BOLD}${GREEN}HTTP 200 OK${RESET} (${LATENCY_MS}ms latency)"
    else
      echo -e "   • Health Probe: ${RED}HTTP $HTTP_CODE (Failed)${RESET}"
    fi
  else
    echo -e "   • Status:       ${RED}● INACTIVE${RESET} (Stale PID file $BPID)"
  fi
else
  echo -e "   • Status:       ${YELLOW}○ NOT RUNNING${RESET} (No PID file)"
fi

echo ""

# 2. Frontend Status
echo -e "${BOLD}${MAGENTA}[2/2] Next.js Internal CRM Portal (Port 4006)${RESET}"
if [ -f "$PID_FRONTEND" ]; then
  FPID=$(cat "$PID_FRONTEND")
  if kill -0 "$FPID" 2>/dev/null; then
    MEM=$(ps -o rss= -p "$FPID" 2>/dev/null | awk '{print int($1/1024) " MB"}' || echo "N/A")
    echo -e "   • Status:       ${BOLD}${GREEN}● ACTIVE${RESET} (PID $FPID)"
    echo -e "   • Memory (RSS): $MEM"

    # Latency Probe
    START_MS=$(python3 -c 'import time; print(time.time())')
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4006 2>/dev/null || echo "000")
    END_MS=$(python3 -c 'import time; print(time.time())')
    LATENCY_MS=$(python3 -c "print(round(($END_MS - $START_MS) * 1000, 2))")

    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "   • Health Probe: ${BOLD}${GREEN}HTTP 200 OK${RESET} (${LATENCY_MS}ms latency)"
    else
      echo -e "   • Health Probe: ${RED}HTTP $HTTP_CODE (Failed)${RESET}"
    fi
  else
    echo -e "   • Status:       ${RED}● INACTIVE${RESET} (Stale PID file $FPID)"
  fi
else
  echo -e "   • Status:       ${YELLOW}○ NOT RUNNING${RESET} (No PID file)"
fi

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
