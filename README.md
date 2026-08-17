# Kudi AI Bank

Microfinance banking platform — NestJS backend, React frontend, PostgreSQL.

> **Current stage: Phase 3 — Foundation Hardening.**
> Four domain modules are built and working. The frontend is aligned to the
> real API contract with all mock data removed. Six contract decisions (§5)
> must be settled and five foundational tasks (§6) completed before module
> five is started.

**Roadmap source of truth:** this file.
**Audit findings:** [`docs/AUDIT.md`](docs/AUDIT.md) · **Contract map:** [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md)

**→ Next session starts at §7.**

---

## 1. Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + TypeScript (Clean Architecture, DDD, CQRS) |
| Frontend | React + Vite + SCSS |
| Database | PostgreSQL + Prisma |
| Auth | JWT + refresh-token rotation |
| Payments | Flutterwave (sole provider) |
| Deployment | Docker + Kubernetes, GitHub Actions |
| Rust engines | scaffolding only — not in the request path |

Redis and RabbitMQ have infrastructure modules but **no business module uses
them**. Domain events are in-process via the NestJS CQRS `EventBus`. Do not
add a broker until something actually needs one.

---

## 2. Backend health

Assessed 2026-08-15. The architecture is sound — build on it, don't rewrite it.

**Verified working**

- `tsc --noEmit` clean · 32 unit tests green across 7 suites
- Clean Architecture and DDD applied properly, not as folder decoration
- Cross-module calls go through ports (interface + DI token), never internals
- Real domain events — `compliance` already reacts to `UserRegisteredEvent`
- Money is `BigInt` minor units in the DB, decimal strings on the wire. No floats
- **Optimistic concurrency** on every balance write via a `version` column and
  conditional `updateMany`
- Transfers are atomic: debit + credit + transfer row in one `$transaction`,
  with a `FAILED` row persisted outside the rollback so failures stay auditable
- Flutterwave webhook verifies `verif-hash` with constant-time comparison
- bcrypt cost factor 12

**Structural holes** — both cheap now, expensive later

- **No ledger.** `Account.balance` is a mutable column with no double-entry
  journal. Balances cannot be audited or reconciled.
- **No idempotency.** A retried transfer creates a second debit.

**Ordinary hardening** — no rate limiting, thin test coverage above the domain
layer, `tx: any` in the transfer executor, Rust and Redis/RabbitMQ unused.

Verdict: the foundation is stronger than most fintech codebases at this stage.
Close the two structural holes before the surface area triples.

---

## 3. Module status

### ✅ Complete — 23 live endpoints

| Module | Surface |
|---|---|
| **identity** | register · login · refresh · logout · change-password · `GET /users/me` |
| **accounts** | create · list mine · get one · credit · debit · freeze · unfreeze · close |
| **transfers** | internal (atomic) · external (Flutterwave saga) · list · get by reference · webhook |
| **compliance** | KYC status · BVN verification · NIN verification (CBN tiers) |

### 🔨 In progress

| Item | State |
|---|---|
| **KYC frontend screen** | Built, wired to live endpoints, uncommitted |
| **Frontend/backend alignment** | Done — mocks removed, pending features fail loudly |

### ⬜ Remaining — no backend

Ordered by dependency. Each already has a complete frontend UI waiting.

| # | Module | Blocks |
|---|---|---|
| 1 | **ledger** | transaction history, statements, reconciliation |
| 2 | **funding** | every inbound money flow — deposits, virtual accounts, checkout |
| 3 | **notifications** | Profile bell, all user comms |
| 4 | **beneficiaries** | saved recipients in Transfer |
| 5 | **bills** | airtime, data, electricity, cable, internet |
| 6 | **savings** | savings goals |
| 7 | **cards** | virtual + physical cards |
| 8 | **loans** | offers, applications, repayment |
| 9 | **rewards** | points and redemption |

---

## 4. Known gaps

