# ledger-engine

Double-entry ledger engine: the authoritative source of truth for
account balances and the immutable double-entry transaction record for
Kudi AI Bank, exposed to the NestJS application layer via gRPC.

## Status

Implemented. Real double-entry posting logic, its own PostgreSQL
schema (owned exclusively by this service — see `migrations/`), and a
runnable gRPC server.

## Architecture

- `src/types.rs` — domain types (`LedgerAccount`, `LedgerTransaction`,
  `LedgerEntry`, `EntryDirection`) backed by `sqlx::FromRow`/`sqlx::Type`.
- `src/repository.rs` — the real logic. `post_double_entry` locks both
  ledger accounts in a consistent order via `SELECT ... FOR UPDATE`
  (pessimistic locking — in contrast to the optimistic-concurrency
  approach used on the NestJS side's own `Account` projection),
  validates currency/sufficient-funds, writes both balance updates and
  both ledger entries inside one Postgres transaction, and is
  idempotent on `idempotency_key` — a retried call never re-applies a
  balance change. `reverse_transaction` posts an equal-and-opposite
  entry pair without ever mutating the original.
- `src/grpc.rs` — implements the `LedgerService` gRPC trait generated
  (via `build.rs`/`tonic-build`) from `/proto/ledger.proto`, translating
  protobuf messages to/from `repository.rs` calls.
- `src/bin/server.rs` — runnable binary: connects to Postgres, runs
  this service's own migrations, serves gRPC.
- `src/error.rs` — `EngineError`, with a `From<EngineError> for
  tonic::Status` impl so every RPC handler can propagate errors via `?`.

## Why pessimistic locking here but optimistic on the NestJS side

This service handles exactly one kind of write (short, well-understood
double-entry postings) inside its own tight transaction boundary, so
row-level locks are held only briefly — a good fit for `SELECT ... FOR
UPDATE`. The NestJS `Account` projection, by contrast, is touched by
several different code paths (credit, debit, freeze, close) with
potentially more complex transaction boundaries around them, where
optimistic concurrency (reject-and-retry) is the safer default.

## Running locally

```sh
export DATABASE_URL=postgresql://kudi:kudi@localhost:5432/kudi_ledger
export LEDGER_ENGINE_PORT=50051
cargo run --bin ledger-engine-server
```

## Build note (MSRV)

This crate was verified against Rust 1.75 (Ubuntu 24.04's shipped
toolchain). Several transitive dependencies' *latest* versions require
newer Rust (`edition2024`) than that; `Cargo.lock` pins older,
1.75-compatible versions of `uuid`, `idna`/`url`, `rust_decimal`,
`indexmap`, `zeroize`, `base64ct`, `home`, and `crc`. If you
intentionally upgrade the Rust toolchain, these pins can likely be
relaxed with `cargo update`.

## Integration with NestJS

See `/infrastructure/grpc/ledger` for the client side, and
`modules/transfers/transfers.module.ts` for the `LEDGER_ENGINE_ENABLED`
migration switch that determines whether Transfers posts through this
service or the local Prisma-transaction fallback.
