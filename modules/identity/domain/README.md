# Identity Domain Layer

The innermost layer of the Identity bounded context. Contains only
business rules and has zero framework dependencies (no NestJS, no
Prisma, no HTTP).

- `entities/` — `User` (aggregate root) and `RefreshToken`, encapsulating
  all authentication-state invariants (lockout policy, credential
  rotation) and raising domain events on state transitions.
- `value-objects/` — `Email`, `PhoneNumber`, `PlainPassword`/`HashedPassword`,
  each self-validating at construction so invalid states are unrepresentable.
- `events/` — domain events published to RabbitMQ via the shared
  `IEventBus`, allowing other bounded contexts (Notifications, Audit/
  Compliance) to react without a direct dependency on this module.
- `exceptions/` — domain-rule violations (invalid credentials, locked
  account, duplicate registration), framework-agnostic.
- `repositories/` — ports (`IUserRepository`, `IRefreshTokenRepository`)
  implemented by `infrastructure/persistence`.
- `services/` — `IPasswordHasher` port implemented by `infrastructure/services`.

## Invariants owned here

- A user is locked for 15 minutes after 5 consecutive failed login attempts.
- Passwords must satisfy strength rules before ever reaching a hasher.
- Refresh tokens are rotated on every use; reuse of a revoked token is
  detectable via token `family`.
