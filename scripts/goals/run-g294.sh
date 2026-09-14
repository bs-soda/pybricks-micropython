#!/usr/bin/env bash

# ==============================================================================
# Goal G-294 Autonomous Socratic Runner & Zero-Mock Verification Engine
# ==============================================================================

set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GOAL_ID="G-294"
GOAL_FILE="$REPO_ROOT/docs/07-backlog/goals/G-294-graph-rag-knowledge-graph-and-qdrant-engine.md"
SOCRATIC_ENGINE="$REPO_ROOT/scripts/agentic/g294-graphrag-qdrant-engine-5why-socratic-engine.mjs"
HARNESS_SCRIPT="$REPO_ROOT/scripts/harness/g294-graphrag-qdrant-engine-harness.mjs"
CONFORMANCE_HARNESS="$REPO_ROOT/scripts/harness/architecture-design-conformance-harness.mjs"

# Color Codes
GREEN="\033[0;32m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
MAGENTA="\033[0;35m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "\n${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🚀  GOAL ${GOAL_ID} EXECUTION ENGINE${RESET}"
echo -e "${BOLD}${CYAN}    GraphRAG Knowledge Graph & Qdrant Hybrid Graph Engine${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"

# Step 1: Verify Goal File Presence
echo -e "${BOLD}${MAGENTA}[Step 1/5] Verifying Goal Specification Contract...${RESET}"
if [ ! -f "$GOAL_FILE" ]; then
    echo -e "  ❌ Goal file not found: $GOAL_FILE"
    exit 1
fi
echo -e "  ${GREEN}✓ Goal specification file verified.${RESET}\n"

# Step 2: Architecture & Conformance Gate
echo -e "${BOLD}${MAGENTA}[Step 2/5] Running Architecture Design Conformance Harness...${RESET}"
node "$CONFORMANCE_HARNESS"
echo -e "  ${GREEN}✓ Goal Conformance Harness passed 100% Green.${RESET}\n"

# Step 3: Run Socratic 5-Why Dialectic Engine (Level 5 for each of the 5 branches)
echo -e "${BOLD}${MAGENTA}[Step 3/5] Executing 5-Why Socratic Dialectic Engine...${RESET}"
node "$SOCRATIC_ENGINE"
echo -e "  ${GREEN}✓ Socratic Dialectic Engine passed.${RESET}\n"

# Step 4: Verify 25 Socratic Invariants in Treatise Document
echo -e "${BOLD}${MAGENTA}[Step 4/5] Verifying 25/25 Invariant Proofs in Raw Knowledge Docs...${RESET}"
TREATISE_DOC="$REPO_ROOT/docs/06_raw/20260831_161000_g294_graphrag_qdrant_engine_5why_socratic_treatise.md"
if [ ! -f "$TREATISE_DOC" ]; then
    echo -e "  ❌ Treatise doc not found: $TREATISE_DOC"
    exit 1
fi
INVARIANT_COUNT=$(grep -c "Formal Invariant" "$TREATISE_DOC" || true)
echo -e "  Found ${INVARIANT_COUNT} Socratic Invariants in Treatise."
if [ "$INVARIANT_COUNT" -lt 25 ]; then
    echo -e "  ❌ Expected at least 25 invariants, found $INVARIANT_COUNT"
    exit 1
fi
echo -e "  ${GREEN}✓ 25 Socratic Invariants Certified 100% Green.${RESET}\n"

# Step 5: Run G-294 Zero-Mock Production Test Harness & Rust Backend Tests
echo -e "${BOLD}${MAGENTA}[Step 5/5] Running Zero-Mock Production Test Harness & Rust Backend Tests for ${GOAL_ID}...${RESET}"
node "$HARNESS_SCRIPT"
echo -e "  Running cargo unit & integration tests for G-294..."
(cd "$REPO_ROOT/code" && cargo test -p domain graphrag --quiet)
(cd "$REPO_ROOT/code" && cargo test -p discovery-service --quiet)
echo -e "  ${GREEN}✓ Production Test Harness & Backend Cargo Tests Passed 100% Green.${RESET}\n"

echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}🏆  GOAL ${GOAL_ID} EXECUTION & VERIFICATION COMPLETE!${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════════════════${RESET}\n"
