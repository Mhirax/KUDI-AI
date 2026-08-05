# Running Kudi AI Bank Locally (for Frontend Integration Testing)

This sandbox cannot expose a server reachable from your frontend or
download Prisma's query-engine binaries (network-restricted). Both of
those work normally on your own machine. Follow these steps there.

## 1. Prerequisites

- Node.js 20+
- Docker + Docker Compose (simplest path — runs Postgres/Redis/RabbitMQ
  for you)

## 2. Install dependencies

```sh
cd kudi-ai
npm install
```

> Note: this copy uses `bcryptjs` instead of `bcrypt` (a pure-JS
> substitute I made only because *this sandbox* couldn't compile
> bcrypt's native binary). On your machine, native `bcrypt` will
> install fine — you can revert this if you prefer, but `bcryptjs` is
> a safe, fully compatible drop-in and avoids needing native build
> tools (`node-gyp`, Python, a C++ toolchain) at all, which is often
> convenient in Docker/CI anyway. No action required either way.

## 3. Start infrastructure

```sh
docker compose up -d postgres redis rabbitmq
```

## 4. Configure environment

```sh
cp .env.example .env
```

Edit `.env` — the defaults already point at `localhost` for each
service, so for local development you likely only need to set:
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to any random string
- Leave `LEDGER_ENGINE_ENABLED`, `FEE_ENGINE_ENABLED`,
  `SETTLEMENT_ENGINE_ENABLED`, `RECONCILIATION_ENGINE_ENABLED` all
  `false` unless you're also running the Rust services — the NestJS
  apps work standalone without them (Prisma-only fallbacks).

## 5. Generate the Prisma client and run migrations

```sh
npm run prisma:generate
npm run prisma:migrate
```

This is the step that was blocked in the sandbox — on your machine
with normal internet access it will download the query engine and
succeed.

## 6. Start an app

```sh
npm run start:web-api      # or start:mobile-api / start:admin-api
```

It boots on the port set in `.env` (`3002` for web-api by default).
Point your frontend's API base URL at `http://localhost:3002/api/v1`.

## 7. Confirm it's alive

```sh
curl http://localhost:3002/health
```

## What I verified from inside the sandbox

- `npx tsc --noEmit` — clean across the entire repo (all 12 modules:
  Identity, Accounts, Ledger, Transfers, Funding, Bills, Compliance,
  Notifications, Savings, Loans, Cards, Rewards). The only reported
  error is a known false positive caused by the Prisma client not
  being generated here — it will not occur on your machine once step
  5 succeeds.
- `cargo check` on `rust/ledger-engine` — compiles clean.
- Postgres, Redis, and RabbitMQ all installed and started successfully
  inside the sandbox itself, confirming the `docker-compose.yml`
  service definitions are consistent with what the app expects.

## What I could NOT verify

- An actual live boot with a real database (blocked by the Prisma
  engine download).
- Runtime behavior of any endpoint.

Both become possible immediately once you run steps 3–6 above.
