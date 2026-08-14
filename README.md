# Kudi AI Bank — Backend Monorepo

Enterprise fintech backend, designed to serve millions of users.
**Phase 1 — Enterprise Foundation.** This repository currently contains
architecture scaffolding only: no business logic, no APIs, no
controllers. It exists to lock in structure, conventions, and tooling
before any domain module is implemented.

## Technology Stack

| Layer               | Technology                          |
|----------------------|--------------------------------------|
| Backend framework    | NestJS + TypeScript                  |
| Core banking engine  | Rust                                  |
| Database             | PostgreSQL                           |
| ORM                   | Prisma                               |
| Cache                | Redis                                |
| Queue                 | RabbitMQ                             |
| Auth                  | JWT + Refresh Tokens                 |
| Deployment            | Docker + Kubernetes                  |
| CI/CD                 | GitHub Actions                       |
| Payments               | Flutterwave (sole provider)          |

## Architecture

Clean Architecture · Domain-Driven Design · SOLID · CQRS · Repository
Pattern · Event-Driven Architecture · Dependency Injection.
See `/docs/architecture` for the full write-up.

## Repository Structure

```
kudi-ai/
├── apps/                # Deployable NestJS applications (mobile/web/admin API)
├── gateway/              # API Gateway + cross-cutting middleware/guards/etc.
├── modules/              # DDD bounded-context business modules (Phase 2+)
├── integrations/         # Third-party adapters (Flutterwave)
├── rust/                 # Rust core banking engines (ledger, fee, settlement...)
├── shared/                # Framework-agnostic shared kernel
├── infrastructure/        # Concrete adapters (DB, Redis, RabbitMQ, security...)
├── docs/                  # Architecture, API, database, deployment docs
├── deployment/             # Dockerfiles, Kubernetes manifests
├── tests/                  # Unit, integration, e2e, performance tests
├── scripts/                 # Dev/ops scripts
├── .github/                 # CI/CD workflows, issue/PR templates
├── .vscode/                  # Editor configuration
└── .husky/                    # Git hooks
```

## Getting Started

```sh
# Install dependencies & generate Prisma client
./scripts/setup.sh

# Start local infrastructure (Postgres, Redis, RabbitMQ)
docker compose up -d postgres redis rabbitmq

# Run an app in watch mode
npm run start:mobile-api

# Build the Rust workspace
cargo build --workspace
```

## Status

**Phase 1**: repository foundation, tooling, CI/CD, and infrastructure
scaffolding — complete.

**Phase 2** (complete): all four planned business domain modules.
- `identity/` — registration, JWT auth, refresh rotation, RBAC — ✅ implemented
- `accounts/` — accounts/wallets, NUBAN numbers, ledger-consistent balances — ✅ implemented
- `transfers/` — internal transfers (atomic) + Flutterwave payouts (saga) — ✅ implemented
- `compliance/` — BVN/NIN verification, KYC tiers, event-driven account activation — ✅ implemented

See `/modules/README.md` for full module status.
