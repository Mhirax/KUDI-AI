# Kudi AI Bank — Backend Monorepo

Enterprise fintech backend, designed to serve millions of users.

**Current state.** Twelve domain modules are implemented — identity,
accounts, transfers, funding, ledger, compliance, savings, loans, cards,
bills, notifications and rewards — behind 67 routes across three
applications. `npm run build` is clean, 130 unit tests pass, and the
mobile API boots and serves OpenAPI docs at `/api/v1/docs`.

It is usable for development and for building a frontend against. It is
not ready to hold real customer money: see *Known limitations* below.

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
├── modules/              # DDD bounded-context business modules
├── integrations/         # Third-party adapters (Flutterwave)
├── rust/                 # Rust core banking engines (ledger, fee, settlement...)
├── proto/                 # Shared gRPC contracts between NestJS and Rust
├── shared/                # Framework-agnostic shared kernel
├── infrastructure/        # Concrete adapters (DB, Redis, RabbitMQ, gRPC, security...)
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

**Phase 3** (in progress): the Rust ledger-engine gRPC integration.
- `/rust/ledger-engine` — real double-entry posting, its own Postgres
  schema, and a runnable gRPC server — ✅ implemented, compiles clean
  (`cargo check`/`cargo build`, zero warnings)
- `/infrastructure/grpc/ledger` — NestJS-side gRPC client — ✅ implemented
- Transfers' `GrpcInternalTransferExecutor` — ✅ implemented, toggled via
  `LEDGER_ENGINE_ENABLED` alongside the original Prisma-only executor
- Accounts' `RegisterLedgerAccountHandler` — ✅ implemented (registers
  every new account with the ledger engine on open)
- Fee-engine, settlement-engine, reconciliation-engine, financial-engine —
  not yet wired (same gRPC pattern is the template; see `/rust/README.md`)

## Known limitations

Honest about what is not finished, so nobody plans around the wrong thing.

- **The Rust ledger engine is not in the request path.** `LEDGER_ENGINE_ENABLED`
  is false, so transfers run through the Prisma executor. The engine has its
  own schema and its own idempotency, and needs its own database before it is
  switched on.
- **A customer cannot fund their own account.** `POST /accounts/:id/credit` is
  admin-only, correctly. Real funding runs through Flutterwave, which needs
  provider credentials. On a fresh environment every account sits at `0.00`.
- **New accounts are `PENDING_VERIFICATION`,** not active. KYC belongs in any
  client flow from the start.
- **No account-name enquiry and no bank list.** External transfers take a
  3-digit bank code and a typed recipient name, with nothing to resolve or
  verify either.
- **`prisma migrate` was destructive against the existing database** and is
  now safe only because the schema was reconciled with it. Check
  `prisma migrate diff` before running any migration against a database with
  data in it.
- **TypeScript strict mode is off** (`strictNullChecks`, `noImplicitAny`).
  Turning it back on is worth doing while the codebase is this size.
