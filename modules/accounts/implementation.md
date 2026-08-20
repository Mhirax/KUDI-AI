# Accounts & Wallets — Implementation Tracker

Tracks known gaps against "MVP-complete" for this module. See
`README.md` in this folder for the architecture as it stands today.
This file exists because a cross-module MVP-completeness review
(2026-08-19) found real gaps that got a deliberate decision and a
same-day fix.

**Baseline (already done, working):**
- Account open/credit/debit/freeze/unfreeze/close, NUBAN-format account
  numbers, exact `bigint` monetary arithmetic, optimistic concurrency
  via a `version` column.
- `GET /accounts/:accountId` correctly restricted to owner or admin.
- Compliance's Phase 1d max-balance ceiling wired into both real credit
  paths (`CreditAccountHandler`, internal-transfer destination credit).

---

## Status at a glance

| # | Gap | Severity | Status |
|---|---|---|---|
| 1 | No server-side account provisioning — registering a user did not create an account for them. | 🔴 Real gap | ✅ Fixed — registration now provisions atomically |
| 2 | `unfreeze` role set didn't match `freeze` in this module's own controller. | 🟡 Inconsistency | ✅ Fixed — both share one role set |

**Accounts is now MVP-complete.**

---

## Resolved

### 1. No server-side account provisioning — fixed
`modules/identity/application/commands/register-user/register-user.handler.ts`
now dispatches this module's `OpenAccountCommand` (`WALLET`/`NGN`)
synchronously via the shared `CommandBus`, immediately after the `User`
row is saved and before the command returns. Decision made explicitly
before building (see chat/commit history): a **direct, awaited call**,
not an event-driven reaction to `UserRegisteredEvent` — the event path
was considered and rejected specifically because `@nestjs/cqrs`'s
`EventBus.publish()` is fire-and-forget, the same failure mode already
found and fixed for Compliance's audit trail this session (a failed
handler there silently drops the write with no error surfaced
anywhere). A direct call fails registration itself instead, which is
correct for an invariant this foundational.

- [x] `RegisterUserHandler` now depends on `CommandBus` in addition to
      `EventBus`, dispatching `OpenAccountCommand(user.id, AccountType.WALLET, Currency.NGN)`
      right after `userRepository.save(user)`. Wrapped in try/catch:
      logs loudly (`this.logger.error(...)`) and rethrows on failure —
      does not swallow it.
- [x] **Known, accepted residual limitation** (not solved, deliberately
      not over-engineered for this MVP): the `User` save and the
      `Account` creation are *not* wrapped in one cross-module DB
      transaction. If account creation fails after the user row is
      already committed, the request fails loudly (registration itself
      errors out) but the user row is not rolled back — a rare
      infrastructure-failure edge case, not a routine one, and strictly
      better than today's *always*-missing-account state. Proven
      directly by a dedicated integration test (see below), not just
      asserted.
- [x] `Login.jsx`'s existing client-side create-if-missing workaround
      is deliberately **kept**, not removed — an idempotent safety net
      for the rare case the backend call fails, at zero ongoing cost.
- [x] New integration test,
      `modules/identity/application/commands/register-user/register-user.handler.integration-spec.ts`,
      against the real Postgres DB: (1) registration provisions exactly
      one `WALLET`/`NGN` account with `PENDING_VERIFICATION` status and
      zero balance, (2) a simulated account-provisioning failure
      propagates as a rejected promise rather than being swallowed,
      and the residual limitation above (user row persists, no
      account) is asserted directly rather than just described.

**Verified:** `tsc --noEmit` clean, a DI-graph boot of `AppModule`
confirming the new cross-module wiring resolves (no circular-import or
missing-provider issue — the `CommandBus` is a shared singleton across
every module importing `CqrsModule`, same mechanism already proven for
Compliance's staff freeze/unfreeze proxy routes), full unit suite
43/43, full integration suite 27/27 (2 new).

### 2. Freeze/unfreeze role asymmetry — fixed
`presentation/controllers/accounts.controller.ts` — `freeze` and
`unfreeze` now both use one shared `ACCOUNT_FREEZE_ROLES` constant
(`ADMIN`, `SUPER_ADMIN`, `COMPLIANCE_OFFICER`), replacing the old
`ADMIN_ROLES`-only gate on `unfreeze`. Decision: not intentional
friction — matches the precedent already set by Compliance's own
staff-surface freeze/unfreeze proxy routes, which use the same role
set for both actions. A compliance officer who freezes an account
during an investigation no longer needs to escalate to an admin to
reverse their own action. `README.md`'s endpoint table updated to
match.

---

## Definition of "done" for this module

**MVP-complete as of 2026-08-19.** Account lifecycle mechanics were
already solid; both real gaps found in review — provisioning and the
role asymmetry — are now closed with a deliberate decision behind
each, verified by real-DB integration tests, not just asserted fixed.
