# Compliance Application Layer

## Commands

| Command                              | Responsibility                                             |
|------------------------------------------|-------------------------------------------------------------------|
| `SubmitBvnVerificationCommand`               | Verify a BVN against the user's registered name; may upgrade to TIER_2 |
| `SubmitNinVerificationCommand`                  | Verify a NIN against the user's registered name; may upgrade to TIER_3 |

## Queries

| Query                    | Responsibility                        |
|----------------------------|------------------------------------------|
| `GetMyKycStatusQuery`         | Fetch the calling user's KYC tier and verification status |

## Event Handlers

| Handler                    | Reacts to                                | Effect                                    |
|------------------------------|---------------------------------------------|------------------------------------------------|
| `UserRegisteredHandler`       | Identity's `UserRegisteredEvent`               | Creates a default TIER_1 `KycProfile`             |

This is one half of a two-module Event-Driven chain:
`Identity.UserRegisteredEvent` → `Compliance` creates a profile →
(later) `Compliance.KycTierUpgradedEvent` → `Accounts` activates
pending accounts (see `modules/accounts/application/event-handlers/kyc-tier-upgraded.handler.ts`).
Neither module imports the other's providers via NestJS DI — only the
published event *classes*, which is the whole point of Event-Driven
Architecture as a decoupling mechanism between bounded contexts.
