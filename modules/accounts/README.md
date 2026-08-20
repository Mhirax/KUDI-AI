# Accounts & Wallets Module

Second implemented bounded context: account/wallet lifecycle (open,
credit, debit, freeze, unfreeze, close) with NUBAN-format account
numbers and exact `bigint`-based monetary arithmetic. **MVP-complete**
as of 2026-08-19 — see [`implementation.md`](implementation.md) for
the two gaps found in that day's review (account provisioning,
freeze/unfreeze role asymmetry) and how each was closed.

## Layers (Clean Architecture)

```
accounts/
├── domain/            # Account aggregate, Money/AccountNumber VOs, events, exceptions, ports
├── application/         # CQRS Commands/Queries, DTOs
├── infrastructure/         # Prisma repository (optimistic concurrency), NUBAN generator
└── presentation/             # AccountsController
```

## Endpoints

| Method | Path                        | Access                        |
|--------|-------------------------------|----------------------------------|
| POST   | `/accounts`                     | Any authenticated user           |
| GET    | `/accounts/me`                    | Any authenticated user             |
| GET    | `/accounts/:accountId`               | Owner or admin                       |
| POST   | `/accounts/:accountId/credit`           | Admin/Super Admin                       |
| POST   | `/accounts/:accountId/debit`               | Admin/Super Admin                          |
| POST   | `/accounts/:accountId/freeze`                 | Admin/Super Admin/Compliance Officer          |
| POST   | `/accounts/:accountId/unfreeze`                  | Admin/Super Admin/Compliance Officer                                |
| POST   | `/accounts/:accountId/close`                        | Owner or admin                                      |

## Design Decisions

- **Money is `bigint` minor units, never `number`.** API requests carry
  decimal strings (`"1500.00"`); `Money.fromDecimalString()` parses
  them exactly. This eliminates floating-point drift entirely from
  account balances.
- **Optimistic concurrency control.** Every `Account` row carries a
  `version`; `PrismaAccountRepository.save()` conditions its update on
  the version the aggregate was loaded with, rejecting (not silently
  overwriting) concurrent credit/debit races.
- **NUBAN account numbers.** Generated with the standard weighted
  mod-10 checksum against Kudi AI Bank's configured bank code
  (`BANK_NUBAN_CODE`); real interbank use requires validation against
  NIBSS certification vectors.
- **Credit/debit are admin-only for now.** Real customer-facing money
  movement (funding, P2P transfers) will be dispatched *internally* by
  the Transfers/Funding module, not called directly by end users over
  HTTP — this module only establishes account state and its
  invariants.
- **Cross-module boundary with Identity.** This module depends on
  Identity only through the `AccessTokenPayload` shape at the
  presentation layer (`user.sub`, `user.role`) — never on Identity's
  domain or application internals. `Account.userId` is a plain scalar
  reference, not a Prisma relation, preserving bounded-context
  isolation at the database level too.
- **The reverse direction is coupled on purpose.** Identity's
  `RegisterUserHandler` directly dispatches this module's
  `OpenAccountCommand` (via the shared `CommandBus`) so every
  registered user provably has exactly one `WALLET`/`NGN` account —
  not an event-driven reaction, a synchronous, awaited call that fails
  registration itself if account creation fails. See
  `modules/identity/implementation.md` for the full reasoning; this
  module's own account-opening logic (`OpenAccountHandler`) is
  unchanged either way.

## Relationship to the Rust ledger-engine

This module's `balance` column is a denormalized projection kept
consistent via domain events. The authoritative, immutable double-entry
record lives in `/rust/ledger-engine`; the synchronous vs. asynchronous
integration contract between the two is finalized when the Transfers
module is built, since that's where actual money movement between
accounts first occurs.

## Persistence

`Account` model + `AccountType`/reused `AccountStatus` enums added to
`/infrastructure/prisma/schema.prisma`. Run:

```sh
npm run prisma:migrate
```

## Status

Phase 2 — second bounded-context module, fully wired, mounted in
`apps/mobile-api`, `apps/web-api`, and `apps/admin-api`.
