# Ledger Module (`modules/ledger`)

The platform's immutable transaction history — every balance mutation
on every account, recorded as an append-only ledger entry, queryable as
paginated history and classic bank statements.

## Design

**Pure CQRS split.** The write side is exclusively event-driven: two
event handlers project Accounts' `AccountCreditedEvent` /
`AccountDebitedEvent` into `LedgerEntry` rows. The read side is
exclusively queries. There are **no commands and no mutating HTTP
endpoints** — nothing a caller can do over HTTP can ever create, edit,
or delete a ledger entry.

**Append-only, immutable.** `LedgerEntry` exposes no mutating
behaviour (no `touch()`, no `version`, no setters), the repository port
has no `update`/`delete`, and corrections are represented the way real
ledgers do it: a compensating credit/debit from the Accounts module
becomes a *new* entry. History is never rewritten.

**Idempotent projection.** Each entry stores the `eventId` of the
domain event it was projected from (`sourceEventId`, unique at the
database level). Re-delivered events are detected by the unique
constraint and skipped — at-least-once delivery can never double-post
a transaction.

**Balances are recorded, not recomputed.** Each credited/debited event
already carries the account's balance immediately after the mutation,
as reported by the `Account` aggregate itself. Statements anchor their
opening/closing balances to those recorded values, so a statement can
never disagree with what the account actually held.

**Relationship to the Rust ledger-engine.** The authoritative
double-entry ledger is ultimately owned by `/rust/ledger-engine`; this
module is the NestJS-side projection serving customer-facing
history/statements, to be reconciled against the engine in a later
phase (see `/rust/reconciliation-engine`).

## Entry classification

| `entryType`  | When                                                              |
|--------------|-------------------------------------------------------------------|
| `TRANSFER`   | Reference matches the platform `KUDI-…` transfer reference format |
| `ADJUSTMENT` | Anything else (admin credit/debit via Accounts' admin endpoints)  |

New members (e.g. `DEPOSIT`, `BILL_PAYMENT`) are added as the modules
that produce them come online — additive only, because persisted rows
are immutable.

## Endpoints

All require authentication (global `JwtAuthGuard`). Ownership is
enforced in the query handlers; `ADMIN`, `SUPER_ADMIN` and
`SUPPORT_AGENT` (read-only support visibility) may read any account.

| Method | Path                                     | Purpose                                        |
|--------|------------------------------------------|------------------------------------------------|
| GET    | `/ledger/accounts/:accountId/entries`    | Paginated history (`page`, `limit`, `from`, `to`) |
| GET    | `/ledger/accounts/:accountId/statement`  | Statement for a period (`from`, `to` required; ≤ 366 days) |
| GET    | `/ledger/entries/:entryId`               | Single entry lookup                            |

## Cross-module boundaries

- Consumes Accounts' *published events* (`AccountCreditedEvent`,
  `AccountDebitedEvent`) — plain class imports, the same pattern
  Compliance ⇄ Accounts already use.
- Imports `AccountsModule` for its exported `ACCOUNT_REPOSITORY` port —
  used only for existence/ownership checks and `userId`
  denormalization at projection time.
- Depends on Identity only through the JWT payload shape at the
  presentation layer.

## Domain events published

| Event                   | When                          |
|-------------------------|-------------------------------|
| `ledger.entry.recorded` | A new entry has been appended |
