# Compliance / KYC — Implementation Tracker

Tracks the work needed to take this module from "verification works and
gates account activation" to "a complete compliance function for a
microfinance app" — before starting the next module. See `README.md` in
this folder for the architecture as it stands today.

**Baseline (already done, do not re-do):**
- Real BVN/NIN verification against Flutterwave (`infrastructure/services/flutterwave-identity-verification-provider.service.ts`), not a stub.
- Tier progression: TIER_1 → TIER_2 (BVN) → TIER_3 (BVN + NIN) (`domain/entities/kyc-profile.entity.ts`).
- Account activation gated on tier via `KycTierUpgradedEvent` (`modules/accounts/application/event-handlers/kyc-tier-upgraded.handler.ts`).
- Raw BVN/NIN never persisted — hashed + masked only.

Each phase below should be checked off only once merged and verified
working end-to-end (not just unit-tested). Sub-phases within a phase are
ordered — do them top to bottom; later ones in the same phase generally
depend on earlier ones.

---

## Status at a glance

**Where we started:** tiers existed only as an on/off switch for account
activation — verified enough → account works, with no control over how
much money could actually move once it did. That's the gap Phase 1 closes.

**Where we are now (Phase 1 — tier-based transaction limits):**

| Sub-phase | Status | Notes |
|---|---|---|
| 1a — source real limits | 🟡 Open, blocking | Interim defaults seeded and in use; still needs actual compliance/legal sign-off against a primary CBN circular. |
| 1b — build the config mechanism | ✅ Done | `KycTierLimit` DB table + repository, replacing hardcoded figures. |
| 1c — enforce at transfer time | ✅ Done | Per-transaction + rolling 24h daily cap, both transfer types. |
| 1d — enforce the balance ceiling | ✅ Done | Max-balance cap on credit operations (`CreditAccountHandler` + internal-transfer destination credit). |
| 1e — frontend `getStatus()` fix | ⬜ Not started | |
| 1f — verify end-to-end | 🟡 Partial | `tsc`, full unit suite, and a runtime DI-graph boot pass after every sub-phase so far; no dedicated integration/e2e tests yet, no manual click-through yet. |

**Where we're going next:** finish 1e (small, standalone) and 1f (real
test coverage + a manual pass), which closes out Phase 1 pending only 1a's
compliance sign-off. Then Phase 2 (rate limiting the verification
endpoints) and Phase 3 (persistent audit trail) — those two are the rest
of the bar for "responsible with real customer money." Phases 4–6
(sanctions screening, manual review, transaction monitoring) come after,
and can run alongside other modules once 1–3 are live.

---

## Phase 1 — Tier-based transaction limits
*The core gap: tiers currently only turn an account on/off — they don't yet control how much money can move.*

### 1a. Source the real limits — compliance-owned, blocks everything else in this phase
- [ ] Confirm daily transfer cap and max account balance per tier against the **current** CBN KYC Tiered Framework circular. Not an engineering guess — needs sign-off from whoever owns regulatory compliance here.
  - Interim defaults are now seeded (see 1b): Tier 1 ₦50,000/day, ₦300,000 max balance; Tier 2 ₦200,000/day, ₦500,000 max balance; Tier 3 ₦5,000,000/day, unlimited balance. Sourced from secondary reporting on a 2017 CBN mobile-money circular — **not** verified against a primary CBN document, and not confirmed as the framework that governs this product's actual account/license type. Treat as a foundation-build placeholder, not a compliance answer.

### 1b. Build the config mechanism
- [x] Limit config now lives in the DB (`KycTierLimit` table, `infrastructure/prisma/schema.prisma`), not env vars — so limits can change without a redeploy.
- [x] `kyc-tier-limits.policy.ts` is now the defaults/seed source (`getDefaultKycTierLimits()`), read by `PrismaKycTierLimitRepository` (`modules/compliance/infrastructure/persistence/prisma-kyc-tier-limit.repository.ts`) via the new `IKycTierLimitRepository` port. Falls back to the defaults in-memory if a tier has no DB row.
- [x] `infrastructure/prisma/seed.ts` created (was referenced by `scripts/seed.sh` but didn't exist) and run once — all three tiers seeded and verified against the live DB.

### 1c. Enforce at transfer time
- [x] Enforce the per-transaction limit in `modules/transfers` — `KycTransferLimitCheckerService` (`modules/transfers/infrastructure/services/kyc-transfer-limit-checker.service.ts`), called from both `InitiateInternalTransferHandler` and `InitiateExternalTransferHandler` before the debit.
- [x] Enforce the rolling 24h daily transfer limit — `ITransferRepository.sumSourceAmountSince()` sums SUCCESSFUL/PROCESSING transfers in the last 24h.
  - **Not fully atomic with the debit** — the sum-check and the debit are separate reads/writes, not inside one DB transaction. Two transfers submitted concurrently, each individually under the cap, could in principle combine to exceed it before either commits. Documented in the service's header comment. Acceptable for a foundation build with no real concurrent load; revisit before this matters in production (e.g. move the check inside `PrismaInternalTransferExecutor`'s existing `$transaction`, or serialize on the source account).
