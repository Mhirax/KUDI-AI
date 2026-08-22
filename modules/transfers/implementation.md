# Transfers — Implementation Tracker

Tracks known gaps against "MVP-complete" for this module. See
`README.md` in this folder for the architecture as it stands today.
This file exists because a cross-module MVP-completeness review
(2026-08-19) found gaps beyond the one bug already fixed earlier this
session — this is real money movement, so these are tracked
explicitly rather than left implicit.

**Baseline (already done, working):**
- Internal transfers atomic via `PrismaInternalTransferExecutor`
  (single `$transaction` across both `Account` aggregates + the
  `Transfer` aggregate). External transfers as a saga with
  debit-first/compensate-on-failure, including late-webhook failure.
- Compliance's Phase 1c tier-based transfer limits (per-transaction +
  rolling 24h) enforced on both transfer types before the debit.
- **Ownership-leak bug fixed** (commit `8e782d8`, this session):
  `InitiateInternalTransferHandler` now checks
  `sourceAccount.userId !== command.initiatorUserId` and throws
  `UnauthorizedTransferException` *before* the KYC limit check runs —
  previously the limit check ran first, against an account the caller
  might not own, letting the exception type returned leak a signal
  about the real owner's transfer volume before the unauthorized
  response arrived. See `modules/compliance/implementation.md`,
  post-implementation review finding #1, for the full writeup.

---

## Status at a glance

| # | Gap | Severity | Status |
|---|---|---|---|
| — | Internal-transfer ownership leak | 🔴 Real security bug | ✅ Fixed (`8e782d8`) |
| 1 | No idempotency — `IDEMPOTENCY_HEADER` is defined but never read anywhere. | 🔴 Real correctness gap | ✅ Fixed — 2026-08-20 |
| 2 | No ledger/double-entry accounting — `Account.balance` is a mutable column with no journal. | 🟡 Real gap | ✅ Fixed — 2026-08-22 |
| 3 | Zero tests on `PrismaInternalTransferExecutor`, this codebase's own highest-risk file. | 🟡 Real gap | ✅ Fixed — 2026-08-22 |

---

## Known gaps

### 1. No idempotency — fixed 2026-08-20
`shared/constants/index.ts:10` defines `IDEMPOTENCY_HEADER`; before
this fix, nothing read it. `docs/AUDIT.md` §4.2 confirmed the gap
exactly as originally described: a client retrying a dropped/timed-out
transfer request (network blip, page refresh, double-tap) had no
protection against the retry executing a second, real debit.

Decision made explicitly before building (see chat history): a
**dedicated, reusable `IdempotencyKey` table**, not a column on
`Transfer` — chosen specifically because Funding, Bills, and Loans
(§6 of the root `README.md`'s roadmap) all have this exact same
retry-safety need coming soon, and a shared mechanism means none of
them re-solve it on their own table.

- [x] **New cross-cutting module, not owned by Transfers:**
      `shared/idempotency/` — `IIdempotencyKeyRepository` (port),
      `IdempotencyGuardService` (the reusable `run()` wrapper any
      command handler calls), `PrismaIdempotencyKeyRepository` (real
      implementation), `IdempotencyModule` (exports the guard service;
      any future module imports this the same way `TransfersModule`
      now does).
- [x] **New table**, `idempotency_keys` — one row per
      `(userId, scope, key)`, unique-constrained on that triple. `scope`
      (e.g. `"transfer.internal"`) namespaces the key space per
      operation so the same client-chosen key can't collide across
      unrelated operations.
- [x] **Correctness under a real race, not just application logic:**
      `tryAcquire()` attempts an `INSERT` first and only falls back to
      reading existing state on a unique-constraint violation (Prisma
      `P2002`) — the database's own constraint is what guarantees only
      one of two genuinely concurrent requests ever wins, not a
      check-then-act application-level race. Proven directly: an
      integration test fires two real concurrent `tryAcquire()` calls
      at the same brand-new key and asserts exactly one gets `ACQUIRED`.
- [x] **Failure handling, deliberately not naive:** a cleanly-thrown
      business error (insufficient funds, limit exceeded, a payout
      provider rejecting the request) releases the claim immediately —
      the same key can be retried right away, since nothing was left
      half-done. A row stuck at `IN_PROGRESS` past a 2-minute staleness
      window (the actual process crashed, never reaching any catch
      block) is reclaimed by the next attempt instead of blocking that
      key forever — proven directly by backdating a row's `createdAt`
      in a test and confirming the next `tryAcquire()` reclaims it.
- [x] **Wired into both transfer-initiating handlers.**
      `InitiateInternalTransferHandler` and
      `InitiateExternalTransferHandler` now inject
      `IdempotencyGuardService` and wrap their existing logic (extracted
      into a private `doExecute()`, unchanged otherwise) in
      `idempotencyGuard.run(...)`. A replay rehydrates via
      `ITransferRepository.findById()` and re-maps through the same
      `TransferResponseDto.fromDomain()` the original call used — a
      replayed response always reflects the transfer's real current
      state, not a cached snapshot.
- [x] `TransfersController` now reads `IDEMPOTENCY_HEADER` via
      `@Headers()` on both `POST /transfers/internal` and
      `POST /transfers/external` and passes it into the command. No
      frontend change needed — `Transfer.jsx` was already generating
      and sending the header correctly (one key per user intent, not
      per request); it was purely a backend gap.
- [x] **Corrected a misleading comment.** `TransferReference`'s header
      comment previously claimed it "doubles as the platform's
      idempotency key... callers may safely retry with the same
      reference" — false as actually implemented: the reference is
      randomly generated fresh by the server on every call, retry or
      not. Reworded to state plainly that request-level retry safety is
      `shared/idempotency`'s job, not this value object's.
- [x] **Known, honest scope limit:** this proves the idempotency
      *mechanism* correct against the real database (6 integration
      tests: acquire, in-progress rejection, completed replay, release-
      then-retry, the concurrent-race guarantee, stale-claim reclaim) —
      it does not include a full hand-wired integration test proving an
      actual duplicate `POST /transfers/internal` HTTP call doesn't
      double-debit through the *entire* handler stack. That would
      overlap with gap #3 below (zero tests on
      `PrismaInternalTransferExecutor` at all) and is scoped there
      instead of duplicated here.

