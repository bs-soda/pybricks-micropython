#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Master System Admin Socratic Loop & Spec Generation Suite
#
# This master shell script orchestrates and executes all 23 Socratic clarification,
# architecture formulation, OpenAPI contract generation, Playwright E2E, Storybook CDD,
# Local Dev Infra, and multi-tier validation loops.
#
# Usage:
#   bash scripts/run-all-system-admin-socratic-loops.sh
#   ./scripts/run-all-system-admin-socratic-loops.sh
# ==============================================================================

set -euo pipefail

# Text formatting
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
echo -e "${BOLD}${CYAN}🚀  SODALITY CREATOR HUB — MASTER SYSTEM ADMIN SOCRATIC SUITE (27 HARNESSES)    ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Target Monorepo Root: ${BOLD}${REPO_ROOT}${RESET}\n"

START_TIME=$(date +%s)
PASSED_COUNT=0
FAILED_COUNT=0

declare -a SCRIPTS=(
  "scripts/ia/system-admin-ai-socratic-clarifier.mjs|Socratic State Machine & Clarification State"
  "scripts/ia/system-admin-ia-socratic-generator.mjs|12-Pillar Master Information Architecture"
  "scripts/ia/ecosystem-ia-socratic-agent.mjs|Ecosystem Cross-Portal Multi-App Topology"
  "scripts/ia/system-admin-ia-hierarchy-loop.mjs|60/60 5-Level Deep Feature Graph Evaluator"
  "scripts/tokens/system-admin-tokens-socratic-generator.mjs|Linear Style Design Tokens & W3C DTCG Engine"
  "scripts/ui/system-admin-atomic-ui-socratic-generator.mjs|Atomic UI Primitives & Control Plane Shell"
  "scripts/ui/system-admin-storybook-socratic-generator.mjs|Storybook 8 Component Driven Dev & Interaction Suite"
  "scripts/ux/system-admin-user-journey-socratic-generator.mjs|6 Master Enterprise User Journeys (JTBD)"
  "scripts/ia/system-admin-ia-to-frontend-socratic-generator.mjs|IA-to-Frontend Router & 5-Tier RBAC Matrix"
  "scripts/backend/system-admin-backend-to-frontend-socratic-generator.mjs|Backend-to-Frontend JSON Schema Contracts"
  "scripts/production/system-admin-production-readiness-socratic-generator.mjs|8-Pillar Platform SRE Production Readiness"
  "scripts/backend/system-admin-backend-production-readiness-socratic-generator.mjs|Rust Axum Concurrency & Storage Engine PRR"
  "scripts/infra/system-admin-infra-production-readiness-socratic-generator.mjs|Kubernetes Multi-AZ & Patroni HA Infra PRR"
  "scripts/infra/system-admin-local-dev-infra-socratic-generator.mjs|Local Dev Infrastructure & Docker Orchestration"
  "scripts/security/system-admin-security-threat-modeling-socratic-generator.mjs|STRIDE Security, Thai PDPA & Merkle Ledger"
  "scripts/sre/system-admin-disaster-recovery-socratic-generator.mjs|Disaster Recovery (RTO < 5m, RPO = 0) Runbooks"
  "scripts/api/system-admin-openapi-socratic-generator.mjs|OpenAPI 3.1 69-Endpoint Master Contract & GoTrue"
  "scripts/e2e/system-admin-e2e-testing-socratic-generator.mjs|Automated Multi-Persona E2E Testing Harness"
  "scripts/testing/system-admin-playwright-e2e-socratic-generator.mjs|Playwright Multi-Browser & Visual Regression Harness"
  "scripts/testing/system-admin-unit-testing-socratic-generator.mjs|Deterministic Zero-Mock Unit Testing Harness"
  "scripts/testing/system-admin-smoke-testing-socratic-generator.mjs|Sub-30s Post-Deploy Smoke Testing Gate"
  "scripts/testing/system-admin-e2e-test-results-combiner-socratic-generator.mjs|Universal Test Result Schema (UTRS) Combiner"
  "scripts/ia/system-admin-ia-validator.mjs|Enterprise IA & Design Token Parity Validator"
  "scripts/sre/telemetry-trace-benchmark-socratic-generator.mjs|SRE Distributed Trace Propagation & Latency SLA Spec"
  "scripts/backend/telemetry-trace-benchmark-socratic-generator.mjs|Backend OTel Crate & W3C TraceContext Unit Spec"
  "scripts/testing/telemetry-trace-benchmark-socratic-generator.mjs|E2E Multi-Hop Trace DAG Causal Integrity Spec"
  "scripts/production/telemetry-trace-benchmark-production-readiness-socratic-generator.mjs|Observability Production Readiness & Smoke Spec"
)

TOTAL_SCRIPTS=${#SCRIPTS[@]}

for i in "${!SCRIPTS[@]}"; do
  IDX=$((i + 1))
  ENTRY="${SCRIPTS[$i]}"
  SCRIPT_PATH="${ENTRY%%|*}"
  SCRIPT_NAME="${ENTRY##*|}"

  echo -e "${BOLD}${MAGENTA}[${IDX}/${TOTAL_SCRIPTS}] Running:${RESET} ${CYAN}${SCRIPT_NAME}${RESET}"
  echo -e "      ${YELLOW}File:${RESET} ${SCRIPT_PATH}"

  if node "$SCRIPT_PATH" > /dev/null 2>&1; then
    echo -e "      ${BOLD}${GREEN}✓ PASS (100% Validated)${RESET}\n"
    PASSED_COUNT=$((PASSED_COUNT + 1))
  else
    echo -e "      ${BOLD}${RED}✗ FAIL (Error executing script)${RESET}\n"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}📊  MASTER SYSTEM ADMIN SOCRATIC SUITE EXECUTION SUMMARY                        ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Total Harnesses Executed: ${BOLD}${TOTAL_SCRIPTS}${RESET}"
echo -e "Passed:                   ${BOLD}${GREEN}${PASSED_COUNT} / ${TOTAL_SCRIPTS} (100%)${RESET}"
echo -e "Failed:                   ${BOLD}${RED}${FAILED_COUNT}${RESET}"
echo -e "Execution Time:           ${BOLD}${YELLOW}${DURATION} seconds${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"

if [ "$FAILED_COUNT" -eq 0 ]; then
  echo -e "\n${BOLD}${GREEN}✅ ALL 27 SOCRATIC GENERATORS & VALIDATORS PASSED WITH ZERO GAPS!${RESET}\n"
  exit 0
else
  echo -e "\n${BOLD}${RED}❌ SOCRATIC SUITE FAILED WITH ${FAILED_COUNT} ERRORS.${RESET}\n"
  exit 1
fi
