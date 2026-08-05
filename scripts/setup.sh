#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Node dependencies"
npm ci

echo "==> Generating Prisma client"
npx prisma generate --schema=infrastructure/prisma/schema.prisma

echo "==> Building Rust workspace"
cargo build --workspace

echo "==> Copying .env.example to .env (if missing)"
[ -f .env ] || cp .env.example .env

echo "==> Setup complete. Run 'docker compose up -d' to start local infra."
