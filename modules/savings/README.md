# Savings Module

Goal-based savings built entirely on the existing Accounts primitive —
no new money-movement machinery.

## How it works

Each `SavingsGoal` is metadata (name, optional target, status) that
wraps a **dedicated Account** of `accountType: SAVINGS`, opened via
Accounts' own `OpenAccountCommand` the moment a goal is created. All
money movement — deposit, withdraw, and the balance sweep on close —
is dispatched through Accounts' existing `CreditAccountCommand` /
`DebitAccountCommand`, exactly the same primitives every other bounded
context (Transfers, Bills, Funding) already uses.

Because of that, Savings gets two things for free, without a single
line of Savings-specific code:

- **Ledger projection.** `AccountCreditedEvent`/`AccountDebitedEvent`
  are published by `Account.credit()`/`debit()` regardless of which
  module triggered them, and Ledger's event handlers project *every*
  such event into an immutable entry — a savings deposit shows up in
  the customer's transaction history the same way a transfer does.
- **Optimistic concurrency & invariant enforcement.** Insufficient
  funds, frozen/closed accounts, and the zero-balance-to-close rule
  are all enforced by `Account` itself.

## Endpoints

- `POST /savings/create`
- `GET /savings`
- `GET /savings/:id`
- `POST /savings/deposit`
- `POST /savings/withdraw`
- `POST /savings/close`

## Scope for this phase (v1)

Manual deposits/withdrawals only — no scheduled auto-debit and no
interest. Both are documented future enhancements, the same way
Compliance documents unimplemented per-tier transaction limits: adding
a scheduled auto-debit means deciding what happens on a failed debit
(insufficient wallet funds on the scheduled date), and interest is a
compliance/accounting decision, not a technical one — neither should
be guessed at in code.
