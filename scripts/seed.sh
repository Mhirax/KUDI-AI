#!/usr/bin/env bash
set -euo pipefail

echo "==> Seeding database"
npx ts-node infrastructure/prisma/seed.ts
