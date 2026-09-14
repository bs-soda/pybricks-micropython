#!/usr/bin/env bash
# ==============================================================================
# Sodality Creator Hub — Master Microservices Socratic Suite (Goals G-160 to G-189)
#
# Orchestrates automated 5-Why invariant checks, NATS preemptive scheduling evaluation,
# PCI security verification, and dual-transport chaos resilience validation.
#
# Usage:
#   bash scripts/run-all-microservices-socratic-loops.sh
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
echo -e "${BOLD}${CYAN}🚀  SODALITY CREATOR HUB — MASTER MICROSERVICES SOCRATIC SUITE (G-160 to G-189)   ${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Target Monorepo Root: ${BOLD}${REPO_ROOT}${RESET}\n"

START_TIME=$(date +%s)
PASSED_COUNT=0
FAILED_COUNT=0

declare -a SCRIPTS=(
  "scripts/agentic/verify-socratic-contracts.mjs|30/30 Socratic Contract Invariants & Context Registry"
  "scripts/agentic/g184-5why-agentic-socratic-loop.mjs|G-184 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g184-transport-nats-preemptive-socratic-generator.mjs|G-184 NATS Preemption & Dual-Transport Invariant Engine"
  "scripts/harness/g184-transport-kit-harness.mjs|G-184 Zero-Mock Rust Crate Production Test Harness"
  "scripts/agentic/g185-5why-agentic-socratic-loop.mjs|G-185 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g185-notification-microservice-socratic-generator.mjs|G-185 Notification Microservice Invariant Engine"
  "scripts/harness/g185-notification-service-harness.mjs|G-185 Notification Microservice Production Test Harness"
  "scripts/agentic/g186-5why-agentic-socratic-loop.mjs|G-186 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g186-telemetry-microservice-socratic-generator.mjs|G-186 Telemetry Microservice Invariant Engine"
  "scripts/backend/microservices-nats-preemption-socratic-generator.mjs|4-Tier NATS Preemptive Scheduling & Dual-Transport Routing"
  "scripts/security/microservices-pci-hmac-socratic-generator.mjs|PCI Network Boundary, HMAC Verification & Anti-Replay Nonce Engine"
  "scripts/harness/g186-telemetry-service-harness.mjs|G-186 Telemetry Microservice Production Test Harness"
  "scripts/agentic/g187-5why-agentic-socratic-loop.mjs|G-187 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g187-clip-worker-socratic-generator.mjs|G-187 Clip Worker Invariant Engine"
  "scripts/harness/g187-clip-worker-harness.mjs|G-187 Clip Worker Production Test Harness"
  "scripts/agentic/g188-5why-agentic-socratic-loop.mjs|G-188 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g188-payment-service-socratic-generator.mjs|G-188 Payment Service Invariant Engine"
  "scripts/harness/g188-payment-service-harness.mjs|G-188 Payment Service Production Test Harness"
  "scripts/agentic/g189-5why-agentic-socratic-loop.mjs|G-189 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g189-compose-socratic-generator.mjs|G-189 Compose Mesh Invariant Engine"
  "scripts/sre/g189-chaos-resilience-harness.mjs|G-189 Dual-Transport Chaos & SRE Mesh Harness"
  "scripts/agentic/g160-5why-agentic-socratic-loop.mjs|G-160 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g160-email-template-socratic-generator.mjs|G-160 Email Template Invariant Engine"
  "scripts/harness/g160-email-schema-harness.mjs|G-160 Email Schema Production Test Harness"
  "scripts/agentic/g161-5why-agentic-socratic-loop.mjs|G-161 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g161-email-api-socratic-generator.mjs|G-161 Email API Invariant Engine"
  "scripts/harness/g161-email-api-harness.mjs|G-161 Email API Production Test Harness"
  "scripts/http-smoke/email-template-engine.mjs|G-161 Email HTTP Smoke & Contract Harness"
  "scripts/agentic/g164-5why-agentic-socratic-loop.mjs|G-164 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g164-tax-service-socratic-generator.mjs|G-164 Tax Service Invariant Engine"
  "scripts/harness/g164-tax-service-harness.mjs|G-164 Tax Service Production Test Harness"
  "scripts/http-smoke/tax-service.mjs|G-164 Tax Service HTTP Smoke & Contract Harness"
  "scripts/agentic/g165-5why-agentic-socratic-loop.mjs|G-165 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g165-invoicing-socratic-generator.mjs|G-165 Invoicing & PromptPay Invariant Engine"
  "scripts/harness/g165-invoicing-harness.mjs|G-165 Invoicing & Dunning Production Test Harness"
  "scripts/http-smoke/promptpay-invoicing.mjs|G-165 PromptPay Invoicing HTTP Smoke & Contract Harness"
  "scripts/agentic/g171-5why-agentic-socratic-loop.mjs|G-171 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g171-accounting-socratic-generator.mjs|G-171 Accounting Service Invariant Engine"
  "scripts/harness/g171-accounting-service-harness.mjs|G-171 Accounting Service Production Test Harness"
  "scripts/http-smoke/accounting-service.mjs|G-171 Accounting Service HTTP Smoke & Contract Harness"
  "scripts/agentic/g166-5why-agentic-socratic-loop.mjs|G-166 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g166-domain-socratic-generator.mjs|G-166 Agency Domain Invariant Engine"
  "scripts/harness/g166-domain-harness.mjs|G-166 Agency BYOD Domain Production Test Harness"
  "scripts/http-smoke/agency-domains.mjs|G-166 Agency BYOD Domain HTTP Smoke & Contract Harness"
  "scripts/agentic/g167-5why-agentic-socratic-loop.mjs|G-167 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g167-action-socratic-generator.mjs|G-167 HMAC Action Link Invariant Engine"
  "scripts/harness/g167-action-harness.mjs|G-167 HMAC Action Link Production Test Harness"
  "scripts/http-smoke/email-actions.mjs|G-167 HMAC Action Link HTTP Smoke & Contract Harness"
  "scripts/agentic/g168-5why-agentic-socratic-loop.mjs|G-168 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g168-dispatcher-socratic-generator.mjs|G-168 Campaign Lifecycle Dispatcher Invariant Generator"
  "scripts/harness/g168-dispatcher-harness.mjs|G-168 Campaign Dispatcher & Apalis Production Harness"
  "scripts/http-smoke/lifecycle-emails.mjs|G-168 Lifecycle Email Dispatcher & Apalis HTTP Smoke Test"
  "scripts/agentic/g174-5why-agentic-socratic-loop.mjs|G-174 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g174-calendar-socratic-generator.mjs|G-174 iCalendar Invariant Generator"
  "scripts/harness/g174-calendar-harness.mjs|G-174 iCalendar Engine & Apalis Production Harness"
  "scripts/http-smoke/icalendar-engine.mjs|G-174 iCalendar Engine & Apalis HTTP Smoke Test"
  "scripts/agentic/g169-5why-agentic-socratic-loop.mjs|G-169 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g169-deliverability-socratic-generator.mjs|G-169 Email Deliverability Invariant Generator"
  "scripts/harness/g169-deliverability-harness.mjs|G-169 Email Deliverability & Circuit Breaker Production Harness"
  "scripts/http-smoke/email-circuit-breaker.mjs|G-169 Email Deliverability & Circuit Breaker HTTP Smoke Test"
  "scripts/agentic/g177-5why-agentic-socratic-loop.mjs|G-177 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g177-signer-socratic-generator.mjs|G-177 Thai e-Tax Digital Signer Invariant Generator"
  "scripts/harness/g177-signer-harness.mjs|G-177 Thai e-Tax Digital Signer Production Harness"
  "scripts/security-audit/etax-digital-signatures.mjs|G-177 Thai e-Tax Digital Signatures Security Audit & Smoke Test"
  "scripts/agentic/g173-5why-agentic-socratic-loop.mjs|G-173 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g173-security-socratic-generator.mjs|G-173 Email Security & Spam Linter Invariant Generator"
  "scripts/harness/g173-security-harness.mjs|G-173 Email Security & Spam Linter Production Harness"
  "scripts/http-smoke/spam-linter.mjs|G-173 Email Security & Spam Linter HTTP Smoke Test"
  "scripts/agentic/g170-5why-agentic-socratic-loop.mjs|G-170 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g170-digest-socratic-generator.mjs|G-170 Notification Preferences & Digest Invariant Generator"
  "scripts/harness/g170-digest-harness.mjs|G-170 Notification Preferences & Daily Digest Production Harness"
  "scripts/http-smoke/notification-preferences.mjs|G-170 Notification Preferences & Daily Digest HTTP Smoke Test"
  "scripts/agentic/g176-5why-agentic-socratic-loop.mjs|G-176 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g176-mailpit-socratic-generator.mjs|G-176 Mailpit & Staging Catch-All Invariant Generator"
  "scripts/harness/g176-mailpit-harness.mjs|G-176 Mailpit & Staging Catch-All Production Harness"
  "scripts/http-smoke/mailpit-sandbox.mjs|G-176 Mailpit Sandbox & Staging Catch-All HTTP Smoke Test"
  "scripts/agentic/g162-5why-agentic-socratic-loop.mjs|G-162 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g162-template-admin-socratic-generator.mjs|G-162 Template Admin & Test Dispatch Invariant Generator"
  "scripts/harness/g162-template-admin-harness.mjs|G-162 Template Admin & Test Dispatch Production Harness"
  "scripts/ui-smoke/system-admin-emails.mjs|G-162 System Admin Email Management UI Smoke Test"
  "scripts/agentic/g163-5why-agentic-socratic-loop.mjs|G-163 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g163-crm-email-socratic-generator.mjs|G-163 CRM Email & Dunning Cadence Invariant Generator"
  "scripts/harness/g163-crm-email-harness.mjs|G-163 CRM Email & Dunning Cadence Production Harness"
  "scripts/ui-smoke/crm-emails.mjs|G-163 Internal CRM Creator Email & Dunning UI Smoke Test"
  "scripts/agentic/g172-5why-agentic-socratic-loop.mjs|G-172 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g172-email-components-socratic-generator.mjs|G-172 Email Components & Tokens Invariant Generator"
  "scripts/harness/g172-email-components-harness.mjs|G-172 Responsive Email Components & Storybook Harness"
  "scripts/ui-smoke/email-components.mjs|G-172 Responsive Email Components UI Smoke Test"
  "scripts/agentic/g175-5why-agentic-socratic-loop.mjs|G-175 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g175-omnichannel-socratic-generator.mjs|G-175 Omnichannel Messaging Invariant Generator"
  "scripts/harness/g175-omnichannel-harness.mjs|G-175 Internal CRM Omnichannel Messaging Harness"
  "scripts/ui-smoke/omnichannel-hub.mjs|G-175 Internal CRM Omnichannel UI Smoke Test"
  "scripts/agentic/g190-5why-agentic-socratic-loop.mjs|G-190 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g190-campaign-dispatcher-socratic-generator.mjs|G-190 Campaign Dispatcher Invariant Generator"
  "scripts/harness/g190-campaign-dispatcher-harness.mjs|G-190 Campaign Dispatcher & Preemptive Queue Harness"
  "scripts/agentic/g191-5why-agentic-socratic-loop.mjs|G-191 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g191-settlement-service-socratic-generator.mjs|G-191 Settlement & Dunning Invariant Generator"
  "scripts/harness/g191-settlement-service-harness.mjs|G-191 Settlement & Dunning Production Test Harness"
  "scripts/agentic/g192-5why-agentic-socratic-loop.mjs|G-192 Socratic 5-Why Dialectic Engine (Levels 1 to 5)"
  "scripts/backend/g192-tiktok-sync-socratic-generator.mjs|G-192 TikTok Sync & Media Worker Invariant Generator"
  "scripts/harness/g192-tiktok-sync-harness.mjs|G-192 TikTok Sync & Media Worker Production Test Harness"
)

