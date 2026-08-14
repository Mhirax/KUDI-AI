# Compliance / KYC Module

Fourth implemented bounded context: identity verification against a
CBN-style tiered KYC model, and the event chain that ties account
activation to verification status.

## Layers (Clean Architecture)

```
compliance/
├── domain/            # KycProfile aggregate, Bvn/Nin VOs, events, exceptions, ports
├── application/         # CQRS Commands/Queries, event handlers, DTOs
├── infrastructure/         # Prisma repository, Flutterwave verification provider
└── presentation/             # KycController
```

## Endpoints

| Method | Path                | Access                    |
|--------|-----------------------|-------------------------------|
| GET    | `/kyc/me`                | Any authenticated user           |
| POST   | `/kyc/verify-bvn`          | Own profile only                    |
| POST   | `/kyc/verify-nin`             | Own profile only                       |

## The full event chain

This module is the middle link in a three-module Event-Driven chain
that required no direct provider-level dependency between Identity and
Accounts:

1. A user registers → Identity publishes `UserRegisteredEvent`.
2. Compliance's `UserRegisteredHandler` reacts, creating a default
   TIER_1 `KycProfile`.
3. The user submits a BVN → `SubmitBvnVerificationHandler` verifies it
   against Flutterwave and checks the returned name against the user's
   *registered* name (fetched via Identity's exported `USER_REPOSITORY`
   port). On success, `KycProfile` upgrades to TIER_2 and publishes
   `KycTierUpgradedEvent`.
4. Accounts' `KycTierUpgradedHandler` reacts, activating every
   `PENDING_VERIFICATION` account the user owns.

Steps 2 and 4 are pure event subscriptions — Compliance never imports
Accounts, and neither Identity nor Accounts imports Compliance's
providers, only its published event classes.

## Design Decisions

- **Raw BVN/NIN are never persisted.** Only a SHA-256 hash (for
  duplicate-submission detection) and a masked last-4-digit form ever
  reach the database — see `KycProfile`'s and `Bvn`/`Nin`'s header
  comments.
- **Name-matching is conservative, not fuzzy.** An exact
  case/whitespace-insensitive comparison against the provider's
  returned name is used; see
  `FlutterwaveVerificationMapper.namesMatch()`'s header comment for why
  fuzzy matching was deliberately deferred rather than guessed at.
- **A KYC profile always exists.** Created automatically on
  registration via an event handler, so "profile doesn't exist" is an
  exceptional case in verification handlers, not a routine branch.
- **No transaction-limit enforcement yet.** This module establishes
  the tier; wiring tier-based limits into Transfers is a deliberately
  separate future enhancement (see domain README).

## Persistence

`KycProfile` model + `KycTier` enum added to
`/infrastructure/prisma/schema.prisma`. Run:

```sh
npm run prisma:migrate
```

## Status

Phase 2 — fourth and final bounded-context module for this phase,
fully wired, mounted in `apps/mobile-api`, `apps/web-api`, and
`apps/admin-api`. The Flutterwave Verification integration
(`/integrations/payment-gateway/flutterwave/verification`) is now
implemented for real, not scaffolded.
