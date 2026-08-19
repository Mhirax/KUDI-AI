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

## Phase 1 — Tier-based transaction limits
*The core gap: tiers currently only turn an account on/off — they don't yet control how much money can move.*

### 1a. Source the real limits — compliance-owned, blocks everything else in this phase
- [ ] Confirm daily transfer cap and max account balance per tier against the **current** CBN KYC Tiered Framework circular. Not an engineering guess — needs sign-off from whoever owns regulatory compliance here.
  - Interim defaults are now seeded (see 1b): Tier 1 ₦50,000/day, ₦300,000 max balance; Tier 2 ₦200,000/day, ₦500,000 max balance; Tier 3 ₦5,000,000/day, unlimited balance. Sourced from secondary reporting on a 2017 CBN mobile-money circular — **not** verified against a primary CBN document, and not confirmed as the framework that governs this product's actual account/license type. Treat as a foundation-build placeholder, not a compliance answer.

### 1b. Build the config mechanism
- [x] Limit config now lives in the DB (`KycTierLimit` table, `infrastructure/prisma/schema.prisma`), not env vars — so limits can change without a redeploy.
- [x] `kyc-tier-limits.policy.ts` is now the defaults/seed source (`getDefaultKycTierLimits()`), read by `PrismaKycTierLimitRepository` (`modules/compliance/infrastructure/persistence/prisma-kyc-tier-limit.repository.ts`) via the new `IKycTierLimitRepository` port. Falls back to the defaults in-memory if a tier has no DB row.
- [x] `infrastructure/prisma/seed.ts` created (was referenced by `scripts/seed.sh` but didn't exist) and run once — all three tiers seeded and verified against the live DB.
- Not yet done: nothing calls `KYC_TIER_LIMIT_REPOSITORY` yet — that's 1c/1d.

### 1c. Enforce at transfer time
- [ ] Enforce the per-transaction limit in `modules/transfers`.
- [ ] Enforce the rolling 24h daily transfer limit. Must be checked atomically with the debit (same transaction) — two concurrent transfers each individually under the cap can otherwise combine to blow past it.
- [ ] Reject over-limit transfers with a clear message ("upgrade your verification to send more"), not a silent failure.

### 1d. Enforce the balance ceiling
- [ ] Enforce a max-balance ceiling per tier on credit operations in `modules/accounts`.

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
