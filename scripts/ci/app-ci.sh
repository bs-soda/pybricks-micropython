#!/usr/bin/env bash
# Run app test/lint from .github/ci-config.yml — skips gracefully if not configured.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CONFIG="${ROOT}/.github/ci-config.yml"

if [[ ! -f "$CONFIG" ]]; then
  echo "App CI skipped: .github/ci-config.yml not found."
  echo "Copy .github/ci-config.example.yml → ci-config.yml at project bootstrap (G-001)."
  exit 0
fi

get_yaml_value() {
  local key="$1"
  grep -E "^${key}:" "$CONFIG" | head -1 | sed "s/^${key}:[[:space:]]*//" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
}

WORK_DIR="$(get_yaml_value working_directory)"
TEST_CMD="$(get_yaml_value test)"
LINT_CMD="$(get_yaml_value lint)"

if [[ -z "$WORK_DIR" ]]; then
  echo "::error::ci-config.yml: working_directory is required"
  exit 1
fi

if [[ ! -d "$ROOT/$WORK_DIR" ]]; then
  echo "App CI skipped: directory '$WORK_DIR' does not exist yet (complete G-001 bootstrap)."
  exit 0
fi

cd "$ROOT/$WORK_DIR"

if [[ -n "$TEST_CMD" && "$TEST_CMD" != "null" && "$TEST_CMD" != '""' ]]; then
  echo "Running test: $TEST_CMD"
  eval "$TEST_CMD"
else
  echo "No test command in ci-config.yml — skipped."
fi

if [[ -n "$LINT_CMD" && "$LINT_CMD" != "null" && "$LINT_CMD" != '""' ]]; then
  echo "Running lint: $LINT_CMD"
  eval "$LINT_CMD"
else
  echo "No lint command in ci-config.yml — skipped."
fi

echo "App CI passed."
