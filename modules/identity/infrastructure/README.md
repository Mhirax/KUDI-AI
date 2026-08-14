# Identity Infrastructure Layer

Concrete adapters implementing the ports declared in the domain and
application layers.

- `persistence/` — `PrismaUserRepository`, `PrismaRefreshTokenRepository`
  implementing `IUserRepository` / `IRefreshTokenRepository` against
  the platform's shared `PrismaService` (`/infrastructure/database`).
- `services/` — `BcryptPasswordHasher` (implements `IPasswordHasher`,
  cost factor 12) and `JwtTokenService` (implements `ITokenService`,
  wraps `@nestjs/jwt`; refresh tokens are opaque random strings, hashed
  with SHA-256 before storage — never JWTs, so revocation is a simple
  DB lookup, not a deny-list).
- `mappers/` — translate between Prisma models and domain
  entities/value objects, keeping Prisma-specific types out of the
  domain layer entirely.

Nothing outside this directory (and `presentation/`, which wires it via
DI) knows these are backed by Prisma or bcrypt — swapping either is a
change confined to this layer.
