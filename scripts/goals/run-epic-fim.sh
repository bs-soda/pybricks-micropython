#!/usr/bin/env bash
# ==============================================================================
# Master Runner Script for Epic FIM (Group 2):
# Financial Ledger, Invoicing & Multi-Tenant Accounting
#
# Runs all 7 goals sequentially through the 5-step Socratic & Verification pipeline:
# 1. G-228 B2B Contracts & Net-30 Invoicing
# 2. G-229 Sub-Wallets & Cost Centers
# 3. G-231 IFRS 15 Breakage Ledger
# 4. G-242 Partner Rev-Share Ledger
# 5. G-250 Multi-Entity ERP Sync
# 6. G-241 Smart Dunning FSM
# 7. G-240 Guardian Co-Signature Escrow
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
echo -e "${BOLD}${CYAN}🚀  STARTING MASTER PIPELINE FOR EPIC FIM (GOALS G-228 TO G-250)                ${RESET}"
echo -e "${BOLD}${CYAN}    Group 2: Financial Ledger, Invoicing & Multi-Tenant Accounting               ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

GOAL_RUNNERS=(
  "scripts/goals/run-g228.sh"
  "scripts/goals/run-g229.sh"
  "scripts/goals/run-g231.sh"
  "scripts/goals/run-g242.sh"
  "scripts/goals/run-g250.sh"
  "scripts/goals/run-g241.sh"
  "scripts/goals/run-g240.sh"
)

TOTAL=${#GOAL_RUNNERS[@]}
PASSED=0

for i in "${!GOAL_RUNNERS[@]}"; do
  RUNNER="${GOAL_RUNNERS[$i]}"
  IDX=$((i + 1))
  echo -e "\n${BOLD}${MAGENTA}▶ [${IDX}/${TOTAL}] Executing Goal Runner: ${RUNNER}...${RESET}\n"
  bash "$RUNNER"
  PASSED=$((PASSED + 1))
done

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}🏆  ALL ${PASSED}/${TOTAL} GOAL RUNNERS IN EPIC FIM EXECUTED & PASSED 100% GREEN!${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
