# Loans Module

Internal lending against the platform's own ledger. A customer applies
for a loan, staff approve or reject it, an approved loan is disbursed
into the borrower's wallet, and the borrower repays it (fully or in
instalments) before or after the due date.

## Why this design

**No new money-movement machinery.** Disbursement is one call to
Accounts' `CreditAccountCommand`; repayment is one call to Accounts'
`DebitAccountCommand`. Both already raise `AccountCreditedEvent` /
`AccountDebitedEvent`, which Ledger's existing event handlers already
project into immutable ledger entries. This module never writes to an
Account balance directly — it only tracks the loan's own lifecycle
state and repayment progress, the same division of responsibility
Bills and Transfers already use for their sagas.

**Eligibility is rules-based, not a credit bureau integration.**
`RulesBasedLoanEligibilityService` reads the caller's KYC tier
(Compliance module) and their target account's status (Accounts
module):

| KYC Tier | Eligible? | Max principal |
|---|---|---|
| TIER_1 | No — BVN verification required | — |
| TIER_2 | Yes | ₦100,000 |
| TIER_3 | Yes | ₦500,000 |

This is a deliberate v1 simplification. A real credit-risk assessment
(bureau pull, income verification, repayment-history scoring) is
out of scope for this phase and is called out here as the most
important pre-production follow-up for this module.

**Pricing is a single flat fee, not two loan products.** An earlier
"Quick Loan vs. Business Loan" concept was simplified to one flat 10%
fee on principal (`FlatFeeLoanCalculator`), independent of tenor.
Tenor (7–90 days) is still captured and validated so a real interest
curve can be layered in later without an API or schema change — only
the fee calculator's internals would need to change.

**Approval and disbursement are separate steps, on purpose.** Marking
a loan APPROVED never itself moves money. A staff member must call
`POST /loans/disburse` as a second, distinct action. This keeps
"decided to lend" and "money actually left the building" as two
separately-audited events, which matters for reconciliation and for
undoing an approval before funds move.

**`POST /loans/approve` handles both approval and rejection** via a
`decision: APPROVE | REJECT` field, to satisfy the single endpoint
named in the spec while still exposing the entity's real `reject()`
transition (with a `reason`) rather than forcing every non-approval
through a generic error path.

## State machine

```
PENDING_REVIEW --approve--> APPROVED --disburse--> DISBURSED --repay--> REPAYING --repay (final)--> REPAID
       |
       +--reject--> REJECTED
```

`DEFAULTED` is modeled in the schema/enum but nothing in this phase
transitions a loan into it — there is no scheduled job checking
overdue `dueDate`s yet. That job (plus any collections workflow) is
the other major pre-production gap, alongside the credit-risk check
above.

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/loans/apply` | Authenticated customer (own account only) |
| GET | `/api/v1/loans` | Staff: all loans. Customer: own loans only |
| GET | `/api/v1/loans/:id` | Staff, or the loan's owner |
| POST | `/api/v1/loans/approve` | Staff only (ADMIN / SUPER_ADMIN / SUPPORT_AGENT) |
| POST | `/api/v1/loans/disburse` | Staff only |
| POST | `/api/v1/loans/repay` | Authenticated customer (own loan only) |

## What a later phase should add

- Real credit-risk assessment beyond KYC tier
- A scheduled job to detect overdue loans and transition them to `DEFAULTED`
- Tiered/interest-based pricing instead of a flat fee
- Partial-approval (approve a lower principal than requested)
- Auto-approval for small, low-risk amounts
