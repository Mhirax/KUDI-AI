# Kudi AI Bank — Codebase Overview

A senior-engineer onboarding read: what this system is, how it's put together,
and where the sharp edges are. Written from a direct inspection of the repo on
2026-08-17. For current project status and the active roadmap, see
[`../README.md`](../README.md); for the gap between what the frontend expects
and what the backend serves, see [`AUDIT.md`](AUDIT.md) and
[`API-CONTRACT.md`](API-CONTRACT.md) — this document doesn't repeat their
content, only points to it.

---

## 1. Project purpose

A microfinance banking platform ("Kudi AI Bank"): user identity/auth, bank
accounts (wallets), internal and external (interbank) money transfers, and
KYC/compliance (BVN/NIN verification against CBN tiers). Backend is a NestJS
monorepo; frontend is a separate React SPA. See [`README.md`](../README.md).

## 2. Tech stack

| Layer | Technology | Where |
|---|---|---|
| Backend | NestJS 10 + TypeScript, Clean Architecture / DDD / CQRS | [`package.json`](../package.json) |
| Frontend | React 18 + Vite + SCSS | [`frontend/package.json`](../frontend/package.json) |
| Database | PostgreSQL via Prisma ORM | [`infrastructure/prisma/schema.prisma`](../infrastructure/prisma/schema.prisma) |
| Auth | JWT (access + refresh rotation), Passport | [`modules/identity`](../modules/identity) |
| Payments | Flutterwave — sole provider | [`integrations/payment-gateway/flutterwave`](../integrations/payment-gateway/flutterwave) |
| Deployment | Docker + Kubernetes, GitHub Actions | [`deployment/`](../deployment) |
| Rust | Cargo workspace, 6 crates — **50-line stubs, not wired in** | [`rust/`](../rust) |

## 3. Frameworks and libraries (backend)

From [`package.json`](../package.json):
- `@nestjs/cqrs` — every write goes through `CommandBus`, every read through
  `QueryBus`. No service-layer god classes.
- `@nestjs/passport` + `passport-jwt` — JWT strategy, see §10.
- `@prisma/client` — the only persistence layer touching Postgres.
- `class-validator` / `class-transformer` — DTO validation at the controller
  boundary (`ValidationPipe` in every `main.ts`).
- `ioredis`, RabbitMQ client — **infrastructure modules exist but nothing in
  `modules/` imports them.** Domain events are in-process
  (`@nestjs/cqrs` `EventBus`), not brokered.
- `nest-winston` / `winston` — structured logging, wired in
  [`apps/web-api/src/bootstrap/logger.bootstrap.ts`](../apps/web-api/src/bootstrap/logger.bootstrap.ts).
- `helmet` — security headers, wired in each app's `bootstrap/security.bootstrap.ts`.
- Notably **absent**: no `@nestjs/throttler` (rate limiting) despite
  `RATE_LIMIT_TTL`/`RATE_LIMIT_MAX` being defined in
  [`.env.example`](../.env.example) — the config exists, the throttler
  package and its guard do not.

Frontend ([`frontend/package.json`](../frontend/package.json)) is
deliberately minimal: `react-router-dom` for routing, `zustand` for state,
no UI kit, no data-fetching library (fetch is hand-wrapped, see §11).

## 4. Entry points

Four separate NestJS applications share the same domain modules:

| App | Entry file | Port | Notes |
|---|---|---|---|
| `web-api` | [`apps/web-api/src/main.ts`](../apps/web-api/src/main.ts) | 3002 | **The only one the frontend actually talks to** (`VITE_API_BASE_URL` in [`frontend/src/api/client.js`](../frontend/src/api/client.js) defaults to `http://localhost:3002/api/v1`) |
| `mobile-api` | `apps/mobile-api/src/main.ts` | 3001 | Identical `app.module.ts` to web-api |
| `admin-api` | `apps/admin-api/src/main.ts` | 3003 | Identical `app.module.ts` to web-api |
| `api-gateway` | [`gateway/api-gateway/src/main.ts`](../gateway/api-gateway/src/main.ts) | 8080 | **Empty shell** — no routes, no proxy logic, just `ConfigModule` (see §16) |

Frontend entry: [`frontend/src/main.jsx`](../frontend/src/main.jsx) →
renders [`AppRouter`](../frontend/src/routes/AppRouter.jsx).

## 5. Main application flow

