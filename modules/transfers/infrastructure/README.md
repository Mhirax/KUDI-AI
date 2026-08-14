# Transfers Infrastructure Layer

- `persistence/prisma-transfer.repository.ts` — implements
  `ITransferRepository` with optimistic concurrency control (same
  pattern as Accounts).
- `services/prisma-internal-transfer-executor.service.ts` — implements
  `IInternalTransferExecutor`. The one place in this module that
  atomically coordinates two `Account` aggregates and the `Transfer`
  aggregate inside a single `prisma.$transaction`; see its class-level
  comment for the documented cross-module coupling this requires and
  why it's temporary (pending the Rust ledger-engine integration).
- `services/flat-rate-fee-calculator.service.ts` — implements
  `IFeeCalculator` with a simple flat/tiered schedule; the named seam
  for the future Rust `fee-engine` integration.
- `services/flutterwave-payout-provider.service.ts` — implements
  `IExternalPayoutProvider` by delegating to the Flutterwave
  integration adapter (`/integrations/payment-gateway/flutterwave/transfers`).
- `mappers/transfer.mapper.ts` — Prisma ⇄ domain translation.
