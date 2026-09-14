#!/usr/bin/env bash
# Reclaim runner disk before heavy Rust link/test work (ubuntu-latest ~14GB free).
# Safe to run after Node/Rust toolchain setup — does not remove hosted toolcache Node/Rust.

set -euxo pipefail

echo "=== Disk before cleanup ==="
df -h /

sudo rm -rf /usr/share/dotnet
sudo rm -rf /usr/local/lib/android
sudo rm -rf /opt/ghc
sudo rm -rf /opt/hostedtoolcache/CodeQL
sudo rm -rf /usr/local/share/boost
sudo rm -rf "$HOME/.cache/go-build" 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
  sudo docker image prune --all --force || true
fi

echo "=== Disk after cleanup ==="
df -h /
