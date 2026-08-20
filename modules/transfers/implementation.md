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
| 1 | No idempotency — `IDEMPOTENCY_HEADER` is defined but never read anywhere. | 🔴 Real correctness gap | Open |
| 2 | No ledger/double-entry accounting — `Account.balance` is a mutable column with no journal. | 🟡 Real gap | Open |
| 3 | Zero tests on `PrismaInternalTransferExecutor`, this codebase's own highest-risk file. | 🟡 Real gap | Open |

---

## Known gaps

### 1. No idempotency
`shared/constants/index.ts:10` defines `IDEMPOTENCY_HEADER`. Grepped
every `.ts` file under `apps/`, `modules/`, `gateway/`, `shared/`
(excluding specs) for any reference to it or to `x-idempotency` —
zero matches outside the constant's own definition. Nothing reads it,
nothing keys a lookup off it.

This is `docs/AUDIT.md` §4.2, confirmed still open exactly as
originally described: a client that retries a dropped/timed-out
transfer request (network blip, page refresh, double-tap) has no
protection against the retry executing a second, real debit.

- [ ] Decide the mechanism: header-based idempotency key
      (`IDEMPOTENCY_HEADER` already scaffolded, unused) stored against
      a completed/in-flight transfer, checked before
      `PrismaInternalTransferExecutor`/the external-transfer handler
      runs. `TransferReference` already exists as a client-supplied or
      server-generated value on `Transfer` — worth confirming whether
      it can double as the idempotency key rather than adding a
      parallel mechanism (this module's own `README.md` already claims
      idempotency is handled *for webhook redelivery* via
      `TransferReference` — that's the *inbound Flutterwave webhook*
      case, a different problem from the *client-initiated request
      retry* case this gap is about; the two shouldn't be conflated).
- [ ] This is the gap I'd treat as a blocker before this module
      touches real customer funds, not a "note for later" item — a
      double-debit is a direct, tangible harm to a real user.

### 2. No ledger / double-entry accounting
`infrastructure/prisma/schema.prisma` has no `LedgerEntry` or `Ledger`
model. `Account.balance` is a plain mutable column, updated in place
by credit/debit operations — there's no append-only journal to
reconstruct how a balance arrived at its current value, and nothing to
reconcile against Flutterwave's own transaction records later.

This module's own `README.md` ("Relationship to the Rust
ledger-engine") already names this as a known, deliberate gap —
`/rust/ledger-engine` is where the authoritative double-entry record is
meant to live, "finalized when the Transfers module is built." The
Transfers module is now built; the ledger-engine integration is not.

- [ ] Not this module's job to close alone — tracked here because it's
      the module where the absence is most consequential (every
      transfer changes a balance with no durable record of *why*), but
      the actual fix lives in `/rust/ledger-engine`'s integration
      contract, out of scope for a `modules/transfers` change alone.
- [ ] At minimum: decide whether this blocks a real production launch
      (reconciliation against Flutterwave becomes very difficult
      without it) or can follow shortly after, and note that decision
      here.

### 3. Zero tests on `PrismaInternalTransferExecutor`
Grepped every `*.spec.ts` file in `modules/` and `tests/` by name for
`PrismaInternalTransferExecutor` — zero results, direct or indirect.
The only transfer-adjacent tests that exist:
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

`docs/AUDIT.md` calls this file the highest-risk in the repo. It still
has no dedicated coverage of its own.

- [ ] Write `prisma-internal-transfer-executor.service.integration-spec.ts`
      against the real DB (same pattern as the two specs above):
      successful transfer debits source/credits destination correctly,
      insufficient funds rejects and leaves both balances unchanged,
      a `MaxBalanceGuardService` rejection mid-transaction rolls back
      the source debit too (currently only proven indirectly via the
      guard's own spec).

---

## Definition of "done" for this module

Money-movement mechanics are correct and the specific ownership-leak
bug that prompted this review is closed. Not MVP-complete for handling
real customer funds until idempotency (item 1) is closed — that one
gap alone is enough to cause a real financial harm to a real user on a
network retry, independent of anything else in this file.
