# Rewards Module

Points earned automatically from real, completed money-moving activity
elsewhere on the platform; redeemed through the platform's real
money-movement paths, not a parallel one built just for this module.

## Earning

Three event handlers (`application/event-handlers/`) listen for
`TransferCompletedEvent` (Transfers), `BillPaymentCompletedEvent`
(Bills), and `DepositCompletedEvent` (Funding), and each dispatches the
internal `EarnRewardPointsCommand`. Rate: 1 point per ₦100 moved (see
`RateBasedRewardPointsCalculator`) — illustrative, not final pricing,
the same disclaimer every other fee/rate schedule in this codebase
carries. Idempotent by the upstream event's own `eventId`, so an
at-least-once redelivery never double-credits points.

`TransferCompletedEvent` doesn't carry `userId`/`amount` directly, so
its handler re-fetches the `Transfer` by id via Transfers' exported
`TRANSFER_REPOSITORY` — the same pattern Ledger's own event handlers
use to fetch an `Account` for its `userId`.

## Redemption

`POST /rewards/redeem` always credits the Naira-equivalent value into
the customer's wallet first, via Accounts' own `CreditAccountCommand`
— so the Ledger records exactly what a reward redemption is worth,
the same as any other credit. `AIRTIME`/`DATA` redemption then
immediately chains into Bills' own `InitiateBillPaymentCommand` using
that same amount, so the actual purchase runs through Bills' real
Flutterwave integration. `CASHBACK` stops after the credit.

## Referrals

`POST /rewards/referral` awards a flat bonus to both parties. A
referee may redeem exactly one code, ever — enforced by a unique
constraint on `ReferralRedemption.refereeUserId`, not application-layer
logic alone.

## Endpoints

- `GET /rewards`
- `GET /rewards/history`
- `POST /rewards/redeem`
- `POST /rewards/referral`

## Scope for this phase (v1)

Vouchers and physical-reward redemption are out of scope — they need a
real fulfillment partner, which is a business/operations problem, not
a backend one. Only `CASHBACK`, `AIRTIME`, and `DATA` are implemented.
