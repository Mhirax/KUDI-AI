# Strategies

Only a `JwtStrategy` is implemented here. Login and refresh deliberately
do **not** use Passport strategies:

- **Login** validates credentials via the domain (`User.assertCanAttemptLogin`
  + `IPasswordHasher.compare`) inside `LoginHandler`, invoked directly
  from `AuthController` — introducing `passport-local` would just be an
  extra indirection around logic that already lives correctly in the
  application layer.
- **Refresh** tokens are opaque, hashed, DB-verified strings (see
  `infrastructure/services/jwt-token.service.ts`), not JWTs, so there is
  no JWT to verify with a Passport strategy — verification happens in
  `RefreshAccessTokenHandler` via the repository.

This keeps authentication decision-making inside the domain/application
layers, where it can be unit tested without an HTTP or Passport
dependency, and reserves Passport strictly for what it's good at:
extracting and validating the bearer token on already-authenticated
requests.
