#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.yml up -d postgres redis rabbitmq
echo "==> Local infra (Postgres, Redis, RabbitMQ) is up."