**Verified:** `tsc --noEmit` clean, full unit suite passing (5 new:
`idempotency-guard.service.spec.ts`), full integration suite passing
(6 new: `prisma-idempotency-key.repository.integration-spec.ts`,
against the real DB in `.env`). Migration
`20260820152731_add_idempotency_keys` applied to the live Neon DB via
this session's established `db execute` + `migrate resolve --applied`
pattern (scoped narrowly, same as every other migration this session —
the pre-existing, unrelated 11-table schema drift was excluded, not
touched).

### 2. No ledger / double-entry accounting — fixed 2026-08-22
`infrastructure/prisma/schema.prisma` had no `LedgerEntry` or `Ledger`
model. `Account.balance` is a plain mutable column, updated in place
by credit/debit operations — there was no append-only journal to
reconstruct how a balance arrived at its current value, and nothing to
reconcile against Flutterwave's own transaction records later.

This module's own `README.md` ("Relationship to the Rust
ledger-engine") already names this as a known, deliberate gap —
`/rust/ledger-engine` is where the *authoritative* double-entry record
is meant to live eventually. Checked: that crate is still pure Phase-1
scaffolding (no domain logic, no running service, nothing wired to
NestJS) — a real integration there is a multi-day project on its own,
not something to build as a follow-up to a bug-fix session. Decision
made explicitly with the user before building: ship a real
double-entry journal in the Node/Prisma layer now, documented as an
interim denormalized mechanism to be superseded once ledger-engine is
actually built out — the same staged approach `Account`'s own header
comment already anticipated ("kept consistent with it via domain
events and, in a later phase, the ledger-engine's own confirmation
callback").

- [x] **Discovered before building anything**: the live (shared) dev
      DB already had a `ledger_entries` table — part of the
      pre-existing, unrelated ~10-table schema drift earlier sessions
      deliberately left untouched (deposits, cards, loans,
      bill_payments, notifications, reward_*, savings_goals,
      virtual_accounts). Introspected it directly rather than guessing:
      `id, accountId, userId, direction (EntryDirection),
      amountMinorUnits, balanceAfterMinorUnits (NOT NULL), currency,
      entryType (LedgerEntryType: TRANSFER/DEPOSIT/BILL_PAYMENT/
      ADJUSTMENT), reference, sourceEventId (UNIQUE), occurredAt,
      createdAt` — with 2 real rows (`test-credit-001`/`test-debit-001`,
      dated 2026-08-04, predating this session). Its `entryType` vocab
      already anticipates this exact roadmap (Funding → DEPOSIT, Bills
      → BILL_PAYMENT). Flagged to the user rather than silently
      overwriting a shared table with real (if only test) data —
      decision: **adopt its shape rather than replace it.**
- [x] **New cross-cutting module, not owned by Transfers** (same
      pattern as `shared/idempotency/`): `shared/ledger/` —
      `ILedgerRecorder` (port), `PrismaLedgerRecorderService` (the
      `post()` implementation), `LedgerModule` (exports the recorder;
      any future module imports this the same way `TransfersModule`
      now does). First consumer: Transfers.
- [x] **The one genuinely new column**: `journalId`, added because the
      2 pre-existing rows have *different* references and no shared
      grouping field — they're independent single-sided audit rows,
      not a balanced posting. Nothing before this enforced that
      DEBITs and CREDITs actually pair up and net to zero; now
      `PrismaLedgerRecorderService.post()` asserts that (per currency)
      before writing a single row, and every leg of one posting shares
      a `journalId`. Added as nullable, backfilled from the existing
      unique `sourceEventId` (each legacy row becomes its own
      single-row "journal"), then set `NOT NULL` — no data lost, see
      migration `20260822111923_add_ledger_entry_journal_id`.
- [x] **Real double-entry, including the fee**: internal transfers
      previously debited `amount+fee` from the source and credited only
      `amount` to the destination with no record of where the fee
      went. Now posts 2–3 balanced legs atomically with the account
      writes (same `$transaction`): debit source, credit destination,
      and — when the fee is non-zero — credit a synthetic
      `fee-revenue` system account (`shared/ledger/system-ledger-account.ts`)
      so the posting actually balances instead of just tracking the fee
      implicitly via `Transfer.fee`.
- [x] **External transfers get the same treatment across the full
      saga**, not just the atomic internal case: the debit-hold
      (`InitiateExternalTransferHandler`) posts source-debit /
      clearing-credit into a synthetic `external-payout-clearing`
      account; settlement — whether resolved synchronously
      (`isImmediatelySettled`) or later via
      `ConfirmExternalTransferHandler`'s webhook — relieves clearing
      into `fee-revenue` + `external-payout-settled`; both compensation
      paths (synchronous payout failure, late webhook failure) relieve
      clearing back to the customer, mirroring the existing compensating
      credit. Posted outside any DB transaction, same as the
      debit/save calls already there — this saga spans a call to
      Flutterwave and can't be made atomic.
- [x] **Synthetic system accounts get a real running balance, not a
      stand-in.** `balanceAfterMinorUnits` is `NOT NULL` on the
      pre-existing table, so a system-account leg's balance is computed
      from that account's own last entry + this leg's signed delta
      (credit-normal, the same convention `Account.credit()`/`debit()`
      already uses) rather than faked or left null.
- [x] **Verified against the real DB, not just unit-level**: extended
      `prisma-internal-transfer-executor.service.integration-spec.ts`
      (gap #3, above) to assert the posted ledger rows for both the
      successful-transfer case (3 balanced legs, shared `journalId`,
      correct `balanceAfterMinorUnits`) and the max-balance-guard
      rollback case (zero ledger rows — the guard rejects before the
      posting is ever reached). Caught a real, unrelated bug in the
      process: the added query inside the `$transaction` pushed total
      duration past Prisma's default 5s interactive-transaction timeout
      against Neon's network latency (`Transaction not found` on the
      last query) — fixed by raising it to `{ maxWait: 5000, timeout:
      15000 }`, matching the 15s timeout Flutterwave's own HTTP client
      already uses elsewhere in this codebase.
- [x] **Known, honest scope limit**: `sourceEventId` (unique per row)
      is generated fresh per leg rather than tied to a caller-supplied
      event id — today's callers rely on `shared/idempotency` for
      request-level retry safety upstream instead, so this column
      isn't yet used for its apparent original purpose (per-event
      dedup at the ledger layer). Left as-is rather than inventing a
      caller-side event-id scheme not asked for.

