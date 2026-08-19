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
| 1e — frontend `getStatus()` fix | ✅ Done | Turned out already covered by the `features/kyc/` build — verified, not re-done. |
| 1f — verify end-to-end | 🟡 Mostly done | Unit + real-DB integration tests written and passing (13 new tests total); concurrent-race test deliberately not written (see below); manual browser/Flutterwave-sandbox click-through still outstanding. |

**Phase 2 — abuse & fraud protection:** ✅ Done (2a rate limiting, 2b
cleanup) — see below for what's covered and the one gap (no live HTTP
smoke test, same environment constraint as 1f).

**Phase 3 — persistent, queryable audit trail:** ✅ Done (3a persist,
3b expose internally) — every verification attempt and tier change is
now durably recorded and queryable per-user; not yet reachable over
HTTP by design, pending Phase 5's access control.

**Where we're going next:** Phases 1–3 — the full bar for "responsible
with real customer money" — are now functionally complete and tested.
What's left before *all three* are fully closed, not just engineered:
1a's compliance sign-off on the real limit figures, and one manual
click-through pass (covers 1f's gap and Phase 2's live-smoke-test gap
in one sitting, whenever Flutterwave sandbox credentials are
available). From here: **Phase 4** (sanctions/watchlist screening) and
**Phase 5** (manual review surface — which also finally exposes 3b's
query over HTTP) can run in parallel with other modules, per this
tracker's original "Definition of done" below.

---

## Post-implementation review findings

