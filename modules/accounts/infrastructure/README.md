# Accounts Infrastructure Layer

- `persistence/prisma-account.repository.ts` — implements
  `IAccountRepository`. Writes use optimistic concurrency control keyed
  on the aggregate's `version` column, rejecting (via `DomainException`,
  mapped to HTTP 400 `CONCURRENT_MODIFICATION`) a save whose expected
  version has already moved — the correct behavior for a
  balance-mutating aggregate under concurrent access.
- `services/nuban-account-number-generator.service.ts` — implements
  `IAccountNumberGenerator` using the standard NUBAN weighted mod-10
  checksum algorithm against Kudi AI Bank's configured bank code
  (`BANK_NUBAN_CODE`).
- `mappers/account.mapper.ts` — Prisma ⇄ domain translation; balances
  move as native `BigInt` end-to-end, never through `number`.
