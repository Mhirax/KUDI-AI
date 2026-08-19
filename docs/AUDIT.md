# Kudi AI Bank — Foundational Audit

**Date:** 2026-08-15
**Scope:** backend modules, frontend, database schema, API contracts, README
**Status:** findings only — no fixes applied in this pass

---

## 1. Summary

The backend is further along than the README claims, and the code quality in
the money-movement path is genuinely good. The problem is not the backend —
it is that **the frontend was built against a specification roughly three
times larger than the backend that exists**, and mock data was used to hide
the gap.

| Area | State |
|---|---|
| Backend modules | 4 of ~12 implemented |
| Backend endpoints | 23 live |
| Frontend API clients | 15 files, ~40 endpoints expected |
| Endpoints frontend expects that do not exist | **~24 across 9 domains** |
| `tsc --noEmit` | clean |
| Unit tests | 32 passing, 7 suites — **domain entities only** |
| Frontend build | passes |
| Frontend lint | **never runs** (broken config) |

---

## 2. What is actually implemented

### Backend — 4 modules, verified working

| Module | Endpoints | Notes |
|---|---|---|
| `identity` | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /users/me`, `GET /users/:userId` | bcrypt cost 12, JWT + refresh rotation, RBAC |
| `accounts` | `POST /accounts`, `GET /accounts/me`, `GET /accounts/:id`, `POST /accounts/:id/{credit,debit,freeze,unfreeze,close}` | balance is `BigInt` minor units, serialized as major-unit decimal string |
| `transfers` | `POST /transfers/internal`, `POST /transfers/external`, `GET /transfers/me`, `GET /transfers/:reference`, `POST /webhooks/flutterwave/transfers` | atomic, optimistic concurrency |
| `compliance` | `GET /kyc/me`, `POST /kyc/verify-bvn`, `POST /kyc/verify-nin` | CBN tier model, event-driven |

**Genuinely strong work worth preserving:**

- `PrismaInternalTransferExecutor` performs debit + credit + transfer-row
  insert inside one `prisma.$transaction`, each account write guarded by a
  `version` column (optimistic concurrency). Failures still persist a
  `FAILED` transfer row outside the rollback, so failed attempts remain
  auditable.
- Money is `BigInt` minor units end-to-end. Never a float.
- Flutterwave webhook verifies `verif-hash` with a constant-time comparison
  before dispatching any command, and returns a deliberately generic error.
- Cross-module communication already uses the correct pattern: ports + DI
  tokens, and a real domain-event handler
  (`compliance/application/event-handlers/user-registered.handler.ts`).

### Frontend — 11 feature areas, builds clean

Routed and reachable: Dashboard, Transfer, Bills, Savings, Cards, Loans,
Rewards, Profile, KYC, Login, Signup, onboarding.

---

## 3. What is partially implemented

| Item | Detail |
|---|---|
| **KYC screen** | UI complete and wired to real endpoints, but uncommitted, and `getStatus()` has no `.catch()` — a failed fetch produces an unhandled rejection and renders a verified user as unverified |
| **Internal transfers** | Backend fully implemented; `transferApi.initiateInternal()` exists but **no UI calls it** — there is no screen to pick a destination Kudi account |
| **Profile** | `GET /users/me` is real; notifications and `updateProfile` are not |
| **Dashboard** | balance + account are real; savings goals and transaction history are not |
| **Rust engines** | 6 crates, ~50 lines each — error enums and module layout only. `ledger-engine` states plainly: *"Phase 1 — foundation only. No business logic is implemented yet."* |
| **API gateway** | `gateway/api-gateway/src/config/gateway.config.ts` defines a `rateLimit` block that nothing consumes |

---

## 4. What is missing

### Backend modules with zero implementation

`funding` · `ledger` · `bills` · `savings` · `cards` · `loans` · `rewards` ·
`beneficiaries` · `notifications`

### Foundational gaps (these matter more than the missing modules)

**4.1 — There is no ledger.**
The schema has six models: `User`, `RefreshToken`, `Account`, `Transfer`,
`KycProfile`. `Account.balance` is a mutable column. There is no journal and
no double-entry record. You can compute what a balance *is*, but you cannot
prove *how it got there*, and you cannot reconcile against Flutterwave. The
executor's own comment concedes this — fee revenue is "booked to a
fee-revenue ledger account once the Rust ledger-engine integration lands."

**4.2 — Transfers are not idempotent.**
`shared/constants/index.ts` defines `IDEMPOTENCY_HEADER = 'x-idempotency-key'`.
The **frontend already sends it** on both transfer calls. **No backend code
reads it.** `Transfer.reference` is `@unique` and documented as "the
platform's idempotency key", but it is generated server-side from
`randomBytes(8)` — a fresh value on every request. A retried transfer after
a dropped response debits the user twice.

**4.3 — No rate limiting.**
`bootstrapSecurity()` is documented as "helmet, CORS, rate limiting, etc."
but implements only the first two. `/auth/login` and the BVN/NIN endpoints
are unthrottled.

**4.4 — No server-side account provisioning.**
`register-user.handler.ts` does not create an account. The uncommitted
workaround creates one from the client on every login. `UserRegisteredEvent`
already exists and is already consumed by `compliance` — that is the correct
seam.

**4.5 — No tests on anything but domain entities.**
All 7 suites test entities and value objects. `PrismaInternalTransferExecutor`
— the highest-risk file in the repository — has zero tests. `test:integration`
and `test:e2e` are configured and empty.

---

## 5. What is broken

| # | Issue | Impact |
|---|---|---|
| 1 | **`VITE_MOCK_API=false` with ~24 missing endpoints** | Most of the app 404s against a real backend |
| 2 | **`wallet.js` returns mock savings even when `MOCK=false`** — comment: *"Fail soft with mock data so the dashboard doesn't break"* | **Fabricated financial data shown to real users as real** |
| 3 | **`profile.js:48` `updateProfile` mutates a local mock object and returns success when `MOCK=false`** | Silent data loss — user thinks the profile saved |
| 4 | **`bills.js:83` `getDataBundles` returns mock bundles unconditionally** | Fake pricing shown in real mode |
| 5 | **Frontend ESLint has never run** — root `.eslintrc.js` uses the TS parser with `project: 'tsconfig.json'`; `frontend/` has no `tsconfig.json`, so every file dies with `TS5012` | `@typescript-eslint/no-floating-promises` is configured but cannot reach the code it would catch |
| 6 | **`CORS_ORIGIN` falls back to `'*'` with `credentials: true`** | Invalid combination; must not reach production |
| 7 | **`client.js` mishandles validation errors** — `ValidationPipe` returns `message.message` as an **array**; the client's two-branch check stringifies it comma-joined | Users see `bvn must be 11 digits,bvn should not be empty` |
| 8 | **Dead auth screens** — `VerifyOtp.jsx` and `SetupPin.jsx` exist, are not routed, and call OTP/PIN endpoints that do not exist | Confusing to a new teammate |

Items 2, 3 and 4 are the most serious: they are the frontend *lying* about
state, which is the specific thing that must not happen in a banking product.

---

## 6. Frontend expects vs backend provides

Full table in [`API-CONTRACT.md`](./API-CONTRACT.md). Summary of missing domains:

| Frontend client | Endpoints expected | Backend module | Status |
|---|---|---|---|
| `beneficiary.js` | 3 | — | missing |
| `bills.js` | 7 | — | missing |
| `cards.js` | 4 | — | missing |
| `funding.js` | 5 | — | missing |
| `ledger.js` | 3 | — | missing |
| `loans.js` | 4 | — | missing |
| `rewards.js` | 2 | — | missing |
| `savings.js` | 4 | — | missing |
| `profile.js` (notifications only) | 4 | — | missing |

### Contract mismatches on endpoints that *do* exist

| Mismatch | Detail |
|---|---|
| **Idempotency header ignored** | Frontend sends `x-idempotency-key`; backend defines the constant and never reads it |
| **`accountType: 'PERSONAL'`** | `accounts.js` mock uses `PERSONAL`; the real `AccountType` enum is `WALLET \| SAVINGS \| CURRENT`. Mock removal resolves this |
| **Mock accounts omit `accountNumber`** | Real `AccountResponseDto` always includes it; screens built against the mock never exercised it |
| **No bank-list endpoint** | `transfer.js` ships a hardcoded 20-bank list. Acceptable short-term, but it is a frontend assumption with no backend contract |
| **No name-enquiry endpoint** | Recipient name is typed manually and unverified — a real UX and correctness gap for external transfers |

**Confirmed aligned (no action needed):** `balance` is a major-unit decimal
string on both sides; `AuthResponseDto` matches what `Login.jsx` destructures;
`UserResponseDto` matches `Profile.jsx`; `TX_STATUS` matches the backend enum.

---

## 7. README vs reality

The README opens with:

> *"This repository currently contains architecture scaffolding only: no
> business logic, no APIs, no controllers."*

This is false and has been for two phases. The same file later contradicts
itself by listing all four Phase 2 modules as complete. It also lists Redis
and RabbitMQ in the stack — both have modules under `infrastructure/` but
neither is used by any business module.

A new teammate reading the README top-down would conclude there is nothing
built. **Resolved in this pass — see the rewritten README.**

---

## 8. Recommended order of foundational work

Deliberately *not* started. For review.

1. **Idempotency keys on transfers** — read the header the frontend already sends
2. **`LedgerEntry` table + double-entry posting** inside the existing transaction
3. **Server-side account provisioning** via `UserRegisteredEvent`
4. **Throttler + CORS hardening**
5. **Frontend ESLint config** + one concurrency integration test on the executor
6. **Then** the next module — `funding`, since money must get *in* before
   bills, cards, or savings mean anything

Items 1–5 are roughly one focused sprint and they are the difference between
a codebase that survives twelve modules and one that accumulates twelve
modules' worth of the same three flaws.
