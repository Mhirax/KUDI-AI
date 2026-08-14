# Compliance Domain Layer

- `entities/kyc-profile.entity.ts` — `KycProfile` aggregate root. Owns
  the CBN-style tier progression invariant (`TIER_1 → TIER_2 → TIER_3`)
  and guarantees a raw BVN/NIN is never part of persisted state — only
  a SHA-256 hash and masked display form ever reach this aggregate.
- `value-objects/` — `Bvn`, `Nin`: 11-digit format validation, with
  explicit masking methods (`toMasked()`) so callers have to opt out of
  safe display, not opt in.
- `events/` — `KycProfileCreated`, `VerificationPassed`,
  `VerificationFailed`, `KycTierUpgraded`. The last is this module's
  primary published contract: the Accounts module subscribes to it to
  activate pending accounts once a user reaches TIER_2 (see
  `modules/accounts/application/event-handlers/kyc-tier-upgraded.handler.ts`).
- `exceptions/` — `KycProfileNotFoundException` (404),
  `VerificationAlreadyPassedException` (409, prevents duplicate
  submissions), `IdentityMismatchException` (422, the provider's
  returned name doesn't match the user's registered name — deliberately
  vague in its message to avoid leaking PII), `VerificationProviderException` (502).
- `repositories/` — `IKycProfileRepository`.
- `services/` — `IIdentityVerificationProvider`, implemented by
  `infrastructure/services/flutterwave-identity-verification-provider.service.ts`.

## Why no transaction-limit enforcement yet

Real CBN tiers cap daily/cumulative transaction volume per tier. This
module establishes the tier *itself*; wiring tier-based limits into
Transfers' initiation flow is a deliberately separate, documented
future enhancement — bolting it on here would couple Compliance
directly to Transfers' domain rules rather than the other way around
(Transfers should query the caller's tier when it needs to, not the
reverse).