A deep technical review of Phases 1–3 (code-review skill, high effort,
`dev` vs `main`) after all three phases first landed surfaced 5 issues.
Each gets its own commit as it's fixed, so the history traces cleanly.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Internal transfer: KYC limit check ran on `sourceAccountId` before ownership was verified — an attacker could use a victim's real account id as source and read a signal about the victim's transfer volume from the exception type returned, before being told "unauthorized". | 🔴 Real security bug, introduced by 1c | ✅ Fixed — see 1c note below |
| 2 | Audit trail (Phase 3) was written via `EventBus.publish()`, which is fire-and-forget in `@nestjs/cqrs` — a DB failure during the write would be silently logged and dropped, never surfaced to the caller, while the verification request still returned success. Undermined "durable" audit trail. | 🟡 Real gap | ✅ Fixed — see 3a note below |
| 3 | Rate limiting (Phase 2) is IP-keyed with no `trust proxy` configuration. If `gateway/api-gateway` ever actually routes traffic (it doesn't yet — no routes wired), every request would appear to share the gateway's IP, and the login/verification limits would apply platform-wide instead of per-abuser. | 🟡 Real gap, not yet live | ✅ Fixed — see 2a note below |
| 4 | `MaxBalanceGuardService`'s two lookups run on the shared `PrismaService` connection even when called from inside `PrismaInternalTransferExecutor`'s `$transaction` — a second connection held open alongside the transaction's own, risking pool contention/timeouts under concurrent load. | 🟡 Real gap | ⬜ Planned |
| 5 | The "no KYC profile → assume TIER_1" fallback rule is implemented identically in two places (`MaxBalanceGuardService`, `KycTransferLimitCheckerService`) instead of one shared resolver — a future change to that rule could easily be applied to one copy and missed in the other. | 🟢 Minor, maintainability | ✅ Fixed |

**Finding #5 fix:** extracted `IKycTierResolver`/`KycTierResolverService` (`modules/compliance/domain/services/kyc-tier-resolver.interface.ts` / `infrastructure/services/kyc-tier-resolver.service.ts`) — the single "resolve a user's tier, defaulting to TIER_1 with no profile" implementation, exported from `ComplianceModule` via `KYC_TIER_RESOLVER`. Both `MaxBalanceGuardService` (1d) and `KycTransferLimitCheckerService` (1c) now depend on it instead of each independently reimplementing the same fallback logic against `KYC_PROFILE_REPOSITORY` directly. Pure refactor, no behavior change — verified via `tsc`, a DI-graph boot, and the full unit (36/36) and integration (13/13) suites still passing.

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
- **Post-review fix (finding #1 above):** `InitiateInternalTransferHandler` now checks `sourceAccount.userId !== command.initiatorUserId` (throwing `UnauthorizedTransferException`) *before* calling the KYC limit checker, not after. Previously the limit check ran first, against an account the caller might not own, letting the exception type returned (limit-exceeded vs. eventually-unauthorized) leak a signal about the real owner's transfer volume. The executor's own ownership check (inside its transaction, against a freshly-loaded record) is unchanged and still runs — this is the earlier, cheaper check, not a replacement.

### 1d. Enforce the balance ceiling
- [x] Enforce a max-balance ceiling per tier on credit operations in `modules/accounts` — `MaxBalanceGuardService` (`modules/accounts/infrastructure/services/max-balance-guard.service.ts`), one shared implementation used by both real credit paths that exist today:
  - `CreditAccountHandler` (admin-triggered credit, e.g. future funding-webhook path) — checked before `account.credit()`.
  - `PrismaInternalTransferExecutor`'s destination-account credit — checked **inside** the existing `$transaction`, against the already-loaded destination account, so this one check (unlike 1c's daily-sum check) has no race-condition caveat: a throw here rolls the whole transfer back.
  - Deliberately **not** applied to the two reversal/compensation credit paths (`initiate-external-transfer.handler.ts`, `confirm-external-transfer.handler.ts`) — those return money the account already held moments earlier, not new inflow, so they can't push a balance past a cap it wasn't already under.
  - Rejects with `MaxBalanceExceededException` (422, code `MAX_BALANCE_EXCEEDED`) — "Upgrade your verification to hold more."
  - Not yet covered: there is no funding/deposit module in this codebase yet (frontend's `funding.js` has no live backend endpoint) — whenever that's built, it must credit through `CreditAccountHandler` or another path that also calls `MAX_BALANCE_GUARD`, or this ceiling will have a hole.

### 1e. Frontend fix (bundled here since you're already touching this status path)
- [x] Already fixed, no new code needed — turned out to already be covered by the `features/kyc/` build (commit `a289060`), just not connected to this tracker item until now. Both call sites of `kycApi.getStatus()` handle a failed fetch safely: `Kyc.jsx` has an explicit `.catch()` → `loadError` state with a real error message (not a false "unverified" screen), and `Profile.jsx` calls it via `Promise.allSettled` with the KYC badge conditionally rendered (`{kyc && (...)}`) — on failure it's omitted, not wrong.

### 1f. Verify end-to-end
- [x] Unit test the limits policy — `kyc-tier-limits.policy.spec.ts`, all three tiers plus the Tier 3 null/uncapped-balance case (5 tests).
- [x] Integration test, against the real Postgres DB (not mocks) — `tests/integration/jest.config.ts` created (didn't exist before; `tests/integration/` was pure scaffolding until now), run via `npm run test:integration`:
  - `kyc-transfer-limit-checker.service.integration-spec.ts` (4 tests): per-transaction rejection, daily-cap rejection, an allowed transfer, and the missing-profile → TIER_1 fallback.
  - `max-balance-guard.service.integration-spec.ts` (4 tests): max-balance rejection, an allowed credit, Tier 3 uncapped, and the missing-profile → TIER_1 fallback.
  - Both suites create their own fixture rows and clean up after themselves — verified no leftover rows after a run.
- [x] ~~Concurrent-transfer race does not bypass the daily cap~~ — **not tested, by decision.** 1c already documented that this race is real and was deliberately left open (not atomic with the debit); a test asserting it's prevented would fail against the current, accepted implementation. Reworded here rather than writing a test that either fails or misrepresents what's actually guaranteed. If this gets closed later (see 1c's note on moving the check inside the debit transaction), add the test then.
- [ ] **Manual pass — not done.** Requires either a real Flutterwave sandbox key (to actually verify a BVN and progress a tier) or a browser session against the running frontend, neither available in this environment. What *is* covered: the integration tests above exercise the real business logic (tier lookup, limit comparison, rejection) against the real database, end-to-end at the service layer. What's *not* covered: the actual HTTP request/response round-trip, the frontend's rendering of a `TRANSFER_LIMIT_EXCEEDED`/`MAX_BALANCE_EXCEEDED` error, and a real BVN-verification-driven tier upgrade. Recommend a real click-through pass before this goes live, whenever sandbox credentials are available.

## Phase 2 — Abuse & fraud protection on the verification endpoints
*Nothing currently stops rapid-fire BVN/NIN guessing, and every attempt is a billed Flutterwave call.*

### 2a. Rate limit the sensitive endpoints
- [x] Installed `@nestjs/throttler` (v6.5.0) — wasn't a dependency before. Registered globally in all three apps' `AppModule` (`ThrottlerModule.forRoot()` + `ThrottlerGuard` via `APP_GUARD`, ahead of `JwtAuthGuard` so abusive requests are rejected before auth work happens).
- [x] Rate limit `/kyc/verify-bvn` and `/kyc/verify-nin` — `@Throttle(KYC_VERIFICATION_THROTTLE)` on both.
- [x] Rate limit `/auth/login` — `@Throttle(LOGIN_THROTTLE)` (same underlying gap flagged in `docs/AUDIT.md` §4.3, now closed).
- [x] Decided and documented actual thresholds, in `infrastructure/config/throttler.config.ts`:
  - Global baseline (everything else): 100 requests/minute per IP by default, now actually reading the `RATE_LIMIT_TTL`/`RATE_LIMIT_MAX` env vars that `.env.example` had scaffolded for this before this phase (they were dead until now).
  - `/auth/login`: 5 attempts/minute per IP, then a 5-minute lockout (`blockDuration`). Worth knowing: account-level lockout-on-repeated-failure is currently *disabled* in code (`User.recordFailedLogin()`'s header comment) — so until that's revisited, this IP-based throttle is the only defense `/auth/login` has against brute-forcing.
  - `/kyc/verify-bvn` / `/kyc/verify-nin`: 3 attempts/10 minutes per IP, then a 30-minute lockout — tighter, since each attempt is a billed Flutterwave call and a guess against an 11-digit identity number.
  - Tracked by IP via in-memory storage (the library default) — correct for today's single-instance setup; would need Redis-backed storage (`infrastructure/redis`, currently unused) if these apps ever run multiple instances behind a load balancer. Documented in the config file itself.
  - Not done: a live HTTP-level smoke test (start the server, actually hit `/auth/login` 6 times, confirm the 6th is rejected) — the same environment constraint as 1f's manual pass (no way to keep a background dev server alive reliably here). Verified instead via `tsc`, a full DI-graph boot of all three apps (confirms the guard wires and instantiates without error), and that `@nestjs/throttler` is a mature, widely-used library — the residual risk is lower than for custom-written logic, but a real click-through/curl pass is still recommended before this is trusted in production.
- **Post-review fix (finding #3 above):** IP-based rate limiting had no `trust proxy` configuration, so if `gateway/api-gateway` ever starts actually routing traffic (it doesn't yet), every request would arrive from the gateway's IP and the per-abuser limits would become platform-wide lockouts instead. Fixed in all three apps' `bootstrapSecurity()`: a new `TRUST_PROXY_HOPS` env var (default `0`/unset — today's correct behavior, verified: `trust proxy` stays `false` by default) controls how many upstream proxy hops Express trusts for the client IP. Deliberately **not** defaulted to "trust everything" — that would let any caller spoof their IP via `X-Forwarded-For` and dodge rate limiting entirely, a worse problem than the one being fixed. Whoever wires up `gateway/api-gateway` for real needs to set this to the actual hop count (usually `1`) at that time. Verified the setting actually takes effect at runtime (`instance.get('trust proxy')` reflects the env var) in addition to `tsc` and a DI-graph boot of all three apps.

### 2b. Cleanup
- [x] Removed the dead `BVN_VERIFICATION_API_KEY` / `NIN_VERIFICATION_API_KEY` lines from the local `.env` (already absent from `.env.example`; not git-tracked either way, so nothing to commit here). Left `BILLER_API_KEY` alone — same "unused placeholder" shape, but out of this phase's explicit scope; worth the same cleanup whenever billing is actually touched.

## Phase 3 — Persistent, queryable audit trail
*Verification/tier-change events currently exist only as transient `EventBus` events — nothing durable to answer "prove this user was properly verified."*

### 3a. Design and persist
- [x] Designed the audit log schema — `KycAuditLogEntry` (`infrastructure/prisma/schema.prisma`, table `kyc_audit_log`): who (`userId`, `kycProfileId`), what (`eventType`: `VERIFICATION_ATTEMPT` | `TIER_CHANGE`), result (`outcome`/`failureReason` for attempts, `previousTier`/`newTier` for tier changes), timestamp (`createdAt`). Append-only — no `version`, no update path, rows are never mutated.
- [x] Persists on every verification attempt, pass and fail, and on every tier change — via `KycAuditRecorderService` (`application/services/kyc-audit-recorder.service.ts`), called directly and awaited from `SubmitBvnVerificationHandler`/`SubmitNinVerificationHandler` right after `profile.pullDomainEvents()`, on both the pass and fail paths.
- **Post-review fix (finding #2 above):** originally built as two `@EventsHandler`s (`RecordVerificationAuditHandler`/`RecordTierChangeAuditHandler`) subscribed to the command handlers' published events — since removed. `@nestjs/cqrs`'s `EventBus.publish()` is fire-and-forget: it never awaits a handler, and swallows/logs a thrown error without surfacing it to the publisher or the HTTP caller. That meant a DB hiccup during the audit write could silently and permanently lose the row while the verification request still returned success — directly contradicting "durable." `KycAuditRecorderService` is now called synchronously instead, so a write failure fails the whole request rather than being lost. `KycTierUpgradedEvent` is still also published to the `EventBus` afterward, unchanged — Accounts' account-activation handler depends on that, and eventual consistency there is a separate, accepted trade-off unrelated to audit durability. `previousTier` for `TIER_CHANGE` rows is still derived from `KycTierUpgradedEvent.newTier` (that event's shape wasn't touched, since Accounts also depends on it) — safe only because progression is strictly linear today; documented in the service.

### 3b. Expose it
- [x] `GetKycAuditHistoryQuery`/`GetKycAuditHistoryHandler` (`application/queries/get-kyc-audit-history/`) — returns one user's full history, oldest first. **Not yet exposed over HTTP** — deliberately deferred to Phase 5, which builds the staff-only role-gating this query needs before it's reachable by anyone; wiring it to a route without that gate first would be a real access-control gap, not a shortcut worth taking. The query itself takes a bare `userId` with no caller-identity check of its own — noted in its own header comment as a "must only be reached through an already-authorized surface" constraint.

**Verified:** `tsc --noEmit` clean, full unit suite 36/36 passing, a DI-graph boot of `AppModule` confirming the reworked wiring resolves, and a real-DB integration suite (`kyc-audit-recorder.service.integration-spec.ts`, 5 tests) proving: a pass is recorded correctly, a failure is recorded with its reason, a two-step tier change (TIER_1→2→3) derives `previousTier` correctly at each step, a batch of events (mirroring real command-handler usage) records in order, and an unknown user returns an empty history. Confirmed no leftover rows after the run.

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
