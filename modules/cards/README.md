# Cards Module

Virtual and physical debit cards, each linked to one of the caller's
existing platform Accounts.

## Why this design

**Real Flutterwave Issuing integration for virtual cards, not a
stub.** The `integrations/.../virtual-cards` folder previously
contained only a structure README ("Phase 1 — Structure only"). This
phase implements it fully: `FlutterwaveVirtualCardsAdapter` calls
Flutterwave's real v3 Issuing endpoints (create, lookup, fund, block,
unblock, terminate) with the same HTTP/error-handling conventions as
every other Flutterwave capability in this codebase (bearer auth,
15s timeout, normalized `ServiceUnavailableException`). `modules/cards`
consumes it through its own domain-level `ICardIssuer` port
(`domain/services/card-issuer.interface.ts`) — the module never
imports the adapter directly, matching the seam pattern Bills uses for
`IBillPaymentProvider`.

**Virtual card issuance is synchronous; physical is deliberately
not.** `POST /cards/create-virtual` calls Flutterwave in the same
request and the card comes back ACTIVE immediately.
`POST /cards/request-physical` does **not** call any provider — it
records a `PENDING` card and stops there. This is not a shortcut: real
physical card programs (KYC-gated printing, embossing, courier
dispatch) are an offline logistics process, not a synchronous API call,
in every card-issuing integration. Progressing a physical card from
`PENDING` to `ACTIVE` once it's produced and dispatched is ops
tooling this phase does not build (see "What a later phase should
add").

**A card has its own spendable balance, separate from its linked
Account.** `POST /cards/fund` debits the linked Account via Accounts'
own `DebitAccountCommand` (so the Ledger projects it like any other
debit) and then credits both Flutterwave's card balance and the Card
aggregate's own `balance` field. This mirrors how a real card program
works — the card spends against its own funded balance, not live
against the wallet — and keeps Money movement entirely inside
Accounts' existing, tested Credit/DebitAccountCommand machinery rather
than reimplementing it here.

**Terminating a card sweeps its balance home.** `Card.terminate()`
zeroes the card's own balance and returns the swept amount; the
handler credits it back to the linked Account via
`CreditAccountCommand` so funds are never stranded on a dead card.

**Eligibility is the same bar as Loans.** Card issuance (virtual or
physical) requires KYC Tier 2+ and an ACTIVE linked account — checked
inline in the two issuance handlers, the same pattern
`CreateSavingsGoalHandler` already uses rather than a separate
eligibility service (Cards' eligibility rule is simple enough not to
warrant Loans' dedicated `ILoanEligibilityService` abstraction).

**Freeze/unfreeze/terminate are owner-accessible, not staff-only.** A
customer can lock down or close their own compromised card immediately
without waiting on support — `GET /cards` and card actions authorize
via "staff sees all, everyone else only their own," the same
role-aware pattern used throughout (Savings, Loans).

## State machine

```
PENDING --activate (virtual: immediate; physical: ops, not built)--> ACTIVE ⇄ FROZEN
ACTIVE/FROZEN/PENDING --terminate--> TERMINATED
```

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/cards/create-virtual` | Authenticated customer (own account, KYC Tier 2+) |
| POST | `/api/v1/cards/request-physical` | Authenticated customer (own account, KYC Tier 2+) |
| GET | `/api/v1/cards` | Authenticated customer — own cards only |
| GET | `/api/v1/cards/:id` | Staff, or the card's owner |
| POST | `/api/v1/cards/freeze` | Staff, or the card's owner |
| POST | `/api/v1/cards/unfreeze` | Staff, or the card's owner |
| POST | `/api/v1/cards/fund` | Authenticated customer (own card only) |
| POST | `/api/v1/cards/terminate` | Staff, or the card's owner |

## What a later phase should add

- An ops workflow to progress `PENDING` physical cards to `ACTIVE`
  once printed/dispatched (address collection, shipment tracking)
- Real-time transaction webhooks from Flutterwave (spend
  notifications, declines) — not built in this phase
- Per-card spend limits / merchant category restrictions
- Card PIN management endpoints
