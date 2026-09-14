#!/usr/bin/env bash
# ==============================================================================
# Goal G-131: Master OpenTelemetry Distributed Trace & SLA Benchmark Suite
#
# Executes all 5 verification phases:
# 1. Phase 1: Rust Native TracerProvider Micro-Benchmark & Ring Buffer Stability
# 2. Phase 2: ClickHouse Columnar Storage & Codec Integrity Validation
# 3. Phase 3: High-Throughput 5,000 req/sec Latency SLA Benchmark
# 4. Phase 4: End-to-End 5-Hop Distributed Trace Propagation & DAG Verification
# 5. Phase 5: SLA Certification Reports & LLM Wiki Documentation Generation
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🌟 G-131: MASTER OPENTELEMETRY TRACE PROPAGATION & SLA BENCHMARK SUITE"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "Timestamp: $(date)"
echo ""

# PHASE 1: RUST BENCHMARK
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ 🦀 PHASE 1: RUST NATIVE MICRO-BENCHMARK & RING BUFFER STABILITY             │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
cargo test --manifest-path code/Cargo.toml --package telemetry-otel --test trace_benchmark_test
echo "✓ Phase 1 Complete: Rust Micro-Benchmark Passed (100% Green)."
echo ""

# PHASE 2: CLICKHOUSE STORAGE VALIDATOR
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ 🗄️  PHASE 2: CLICKHOUSE COLUMNAR STORAGE & CODEC VALIDATION                 │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
node "${REPO_ROOT}/scripts/otel-benchmark/clickhouse-trace-validator.mjs"
echo "✓ Phase 2 Complete: ClickHouse Storage & Codecs Verified."
echo ""

# PHASE 3: HIGH-THROUGHPUT LATENCY SLA BENCHMARK
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ ⚡ PHASE 3: HIGH-THROUGHPUT 5,000 REQ/SEC LATENCY SLA BENCHMARK             │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
node "${REPO_ROOT}/scripts/otel-benchmark/telemetry-sla-benchmark.mjs"
echo "✓ Phase 3 Complete: Latency SLA Budget Verified (< 0.20ms overhead)."
echo ""

# PHASE 4: E2E MULTI-HOP TRACE DAG PROPAGATION
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ 🌐 PHASE 4: E2E MULTI-HOP DISTRIBUTED TRACE DAG PROPAGATION VERIFICATION    │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
node "${REPO_ROOT}/scripts/otel-benchmark/e2e-trace-verification.mjs"
echo "✓ Phase 4 Complete: 100% Unbroken Multi-Hop Trace Hierarchy Certified."
echo ""

# PHASE 5: REPORT GENERATION
echo "┌─────────────────────────────────────────────────────────────────────────────┐"
echo "│ 📊 PHASE 5: SLA CERTIFICATION REPORT & LLM WIKI LEDGER EXPORT               │"
echo "└─────────────────────────────────────────────────────────────────────────────┘"
node "${REPO_ROOT}/scripts/otel-benchmark/generate-reports.mjs"
echo "✓ Phase 5 Complete: Reports & Ledgers Written."
echo ""

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🌟 GOAL G-131 MASTER BENCHMARK SUITE CERTIFIED 100% GREEN!                    "
echo "════════════════════════════════════════════════════════════════════════════════"
