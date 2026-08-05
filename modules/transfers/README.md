# Transfers Module

Third implemented bounded context: money movement between accounts —
both internal (wallet-to-wallet, synchronous) and external (payouts to
other Nigerian banks via Flutterwave, asynchronous).

## Layers (Clean Architecture)

```
transfers/
├── domain/            # Transfer aggregate, TransferReference/ExternalRecipient VOs, events, exceptions, ports
├── application/         # CQRS Commands/Queries, DTOs
├── infrastructure/         # Prisma repository, atomic executor, fee calculator, Flutterwave provider
└── presentation/             # TransfersController, Flutterwave webhook controller
```

## Endpoints

| Method | Path                              | Access                        |
|--------|-------------------------------------|----------------------------------|
| POST   | `/transfers/internal`                  | Own accounts only                 |
| POST   | `/transfers/external`                     | Own accounts only                    |
| GET    | `/transfers/me`                              | Any authenticated user                  |
| GET    | `/transfers/:reference`                         | Owner or admin                             |
| POST   | `/webhooks/flutterwave/transfers`                  | Public, `verif-hash`-verified                 |

## Design Decisions

- **Internal transfers are atomic — via one of two interchangeable
  executors.** `IInternalTransferExecutor` has two implementations,
  selected by a factory in `transfers.module.ts` based on
  `LEDGER_ENGINE_ENABLED`:
  - `PrismaInternalTransferExecutor` (default): coordinates both
    `Account` aggregates and the `Transfer` aggregate inside a single
    `prisma.$transaction`. Requires a documented, deliberate
    cross-module coupling to Accounts' `Account` entity and
    `AccountMapper` directly — the one exception to the "depend only on
    exported ports" rule, scoped to this single operation.
  - `GrpcInternalTransferExecutor`: delegates atomicity to the Rust
    `ledger-engine` over gRPC (see `/rust/ledger-engine` and
    `/infrastructure/grpc/ledger`) and depends only on Accounts'
    exported `ACCOUNT_REPOSITORY` port — no exception needed, since the
    ledger-engine itself now owns the atomicity guarantee. Swapping to
    this implementation required zero changes to any domain or
    application code in either module — exactly the payoff Clean
    Architecture's dependency-inversion rule is meant to deliver.
- **External transfers are a saga, not a transaction.** A call to
  Flutterwave cannot share a database transaction with our own debit.
  The handler debits first, attempts the payout, and compensates
  (credits back, marks `REVERSED`) on synchronous failure — the same
  compensation logic runs again if Flutterwave's webhook reports a
  *late* failure after initially accepting the transfer.
- **Fees are a named seam, not a shortcut.** `IFeeCalculator`'s Phase 2
  implementation is a simple flat/tiered schedule; the port exists
  specifically so the Rust `fee-engine` can be substituted later via
  gRPC with zero change to callers.
- **Idempotency.** `TransferReference` doubles as an idempotency key;
  webhook confirmation (`ConfirmExternalTransferHandler`) is a no-op on
  an already-terminal transfer, safe against Flutterwave's webhook
  redelivery.
- **Money is `bigint`, end to end** — from `Account` through
  `Transfer`, and even into the Flutterwave request mapper, where the
  one unavoidable float boundary (Flutterwave's JSON contract expects
  a numeric major-unit amount) is explicitly called out and justified
  in `FlutterwaveTransferMapper`.

## Persistence

`Transfer` model + `TransferType`/`TransactionStatus` enums added to
`/infrastructure/prisma/schema.prisma`. Run:

```sh
npm run prisma:migrate
```

## Status

Phase 2 — third bounded-context module, fully wired, mounted in
`apps/mobile-api`, `apps/web-api`, and `apps/admin-api`. The Flutterwave
Transfers integration (`/integrations/payment-gateway/flutterwave/transfers`)
is implemented for real, not scaffolded. The Rust `ledger-engine`
integration is also implemented for real (`GrpcInternalTransferExecutor`),
available behind the `LEDGER_ENGINE_ENABLED` flag alongside the
default Prisma-only executor.