| # | Issue | Severity |
|---|---|---|
| 1 | **Transfers are not idempotent.** Frontend sends `x-idempotency-key`; `shared/constants/index.ts` defines the constant; no handler reads it | **Critical** |
| 2 | **No ledger.** No double-entry journal behind `Account.balance` | **Critical** |
| 3 | **No rate limiting.** `/auth/login` and BVN/NIN endpoints unthrottled | **High** |
| 4 | **`CORS_ORIGIN` defaults to `'*'`** with `credentials: true` | **High** |
| 5 | **Accounts provisioned from the client** in `Login.jsx`, not on `UserRegisteredEvent` | Medium |
| 6 | **Tests cover domain entities only.** Transfer executor has none; integration and e2e suites empty | Medium |
| 7 | **Frontend ESLint never runs** — root config is TS-only, `frontend/` has no `tsconfig.json` | Medium |
| 8 | **`client.js` stringifies `ValidationPipe` error arrays** into comma-joined text | Low |
| 9 | **No name enquiry** before external transfers | Low |
| 10 | **Dead auth screens** — `VerifyOtp.jsx`, `SetupPin.jsx` unrouted | Low |

---

## 5. Open decisions

Settle these first — they set precedent for all nine remaining modules.
Recommendations given; the call is the team's.

### D1 — Idempotency key ownership · **blocks everything**

The header is sent by the frontend and ignored by the backend, and the
frontend regenerates it per request, so neither side is correct today.

> **Recommended:** frontend generates one key **per user intent** (already
> shaped this way in `Transfer.jsx` via `useRef`). Backend reads
> `IDEMPOTENCY_HEADER`, stores it unique-per-user, and returns the stored
> result on replay instead of re-executing.

**Decide:** where the replay record lives — a dedicated `IdempotencyKey`
table, or a unique column on `Transfer`. A table generalises to bills,
funding and loans later; a column is faster now.

### D2 — Money units in unbuilt modules · **sets precedent**

`savings`, `cards` and `loans` clients were written against `*Kobo` integers.
Every live endpoint uses major-unit decimal strings.

> **Recommended:** decimal strings on the wire, `BigInt` minor units in the
> DB, matching `AccountResponseDto`. Treat the `*Kobo` naming as a defect.

**Decide:** confirm, then the pending clients get renamed as each module lands.

### D3 — Bank list

`transfer.js` ships a hardcoded 20-bank list with no backend contract. Codes
are unvalidated until the transfer is initiated.

> **Recommended:** add `GET /transfers/banks` proxying Flutterwave with a
> cached response. Small, removes a whole class of silent failure.

**Decide:** build it, or formally accept the static list and document it as
intentional.

### D4 — Name enquiry before external transfers

Recipient names are typed by hand and never verified. A typo sends real money
to the wrong person.

> **Recommended:** build it with `funding`, not before — it needs the same
> Flutterwave client work.

**Decide:** accept the misdirected-payment risk until then, or block external
transfers until name enquiry exists.

### D5 — Internal transfers have no UI

Backend is complete and unreachable. A Kudi-to-Kudi recipient picker needs a
user/account lookup endpoint that does not exist.

> **Recommended:** add `GET /users/lookup?phone=` returning **only** display
> name and account ID. Never expose email, balance or status on a lookup.

**Decide:** lookup by phone number, Kudi tag, or account number.

### D6 — OTP and transaction PIN

`VerifyOtp.jsx` and `SetupPin.jsx` exist, are unrouted, and call endpoints
that were never built. Login is currently password-only.

> **Recommended:** decide now, because a transaction PIN changes the transfer
> contract. If yes, build it with idempotency (D1) since both touch the same
> path. If no, delete both screens this week.

**Decide:** in scope or deleted.

---

## 6. Foundational work — before module five

Do these in order. Every later module inherits whatever is decided here.

1. **Idempotency** (needs D1) — read `x-idempotency-key` in transfers,
   unique-index per user, replay returns the stored result.
2. **`LedgerEntry` table** — append-only, double-entry, written inside the
   existing `$transaction`. `Account.balance` becomes a rebuildable
   projection. **Postgres first; Rust only when volume justifies it.**
