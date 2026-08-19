# Compliance / KYC Module

Identity verification against a CBN-style tiered KYC model, tier-based
transaction limits, rate limiting, a durable audit trail, sanctions
screening, and a staff review/override surface. Engineering-complete
for MVP at Phases 1–5 — see [`implementation.md`](implementation.md)
for the full build history, what was tested, and how.

**This file is the other half of that record — everything that isn't
code.** Sign-offs needed, manual QA still owed, product/ops decisions
that were deliberately left for a human, and anything else a
non-engineering reader needs to know before this module is actually
*done*, not just *built*. If you're looking for architecture, file
layout, or verification detail, that's all in `implementation.md`.

---

## Before this handles real customer money

Everything below is a real, open item — not hedging, not boilerplate.
Each one was surfaced and deliberately left open during the build
rather than guessed at or silently skipped.

### 1. The CBN transaction-limit figures need compliance/legal sign-off

**Status: not signed off.**

The ₦ figures currently enforced (Tier 1: ₦50,000/day, ₦300,000
balance; Tier 2: ₦200,000/day, ₦500,000 balance; Tier 3:
₦5,000,000/day, unlimited balance) come from secondary reporting on a
2017 CBN mobile-money circular — cross-referenced across multiple
sources, but never confirmed against a primary CBN document, and never
confirmed as the specific framework that governs *this* product's
account/license type.

**What's needed:** whoever owns regulatory compliance for this
business needs to either confirm these figures against the current CBN
KYC Tiered Framework circular, or provide the correct ones. The
mechanism to change them requires no engineering work — they live in a
database table (`KycTierLimit`), editable without a redeploy.

### 2. A real end-to-end manual test pass is still owed

**Status: not done — no environment to do it in yet.**

Every test written for this module (66 automated tests) exercises real
business logic against a real database — genuinely strong coverage.
None of it exercises the actual product: a real browser, a real
Flutterwave sandbox call, a real person hitting a real limit and
seeing the real error on screen.

**What's needed:** once there's a Flutterwave sandbox key and a way to
run the frontend, someone should: register a test user → verify a real
BVN → attempt a transfer that exceeds the Tier 1 limit → confirm the
rejection message renders correctly in the app, not just in a test
assertion.

### 3. There is no staff/compliance interface — the endpoints are API-only

**Status: not built — a product decision, not an oversight.**

Phase 5 built everything a compliance officer needs to do their job:
look up a user's KYC status and full history, manually clear a failed
verification, review and clear sanctions flags, freeze/unfreeze
accounts. All of it is real, working, and role-gated — but it's only
reachable by calling the API directly (Postman, curl, etc.). There is
no screen for it, and no admin app exists anywhere in this codebase.

**What's needed:** a decision on how compliance staff will actually use
this day to day — a real admin dashboard, an interim tool (e.g.
Retool, wired to these existing endpoints), or something else. This is
a product/resourcing call, not something to build reflexively.

### 4. The sanctions watchlist is a snapshot, not a live feed

**Status: real data, but frozen at download time.**

Screening runs against 7,481 real individual entries from the public
OFAC SDN list, downloaded 2026-08-19 (full provenance in
`infrastructure/prisma/data/README.md`). OFAC updates this list
continuously — new designations, delistings. This snapshot does not
auto-refresh.

**What's needed:** someone needs to own re-downloading and re-seeding
this list on a real cadence (weekly? monthly?) before this is a
reliable ongoing control, not just a one-time check at launch. The
mechanism (`infrastructure/prisma/seed-sanctions-list.ts`) already
supports safe re-runs — it's a process/ownership gap, not a technical
one.

### 5. Internal (Kudi-to-Kudi) transfers have no UI

**Status: pre-existing gap, not introduced by this work.**

The balance-ceiling enforcement built in Phase 1d is real, tested, and
correctly wired — but it only applies to money arriving via an
internal transfer, and there's no screen in the app to actually send
one (no destination-account picker exists). Until that UI is built,
this piece of the compliance module is enforced but effectively
dormant in the real product.

**What's needed:** a product decision on whether/when Kudi-to-Kudi
transfers are in scope for this app.

### 6. Rate-limit error messages need copywriting

**Status: functional, not customer-ready wording.**