**Verified:** `tsc --noEmit` clean, full unit suite passing (56/56, 3
new for `PrismaLedgerRecorderService`), full integration suite passing
(36/36, including the executor's new ledger assertions). Migration
`20260822111923_add_ledger_entry_journal_id` applied to the live Neon
DB via this session's established `db execute` + `migrate resolve
--applied` pattern — scoped narrowly to `ledger_entries` only, same as
every other migration this session; the pre-existing, unrelated
~10-table schema drift was excluded, not touched.

### 3. Zero tests on `PrismaInternalTransferExecutor` — fixed 2026-08-22
Grepped every `*.spec.ts` file in `modules/` and `tests/` by name for
`PrismaInternalTransferExecutor` — zero results, direct or indirect.
The only transfer-adjacent tests that existed:
- `transfer.entity.spec.ts` — pre-existing, domain-entity level only,
  doesn't touch the executor.
- `kyc-transfer-limit-checker.service.integration-spec.ts` — added this
  session, tests the KYC limit gate that runs *before* the executor,
  not the executor's own debit/credit/rollback logic.
- `max-balance-guard.service.integration-spec.ts` — added this session,
  tests the max-balance guard's behavior *when called with the
  executor's transaction client*, including one test that proves an
  unrelated write earlier in that transaction rolls back correctly —
  but this proves the *guard's* correctness under the executor's
  transaction, not the executor's own core transfer logic (a normal
  successful transfer correctly debiting source and crediting
  destination, insufficient-funds correctly rejecting and rolling
  back, etc.).

`docs/AUDIT.md` calls this file the highest-risk in the repo.

- [x] Wrote `prisma-internal-transfer-executor.service.integration-spec.ts`
      against the real DB (same pattern as the two specs above): a
      successful transfer debits source/credits destination correctly,
      insufficient funds rejects and leaves both balances unchanged, a
      `MaxBalanceGuardService` rejection mid-transaction rolls back the
      source debit too (previously only proven indirectly via the
      guard's own spec).
- [x] **Writing the test surfaced a real, previously-hidden bug** —
      not a test bug, a production one. The executor's failure-path
      catch block calls `transfer.markFailed(reason)` *before* the
      transfer's very first save. Every other call site in the module
      saves a freshly-`initiate*()`'d transfer once, immediately,
      before any mutator runs — `PrismaTransferRepository.save()`'s
      create-vs-update branching relies on that ordering (`version ===
      0` and un-mutated ⇒ create). The internal executor's happy path
      never calls `save()` for creation at all (it persists via a raw
      `tx.transfer.create()` inside the `$transaction`), so its
      failure path was the only place that mutates-then-saves a
      never-before-persisted transfer. `markFailed()` bumps version
      0→1, `save()` then wrongly took the *update* branch, matched
      zero rows, and threw a misleading `"Transfer ... was modified
      concurrently; please retry"` — silently swallowing the real
      error (`InsufficientFundsException`,
      `MaxBalanceExceededException`, etc.) before it ever reached the
      caller, **and leaving the FAILED transfer completely
      unpersisted**, directly contradicting this file's own
      documented guarantee that "failed attempts remain auditable."
- [x] **Fixed at the root**, in
      `modules/transfers/infrastructure/persistence/prisma-transfer.repository.ts`:
      `save()` no longer assumes a zero-row `updateMany` match means a
      genuine concurrent-modification conflict. It now checks whether
      the row exists at all first — if it doesn't, this is really a
      first-time create (whatever the in-memory version claims) and is
      created instead of throwing. Fixed here rather than in the
      executor so any future caller with the same "mutate before first
      save" shape is protected too, not just this one call site.
      Existing genuine-concurrent-modification behavior is unchanged
      (that path still throws — it just no longer misfires on a
      not-yet-created row).

**Verified:** `tsc --noEmit` clean, full unit suite passing (52/52,
no regressions), full transfers integration suite passing (7/7,
including the 3 new executor tests).

---

## Definition of "done" for this module

Money-movement mechanics are correct, the ownership-leak bug is
closed, idempotency — the gap most likely to cause real financial harm
to a real user — is closed, the highest-risk file in the module
(`PrismaInternalTransferExecutor`) now has dedicated coverage (which in
the process surfaced and fixed a real bug in failed-transfer
persistence), and every balance mutation this module makes — internal
and external, happy path and every compensation path — now produces a
real, balanced double-entry journal instead of an unexplained column
update. All three tracked gaps are closed.

**Still not the same as the Rust ledger-engine actually existing.**
`shared/ledger` is deliberately an interim, denormalized mechanism —
`Account.balance` remains the system of record, same as before; the
journal is the durable "why" behind it and something to reconcile
against Flutterwave with, not a replacement for a real double-entry
core banking engine. Whether that gap (Rust ledger-engine never built)
is acceptable to carry into a real production launch, the way
Compliance's Phase 6 was explicitly deferred, is a decision that
belongs at the `/rust/ledger-engine` level, not this file — not
assumed here either way.