for ENTRY in "${SCRIPTS[@]}"; do
  IFS="|" read -r SCRIPT_PATH SCRIPT_TITLE <<< "$ENTRY"
  
  echo -e "${BOLD}${MAGENTA}▶ Running [${SCRIPT_TITLE}]...${RESET}"
  if node "$SCRIPT_PATH"; then
    ((PASSED_COUNT++))
    echo -e "${GREEN}✔ [${SCRIPT_TITLE}] Completed successfully.${RESET}\n"
  else
    ((FAILED_COUNT++))
    echo -e "${RED}✘ [${SCRIPT_TITLE}] Failed.${RESET}\n"
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}🎯  MASTER MICROSERVICES SOCRATIC SUITE SUMMARY${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "Total Harnesses Executed : ${BOLD}${#SCRIPTS[@]}${RESET}"
echo -e "Passed Harnesses         : ${BOLD}${GREEN}${PASSED_COUNT}${RESET}"
echo -e "Failed Harnesses         : ${BOLD}${RED}${FAILED_COUNT}${RESET}"
echo -e "Total Duration           : ${BOLD}${DURATION}s${RESET}"

if [ "$FAILED_COUNT" -eq 0 ]; then
  echo -e "\n${BOLD}${GREEN}🏆 ALL 4 MASTER MICROSERVICES SOCRATIC HARNESSES PASSED WITH ZERO VIOLATIONS!${RESET}\n"
  exit 0
else
  echo -e "\n${BOLD}${RED}⚠️  SOME SOCRATIC HARNESSES FAILED.${RESET}\n"
  exit 1
fi
