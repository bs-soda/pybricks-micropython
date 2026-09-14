#!/usr/bin/env bash
# CI-friendly Rust test runner for ubuntu-latest (~7 GiB RAM, ~14 GB disk).
#
# `cargo test --workspace` links every `api` integration-test binary in parallel
# (50+ crates each pulling openssl/reqwest/tokio) → linker SIGBUS / OOM.
# Sequential `--test` runs avoid OOM but fill disk unless we prune each executable.
#
# This script:
#   1. Tests workspace libs (domain, auth, telemetry-otel)
#   2. Tests api unit tests (--lib)
#   3. Runs each api integration test target sequentially (--test <name>)
#   4. Deletes each integration-test executable after it passes (keeps libapi rlib)
#
# Env: DATABASE_URL, POSTGRES_PASSWORD (for Postgres-backed api tests)
#      CARGO_BUILD_JOBS (default 1), RUSTFLAGS (caller may set mold + debuginfo=0)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}/code"

export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-1}"

prune_integration_test_binary() {
  local name="$1"
  local f

  shopt -s nullglob
  for f in "target/debug/deps/${name}-"*; do
    case "${f}" in
      *.rlib | *.d | *.rmeta) continue ;;
    esac
    rm -f "${f}"
  done
  rm -f "target/debug/${name}" 2>/dev/null || true
}

echo "=== Rust CI: workspace libs (domain, auth, telemetry-otel) ==="
cargo test -p domain -p auth -p telemetry-otel -- --test-threads=2

echo "=== Rust CI: api unit tests (--lib) ==="
cargo test -p api --lib -- --test-threads=2

API_TESTS_DIR="apps/backend/api/tests"
shopt -s nullglob
tests=( "${API_TESTS_DIR}"/*.rs )
if [ "${#tests[@]}" -eq 0 ]; then
  echo "::error::No integration tests under ${API_TESTS_DIR}"
  exit 1
fi

echo "=== Rust CI: api integration tests (${#tests[@]} targets, sequential link) ==="
df -h / || true
for f in "${tests[@]}"; do
  name="$(basename "${f}" .rs)"
  echo ""
  echo ">>> cargo test -p api --test ${name}"
  cargo test -p api --test "${name}" -- --test-threads=1
  prune_integration_test_binary "${name}"
done

echo ""
df -h / || true
echo "Rust workspace CI passed."
