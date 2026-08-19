# Folder Structure Guide

A walkthrough of this repository written for someone new to the codebase.
If [`CODEBASE-OVERVIEW.md`](CODEBASE-OVERVIEW.md) is the "what is this system
and how healthy is it" read, this file is the "where do I even find things"
read — start here if you've just cloned the repo.

There are actually **two projects** living in this one git repository:

- The **backend** — a NestJS monorepo at the repo root (`apps/`, `modules/`,
  `gateway/`, `shared/`, `infrastructure/`, `integrations/`, `rust/`).
- The **frontend** — a completely separate React app in `frontend/`, with
  its own `package.json`, own dependency tree, own build tool (Vite). It is
  not a workspace/package of the root `package.json` — it's a sibling
  project that happens to live in the same repo and talk to the backend over
  HTTP.

Keep that split in your head; almost every folder below belongs to one side
or the other, never both.

---

## 1. Folder-by-folder responsibility

### Backend (root-level, NestJS)

| Folder | Responsibility |
|---|---|
| `apps/` | The deployable programs. Each subfolder (`mobile-api`, `web-api`, `admin-api`) is a separate NestJS application with its own `main.ts` — think of these as three separate `.exe`s that happen to share almost all their code. |
| `gateway/` | Code that's *cross-cutting* — it runs on every request, in every app, regardless of which business module handles it: auth guards, exception filters, logging interceptors, validation pipes, HTTP middleware. Also houses a 4th deployable app, `gateway/api-gateway/`, meant to be the single public entry point in front of the other three (see §7 — it's currently empty). |
| `modules/` | The actual business logic, organized by bounded context: `identity` (users/auth), `accounts` (wallets/balances), `transfers` (money movement), `compliance` (KYC). This is where you'll spend most of your time. Each module is further split into four layers — see §1a below. |
| `integrations/` | Code that talks to the outside world. Currently just `payment-gateway/flutterwave/` — adapters that translate between our domain and Flutterwave's API. |
| `shared/` | A small "kernel" of framework-agnostic building blocks every module is allowed to depend on: the `Money` value object, custom exceptions, enums, decorators (`@Public()`, `@CurrentUser()`, `@Roles()`), constants. Nothing in here is allowed to depend back on a specific module. |
| `infrastructure/` | Concrete technical plumbing: the Prisma/Postgres connection (`infrastructure/prisma`, `infrastructure/database`), Redis client, RabbitMQ client, security config, logging setup. Most of this (Redis, RabbitMQ) is scaffolded but currently unused — see `CODEBASE-OVERVIEW.md` §3. |
| `rust/` | A separate Cargo workspace of 6 crates meant to eventually be high-performance core banking engines (ledger, fees, settlement, reconciliation). Right now each crate is a ~50-line stub. **Not called by any TypeScript code today.** |
| `docs/` | Project documentation — you're reading part of it now. |
| `tests/` | Backend test suites, split by kind: `unit/`, `integration/`, `e2e/`, `performance/`. See §3 — only `unit/` currently has real tests. |
| `deployment/` | Everything needed to ship the backend: one `Dockerfile.*` per app, Kubernetes manifests, deployment runbook docs. |
| `scripts/` | Small dev-ops shell scripts: `setup.sh` (install + generate Prisma client), `migrate.sh`, `seed.sh`, `docker-dev-up.sh`, `lint-all.sh`. |
| `.husky/` | Git hooks (commit-msg, pre-commit) — enforces commit message conventions and lint-staged checks before a commit is allowed to complete. |
| `.github/` | GitHub Actions CI/CD workflow definitions, issue/PR templates, Dependabot config. |
| `.vscode/` | Shared editor settings/recommended extensions/debug launch config for anyone using VS Code. |

### Frontend (`frontend/`, React)

