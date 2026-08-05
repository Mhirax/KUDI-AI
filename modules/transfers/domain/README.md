# Transfers Domain Layer

- `entities/transfer.entity.ts` — `Transfer` aggregate root. Owns the
  transfer *instruction's* lifecycle (`PENDING → PROCESSING →
  SUCCESSFUL/FAILED/REVERSED`), enforced via `TransactionStatus`
  (shared kernel) with terminal-state protection. Does **not** own
  balance mutations itself — those happen on `Account` aggregates
  (Accounts module), coordinated by the application/infrastructure
  layers.
- `value-objects/`
  - `TransferReference` — also serves as the platform's idempotency
    key for transfer initiation and the reference sent to Flutterwave.
  - `ExternalRecipient` — destination bank code + NUBAN for external payouts.
  - (`Money` lives in `/shared/value-objects` — reused as-is from Accounts.)
- `events/` — `TransferInitiated`, `TransferCompleted`, `TransferFailed`,
  `TransferReversed` (the last specifically distinguishing "failed, and
  compensated" from a plain failure).
- `exceptions/` — `TransferNotFoundException` (404),
  `InvalidTransferStateException` (409, terminal-state re-transition),
  `SelfTransferNotAllowedException` (400),
  `UnauthorizedTransferException` (403).
- `repositories/` — `ITransferRepository`.
- `services/` — three ports:
  - `IFeeCalculator` — fee computation (Phase 2: simple flat/percentage
    rule; destined to be replaced by the Rust `fee-engine` via gRPC).
  - `IExternalPayoutProvider` — abstracts Flutterwave payouts.
  - `IInternalTransferExecutor` — atomic, cross-aggregate execution of
    an internal (wallet-to-wallet) transfer; see that file's header
    comment for why this exists as an explicit port rather than being
    folded into the repositories.

## Saga pattern for external payouts

An external payout cannot be made atomic with our own database (it's a
call to Flutterwave, a separate system). This module therefore uses an
explicit compensating-transaction (saga) pattern: debit the source
account first, attempt the payout, and if the attempt fails
synchronously, issue a compensating credit and mark the transfer
`REVERSED`. If Flutterwave accepts the payout but it later fails
asynchronously (confirmed via webhook), the same compensating credit
is applied at that point instead.
