# Notifications Module (`modules/notifications`)

The customer's in-app notification center — an event-driven projection
of what the rest of the platform announces.

## Design

**End of the event pipeline.** The write side is exclusively the four
themed event handlers below; there is no HTTP path that creates a
notification, and the aggregate publishes no events of its own. The
read side is self-service queries plus two mark-read commands.

**Never poison the pipeline.** Every handler logs and swallows its own
failures: the underlying business operation (a deposit, a transfer)
already succeeded, and a missed notification must not fail it
retroactively.

**Strictly self-service.** Every endpoint operates on the caller's own
notifications; there is deliberately no admin view or override.

**Channels come later, cheaply.** Email/SMS/push will subscribe to the
same domain events through their own channel adapters — nothing in
this module changes when they arrive.

## Event subscriptions

| Handler                    | Events                                                                                  |
|----------------------------|------------------------------------------------------------------------------------------|
| `identity-security`        | `UserRegistered`, `PasswordChanged`, `UserAccountLocked`                                 |
| `kyc`                      | `KycTierUpgraded`                                                                        |
| `money-movement`           | `DepositCompleted`, `DepositFailed`, `BillPaymentCompleted`, `BillPaymentReversed`, `TransferCompleted` (enriched via Transfers' port) |
| `account-status`           | `AccountFrozen`, `AccountUnfrozen` (owner via Accounts' port)                            |

## Endpoints

| Method | Path                              | Purpose                          |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/notifications/me`               | Paginated list (`unreadOnly=true` filter) |
| GET    | `/notifications/me/unread-count`  | Badge count                       |
| POST   | `/notifications/:id/read`         | Mark one read (idempotent)        |
| POST   | `/notifications/read-all`         | Mark all read                     |
