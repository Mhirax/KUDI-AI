# Database Documentation

## Where it actually lives

| What | Path |
|---|---|
| Schema (source of truth) | [`infrastructure/prisma/schema.prisma`](../../infrastructure/prisma/schema.prisma) |
| Migrations | [`infrastructure/prisma/migrations/`](../../infrastructure/prisma/migrations/) — one folder per migration, applied in order |
| Seed scripts | `infrastructure/prisma/seed.ts` (KYC tier defaults), `seed-sanctions-list.ts` (OFAC watchlist) |
| Connection string | `DATABASE_URL` in `.env` — currently a real Neon Postgres instance, not local |

**To browse actual data:** `npx prisma studio` — opens a local GUI
(`http://localhost:5555`) against whatever `DATABASE_URL` your `.env`
points to. See "Who can actually see this data" below before assuming
this is role-gated the way the API is.

**To change the schema:** edit `schema.prisma`, then generate a
migration. `prisma migrate dev` fails non-interactively in this
environment — this project's actual pattern (used for every migration
so far) is `prisma migrate diff` → hand-review the SQL → `prisma db
execute` → `prisma migrate resolve --applied`. See
`infrastructure/prisma/migrations/README.md`.

---

## Design principles — and where each one is actually enforced

| Principle | Enforced by | Why it matters |
|---|---|---|
| Money is never a float | `BigInt` columns for every amount (`Account.balance`, `Transfer.amountMinorUnits`, `KycTierLimit.maxBalance`, etc.), storing minor units (kobo) | Floating-point arithmetic can't represent money exactly — unacceptable once it's real currency |
| Concurrent writes can't silently corrupt state | `version` column on `Account`, `Transfer`, `KycProfile`, conditioned `updateMany` on save | Two simultaneous debits against the same account must not both succeed against a stale balance |
| History must be provable, not just current state | `KycAuditLogEntry` — append-only, no update/delete path | "Prove this user was properly verified" needs a permanent record, not a guess from current state |
| Sensitive identity data is never stored raw | `KycProfile.bvnHash`/`ninHash` (SHA-256) + `bvnMasked`/`ninMasked` — no `bvn`/`nin` column exists at all | Even full database access exposes nothing usable — the real values were never written to disk |
| Bounded contexts don't share foreign keys | `Account.userId`, `Transfer.sourceAccountId`, `KycProfile.userId` are plain scalar strings, not Prisma relations | Each module owns its own tables; no module's schema is hard-coupled to another's internals |
| Reference/config data is its own table, not hardcoded | `KycTierLimit` (per-tier limits), `SanctionsListEntry` (watchlist) | Changes without a redeploy; also makes clear what's *user data* vs *shared configuration* |

**The one place this project hasn't yet applied its own standard:**
`Account.balance` is a mutable column with no immutable transaction
log underneath it — the "history must be provable" principle that's
already correctly applied to `KycAuditLogEntry` hasn't been applied to
money movement itself yet. That's the missing ledger — see root
`README.md` §4, marked Critical.

---

## Current schema, by module

### Identity — `User`, `RefreshToken`

| Table | Stores |
|---|---|
| `users` | Login credentials (bcrypt hash, never plaintext), `role` (RBAC), `status`, `failedLoginAttempts`/`lockedUntil` (account lockout) |
| `refresh_tokens` | Only a hash of the token (`tokenHash`), never the raw value — plus a `family` id used to detect token-reuse/theft |

### Accounts — `Account`

| Table | Stores |
|---|---|
| `accounts` | `accountNumber` (NUBAN format), `accountType` (WALLET/SAVINGS/CURRENT), `balance` (BigInt kobo), `status`, `version` |

### Transfers — `Transfer`

| Table | Stores |
|---|---|
| `transfers` | `type` (INTERNAL/EXTERNAL), amount + fee (BigInt kobo), source/destination account ids, recipient bank details (external only), `status`, Flutterwave's `providerReference`. `reference` is a unique display/tracking id, generated fresh on every call — it is *not* a retry-safety mechanism (see `IdempotencyKey` below for that) |

