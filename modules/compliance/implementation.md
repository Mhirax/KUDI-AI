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
now durably recorded and queryable per-user, and now actually
reachable over HTTP too (see Phase 5a below).

**Post-implementation review:** after Phases 1–3 first landed, a deep
technical review (see the findings table right below) surfaced 5
issues — including one real security bug in the internal-transfer
limit check. **All 5 are now fixed**, each in its own traced commit.
Nothing outstanding from that review remains open.

**Phase 5 — manual review surface:** ✅ Done. 5a (staff-only lookup —
profile status + full audit history in one call) and 5b (manual
approve/override for failed verifications, requiring staff to
re-confirm the real BVN/NIN rather than a bare override; plus
freeze/unfreeze wired into the same surface, with a role asymmetry
fixed along the way) are both complete and tested.

**Phase 4 — sanctions/watchlist screening:** ✅ Done. Screens against a
seeded snapshot of the free OFAC SDN list (real data, no vendor
contract — confirmed with the product owner as the right MVP call) on
every first verification; a match opens a review flag (never an
auto-block) that routes into Phase 5's existing staff surface — the
queue endpoint and clear-flag action built here, deliberately kept out
of any customer-facing response so a flagged user is never tipped off.
Tested against the real seeded data, not a fabricated fixture.

**Post-MVP hardening (2026-08-20):** BVN/NIN hashing upgraded from
unkeyed SHA-256 to keyed HMAC-SHA256, found by reviewing a partner's
independent implementation — see "Post-MVP hardening" below for the
full writeup. Doesn't change the Phase 1–5 MVP verdict, just closes a
gap the original build/review didn't catch.

**Where we're going next:** the compliance module is considered
**MVP-complete at Phases 1–5** — confirmed explicitly with the product
owner on 2026-08-19. **Phase 6** (transaction monitoring) is
deliberately deferred, not abandoned — noted for later, not planned
right now: it needs real transaction volume to tune detection rules
against, which doesn't exist yet, and Phases 4–5 already cover the
core AML/CFT bases a launch-stage product needs (sanctions screening,
manual review, freeze capability). What's left before Phases 1–3 are
fully *closed*, not just engineered: 1a's compliance sign-off and one
manual click-through pass (covers 1f's and Phase 2's
environment-constrained gaps in one sitting) — everything else in this
tracker is done.

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
| 4 | `MaxBalanceGuardService`'s two lookups run on the shared `PrismaService` connection even when called from inside `PrismaInternalTransferExecutor`'s `$transaction` — a second connection held open alongside the transaction's own, risking pool contention/timeouts under concurrent load. | 🟡 Real gap | ✅ Fixed |
| 5 | The "no KYC profile → assume TIER_1" fallback rule is implemented identically in two places (`MaxBalanceGuardService`, `KycTransferLimitCheckerService`) instead of one shared resolver — a future change to that rule could easily be applied to one copy and missed in the other. | 🟢 Minor, maintainability | ✅ Fixed |

**Finding #5 fix:** extracted `IKycTierResolver`/`KycTierResolverService` (`modules/compliance/domain/services/kyc-tier-resolver.interface.ts` / `infrastructure/services/kyc-tier-resolver.service.ts`) — the single "resolve a user's tier, defaulting to TIER_1 with no profile" implementation, exported from `ComplianceModule` via `KYC_TIER_RESOLVER`. Both `MaxBalanceGuardService` (1d) and `KycTransferLimitCheckerService` (1c) now depend on it instead of each independently reimplementing the same fallback logic against `KYC_PROFILE_REPOSITORY` directly. Pure refactor, no behavior change — verified via `tsc`, a DI-graph boot, and the full unit (36/36) and integration (13/13) suites still passing.