**Backend request lifecycle** (e.g. `POST /api/v1/transfers/internal`):
1. `main.ts` bootstraps → global `ValidationPipe`, `JwtAuthGuard`,
   `HttpExceptionFilter` (registered in
   [`apps/web-api/src/app.module.ts`](../apps/web-api/src/app.module.ts)).
2. Request hits [`TransfersController`](../modules/transfers/presentation/controllers/transfers.controller.ts)
   → builds a CQRS command → `CommandBus.execute()`.
3. Handler (e.g.
   [`initiate-internal-transfer.handler.ts`](../modules/transfers/application/commands/initiate-internal-transfer/initiate-internal-transfer.handler.ts))
   loads domain entities via repository *interfaces* (ports), applies
   business rules on the entity itself (`Account.debit()`,
   `Transfer.initiateExternal()`), persists via
   `PrismaInternalTransferExecutor` inside one `$transaction`, then
   publishes pulled domain events on the `EventBus`.
4. `HttpExceptionFilter` normalizes any thrown `DomainException` into a
   consistent `{ statusCode, error, message, path, timestamp }` envelope
   ([`gateway/filters/http-exception.filter.ts`](../gateway/filters/http-exception.filter.ts)).

**Frontend flow**: `AppRouter.jsx` gates routes on `useAuthStore().isLoggedIn`
→ feature component calls its API client
(e.g. [`api/transfer.js`](../frontend/src/api/transfer.js)) → which calls the
shared `apiClient()` in [`api/client.js`](../frontend/src/api/client.js) →
raw `fetch` with `Authorization: Bearer <token>` → on 401, dispatches a
`window` event handled by `AuthExpiredHandler` in `AppRouter.jsx`, which
attempts a silent refresh before forcing logout.

## 6. Folder structure

```
apps/            4 deployable NestJS entry points (mobile/web/admin-api, api-gateway lives under gateway/)
gateway/         Cross-cutting: guards, filters, interceptors, middleware, pipes + api-gateway app
modules/         DDD bounded contexts: identity, accounts, transfers, compliance
  <module>/domain/          entities, value objects, domain events, repository interfaces
  <module>/application/     CQRS commands/queries/handlers, DTOs, event handlers
  <module>/infrastructure/  Prisma-backed repository implementations, mappers
  <module>/presentation/    controllers, guards, strategies
integrations/    Third-party adapters — currently only Flutterwave
shared/          Framework-agnostic kernel: value objects (Money), enums, exceptions, decorators
infrastructure/  Prisma schema/service, Redis, RabbitMQ, config, security, logging (mostly unused scaffolding)
frontend/        React + Vite SPA, separate package.json, own git-tracked changes
rust/            6 Cargo crates, ~50 lines each, NOT in the request path
docs/            This file, AUDIT.md, API-CONTRACT.md, per-area READMEs
tests/           unit (real tests), integration/e2e/performance (scaffolding only, see §13)
deployment/      Dockerfiles per app, Kubernetes manifests, CI/CD docs
```

Each module follows the same four-layer split consistently — this is the
strongest structural signal in the codebase; new modules should copy
`modules/accounts` as a template.

## 7. Important configuration files

| File | Purpose |
|---|---|
| [`package.json`](../package.json) | Backend scripts — build/start per app, `test:unit`/`test:integration`/`test:e2e`, `prisma:*` |
| [`nest-cli.json`](../nest-cli.json) | Declares the 4-app Nest monorepo; each app has its own `tsconfig.app.json` |
| [`tsconfig.json`](../tsconfig.json) | Strict TS, path aliases `@shared/*`, `@modules/*`, `@infrastructure/*`, `@integrations/*`, `@gateway/*` |
| [`.eslintrc.js`](../.eslintrc.js) | Type-checked linting (`parserOptions.project: 'tsconfig.json'`) — **backend only**, see §16 |
| [`.env.example`](../.env.example) | All expected env vars — DB, Redis, RabbitMQ, JWT, CORS, rate limiting, Flutterwave, storage, encryption |
| [`docker-compose.yml`](../docker-compose.yml) | Local dev stack: postgres, redis, rabbitmq + all 4 apps |
| [`infrastructure/prisma/schema.prisma`](../infrastructure/prisma/schema.prisma) | Source of truth for the DB schema |
| [`frontend/vite.config.js`](../frontend/vite.config.js) | Frontend build config (not yet inspected in depth — check `@` alias setup here if import paths break) |
| [`frontend/.env.example`](../frontend/.env.example) | `VITE_API_BASE_URL` — the only var the frontend reads |

## 8. Database/backend structure

