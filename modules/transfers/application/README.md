# Transfers Application Layer

## Commands

| Command                              | Responsibility                                                    |
|------------------------------------------|------------------------------------------------------------------------|
| `InitiateInternalTransferCommand`           | Wallet-to-wallet transfer; delegates atomic execution to `IInternalTransferExecutor` |
| `InitiateExternalTransferCommand`               | Payout to an external bank via Flutterwave; runs as a saga with compensation |
| `ConfirmExternalTransferCommand`                    | Applies Flutterwave's webhook confirmation to a PROCESSING transfer (idempotent) |

## Queries

| Query                              | Responsibility                                    |
|----------------------------------------|--------------------------------------------------------|
| `GetTransferByReferenceQuery`             | Fetch a single transfer; self-or-admin authorization      |
| `ListMyTransfersQuery`                       | List all transfers initiated by the calling user             |

## Why external transfers aren't just "debit + call Flutterwave"

A call to Flutterwave cannot be part of the same database transaction
as our own debit. `InitiateExternalTransferHandler` therefore runs an
explicit saga: debit → record PENDING transfer → attempt payout → on
synchronous failure, credit back and mark `REVERSED`; on acceptance,
mark `PROCESSING` and wait for `ConfirmExternalTransferCommand` (driven
by the Flutterwave webhook) to reach a terminal state. The same
compensating-credit logic is shared conceptually between the
synchronous-failure path and the late-webhook-failure path, so a
customer's funds are never at risk of being debited without either a
successful payout or a reversal.