- [x] Reject over-limit transfers with a clear message via `TransferLimitExceededException` (422, code `TRANSFER_LIMIT_EXCEEDED`) — "Upgrade your verification to send more."

### 1d. Enforce the balance ceiling
- [x] Enforce a max-balance ceiling per tier on credit operations in `modules/accounts` — `MaxBalanceGuardService` (`modules/accounts/infrastructure/services/max-balance-guard.service.ts`), one shared implementation used by both real credit paths that exist today:
  - `CreditAccountHandler` (admin-triggered credit, e.g. future funding-webhook path) — checked before `account.credit()`.
  - `PrismaInternalTransferExecutor`'s destination-account credit — checked **inside** the existing `$transaction`, against the already-loaded destination account, so this one check (unlike 1c's daily-sum check) has no race-condition caveat: a throw here rolls the whole transfer back.
  - Deliberately **not** applied to the two reversal/compensation credit paths (`initiate-external-transfer.handler.ts`, `confirm-external-transfer.handler.ts`) — those return money the account already held moments earlier, not new inflow, so they can't push a balance past a cap it wasn't already under.
  - Rejects with `MaxBalanceExceededException` (422, code `MAX_BALANCE_EXCEEDED`) — "Upgrade your verification to hold more."
  - Not yet covered: there is no funding/deposit module in this codebase yet (frontend's `funding.js` has no live backend endpoint) — whenever that's built, it must credit through `CreditAccountHandler` or another path that also calls `MAX_BALANCE_GUARD`, or this ceiling will have a hole.

### 1e. Frontend fix (bundled here since you're already touching this status path)
- [ ] Fix `kyc.js`'s `getStatus()` — missing `.catch()` lets a failed fetch render a verified user as unverified (see `docs/AUDIT.md` §3).

### 1f. Verify end-to-end
- [ ] Unit test the limits policy (all three tiers, null/uncapped case).
- [ ] Integration test: transfer rejected over per-transaction cap; transfer rejected over rolling daily cap; concurrent-transfer race does not bypass the daily cap.
- [ ] Manual pass: register → verify BVN → hit the Tier 2 cap → confirm the upgrade-prompt message renders correctly on a real failed getStatus() call too.

## Phase 2 — Abuse & fraud protection on the verification endpoints
*Nothing currently stops rapid-fire BVN/NIN guessing, and every attempt is a billed Flutterwave call.*

### 2a. Rate limit the sensitive endpoints
- [ ] Rate limit `/kyc/verify-bvn` and `/kyc/verify-nin`.
- [ ] Rate limit `/auth/login` (same underlying gap — see `docs/AUDIT.md` §4.3).
- [ ] Decide and document actual thresholds + lockout/backoff behavior (not just "add a guard").

### 2b. Cleanup
- [ ] Remove the dead `BVN_VERIFICATION_API_KEY` / `NIN_VERIFICATION_API_KEY` vars — already absent from `.env.example`, still present in local `.env`; superseded by `FLUTTERWAVE_SECRET_KEY`.

## Phase 3 — Persistent, queryable audit trail
*Verification/tier-change events currently exist only as transient `EventBus` events — nothing durable to answer "prove this user was properly verified."*

### 3a. Design and persist
- [ ] Design an audit log schema: who, action, result, timestamp, linked KYC profile.
- [ ] Persist on every verification attempt (pass and fail, not just pass).
- [ ] Persist on every tier change.

### 3b. Expose it
- [ ] Add an internal query for a single user's full KYC history — this is the data source Phase 5's staff-facing screen will read from, so get the shape right here.

## Phase 4 — Sanctions / watchlist screening
*A legal AML/CFT requirement once real money is moving, not optional.*

### 4a. Source a watchlist
- [ ] Select/integrate a sanctions or PEP watchlist data source or provider.

### 4b. Screen and route
- [ ] Screen new customers during onboarding or first verification.
- [ ] Match → flag and route to manual review (Phase 5), never a hard silent reject.

## Phase 5 — Manual review surface for compliance staff
*Right now a user whose name doesn't exactly match the verification provider's response has no path forward.*

### 5a. Staff-facing lookup (depends on Phase 3's audit trail existing)
- [ ] Internal (staff-only) endpoint/screen to look up a user's KYC profile and history.

### 5b. Manual actions
- [ ] Manual approve/override for near-miss identity mismatches — the exact-match design in `FlutterwaveVerificationMapper.namesMatch()` already anticipates this fallback, see its header comment.
- [ ] Wire the existing `POST /accounts/:id/freeze` / `unfreeze` (already "compliance only" per `docs/API-CONTRACT.md`) into this same surface so staff have one place to act.

## Phase 6 — Transaction monitoring
*Ongoing, not onboarding — needs real transaction volume to tune against, so deliberately last.*

### 6a. Detect
- [ ] Flag suspicious patterns (rapid sub-threshold transfers, unusual velocity) for review.

### 6b. Respond
- [ ] Decide on a SAR-style (Suspicious Activity Report) workflow once flagging exists.

---

## Definition of "done" for this module

Phases 1–3 are the bar for handling real customer money responsibly.
Phases 4–6 can run in parallel with other modules once Phases 1–3 are live,
since they matter more at scale than at launch.