3. **Account provisioning on `UserRegisteredEvent`** — mirror the existing
   `compliance` handler, then delete the client-side workaround in `Login.jsx`.
4. **`@nestjs/throttler` + CORS hardening** — throttle `/auth/login` and the
   KYC endpoints; fail startup loudly when `CORS_ORIGIN` is unset.
5. **Frontend ESLint config** + one integration test firing concurrent
   transfers at the same account, asserting exactly one wins.

Roughly one focused sprint. This is the difference between a codebase that
survives twelve modules and one that accumulates twelve modules' worth of the
same three flaws.

**Then** module 1 — `ledger` — followed by `funding`. Money must be provable
before it can move, and must get in before bills, cards or savings mean
anything. 

---

## 7. Next session — start here

1. Settle **D1** and **D6** (§5). Both change the transfer contract; nothing
   else should start until they are fixed.
2. Confirm **D2** so the money-unit convention is locked before three more
   modules inherit the wrong one.
3. Begin foundational task 1 (idempotency), then 2 (ledger).
4. Commit the uncommitted KYC screen — see below.

**Uncommitted work in the tree**

`frontend/src/features/kyc/` plus edits to `client.js`, `Login.jsx`,
`AppRouter.jsx` and `Profile.jsx`. The KYC screen is wired to live endpoints
and working. Review and commit it before starting new work.

**Do not**

- Reintroduce mock data anywhere in the frontend
- Add a Rust engine to the request path — the crates are 50-line stubs
- Wire Redis or RabbitMQ until a module genuinely needs one
- Build module five before §6 is done

---

## 8. Getting started

```sh
./scripts/setup.sh                              # install + generate Prisma client
docker compose up -d postgres redis rabbitmq    # local infrastructure
npm run prisma:migrate                          # migrate
npm run start:web-api                           # backend — port 3002, prefix /api/v1
cd frontend && npm run dev                      # frontend, separate terminal
```

**There is no mock mode.** The frontend talks to the real backend only.
Features whose backend module does not exist render an explicit "not available
yet" state naming the missing module — see [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md).

### Verify

```sh
npm run typecheck        # backend types — currently clean
npm run test:unit        # 32 tests, 7 suites — currently green
cd frontend && npm run build
```

---

## 9. Layout

```
apps/            Deployable NestJS apps (web / mobile / admin API)
gateway/         Cross-cutting middleware, guards, exception filters
modules/         DDD bounded contexts — identity, accounts, transfers, compliance
integrations/    Third-party adapters (Flutterwave)
shared/          Framework-agnostic kernel — value objects, enums, exceptions
infrastructure/  Prisma, Redis, RabbitMQ, config
frontend/        React + Vite client
rust/            Core banking engines — scaffolding, not in the request path
docs/            Audit, API contract, architecture
tests/           unit (populated) · integration · e2e · performance (empty)
```

---

## 10. Conventions

Derived from what the live modules already do correctly. Follow these in every
new module.

- **Money:** `BigInt` minor units in the DB, major-unit decimal strings
  (`"1500.00"`) on the wire. Never floats, never kobo integers in JSON.
- **Lists:** return `{ data: [], meta: { total, page, limit, totalPages } }`.
  Frontend unwraps with `response.data ?? response`.
- **Errors:** throw a `DomainException` subclass; the global
  `HttpExceptionFilter` normalises the envelope.
- **Cross-module calls:** depend on the other module's port (interface + DI
  token), never its internals.
- **Cross-module reactions:** publish a domain event and handle it in the
  consuming module, as `compliance` does for `UserRegisteredEvent`.
- **Concurrency:** every balance-bearing row carries a `version` column and is
  written with a conditional `updateMany`.
- **Frontend:** one API client per backend module. A method either calls a real
  endpoint or throws `FeatureNotAvailableError` from `api/pending.js`. Never a
  mock, never a fallback, never a silent success.