When someone is rate-limited (too many login attempts, too many
verification attempts), the message shown is the library's raw default
— `"ThrottlerException: Too Many Requests"` — not a written, on-brand
message. The protection itself works correctly; only the wording seen
by a real user needs attention.

**What's needed:** a short copywriting pass, whenever there's a UX
review before public launch. Not urgent — it only surfaces during
abuse-pattern lockouts, not normal use.

### 7. `TRUST_PROXY_HOPS` must be set correctly once the API gateway goes live

**Status: correct today, a landmine for later if forgotten.**

Rate limiting currently identifies abusers by IP address, which is
correct as long as this app is reachable directly. This repo also
defines `gateway/api-gateway` as the eventual single entry point for
all traffic — it exists but doesn't route anything yet. The moment it
does, every request will appear to come from the gateway's own IP
unless `TRUST_PROXY_HOPS` (an environment variable, documented in
`.env.example`) is set to the correct hop count. Left unset in that
scenario, rate limits would apply platform-wide instead of per-abuser
— a real availability risk, not just an inconvenience.

**What's needed:** whoever wires up the gateway for real needs to know
this exists and set it correctly at that time. Nothing to do until then.

### 8. Nothing here has been merged to `main`

**Status: all of Phases 1–5 live on `dev` only.**

Every commit for this module — 18 of them, each independently tested —
is on the `dev` branch. Merging to `main` is a deliberate release
decision for whoever owns that, not something done as part of
building this.

---

## Deliberately deferred, not forgotten

**Phase 6 (transaction monitoring)** — pattern-based fraud detection
(rapid sub-threshold transfers, unusual velocity) needs real
transaction volume to calibrate against, which doesn't exist yet.
Confirmed explicitly as out of scope for this MVP; Phases 4–5 already
cover the launch-stage AML/CFT bases (sanctions screening, manual
review, freeze capability). Revisit once there's real usage data — see
`implementation.md`'s Phase 6 section.

---

## Engineering summary (see `implementation.md` for the full detail)

```
compliance/
├── domain/          # KycProfile aggregate, value objects, events, exceptions, ports
├── application/      # CQRS commands/queries, event handlers, application services, DTOs
├── infrastructure/     # Prisma repositories, Flutterwave + OFAC providers
└── presentation/         # KycController
```

**Customer-facing endpoints:**

| Method | Path | Access |
|---|---|---|
| GET | `/kyc/me` | Own profile only |
| POST | `/kyc/verify-bvn` | Own profile only, rate-limited |
| POST | `/kyc/verify-nin` | Own profile only, rate-limited |

**Staff-facing endpoints** (all `COMPLIANCE_OFFICER`/`ADMIN`/`SUPER_ADMIN` only):

| Method | Path | Purpose |
|---|---|---|
| GET | `/kyc/staff/:userId` | Full profile + audit history lookup |
| POST | `/kyc/staff/:userId/verify-bvn` | Manual override for a failed BVN check |
| POST | `/kyc/staff/:userId/verify-nin` | Manual override for a failed NIN check |
| GET | `/kyc/staff/sanctions/flagged` | Sanctions review queue |
| POST | `/kyc/staff/:userId/sanctions/clear` | Resolve an open sanctions flag |
| POST | `/kyc/staff/accounts/:accountId/freeze` | Freeze an account |
| POST | `/kyc/staff/accounts/:accountId/unfreeze` | Unfreeze an account |

**Key design decisions** (why, not just what — full reasoning in `implementation.md`):

- Raw BVN/NIN are never persisted — only a SHA-256 hash and a masked
  display form ever reach the database.
- Identity-verification name matching is conservative (exact,
  case-insensitive) — a false pass is the dangerous direction there.
  Sanctions screening is the opposite bias (permissive, token-based) —
  a missed match is the dangerous direction there instead.
- The audit trail is written synchronously and awaited, not via
  fire-and-forget events — a write failure fails the request rather
  than silently losing the compliance record.
- A sanctions flag never appears in any customer-facing response —
  only staff-facing ones — so a flagged user is never tipped off.

**Persistence:** run `npm run prisma:migrate` after pulling schema
changes. Seed scripts: `infrastructure/prisma/seed.ts` (tier limits),
`infrastructure/prisma/seed-sanctions-list.ts` (OFAC data).