### Compliance — `KycProfile`, `KycAuditLogEntry`, `SanctionsListEntry`, `KycTierLimit`

| Table | Stores |
|---|---|
| `kyc_profiles` | `tier`, hashed+masked BVN/NIN, `sanctionsFlaggedAt`/`sanctionsClearedAt` |
| `kyc_audit_log` | Append-only: every verification attempt, tier change, and sanctions screening result, with `performedByUserId` distinguishing self-service from staff-performed actions |
| `sanctions_list_entries` | Seeded OFAC SDN watchlist (reference data, not user data) |
| `kyc_tier_limits` | Per-tier transaction/balance limits (reference/config data) |

### Shared cross-cutting — `IdempotencyKey`

Not owned by any one bounded context — added 2026-08-20 alongside
`shared/idempotency/` to close Transfers' idempotency gap, built as a
reusable mechanism from the start.

| Table | Stores |
|---|---|
| `idempotency_keys` | One row per `(userId, scope, key)` — `scope` namespaces the key space per operation (e.g. `"transfer.internal"`). `status` (`IN_PROGRESS`/`COMPLETED`) plus `resourceId` once completed, used to replay a request's original result instead of re-executing it |

Current consumer: Transfers' internal/external transfer initiation.
Funding, Bills, and Loans are expected to import `IdempotencyModule`
and reuse this same table rather than each growing their own — see
root `README.md` §6.

---

## Planned schema — not built yet

Reasoned from what each upcoming module (see root `README.md` §6) will
actually need to do. None of this exists in `schema.prisma` today —
update this section as each module is actually built, don't let it go
stale the way the root README once did.

| Module | Likely tables | Notes |
|---|---|---|
| **Funding** | `FundingTransaction` — provider ref, amount, status, destination account | Feeds the already-existing `CreditAccountHandler`; no change needed on `Account` itself |
| **Beneficiaries** | `Beneficiary` — owner user, saved account number + bank code, label | Smallest addition on the roadmap, no dependency on anything unbuilt |
| **Savings** | `SavingsGoal` — target amount/date, linked account | Reuses `Account` directly — `AccountType.SAVINGS` already exists in the enum, unused until this module |
| **Bills** | `BillPayment` — biller code, customer reference (e.g. meter number), amount, status | Same shape as `Transfer` for externals: debit, call a provider, record the outcome |
| **Notifications** | `Notification` — user, type, channel, read state | First module that's purely a *consumer* of other modules' domain events rather than owning core money data |
| **Loans** | `LoanApplication`, `Loan`, `RepaymentSchedule`, likely its own append-only audit table (same reasoning as `KycAuditLogEntry`) | Biggest new data surface on the roadmap — a lending decision needs to be provable months later, the same way KYC verification does |
| **Cards** | `Card` — masked PAN, last 4, expiry, status | Real PAN never stored, same masking principle as BVN/NIN |
| **Rewards** | `RewardPoints`/`Redemption` | Lowest-stakes data in the system |

---

## Who can actually see this data

Two separate, non-overlapping gates — a common source of confusion:

**Application access** (`@Roles()` / `RolesGuard` in the API) — a
`CUSTOMER` only ever sees their own data via routes like
`/accounts/me`; only `COMPLIANCE_OFFICER`/`ADMIN` can reach staff
routes like `/kyc/staff/:userId`. This gate exists **only inside the
HTTP API** — it has no effect on anything else.

**Database access** (`DATABASE_URL`, and anything built on it —
`npx prisma studio` included) — has no concept of `UserRole` at all.
Whoever holds the connection string sees every row in every table,
completely bypassing every `@Roles()` check, because the request never
goes through the API in the first place. Today that's simply "whoever
has this project's `.env`" — i.e., local dev, one machine. In
production this needs its own, separate access model (network-level
restriction, IAM-scoped credentials, query auditing) — not built yet,
not needed yet, but a real requirement before real customer data is
involved. See root `README.md` §5 (D-series decisions) for what's
already tracked as open; this isn't on that list yet and probably
should be before Funding goes live.
