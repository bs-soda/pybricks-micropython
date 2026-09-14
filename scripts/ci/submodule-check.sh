#!/usr/bin/env bash
# Soda CI & Local Submodule Integrity & Reproducibility Verification
# Enforces exact-HEAD gitlink provenance, clean working tree, and zero submodule drift.
# See G-MDRB-026 and docs/02-product/acceptance/G-MDRB-026.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "=== Submodule Integrity & Provenance Verification ==="

# 1. Verify .gitmodules presence and syntax
if [[ ! -f ".gitmodules" ]]; then
  echo "::error::.gitmodules file not found in repository root" >&2
  exit 1
fi

# 2. Verify all registered submodules
REQUIRED_SUBMODULES=("micropython" "lib/btstack" "lib/STM32_USB_Device_Library" "lib/umm_malloc")
for sub in "${REQUIRED_SUBMODULES[@]}"; do
  if ! grep -q "\[submodule \"$sub\"\]" .gitmodules; then
    echo "::error::Submodule '$sub' is not registered in .gitmodules" >&2
    exit 1
  fi
  if [[ ! -d "$sub" ]]; then
    echo "::error::Submodule path '$sub' directory does not exist on disk" >&2
    exit 1
  fi
done

# 3. Verify exact commit SHA for lib/btstack
EXPECTED_BTSTACK_SHA="5d9c44988e61879b409abda35ebf12cf186253bf"
INDEX_BTSTACK_SHA="$(git rev-parse HEAD:lib/btstack 2>/dev/null || echo "")"
if [[ -z "$INDEX_BTSTACK_SHA" ]]; then
  echo "::error::HEAD does not contain a gitlink entry for lib/btstack" >&2
  exit 1
fi

if [[ "$INDEX_BTSTACK_SHA" != "$EXPECTED_BTSTACK_SHA" ]]; then
  echo "::error::lib/btstack gitlink SHA mismatch: expected $EXPECTED_BTSTACK_SHA, got $INDEX_BTSTACK_SHA" >&2
  exit 1
fi

if [[ -d "lib/btstack/.git" || -f "lib/btstack/.git" ]]; then
  CHECKED_OUT_SHA="$(cd lib/btstack && git rev-parse HEAD)"
  if [[ "$CHECKED_OUT_SHA" != "$INDEX_BTSTACK_SHA" ]]; then
    echo "::error::lib/btstack checked-out commit ($CHECKED_OUT_SHA) differs from gitlink ($INDEX_BTSTACK_SHA)" >&2
    exit 1
  fi
fi

# 4. Verify porcelain status of submodules (zero dirty or untracked files)
BTSTACK_PORCELAIN="$(git status --porcelain lib/btstack)"
if [[ -n "$BTSTACK_PORCELAIN" ]]; then
  echo "::error::lib/btstack has uncommitted modifications or untracked files:" >&2
  echo "$BTSTACK_PORCELAIN" >&2
  exit 1
fi

# Check across all initialized submodules
SUBMODULE_STATUS="$(git submodule status)"
while IFS= read -r line; do
  if [[ -n "$line" ]]; then
    # Leading prefix check: '+' means commit divergence, '-' means uninitialized, 'U' means merge conflict
    prefix="${line:0:1}"
    if [[ "$prefix" == "+" ]]; then
      echo "::error::Submodule divergence detected: $line" >&2
      exit 1
    elif [[ "$prefix" == "-" ]]; then
      echo "::error::Submodule uninitialized: $line" >&2
      exit 1
    elif [[ "$prefix" == "U" ]]; then
      echo "::error::Submodule merge conflict detected: $line" >&2
      exit 1
    fi
  fi
done <<< "$SUBMODULE_STATUS"

# Check recursive status inside submodules
git submodule foreach --quiet --recursive '
  DIRTY="$(git status --porcelain)"
  if [ -n "$DIRTY" ]; then
    echo "::error::Dirty working tree in submodule $name:" >&2
    echo "$DIRTY" >&2
    exit 1
  fi
'

echo "All submodules verified and clean"
exit 0
