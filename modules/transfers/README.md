# Transfers Module

Third implemented bounded context: money movement between accounts —
both internal (wallet-to-wallet, synchronous) and external (payouts to
other Nigerian banks via Flutterwave, asynchronous).
See [`implementation.md`](implementation.md) for known open gaps
(idempotency, no ledger, missing executor tests) found in the
2026-08-19 MVP-completeness review — the internal-transfer ownership
leak flagged earlier is already fixed and tracked there too.

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

- **Internal transfers are atomic.** `IInternalTransferExecutor`
  coordinates both `Account` aggregates and the `Transfer` aggregate
  inside a single `prisma.$transaction`. This requires a documented,
  deliberate cross-module coupling to Accounts' `Account` entity and
  `AccountMapper` directly — the one exception to the "depend only on
  exported ports" rule, scoped to this single operation, and expected
  to be replaced entirely by the Rust `ledger-engine` in a later phase.
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
is now implemented for real, not scaffolded.
