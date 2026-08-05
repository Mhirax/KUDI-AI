# Bills Module (`modules/bills`)

Airtime, mobile data, electricity, cable TV and internet payments from
Kudi wallets, via Flutterwave's bills APIs.

## The payment saga

Mirrors Transfers' external payout saga (see
`InitiateExternalTransferHandler`) — it spans our database *and* an
external provider call, so it is a saga with compensation, never
pretending to be atomic:

1. **Validate the customer** with the biller (meter/phone/smartcard) —
   fail fast before any money moves.
2. **Debit amount + fee** from the wallet. `Account.debit()` enforces
   sufficient funds and active status; optimistic concurrency prevents
   racing debits.
3. **Record the `BillPayment` as PENDING.**
4. **Call the provider.** Synchronous failure → compensating credit +
   `REVERSED` (distinct from `FAILED`, so the customer knows their
   money came back). Non-synchronous settlement parks the payment in
   `PROCESSING`; `POST /bills/:reference/refresh-status` requeries the
   provider and finalizes — `SUCCESSFUL`, or compensating credit +
   `REVERSED`.

State machine: `PENDING → PROCESSING → SUCCESSFUL | FAILED`, with
`PENDING/PROCESSING → REVERSED` on compensation. Terminal states are
sinks — the aggregate rejects any further transition.

## Integration with other modules

- Debits/credits go through Accounts' aggregate, so the **Ledger**
  records every bill debit (classified `BILL_PAYMENT` via the
  `KUDI-BILL-` prefix) and every compensating credit automatically.
- The Flutterwave HTTP contract lives entirely in
  `/integrations/payment-gateway/flutterwave/bill-payments` (port →
  adapter → mapper).
- `IBillFeeCalculator` is the named seam for the Rust `fee-engine`,
  like Transfers' `IFeeCalculator`.

## Endpoints

| Method | Path                              | Purpose                                    |
|--------|-----------------------------------|---------------------------------------------|
| GET    | `/bills/billers?category=`        | Biller catalogue (live provider passthrough)|
| POST   | `/bills/validate-customer`        | Pre-payment customer name lookup (UX)       |
| POST   | `/bills/pay`                      | Pay a bill (the saga)                       |
| GET    | `/bills/me`                       | Paginated bill payment history              |
| GET    | `/bills/:reference`               | Single bill payment status                  |
| POST   | `/bills/:reference/refresh-status`| Requery + finalize a PROCESSING payment     |

## Domain events published

| Event                     | When                                    |
|---------------------------|------------------------------------------|
| `bills.payment.initiated` | Saga started (funds held)               |
| `bills.payment.completed` | Bill settled (value token included when the biller issues one) |
| `bills.payment.failed`    | Terminal failure without compensation   |
| `bills.payment.reversed`  | Failure with funds returned             |