| Folder | Responsibility |
|---|---|
| `frontend/src/api/` | One file per backend module (`auth.js`, `accounts.js`, `transfer.js`, `kyc.js`, ...) — each wraps the shared `apiClient()` (`api/client.js`) with typed-in-spirit methods for that module's endpoints. `pending.js` is special: it defines `FeatureNotAvailableError`, thrown by any method whose backend endpoint doesn't exist yet. |
| `frontend/src/features/` | One folder per screen/feature area (`auth`, `dashboard`, `transfer`, `bills`, `savings`, `cards`, `loans`, `rewards`, `profile`, `kyc`, `onboarding`) — each contains its own `.jsx` components and co-located `.scss`. This is where UI work happens. |
| `frontend/src/components/` | Shared, reusable UI pieces used across multiple features — e.g. `common/AppShell.jsx` (the logged-in app frame/nav), `common/PendingFeature.jsx` (the "not available yet" placeholder shown when a feature's backend doesn't exist). |
| `frontend/src/routes/` | Just one file, `AppRouter.jsx` — the entire route table and the logged-in/logged-out gating logic. |
| `frontend/src/store/` | Global client state. Just `authStore.js` (Zustand) — everything else is local component state. |
| `frontend/src/styles/` | Global SCSS — `global.scss` (resets/base styles) and `variables.scss` (design tokens: colors, spacing). |
| `frontend/src/utils/` | Small framework-agnostic helper functions used across features (not yet inventoried in depth). |

---

### 1a. Inside a backend module (the pattern to learn once)

Every folder under `modules/<name>/` follows the same four-layer split.
Learn this once in `modules/accounts/` and you can navigate all four modules
(and every module built in the future):

| Layer | Contains | Depends on |
|---|---|---|
| `domain/` | Entities, value objects, domain events, custom exceptions, and *interfaces* for repositories/services (e.g. `IAccountRepository`). Pure business rules — no NestJS, no Prisma. | Nothing outside `shared/` |
| `application/` | CQRS commands/queries and their handlers, plus DTOs. This is the "use case" layer — orchestrates domain objects to do something, e.g. `InitiateInternalTransferHandler`. | `domain/`, other modules' `domain/repositories/*.interface.ts` (via DI token, never their internals) |
| `infrastructure/` | The *implementations* of the interfaces `domain/` declared — Prisma-backed repositories, mappers between Prisma models and domain entities. | `domain/`, `infrastructure/` (root-level Prisma service) |
| `presentation/` | Controllers (HTTP routes), guards, and auth strategies specific to this module. Thin — just translates HTTP into a command/query and back. | `application/` |

---

## 2. Which folders contain application code

Everything in the table above under "Backend" and "Frontend" **except**
`docs/`, `deployment/`, `scripts/`, `.github/`, `.husky/`, `.vscode/` is
application code. In short: `apps/`, `gateway/`, `modules/`, `integrations/`,
`shared/`, `infrastructure/` (the non-generated parts), `rust/`, and all of
`frontend/src/`.

## 3. Which folders contain configuration

- Root: `.env` / `.env.example`, `tsconfig.json`, `nest-cli.json`,
  `.eslintrc.js`, `.prettierrc`, `.editorconfig`, `docker-compose.yml`,
  `Cargo.toml` (Rust workspace config).
- Per-app: `apps/*/src/config/app.config.ts`,
  `apps/*/tsconfig.app.json` — each app's own settings and its own
  TypeScript project reference.
- `infrastructure/config/` — shared config loader helpers.
- `frontend/`: `vite.config.js`, `frontend/.env.example`,
  `frontend/eslint.config.js` *(currently deleted/uncommitted locally — see
  §6)*.
- `deployment/kubernetes/base/configmap.yaml` and `secrets.example.yaml` —
  cluster-level configuration.

## 4. Which folders contain tests

- `tests/unit/` — real Jest unit tests live **beside the code they test**,
  not only here: `*.spec.ts` files sit next to their entities inside
  `modules/*/domain/entities/` and `shared/value-objects/`. `tests/unit/`
  itself just holds the Jest config and one `example.spec.ts` placeholder.
- `tests/integration/`, `tests/e2e/`, `tests/performance/` — scaffolding
  only right now (configs/READMEs present, no real test files yet — see
  `CODEBASE-OVERVIEW.md` §13 for the specific gap in `tests/integration/`).
- The frontend has **no test folder at all** — no test runner is even
  installed in `frontend/package.json`.

## 5. Which folders contain generated files

