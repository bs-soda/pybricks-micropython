#!/usr/bin/env bash
set -eo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🎯  SODA OS MASTER SOCRATIC & CONTRACT TEST SUITE"
echo "════════════════════════════════════════════════════════════════════════════════"

node "$DIR/harness/architecture-design-conformance-harness.mjs"
node "$DIR/harness/goal-template-conformance-harness.mjs"
node "$DIR/harness/test-epic-socratic-pipeline-harness.mjs"
node "$DIR/harness/microservices-preemption-harness.mjs"
node "$DIR/harness/dual-transport-chaos-harness.mjs"

echo "🏆 ALL SODA OS TEST HARNESSES PASSED 100% GREEN!"
