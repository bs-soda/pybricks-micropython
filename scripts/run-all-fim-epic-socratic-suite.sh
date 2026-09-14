#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Master Socratic & Production Suite for Epic FIM
# Group 2: Financial Ledger, Invoicing & Multi-Tenant Accounting
#
# Goals:
#   G-228 B2B Contracts & Net-30 Invoicing
#   G-229 Sub-Wallets & Cost Centers
#   G-231 IFRS 15 Breakage Ledger
#   G-242 Partner Rev-Share Ledger
#   G-250 Multi-Entity ERP Sync
#   G-241 Smart Dunning FSM
#   G-240 Guardian Co-Signature Escrow
#
# Usage:
#   bash scripts/run-all-fim-epic-socratic-suite.sh
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[38;5;48m"
CYAN="\033[38;5;45m"
YELLOW="\033[38;5;220m"
RED="\033[38;5;196m"
MAGENTA="\033[38;5;141m"
RESET="\033[0m"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🚀  SODALITY CREATOR HUB — EPIC FIM (FINANCIAL LEDGER & ACCOUNTING) SUITE         ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Monorepo Root: ${BOLD}${REPO_ROOT}${RESET}\n"

# Run Master Runner Harness
node "$REPO_ROOT/scripts/harness/run-all-fim-epic-harness.mjs"

echo -e "\n${BOLD}${GREEN}🏆 ALL EPIC FIM SOCRATIC 5-WHY ENGINES & PRODUCTION HARNESSES PASSED 100% GREEN!${RESET}\n"
