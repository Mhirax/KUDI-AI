# Identity Presentation Layer

The outermost layer — HTTP controllers, Passport strategies, and
module-specific guards. Controllers are intentionally thin: they
validate input via DTOs (`class-validator`) and dispatch a CQRS
command/query, with zero business logic of their own.

- `controllers/auth.controller.ts` — `POST /auth/register`, `/login`,
  `/refresh`, `/logout`, `/change-password`
- `controllers/users.controller.ts` — `GET /users/me`, `GET /users/:userId`
- `strategies/jwt.strategy.ts` — Passport strategy backing the shared
  `JwtAuthGuard`
- `guards/self-or-admin.guard.ts` — restricts `:userId` routes to the
  resource owner or an administrative role
