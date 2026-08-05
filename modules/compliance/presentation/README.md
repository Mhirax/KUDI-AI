# Compliance Presentation Layer

| Method | Path                | Access                    |
|--------|-----------------------|-------------------------------|
| GET    | `/kyc/me`                | Any authenticated user           |
| POST   | `/kyc/verify-bvn`          | Any authenticated user (own profile only — enforced via `user.sub`) |
| POST   | `/kyc/verify-nin`             | Any authenticated user (own profile only) |

There is no admin-facing "verify someone else's BVN" endpoint in this
phase — verification always runs against the calling user's own
registered identity, by design.