Single Postgres database via Prisma, schema at
[`infrastructure/prisma/schema.prisma`](../infrastructure/prisma/schema.prisma).
Four models, one per bounded context: `User` + `RefreshToken` (identity),
`Account` (accounts), `Transfer` (transfers), `KycProfile` (compliance).

Notable design choices:
- **Deliberate absence of Prisma relations across module boundaries** — e.g.
  `Account.userId` is a plain string, not a `@relation` to `User`, to keep
  bounded contexts isolated at the DB level (documented inline in the schema
  and in `modules/accounts/README.md`).
- **Money is `BigInt` minor units**, never a float, both in Postgres and in
  domain entities (`shared/value-objects/money.vo.ts`).
- **Optimistic concurrency**: `Account` and `Transfer` both carry a
  `version` int, incremented on every write via a conditional `updateMany`
  in the repository implementations
  (`modules/accounts/infrastructure/persistence/`).
- **BVN/NIN are never stored raw** — only a SHA-256 hash and a masked
  display string on `KycProfile` (see schema comments and
  `modules/compliance/domain/entities/kyc-profile.entity.ts`).
- Access via a single global `PrismaService`
  ([`infrastructure/database/prisma.service.ts`](../infrastructure/database/prisma.service.ts)),
  exported by an `@Global()` `DatabaseModule` — imported once per app.
