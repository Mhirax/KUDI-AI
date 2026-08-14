# Accounts Application Layer

CQRS commands and queries orchestrating the `Account` aggregate.

## Commands

| Command                    | Responsibility                                    |
|------------------------------|------------------------------------------------------|
| `OpenAccountCommand`           | Open a new account/wallet (PENDING_VERIFICATION)      |
| `ActivateAccountCommand`         | Activate a PENDING_VERIFICATION account (not exposed via HTTP — see event handler below) |
| `CreditAccountCommand`           | Increase balance                                        |
| `DebitAccountCommand`              | Decrease balance (enforces sufficient funds)              |
| `FreezeAccountCommand`               | Freeze an account (fraud/compliance hold)                    |
| `UnfreezeAccountCommand`               | Restore a frozen account to active                             |
| `CloseAccountCommand`                    | Close an account (requires zero balance)                          |

## Event Handlers

| Handler                    | Reacts to                                      | Effect                                    |
|------------------------------|-----------------------------------------------------|------------------------------------------------|
| `KycTierUpgradedHandler`       | Compliance's `KycTierUpgradedEvent` (TIER_2/TIER_3)    | Activates all PENDING_VERIFICATION accounts for that user |

This closes the loop described in the domain README: accounts open in
`PENDING_VERIFICATION` and only become usable once Compliance confirms
the owner's identity — entirely via published domain events, with no
direct dependency between the two modules' providers.

## Queries

| Query                    | Responsibility                                        |
|----------------------------|------------------------------------------------------------|
| `GetAccountByIdQuery`         | Fetch a single account; enforces self-or-admin authorization  |
| `ListMyAccountsQuery`            | List all accounts owned by the calling user                     |

## Money handling

API requests carry amounts as decimal strings (e.g. `"1500.00"`), never
JSON numbers — converted to exact `bigint` minor units via
`Money.fromDecimalString()` in the domain layer, so no floating-point
value ever represents a currency amount anywhere in this module.
