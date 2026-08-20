# Identity & Auth Module

First implemented bounded context: user registration, authentication,
JWT access + rotating opaque refresh tokens, and RBAC role assignment.
See [`implementation.md`](implementation.md) for known open gaps
(password policy, account lockout) found in the 2026-08-19
MVP-completeness review.

## Layers (Clean Architecture)

```
identity/
├── domain/            # Entities, Value Objects, Events, Exceptions, Ports
├── application/        # CQRS Commands/Queries, DTOs, Ports
├── infrastructure/       # Prisma repositories, bcrypt, JWT adapter
└── presentation/          # Controllers, Passport strategy, guards
```

Dependency direction is strictly inward: `presentation` → `application`
→ `domain`. `infrastructure` implements ports declared in `domain`/
`application` and is wired in by `identity.module.ts` — nothing in
`domain` or `application` imports from `infrastructure` or
`presentation`.

## Endpoints

| Method | Path                     | Auth        | Description                          |
|--------|---------------------------|-------------|----------------------------------------|
| POST   | `/auth/register`            | Public      | Register a new customer               |
| POST   | `/auth/login`                 | Public      | Authenticate, receive token pair       |
| POST   | `/auth/refresh`                 | Public      | Rotate refresh token                    |
| POST   | `/auth/logout`                    | Bearer      | Revoke current session                  |
| POST   | `/auth/change-password`             | Bearer      | Change password, revoke other sessions   |
| GET    | `/users/me`                           | Bearer      | Own profile                                |
| GET    | `/users/:userId`                        | Bearer      | Profile by ID (self or admin only)         |

## Security Design

- Passwords: bcrypt, cost factor 12; strength enforced by the
  `PlainPassword` value object before hashing ever occurs.
- Access tokens: short-lived JWT (15 min default), stateless
  verification via `JwtStrategy`.
- Refresh tokens: opaque random 512-bit strings, never JWTs; only a
  SHA-256 hash is persisted. Rotated on every use; reuse of a revoked
  token revokes its entire token family (theft/reuse detection).
- Account lockout: 5 consecutive failed logins locks the account for
  15 minutes — enforced as a domain invariant on the `User` aggregate,
  not in a controller or middleware. Auto-unlocks on the next login
  attempt once the window has passed, resetting the counter.
- Timing-safe login: a dummy bcrypt comparison runs even when the
  email doesn't exist, to avoid revealing account existence via
  response timing.
- Domain events (`UserRegistered`, `UserLoggedIn`, `UserLoginFailed`,
  `UserAccountLocked`, `PasswordChanged`) are published via
  `@nestjs/cqrs`'s `EventBus`; a RabbitMQ-backed subscriber bridging
  these into the platform's shared `IEventBus` is added when the
  Notifications/Audit modules consume them.

## Persistence

`User` and `RefreshToken` Prisma models are defined in
`/infrastructure/prisma/schema.prisma`. Run:

```sh
npm run prisma:migrate
```

## Status

Phase 2 — first bounded-context module, fully wired (domain →
application → infrastructure → presentation), ready to mount in
`apps/mobile-api`, `apps/web-api`, and `apps/admin-api`.
