# Identity & Auth — Implementation Tracker

Tracks known gaps against "MVP-complete" for this module. See `README.md`
in this folder for the architecture as it stands today. Unlike
Compliance's tracker, this module wasn't built phase-by-phase in this
session — it was already in place. This file exists because a
cross-module MVP-completeness review (2026-08-19) found real,
undocumented gaps that got a deliberate decision and a fix the same day.

**Baseline (already done, working):**
- Registration, login, JWT access + rotating opaque refresh tokens
  (theft/reuse detection via token-family revocation).
- bcrypt password hashing (cost factor 12), timing-safe login (dummy
  compare when the email doesn't exist).
- RBAC via `@Roles()`/`RolesGuard`.
- `GET /users/:userId` correctly gated by `SelfOrAdminGuard` — a plain
  customer cannot browse other users' records. Verified during the
  2026-08-19 review, no gap found here.

---

## Status at a glance

Two real, security-relevant gaps were found during the 2026-08-19
review. Both were discussed, decided, and fixed the same day.

| # | Gap | Severity | Status |
|---|---|---|---|
| 1 | Password policy relaxed to a flat 8-character minimum, no complexity rules. | 🟡 Undocumented trade-off | ✅ Fixed — raised to 10 chars |
| 2 | Account lockout on repeated failed logins was disabled in code. | 🟡 Undocumented trade-off | ✅ Fixed — re-enabled |

**Identity is now MVP-complete.** Both gaps below were closed
2026-08-19 with an explicit decision behind each, not just a revert.

---

## Resolved

### 1. Password policy — raised to 10 characters, still no complexity requirement
`domain/value-objects/password.vo.ts`'s `PlainPassword.create()`
enforced only `rawPassword.length >= 8`. Decision: raise the minimum
to 10, deliberately still without a complexity requirement (no forced
upper/lower/number/special mix).

- [x] Decided against restoring full complexity rules — that was the
      pre-relaxation policy, but forcing complexity pushes users toward
      predictable substitutions (`Passw0rd!`) and current NIST 800-63B
      guidance argues length matters more than composition rules for
      real-world resistance to brute-force/guessing.
- [x] `MIN_LENGTH` in `password.vo.ts` raised `8` → `10`. Error message
      (`` `Password must be at least ${MIN_LENGTH} characters` ``)
      updates automatically.
- [x] Frontend brought back in sync — `Signup.jsx` had its own
      hardcoded `PASSWORD_RULE = /^.{8,}$/` and matching copy ("Min 8
      characters" in three places); all updated to 10 so client-side
      validation doesn't silently disagree with the backend. `api/auth.js`'s
      stale doc comment (still said "12–128 chars" from the
      pre-relaxation policy, never updated when it was relaxed to 8)
      corrected to match reality.
- [x] No dedicated `password.vo.spec.ts` existed to update — the value
      object's only coverage was indirect via `user.entity.spec.ts`,
      unaffected by the length constant.

### 2. Account lockout — re-enabled
`domain/entities/user.entity.ts` — `recordFailedLogin()` counted
failed attempts but never flipped the account to `LOCKED`; the check
was commented out. Decision: re-enable it — the code already existed,
this was restoring one `if` block, not adding new complexity, and it
closes a real gap IP-based rate limiting can't cover (a distributed
attempt against one specific account from many IPs).

- [x] `recordFailedLogin()` now sets `status = LOCKED` and
      `lockedUntil = now + 15 minutes` once `failedLoginAttempts`
      reaches `MAX_FAILED_LOGIN_ATTEMPTS` (5), emitting the
      already-existing `UserAccountLockedEvent` — that event type was
      defined but never dispatched before this fix.
- [x] `assertCanAttemptLogin()` reworked: a `LOCKED` account with
      `lockedUntil` still in the future throws the already-existing
      `AccountLockedException` (423 Locked, was defined but never
      thrown before this fix). A `LOCKED` account whose window has
      *passed* auto-unlocks right there — status reset to `ACTIVE`,
      counter and `lockedUntil` cleared — so the very next login
      attempt gets a clean slate rather than needing a separate
      scheduled unlock job.
- [x] `user.entity.spec.ts` rewritten: the old test asserted the
      account *never* locks no matter how many failures (documenting
      the disabled state) — replaced with tests for actual lockout at
      5 failures, no lockout before the 5th, counter reset on success,
      and auto-unlock past the lockout window (via `User.reconstitute()`
      with a `lockedUntil` set in the past, no real clock wait needed).
- [x] `README.md`'s existing lockout description ("5 consecutive failed
      logins locks the account for 15 minutes") was already accurate to
      the *intended* design — it had just gone stale relative to the
      disabled code. Now true again; added a line noting the
      auto-unlock behavior.
- [x] IP-based rate limiting (Compliance's `LOGIN_THROTTLE`: 5/min,
      5-minute block) is unchanged and still runs *in front of* this —
      the two are complementary, not redundant: IP throttling stops
      rapid-fire guessing from one source, account lockout stops a
      slower distributed attempt against one target account.

**Verified:** `tsc --noEmit` clean, full unit suite 43/43 passing
(identity's own suite 8/8, including the 4 lockout-specific tests).

---

## Definition of "done" for this module

**MVP-complete as of 2026-08-19.** Registration, login, token
rotation, RBAC, password policy, and account lockout all work
end-to-end with deliberate decisions behind each trade-off, not gaps
left open by omission.