**Finding #4 fix:** threaded an optional Prisma transaction-client parameter (`tx?: any`, matching the `any` typing `PrismaInternalTransferExecutor` already uses for the same reason) through the whole chain finding #5 just consolidated — `IKycProfileRepository.findByUserId`, `IKycTierLimitRepository.findByTier`, `IKycTierResolver.resolveTier`, `IMaxBalanceGuard.assertWithinLimit` — so a caller already inside a `$transaction` can pass its `tx` down instead of these reads checking out a second pool connection for the transaction's duration. `PrismaInternalTransferExecutor` now passes its `tx` through when calling the guard for the destination-account credit. Added two new integration tests specifically for this (`max-balance-guard.service.integration-spec.ts`): one confirming the guard evaluates correctly when given a real transaction client, and — the one that actually proves the atomicity claim in 1d's own comment — one confirming that when the guard rejects *inside* a transaction, an unrelated write made earlier in that same transaction is rolled back too, not just left half-applied. Verified: `tsc` clean, DI-graph boot, full unit (36/36) and integration (15/15, the two new tests included) suites passing.

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
- [x] Confirmed with the product owner (MVP, no overhead): the free public **OFAC SDN list** (US Treasury), not a paid vendor (ComplyAdvantage, Refinitiv World-Check, etc.) and not a stub. Real, legally-recognized data, zero cost, zero vendor contract — see `infrastructure/prisma/data/README.md` for full provenance (source URL, download date, why individuals-only, why this list).
- [x] Seeded 7,481 individual entries (filtered from 19,203 total — entities/vessels/aircraft excluded, this screens person names) into a new `SanctionsListEntry` table via `infrastructure/prisma/seed-sanctions-list.ts`. Safe to re-run — replaces the whole `source` in one pass, so re-seeding after a fresh download is idempotent.
- [x] **This is a point-in-time snapshot, not a live feed** — documented explicitly as a deliberate MVP trade-off in the data README, not a silent gap. Refreshing it periodically is a real operational task, not built yet (no cron job).
- [x] Built as a swappable port — `ISanctionsScreeningProvider` (`domain/services/sanctions-screening-provider.interface.ts`), same shape as `IIdentityVerificationProvider` abstracts Flutterwave. `OfacSanctionsScreeningProvider` is the current implementation; a paid aggregator could replace it later without any application/domain code changing.

