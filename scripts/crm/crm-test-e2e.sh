#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Internal CRM Ephemeral End-to-End Test Orchestrator
#
# Workflow:
# 1. Boots CRM Stack via crm-up.sh
# 2. Inspects Status via crm-status.sh
# 3. Runs Master 7-Phase Suite via crm-all.sh
# 4. Unconditionally Tears Down Stack via crm-down.sh (trap EXIT)
#
# Usage:
#   bash scripts/crm/crm-test-e2e.sh
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

cleanup() {
  echo -e "\n${BOLD}${MAGENTA}🧹 [CLEANUP] Tearing down Internal CRM stack...${RESET}"
  bash "$REPO_ROOT/scripts/crm/crm-down.sh"
}

trap cleanup EXIT INT TERM

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🧪  STARTING INTERNAL CRM EPHEMERAL END-TO-END TEST HARNESS                    ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

# 1. Startup & Probe
echo -e "${BOLD}${MAGENTA}▶ Step 1: Booting CRM stack in daemon mode...${RESET}"
bash "$REPO_ROOT/scripts/crm/crm-up.sh"

echo -e "${BOLD}${MAGENTA}▶ Step 2: Checking health & latency status...${RESET}"
bash "$REPO_ROOT/scripts/crm/crm-status.sh"

echo -e "${BOLD}${MAGENTA}▶ Step 3: Executing Live Integration & Master Verification Suite...${RESET}"
bash "$REPO_ROOT/scripts/crm/crm-all.sh"

echo -e "\n${BOLD}${GREEN}🏆 EPHEMERAL E2E TEST RUN COMPLETED WITH 100% SUCCESS!${RESET}\n"
