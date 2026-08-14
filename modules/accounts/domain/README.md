# Accounts Domain Layer

- `entities/account.entity.ts` — `Account` aggregate root. Owns
  currency-consistency, sufficient-funds, and lifecycle-state
  invariants for all credit/debit/freeze/close operations. Carries a
  `version` field for optimistic concurrency control on concurrent
  balance mutations.
- `value-objects/account-number.vo.ts` — validates the 10-digit NUBAN
  format. (`Money` — `bigint` minor-unit amounts + `Currency` — was
  promoted to `/shared/value-objects/money.vo.ts` once the Transfers
  module needed the identical type; see that file's header for why.)
- `events/` — `AccountOpened`, `AccountCredited`, `AccountDebited`,
  `AccountFrozen`, `AccountUnfrozen`, `AccountClosed`. Monetary amounts
  in events are serialized as decimal strings (not `bigint`, which
  cannot be JSON-serialized) for safe transport over RabbitMQ.
- `exceptions/` — `AccountNotFoundException` (404),
  `AccountNotActiveException` (403, frozen/closed/dormant),
  `CurrencyMismatchException` (400), `AccountClosureNotAllowedException`
  (422, non-zero balance).
- `repositories/` — `IAccountRepository` port, implemented by
  `infrastructure/persistence/prisma-account.repository.ts`.
- `services/` — `IAccountNumberGenerator` port (NUBAN generation),
  implemented by `infrastructure/services`.

## Relationship to the Rust ledger-engine

This aggregate's `balance` is the NestJS-side read/write projection of
account state. The authoritative, immutable, double-entry transaction
record is owned by `/rust/ledger-engine`. The integration contract
between this module and the ledger engine (synchronous gRPC call vs.
asynchronous event-sourced reconciliation) is an explicit decision
deferred to the Transfers module, where actual money movement between
accounts first occurs — this module intentionally only establishes the
account/wallet shell and its invariants.