These are build outputs or installed dependencies — never hand-edit
anything inside them, and none of them should be committed (check
`.gitignore` if you ever see one show up in `git status`):

- `dist/` (root) — compiled backend JS output from `nest build`, plus
  `tsconfig.tsbuildinfo` / `tsconfig.app.tsbuildinfo` incremental-build
  caches.
- `node_modules/` (root) and `frontend/node_modules/` — installed npm
  packages.
- `frontend/dist/` — Vite's production build output.
- `package-lock.json` (both root and frontend) — technically checked into
  git (that's correct — lockfiles should be committed), but is
  machine-generated; never hand-edit it.
- `infrastructure/prisma/migrations/` — Prisma-generated SQL migration
  files (generated by `prisma migrate dev`, but *do* get committed — this
  is the one "generated" folder you should still read, since it's the
  historical record of every schema change).
- Rust's `target/` (not present until you `cargo build`, excluded via
  `tsconfig.json`'s `exclude` and presumably `.gitignore`).

## 6. Which folders contain assets

Short answer: **there isn't really an assets folder.** There's no
`frontend/public/` directory and no image files (`.png`/`.svg`/`.jpg`)
anywhere under `frontend/src/`. The UI is built entirely from SCSS
(`frontend/src/styles/`, plus one `.scss` file co-located next to almost
every `.jsx` component) — any icons or imagery are presumably inline
SVG/CSS or not yet added. Worth confirming with whoever owns the frontend
whether a `public/` folder is coming later (e.g. for a favicon, app icons,
illustration assets) — `index.html` currently has no `<link rel="icon">`
either.

## 7. Entry points

| Entry point | What it starts |
|---|---|
| [`apps/web-api/src/main.ts`](../apps/web-api/src/main.ts) | The backend API the frontend actually talks to. Port 3002. **This is the one you'll run most often.** |
| `apps/mobile-api/src/main.ts` | Same domain modules as web-api, port 3001. Not currently used by anything. |
| `apps/admin-api/src/main.ts` | Same domain modules again, port 3003. Not currently used by anything. |
| [`gateway/api-gateway/src/main.ts`](../gateway/api-gateway/src/main.ts) | Port 8080. Starts, but has no routes — see §7 of `CODEBASE-OVERVIEW.md`. |
| [`frontend/src/main.jsx`](../frontend/src/main.jsx) | The React app — mounts `AppRouter` into `#root` in `frontend/index.html`. Run via `npm run dev` inside `frontend/`. |
| `infrastructure/prisma/schema.prisma` | Not a runtime entry point, but the "start here" file for understanding what data exists — every model in the database is declared in this one file. |

## 8. Files that appear obsolete

- **`frontend/src/features/auth/VerifyOtp.jsx`, `SetupPin.jsx`** (and their
  supporting components `OtpInput.jsx`, `PinPad.jsx`, plus each `.scss`) —
  built, but unrouted. `AppRouter.jsx` has a comment confirming this
  directly: *"VerifyOtp and SetupPin stay in the codebase (kept for possible
  future use) but are DEACTIVATED — no OTP/PIN endpoints exist on the
  backend."* This is tracked as open decision D6 in the root `README.md` —
  the call on whether to finish wiring these or delete them hasn't been made
  yet.
- **`frontend/src/api/wallet.js`** — currently marked deleted in the working
  tree (`git status` shows `D frontend/src/api/wallet.js`), superseded by
  `accounts.js`/`ledger.js`. The deletion just hasn't been committed yet.
- **Stale header comments describing a long-past "Phase 1"** in
  `apps/web-api/src/main.ts` and `infrastructure/prisma/schema.prisma` — not
  obsolete files, but obsolete *text* inside current files; both describe a
  state ("no business logic yet", "domain models omitted") that stopped
  being true modules ago. Flagged in more detail in `CODEBASE-OVERVIEW.md` §16.
