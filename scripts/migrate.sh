#!/usr/bin/env bash
set -euo pipefail

echo "==> Running Prisma migrations"
npx prisma migrate deploy --schema=infrastructure/prisma/schema.prisma
