#!/usr/bin/env bash

# ==============================================================================
# scripts/sre/dual-transport-chaos-test.sh
# 
# Goal G-189: Automated Dual-Transport Chaos Engineering & Failover Test Runner
# Validates 0 message loss, circuit breaker state transitions, and sub-50ms P0 preemption
# under simulated network outages across NATS JetStream and HTTP fallback endpoints.
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
CYAN="\033[36m"
MAGENTA="\033[35m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║   🔥  GOAL G-189: SRE DUAL-TRANSPORT CHAOS ENGINEERING TEST RUNNER           ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${RESET}\n"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo -e "${BOLD}▶ Step 1: Evaluating Socratic Generator & Compose Invariants...${RESET}"
node scripts/backend/g189-compose-socratic-generator.mjs

echo -e "\n${BOLD}▶ Step 2: Executing 5-Why Socratic Dialectic Loop (Levels 1 to 5)...${RESET}"
node scripts/agentic/g189-5why-agentic-socratic-loop.mjs

echo -e "\n${BOLD}▶ Step 3: Running SRE Chaos Resilience Test Suite...${RESET}"
node scripts/sre/g189-chaos-resilience-harness.mjs

echo -e "\n${BOLD}${GREEN}✔ SRE Dual-Transport Chaos Resilience Test PASSED (100% Zero-Loss Verified)${RESET}\n"