- **`rust/` workspace** — not obsolete exactly (it's intended future work),
  but nothing in the running system calls it today; treat it as inert until
  the roadmap says otherwise (`README.md` §7's explicit "do not" list).

## 9. Files that appear duplicated

- **`apps/mobile-api/src/app.module.ts`, `apps/web-api/src/app.module.ts`,
  `apps/admin-api/src/app.module.ts`** — genuinely byte-for-byte identical:
  same four module imports, same global guard, same global filter. If you
  change one, you're very likely supposed to change all three.
- **`apps/*/src/app.controller.ts`** — identical except for a hardcoded
  `service: 'mobile-api' | 'web-api' | 'admin-api'` string in the health
  check response.
- **`apps/*/src/bootstrap/security.bootstrap.ts`** — *mostly* duplicated,
  with one real difference: `web-api`'s version adds a CSP `script-src`
  exception so its Swagger UI page can run; `mobile-api` and `admin-api`
  (identical to each other) don't have that exception since they don't
  mount Swagger the same way. Worth knowing this divergence is intentional,
  not drift — but it's the kind of near-duplicate that's easy to
  accidentally "fix" into full duplication (or accidentally diverge further)
  without noticing.
- **`docs/**/README.md`** — a large number of near-empty placeholder READMEs
  (e.g. `gateway/pipes/README.md`, `shared/dto/README.md`,
  `modules/*/domain/README.md`) exist as one-paragraph folder-purpose stubs.
  Not duplicated content exactly, but a repeated *pattern* worth knowing
  about: almost every folder in this repo has one, so don't be surprised to
  find a `README.md` in nearly every directory you open.

---

## 10. Mental dependency map

How the pieces actually connect, from the outside in:

```
                        ┌─────────────────────────┐
   Browser  ───────────▶│   frontend/ (React SPA)  │
                        │   AppRouter → features/  │
                        │   → api/*.js → client.js │
                        └────────────┬─────────────┘
                                     │  HTTP + JWT Bearer token
                                     ▼
                        ┌─────────────────────────┐
                        │  apps/web-api/main.ts    │  ◀── the only backend
                        │  (port 3002)             │      app actually used
                        └────────────┬─────────────┘
                                     │ imports
              ┌──────────────────────┼───────────────────────┐
              ▼                      ▼                        ▼
       gateway/guards/        modules/{identity,        infrastructure/
       filters/*  (runs      accounts,transfers,        database/
       on every request)     compliance}/               (PrismaService)
                                     │
              ┌──────────────────────┼───────────────────────┐
              ▼                      ▼                        ▼
      presentation/          application/              domain/
      (controllers)   ───▶   (CQRS command/query   ───▶ (entities, value
      HTTP → Command          handlers — the "use        objects, business
                               case" orchestration)       rules, events)
                                     │
                                     ▼
                              infrastructure/
                              (Prisma repository impl,
                               mappers) ──▶ Postgres
```

Cross-module reads (e.g. the `transfers` module needing to load an
`Account`) go through the *other* module's `domain/repositories/*.interface.ts`
port, injected by its DI token — never by importing the other module's
concrete class. That's what keeps `modules/accounts` and `modules/transfers`
from becoming tangled together.

Cross-module *reactions* (e.g. "when a user registers, provision their
compliance profile") go through domain events on the in-process
`@nestjs/cqrs` `EventBus`, not direct calls — see
`modules/compliance/application/event-handlers/user-registered.handler.ts`
reacting to an event published by `modules/identity`.

`shared/` sits underneath everything — every layer in every module is
allowed to import from it (the `Money` value object, `DomainException`,
`@Public()`/`@CurrentUser()`/`@Roles()` decorators), but `shared/` never
imports from a module. It's the one dependency arrow that only ever points
outward.

`integrations/payment-gateway/flutterwave/` is called *only* from
`modules/transfers/infrastructure/` (the external-payout adapter) — no
other module talks to Flutterwave directly.

The **frontend never imports any backend code** — the only connection point
between the two projects is the HTTP contract described in
[`API-CONTRACT.md`](API-CONTRACT.md). If you change a backend DTO shape, the
frontend won't tell you at compile time — you have to check `API-CONTRACT.md`
and the relevant `frontend/src/api/*.js` file by hand.

`rust/` and `infrastructure/redis`, `infrastructure/rabbitmq` currently have
**no incoming arrows from anywhere** — they exist but nothing calls them.
`gateway/api-gateway` currently has no *outgoing* arrows either — it starts,
but doesn't route to `web-api` or anything else yet.
