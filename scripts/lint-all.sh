#!/usr/bin/env bash
set -euo pipefail

echo "==> Linting TypeScript"
npm run lint

echo "==> Linting Rust"
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
