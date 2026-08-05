# Funding Module (`modules/funding`)

All money-in: how external money becomes a Kudi wallet balance.

## Channels

| Channel           | Flow                                                                 |
|-------------------|----------------------------------------------------------------------|
| `VIRTUAL_ACCOUNT` | Customer gets a permanent Flutterwave-issued account number bound to one wallet; any inbound bank transfer to it auto-credits the wallet. |
| `CHECKOUT`        | Customer requests a payment link (`POST /funding/checkout`), pays on Flutterwave's hosted page; settlement arrives via webhook. |

## Security & correctness model

- **Webhooks are pointers, not facts.** `charge.completed` payloads
  are authenticated (constant-time `verif-hash` check) but *never*
  trusted for amounts: `ConfirmDepositHandler` re-verifies every
  transaction server-to-server and uses only the verified amount,
  currency, status, and reference.
- **Exactly-once settlement.** Three idempotency layers: fast-path
  lookup on the unique `providerTransactionId`, terminal-state check on
  the aggregate, and the settlement executor's transactional unique
  claim — concurrent webhook re-deliveries cannot double-credit.
- **Atomic settlement.** `PrismaDepositSettlementExecutor` writes the
  SUCCESSFUL deposit and the account credit in one database
  transaction (the same documented cross-aggregate pattern as
  Transfers' internal executor). A deposit can never be marked settled
  without the credit landing, or vice versa.
- **Amount mismatch ⇒ FAILED, never partial credit.** If the verified
  amount differs from what the customer initiated, the deposit is
  failed with an auditable reason for ops reconciliation.
- **Inactive wallets can't strand money silently.** Settlement against
  a non-ACTIVE account records a FAILED deposit with the reason; funds
  remain at the provider for manual reconciliation.

## Integration with other modules

- Credits run through Accounts' own `Account.credit()` inside the
  executor — Accounts invariants (active status, currency match) and
  the **Ledger projection** (entries classified `DEPOSIT` via the
  `KUDI-DEP-` reference prefix) apply automatically.
- Identity's `USER_REPOSITORY` port supplies customer email/name for
  provider calls.
- The Flutterwave HTTP contract lives entirely in
  `/integrations/payment-gateway/flutterwave/funding` (port → adapter →
  mapper), mirroring the transfers integration.

## Endpoints

| Method | Path                           | Purpose                                   |
|--------|--------------------------------|-------------------------------------------|
| POST   | `/funding/virtual-accounts`    | Issue a permanent virtual account number  |
| GET    | `/funding/virtual-accounts/me` | List my virtual account numbers           |
| POST   | `/funding/checkout`            | Create a hosted-checkout funding session  |
| GET    | `/funding/deposits/me`         | Paginated deposit history                 |
| GET    | `/funding/deposits/:reference` | Deposit status (poll after checkout)      |
| POST   | `/webhooks/flutterwave/funding`| Settlement webhook (public, verif-hash)   |

## Domain events published

| Event                             | When                                  |
|-----------------------------------|---------------------------------------|
| `funding.deposit.initiated`       | Deposit created (checkout or VA credit) |
| `funding.deposit.completed`       | Deposit settled and wallet credited   |
| `funding.deposit.failed`          | Terminal failure (with reason)        |
| `funding.virtual-account.created` | Virtual account number issued         |