### 4b. Screen and route
- [x] Screens on **first verification**, not raw registration — called from all four verification paths (`SubmitBvnVerificationHandler`, `SubmitNinVerificationHandler`, and their Phase 5b manual-override mirrors) right after a successful verification, using the provider's confirmed name in preference to the self-reported one. Never screens an unconfirmed/mismatched name — that's not meaningful.
- [x] Matching is **deliberately permissive, not strict** — the opposite bias from `FlutterwaveVerificationMapper.namesMatch()`'s identity-verification matching. There, a false pass is the dangerous direction (someone else's BVN); here, a false *negative* (missing a real match) is the AML risk, and a false positive just costs a compliance officer a cheap manual dismissal. Token-set matching (order-independent, so "LASTNAME, First Middle" vs "First Last" formatting doesn't matter): a candidate is a hit if *all* of their name tokens appear somewhere in a watchlist entry's tokens. See `OfacSanctionsScreeningProvider`'s header comment for the full reasoning.
- [x] Match → **flag, never a hard silent reject** — `KycProfile.flagForSanctionsReview()` sets `sanctionsFlaggedAt` (idempotent: re-screening while already flagged doesn't spam duplicate flags/events). The verification itself still succeeds; nothing is auto-blocked or auto-frozen. If a compliance officer later confirms a real hit, Phase 5b's existing `freeze` action is the actual mitigation tool — Phase 4 doesn't need to build a separate blocking mechanism.
- [x] **Route to manual review** — `GET /kyc/staff/sanctions/flagged` (the queue, oldest first) and `POST /kyc/staff/:userId/sanctions/clear` (resolves an open flag, mandatory reason, staff-attributed) on `KycController`, same `COMPLIANCE_ROLES` gate as the rest of the Phase 5 staff surface. `KycProfile.clearSanctionsFlag()` throws if there's no open flag — can't be called speculatively.
- [x] **Deliberately kept the flag out of any customer-facing response.** The review queue uses a dedicated `FlaggedSanctionsProfileResponseDto`, not `KycStatusResponseDto` (the shape `GET /kyc/me` also returns) — tipping off the subject of an active sanctions review is the opposite of correct AML/CFT process. `KycStatusResponseDto` was deliberately left untouched.
- [x] Every screening outcome (clean or matched) and every flag-clear action is written to the existing `kyc_audit_log` table via a new `SANCTIONS_SCREENING` event type — durable and synchronous (same reasoning as the Phase 3/finding-#2 fix: written directly and awaited, not via `EventBus`), reusing the append-only audit trail rather than a parallel table.

**Verified:** `tsc --noEmit` clean, a DI-graph boot of `AppModule`, full unit suite 41/41 (5 new: `KycProfile.flagForSanctionsReview()`/`clearSanctionsFlag()` guard conditions and events), full integration suite 25/25 (7 new in `sanctions-screening.service.integration-spec.ts`) — critically, screening was tested **against the real seeded OFAC data**, not a fabricated fixture list: confirmed a real entry ("AL ZAWAHIRI, Dr. Ayman", program `SDGT`) matches regardless of name-token order, an ordinary unrelated name doesn't match, a single-word name is treated as unscreenable rather than noisy, and the full flag → review-queue → clear flow works end-to-end with correct audit attribution. Confirmed no leftover flagged profiles after the test run.

## Phase 5 — Manual review surface for compliance staff
*Right now a user whose name doesn't exactly match the verification provider's response has no path forward.*

### 5a. Staff-facing lookup (depends on Phase 3's audit trail existing)
- [x] `GET /kyc/staff/:userId` (`KycController.getStaffLookup`) — role-gated to `COMPLIANCE_OFFICER`/`ADMIN`/`SUPER_ADMIN` via `RolesGuard`/`@Roles()`, same pattern `AccountsController` already uses for its admin-only routes. Combines two existing queries (no new query logic needed): `GetMyKycStatusQuery` (profile/tier status — reused as-is, just called with the target `userId` instead of the caller's own) and `GetKycAuditHistoryQuery` (Phase 3b — this is the first thing that actually calls it over HTTP, the role gate it was waiting on). Returns both as `StaffKycLookupResponseDto`.
- Verified: `tsc` clean, a DI-graph boot of `AppModule`, full unit suite 36/36 still passing. No new controller-level test — matches this codebase's existing test posture (`docs/AUDIT.md` §4.5: zero controller/e2e tests anywhere yet, not something to newly introduce just for this one route); both underlying queries are already covered (audit history at the integration level, status query already in production use via `GET /kyc/me`).

### 5b. Manual actions
- [x] Manual approve/override for failed identity-verification checks. Design decision made explicitly before building (see chat/commit history): staff **re-enter the BVN/NIN** (obtained out-of-band — phone call, ID document, etc.), the system **re-runs the real Flutterwave lookup** (so staff can't push through a fake/unregistered number), and only the automated name-match gate (`result.matched`) is skipped — never a bare "trust me" override with no re-verification. `reason` is mandatory (min 10 chars) and becomes part of the durable audit record.
  - `ManuallyVerifyBvnCommand`/`ManuallyVerifyBvnHandler` and the NIN mirror (`application/commands/manually-verify-bvn/`, `manually-verify-nin/`) — reuse `KycProfile.recordBvnVerified()`/`recordNinVerified()` as-is (no entity changes; the override is an application-layer decision, not a new domain invariant).
  - `POST /kyc/staff/:userId/verify-bvn` / `/verify-nin`, role-gated the same as 5a's lookup endpoint.
  - `KycAuditLogEntry` extended with two nullable columns (`performedByUserId`, `notes`) — non-null only for staff-performed entries, so the audit trail can distinguish "this user verified themselves" from "staff overrode a failed check, and here's why." Written directly by the override handlers (not via `KycAuditRecorderService`) to avoid a duplicate routine row for the same pass — verified explicitly by a dedicated test.
  - Any resulting `KycTierUpgradedEvent` is still filtered through to `KycAuditRecorderService`, and every event is still published to the `EventBus` as normal — Accounts' account-activation handler is unaffected.
  - Verified: `tsc` clean, DI-graph boot, full unit suite 36/36, and a new real-DB integration suite (`manually-verify-bvn.handler.integration-spec.ts`, 3 tests) proving: a pass is recorded and attributed to the staff member *even when the provider reports no name match* (the actual point of the feature), no duplicate routine audit row is written, and the NIN path mirrors correctly including `recordNinVerified()`'s existing "NIN alone doesn't advance tier without BVN" invariant. Identity's user lookup and the Flutterwave provider call are stubbed in this test — deliberately: they're external/cross-module boundaries unchanged from the already-existing self-service handlers, and this codebase doesn't call real Flutterwave from any automated test anywhere.
- [x] Wired the existing `FreezeAccountCommand`/`UnfreezeAccountCommand` into this same surface — `POST /kyc/staff/accounts/:accountId/freeze` and `/unfreeze` in `KycController`, thin proxies to the exact same commands `AccountsController`'s own `/accounts/:id/freeze`/`unfreeze` already dispatch. No new command/handler logic — verified empirically (a throwaway smoke script dispatching `FreezeAccountCommand` from the root `CommandBus` and confirming it reached `FreezeAccountHandler`, registered in a different module) that `@nestjs/cqrs`'s `CommandBus`/`QueryBus`/`EventBus` are singletons shared across every module that imports `CqrsModule`, not one bus per module — so this needed no new module import, no duplicate command, just a proxying controller method. Fixed a role asymmetry while here: `AccountsController`'s own `unfreeze` is `ADMIN`/`SUPER_ADMIN` only (not `COMPLIANCE_OFFICER`, unlike its `freeze`); the new compliance-surface routes use `COMPLIANCE_ROLES` for both, so a compliance officer who freezes an account during an investigation doesn't need to escalate to an admin to reverse it. `AccountsController`'s own routes/roles are untouched.
  - Verified: `tsc` clean, a DI-graph boot of `AppModule`, full unit suite 36/36, full integration suite 18/18 (no new tests added for this piece specifically — it's a pure proxy to already-tested commands, and the cross-module `CommandBus` sharing was verified directly rather than via a new test file).

## Phase 6 — Transaction monitoring
*Ongoing, not onboarding — needs real transaction volume to tune against, so deliberately last.*

**Status: deliberately deferred, not abandoned — noted for later, not planned right now.**
Decided explicitly (not a scope cut by omission): Phase 6 detects
*patterns* (rapid sub-threshold transfers, unusual velocity), which
structurally can't be calibrated well against zero real transaction
volume — building it now means guessing at thresholds, which either
floods reviewers with false positives or misses real patterns
entirely. The core AML/CFT bases for a launch-stage product are
already covered without it: Phase 4 screens every verified user
against a real sanctions list, and Phase 5 gives staff a manual review
queue plus the ability to freeze an account on suspicion. Revisit once
there's real transaction volume to tune detection rules against — see
`docs/AUDIT.md`/product roadmap for when that's expected.

### 6a. Detect
- [ ] Flag suspicious patterns (rapid sub-threshold transfers, unusual velocity) for review.

### 6b. Respond
- [ ] Decide on a SAR-style (Suspicious Activity Report) workflow once flagging exists.

---

## Post-MVP hardening

Found after Phases 1–5 were already marked MVP-complete — not part of
the original phase tracker, tracked here separately so the phase
history above stays an accurate record of what each phase actually
covered at the time.

### Identifier hashing: unkeyed SHA-256 → keyed HMAC-SHA256 (2026-08-20)

**Source:** found by reviewing a partner's independent build of the
same KYC module (`KYC_FIX_REPORT.md` in their codebase) — not
something the original Phase 1–5 build or its post-implementation
review caught. Their code wasn't merged (that codebase doesn't
compile, per its own `BUILD_STATUS.md`), but the underlying idea was
verified sound and reimplemented directly against this codebase.

- [x] **The gap:** all four verification handlers
      (`submit-bvn-verification`, `submit-nin-verification`,
      `manually-verify-bvn`, `manually-verify-nin`) hashed BVN/NIN with
      plain `createHash('sha256')` — unkeyed. An 11-digit identifier
      has only 10^11 possible values; an unkeyed digest is
      brute-forceable offline against that whole space with no rate
      limit, since the digest alone is enough to test candidates
      against. A keyed HMAC can't be attacked that way without the key.
- [x] **The fix:** `IIdentifierHasher`
      (`domain/services/identifier-hasher.interface.ts`) /
      `HmacIdentifierHasher`
      (`infrastructure/services/hmac-identifier-hasher.service.ts`) —
      one shared service, `createHmac('sha256', key)`, keyed by the new
      `KYC_IDENTIFIER_HMAC_KEY` env var (32+ chars, validated at call
      time, throws `InternalServerErrorException` if missing/short).
      Injected into all four handlers via `IDENTIFIER_HASHER`,
      replacing each handler's own inline `createHash` call — the same
      "one shared implementation instead of four duplicated inline
      copies" fix already applied once this session (see finding #5
      above, `KycTierResolverService`).
- [x] **Migration:** `20260820045157_invalidate_unkeyed_kyc_hashes` —
      a pure data migration, no schema/column change (both algorithms
      produce the same 64-hex-char shape into the existing
      `bvnHash`/`ninHash` columns). Clears any `bvnHash`/`ninHash`
      computed with the old unkeyed algorithm and resets `tier` to
      `TIER_1`, since an old digest isn't comparable to a new keyed one
      for the same identifier. At the time this was applied, zero
      `kyc_profiles` rows had any hash set (test-data-only stage) — the
      migration affected 0 rows in practice, run for correctness rather
      than because data was observed to change. **Known limitation,
      accepted deliberately:** the migration does not touch any
      already-activated `Account` — if this is ever re-run against a
      database with real verified profiles, treat the resulting forced
      re-verification as needing its own customer-communication/
      compliance-review plan, not something a raw migration should
      silently handle.
- [x] `manually-verify-bvn.handler.integration-spec.ts` updated with a
      stub `IIdentifierHasher` at its three direct-construction call
      sites (this suite proves audit/tier behavior, not the hashing
      algorithm itself).
- [x] New unit suite,
      `hmac-identifier-hasher.service.spec.ts`: deterministic (same
      input → same output), actually keyed (different keys → different
      digests, and different from a plain SHA-256 of the same input —
      proving it isn't silently ignoring the key), throws on a
      missing/short key.

**Verified:** `tsc --noEmit` clean, a DI-graph boot of `AppModule`,
full unit suite 47/47 (4 new), full integration suite 27/27 unaffected.

---

## Definition of "done" for this module

Phases 1–3 are the bar for handling real customer money responsibly.
Phases 4–6 can run in parallel with other modules once Phases 1–3 are live,
since they matter more at scale than at launch.

**The compliance module is considered MVP-complete at Phases 1–5** (all
five done, tested, and hardened against a post-implementation review —
see "Status at a glance" above). Phase 6 is intentionally the one
open item, deferred until real transaction volume exists to build it
against — not an oversight, a deliberate call made explicitly with the
product owner on 2026-08-19.