- **No ledger table.** `Account.balance` is a mutable column with no
  double-entry journal behind it (tracked as a known gap in
  [`README.md`](../README.md#4-known-gaps)).

## 9. API structure

REST, prefix `/api/v1` (configurable via `API_PREFIX`), one controller per
module, thin (controllers only translate HTTP → CQRS command/query, all
logic lives in handlers). 23 live endpoints across 4 modules — full table in
[`AUDIT.md`](AUDIT.md#2-what-is-actually-implemented).

- Auth: [`modules/identity/presentation/controllers/auth.controller.ts`](../modules/identity/presentation/controllers/auth.controller.ts)
- Users: [`modules/identity/presentation/controllers/users.controller.ts`](../modules/identity/presentation/controllers/users.controller.ts)
- Accounts: `modules/accounts/presentation/controllers/accounts.controller.ts`
- Transfers: [`modules/transfers/presentation/controllers/transfers.controller.ts`](../modules/transfers/presentation/controllers/transfers.controller.ts) + a separate [`flutterwave-transfer-webhook.controller.ts`](../modules/transfers/presentation/controllers/flutterwave-transfer-webhook.controller.ts)
- Compliance/KYC: `modules/compliance/presentation/controllers/*.controller.ts`

Swagger/OpenAPI is auto-generated and mounted at `/api-docs` in non-production
(see `apps/web-api/src/main.ts`). Errors follow one consistent envelope from
`HttpExceptionFilter` (§5). List endpoints return
`{ data: [], meta: { total, page, limit, totalPages } }` by convention
(documented in `README.md` §10, not yet enforced by a shared base DTO).

External transfers are a documented **saga**, not a single transaction —
see [`initiate-external-transfer.handler.ts`](../modules/transfers/application/commands/initiate-external-transfer/initiate-external-transfer.handler.ts):
debit → attempt Flutterwave payout → on synchronous failure, compensating
credit + mark `REVERSED`; on async failure (webhook), the same compensation
logic runs in `ConfirmExternalTransferHandler`. Internal transfers, by
contrast, are truly atomic (one `$transaction` covering debit + credit +
transfer row) via `PrismaInternalTransferExecutor`.

## 10. Authentication/authorization flow

1. `POST /auth/register` / `POST /auth/login` — public
   ([`@Public()`](../shared/decorators/public.decorator.ts) decorator, read by
   [`JwtAuthGuard`](../gateway/guards/jwt-auth.guard.ts)) — issues an access
   token (15 min, `JWT_ACCESS_EXPIRES_IN`) and refresh token (7 days).
2. `JwtAuthGuard` is registered **globally** as `APP_GUARD` in every app's
   `app.module.ts` — every route requires a valid bearer token by default;
   `@Public()` is the explicit opt-out. Secure-by-default.
3. [`JwtStrategy`](../modules/identity/presentation/strategies/jwt.strategy.ts)
   validates the token and attaches the decoded payload to `request.user`,
   retrieved downstream via [`@CurrentUser()`](../shared/decorators/current-user.decorator.ts).
4. Role-based access is opt-in via [`@Roles(...)`](../shared/decorators/roles.decorator.ts)
   + [`RolesGuard`](../gateway/guards/roles.guard.ts) (not global — must be
   applied per-route; used e.g. in `TransfersController` to distinguish admin
   vs. owner access on `GET /transfers/:reference`).
5. `POST /auth/refresh` rotates the refresh token (family-based revocation —
   see the `RefreshToken` model's `family`/`replacedByTokenId` fields).
6. Passwords: bcrypt, cost factor 12
   (`modules/identity/infrastructure/services/*hasher*`).
7. Frontend side: access token held **in memory only** (module-level variable
   in `api/client.js`, never `localStorage`), refresh token held in
   `useAuthStore` (Zustand, also in-memory, not persisted) — see
   [`frontend/src/store/authStore.js`](../frontend/src/store/authStore.js).
   This means a hard page refresh currently loses the session; there's no
   persistence layer (deliberate, but worth confirming is intentional for
   this stage).

**Dead code**: `VerifyOtp.jsx` / `SetupPin.jsx` exist in
`frontend/src/features/auth/` but are unrouted — no backend OTP/PIN endpoints
exist (open decision D6 in `README.md`).

## 11. State management

Frontend only — backend is stateless per-request (CQRS handlers, no session
state beyond the JWT).

- **Zustand**, single store: [`frontend/src/store/authStore.js`](../frontend/src/store/authStore.js)
  — user object, login state, tokens (access in `api/client.js`'s module
  scope, refresh in the store itself), onboarding/persona selection.
- No React Context, no Redux — everything else is local component state.
- No data-fetching/cache library (no React Query/SWR) — each feature
  component calls its API client directly in a `useEffect`, presumably (not
  yet verified per-component).
- `api/pending.js` is a notable pattern: any endpoint the backend doesn't
  yet implement throws `FeatureNotAvailableError` instead of falling back to
  mock data — the "no mock mode" rule documented in `README.md` §8.

## 12. Main frontend/backend modules

**Backend** (4 built, 9 pending — full breakdown in `README.md` §3):
`identity`, `accounts`, `transfers`, `compliance` — each following the
domain/application/infrastructure/presentation split from §6.

**Frontend features** (`frontend/src/features/`): `auth` (Login/Signup/dead
OTP+PIN screens), `dashboard`, `transfer`, `bills`, `savings`, `cards`,
`loans`, `rewards`, `profile`, `kyc`, `onboarding`. Every feature has a UI
already; only `auth`, `dashboard`(partial), `transfer`, `kyc` are backed by a
real API per `API-CONTRACT.md` — the rest render a "not available yet" state.

## 13. Testing setup

| Suite | Config | Status |
|---|---|---|
| Unit | [`tests/unit/jest.config.ts`](../tests/unit/jest.config.ts) | **Real** — 32 tests / 7 suites, domain entities only (`modules/**/*.spec.ts`, `shared/value-objects/money.vo.spec.ts`) |
| Integration | referenced as `tests/integration/jest.config.ts` in `package.json`'s `test:integration` script | **Config file does not exist** — only `README.md` and `docker-compose.test.yml` are present in `tests/integration/`. Running `npm run test:integration` will fail immediately. This script is also invoked by CI (`.github/workflows/ci.yml`, `test-node` job) |
| E2E | [`tests/e2e/jest-e2e.config.ts`](../tests/e2e/jest-e2e.config.ts) | Config exists, no spec files yet — not run in CI |
| Performance | [`tests/performance/smoke.k6.js`](../tests/performance/smoke.k6.js) | k6 script present, not wired into any CI job |
| Frontend | none | `frontend/package.json` has no `test` script at all |

Domain-layer unit tests are genuinely good (see e.g.
`modules/accounts/domain/entities/account.entity.spec.ts`, 8 cases covering
debit/credit/freeze invariants) — coverage just doesn't extend past the
domain layer into handlers, executors, or controllers.

## 14. Build/deployment setup

- **CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)): lint +
  format check → typecheck → unit+integration tests (Postgres/Redis/RabbitMQ
  service containers) → Rust fmt/clippy/test → Docker image build matrix for
  all 4 backend apps. **Frontend is entirely absent from CI** — no lint, no
  build, no test job touches `frontend/`.
- **CD**: [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) (not yet
  inspected in this pass).
- **Docker**: one `Dockerfile.*` per backend app under
  [`deployment/docker/`](../deployment/docker), plus `Dockerfile.rust-engines`
  even though the Rust crates aren't in any request path yet.
- **Kubernetes**: per-app `deployment.yaml`/`service.yaml`/`hpa.yaml` under
  [`deployment/kubernetes/`](../deployment/kubernetes) for `mobile-api`,
  `web-api`, `admin-api`, `api-gateway` — i.e. k8s manifests exist for
  scaling out an `api-gateway` that currently does nothing (§16).
- **Local dev**: [`docker-compose.yml`](../docker-compose.yml) brings up
  Postgres/Redis/RabbitMQ + all 4 apps; `./scripts/setup.sh` installs deps
  and generates the Prisma client (per `README.md` §8).

## 15. Environment/configuration files

- [`.env.example`](../.env.example) → copy to `.env` (gitignored — confirmed
  not tracked, `.gitignore` line: `.env` / `.env.*` / `!.env.example`).
  Covers app/service ports, `DATABASE_URL`, Redis, RabbitMQ, JWT secrets,
  CORS, rate-limit knobs, Flutterwave keys, bank identity, logging, S3-style
  object storage, and a KYC field-level `ENCRYPTION_KEY`.
- [`frontend/.env.example`](../frontend/.env.example) → just
  `VITE_API_BASE_URL`.
- Per-app config: `apps/{web,mobile,admin}-api/src/config/app.config.ts` and
  `bootstrap/security.bootstrap.ts` (CORS) — the latter is where the
  `CORS_ORIGIN` default-to-`'*'` issue lives (§16).

## 16. Areas that look unusual or potentially problematic

Ranked roughly by how much attention they deserve first:

1. **`npm run test:integration` points at a config file that doesn't
   exist** — `tests/integration/jest.config.ts` is referenced in
   `package.json` and invoked by CI, but only `README.md` and
   `docker-compose.test.yml` exist in that folder. This should fail every CI
   run on the `test-node` job unless something downstream is silently
   swallowing the error — worth confirming actual CI run status rather than
   assuming green.
2. **Three identical backend apps.** `mobile-api`, `web-api`, and
   `admin-api` have byte-for-byte identical `app.module.ts` files (same four
   domain modules, same global guard/filter). Only `web-api` is actually
   used (frontend points at port 3002). It's unclear whether `mobile-api`
   and `admin-api` are meant to diverge later (different module subsets,
   different guards for an admin surface) or are vestigial from initial
   scaffolding — this is worth a direct question to whoever owns the
   roadmap, since right now they're 100% duplicate attack surface and
   duplicate deploy targets for zero behavioral difference.
3. **`api-gateway` is a k8s-deployable no-op.** It has Kubernetes manifests,
   a Dockerfile, and a `docker-compose.yml` entry, but its `app.module.ts`
   is just a bare `ConfigModule` — no proxying, no routes. Anything hitting
   port 8080 today gets nothing.
4. **Frontend has zero CI coverage.** No lint script even exists in
   `frontend/package.json`, and CI never runs `npm run build` inside
   `frontend/`. Combined with the root `.eslintrc.js` being unable to parse
   frontend files at all (type-checked linting against a `tsconfig.json`
   that doesn't cover `.jsx`, and `frontend/` has no `tsconfig.json` of its
   own — flagged as gap #7 in `README.md`), a frontend-breaking change could
   land without any automated signal.
5. **Stale "Phase 1" doc comments contradict the actual state.**
   `apps/web-api/src/main.ts`'s file header still says *"Business logic,
   controllers, and route handlers are intentionally omitted in Phase 1"*,
   and `infrastructure/prisma/schema.prisma`'s header says *"Domain models
   are intentionally omitted; this establishes datasource... only"* — both
   false today (23 live endpoints, 4 full Prisma models). Not a functional
   bug, but worth a cleanup pass since a new contributor reading these files
   top-down will be actively misled before reaching the real content below.
6. **Rate limiting is configured but not implemented.** `.env.example`
   defines `RATE_LIMIT_TTL`/`RATE_LIMIT_MAX`, but `@nestjs/throttler` isn't
   even a dependency in `package.json`. `/auth/login` and the BVN/NIN
   verification endpoints are unthrottled (already tracked as gap #3 in
   `README.md`).
7. **`CORS_ORIGIN` defaults to `'*'` with credentials enabled** in all three
   `security.bootstrap.ts` files
   (`apps/{web,mobile,admin}-api/src/bootstrap/security.bootstrap.ts`) —
   `origin: process.env.CORS_ORIGIN?.split(',') || '*'` combined with
   `credentials: true` is an invalid/dangerous combination if it ever
   reaches production unset (already tracked as gap #4 in `README.md`, and
   independently flagged in `AUDIT.md`).
8. **No idempotency on money movement**, and the saga-based external
   transfer handler (`initiate-external-transfer.handler.ts`) does two
   separate repository writes (debit, then transfer-row insert) that are
   *not* wrapped in a shared `$transaction` the way the internal-transfer
   path is — if the process dies between them, funds are held with no
   transfer record. Internal transfers don't have this specific risk (they
   share one `$transaction`), but external transfers do, on top of the
   already-tracked idempotency gap.
9. **Rust workspace is fully decorative** right now — 6 crates, ~50 lines
   each, `Dockerfile.rust-engines` builds an image nothing calls. Building
   or extending these before a real ledger module needs them would be pure
   sunk cost (this is explicitly called out as a "do not" in `README.md`
   §7).
10. **Frontend tokens are memory-only with no persistence.** Confirmed
    deliberate (comment in `api/client.js`: "never localStorage"), but it
    means every hard refresh drops the session — reasonable for a security
    posture, but worth confirming product actually wants this UX today
    versus, say, an httpOnly-cookie refresh flow later.

---

## What to understand first

1. The **module template**: read `modules/accounts` top to bottom
   (domain → application → infrastructure → presentation). Every other
   built module and every module still to come follows this exact shape.
2. **`README.md`** — it's the living roadmap, not a static intro. §5 (open
   decisions) and §6 (foundational work) describe what blocks the next nine
   modules; nothing about future work should be planned without reading
   those first.
3. **The money path**: `Account` entity (`modules/accounts/domain/entities/account.entity.ts`),
   `Money` value object (`shared/value-objects/money.vo.ts`), and
   `PrismaInternalTransferExecutor` — this is the highest-stakes code in the
   repo and the best-written.
4. **`AUDIT.md`** and **`API-CONTRACT.md`** — the frontend/backend gap is
   large and already fully mapped; don't re-derive it.

## What to avoid touching

- The Rust workspace (`rust/`) — not in the request path; touching it now is
  wasted effort per the roadmap's explicit "do not" list.
- Redis/RabbitMQ wiring (`infrastructure/redis`, `infrastructure/rabbitmq`) —
  unused by design until a module genuinely needs a broker.
- `api-gateway` — don't build proxy logic into it speculatively; confirm with
  whoever owns the roadmap whether it's still the intended architecture
  before investing in it.
- Anything that reintroduces mock data or `localStorage` token persistence in
  the frontend — both are explicit anti-patterns the codebase has already
  moved away from (`README.md` §7 "Do not", `api/client.js` comments).

## The 5 most important files

1. [`README.md`](../README.md) — roadmap, module status, open decisions;
   read before starting any task.
2. [`infrastructure/prisma/schema.prisma`](../infrastructure/prisma/schema.prisma) —
   the entire persisted data model in one file.
3. [`modules/accounts/domain/entities/account.entity.ts`](../modules/accounts/domain/entities/account.entity.ts) —
   the canonical example of the domain-entity pattern (invariants, events)
   every module should follow.
4. [`apps/web-api/src/app.module.ts`](../apps/web-api/src/app.module.ts) —
   shows exactly how a module gets wired into a running app (guard, filter,
   module imports) — the pattern to copy for module five.
5. [`frontend/src/api/client.js`](../frontend/src/api/client.js) — single
   chokepoint for all frontend↔backend communication; understanding this
   file explains how auth, errors, and the "no mock mode" rule are enforced
   across every feature.

## Potential technical risks

- **CI may not actually be green** — the missing `tests/integration/jest.config.ts`
  (§16.1) should break the `test-node` job on every push/PR to `main`/`develop`.
- **Silent duplicate attack surface** — three identical, independently
  deployable backend apps (§16.2) triple the surface that needs securing,
  patching, and monitoring for zero current behavioral benefit.
- **CORS misconfiguration risk in production** — the `'*'` + `credentials: true`
  default (§16.7) is a live risk the moment `CORS_ORIGIN` is left unset in
  any deployed environment.
- **Unthrottled auth and KYC-verification endpoints** (§16.6) — brute-force
  and enumeration risk on `/auth/login`, BVN/NIN verification, until
  `@nestjs/throttler` is actually wired in.
- **No ledger, no idempotency** — both already tracked as Critical in
  `README.md` §4, and both are prerequisites the roadmap explicitly gates
  module five on; the biggest financial-integrity risk in the repo.
- **Frontend has no safety net** — no lint, no tests, no CI build step
  (§16.4) — a broken frontend commit has no automated way to be caught
  before it reaches a reviewer's eyes.
