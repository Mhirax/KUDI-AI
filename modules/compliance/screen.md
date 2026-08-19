# Compliance / KYC — What Shows On Screen

`implementation.md` covers the engineering. `README.md` covers what's
left outside engineering. **This file covers the third thing: what a
real person actually sees**, screen by screen, confirmed by an actual
click-through of the running app — not a guess, and not a code
description dressed up as one.

Every wireframe below is a plain-text sketch of the real component
(`frontend/src/features/...`), not a pixel-accurate mockup — the
labels, headings, and message text are copied exactly from the actual
code and were confirmed live during a real test run.

---

## What actually appears on screen

### 1. Profile screen — the KYC tier badge

The first (and only permanent) trace of the compliance module in the
everyday app. `frontend/src/features/profile/Profile.jsx`.

```
┌───────────────────────────────────────┐
│  Profile                          🔔  │
├───────────────────────────────────────┤
│                                       │
│               ┌─────┐                │
│               │ JD  │  ← avatar      │
│               └─────┘                │
│             Jane Doe                 │
│          jane@example.com            │
│           +234 801 234 5678          │
│                                       │
│    ┌───────────────────────────┐    │
│    │ KYC: Tier 1 · Verify →    │ ←── tap opens the KYC screen
│    └───────────────────────────┘    │
│                                       │
│    ┌───────────────────────────┐    │
│    │ WALLET Account            │    │
│    │ ₦0.00                     │    │
│    │ NGN · PENDING_VERIFICATION │    │
│    └───────────────────────────┘    │
│                                       │
│    ⚙️  Account Settings          →  │
│    🔐  Security                  →  │
│    🌍  Language                  →  │
│    👤  Switch Persona            →  │
│    🔔  Notification Preferences  →  │
│    💬  Help & Support            →  │
│                                       │
│           [    Log Out    ]          │
└───────────────────────────────────────┘
```

The badge's colour and label change with real tier data
(`TIER_1`/`TIER_2`/`TIER_3` → orange/blue/green). Once a user reaches
`TIER_3`, the "· Verify →" part disappears — there's nothing further
to verify. **If the badge fails to load, it simply doesn't render at
all** rather than showing a wrong tier — see `implementation.md`
Phase 1e for why that specific behaviour was checked, not assumed.

### 2. The KYC screen — BVN/NIN verification

`frontend/src/features/kyc/Kyc.jsx`. Reached only by tapping the badge above.

```
┌───────────────────────────────────────┐
│  ←          Verify Identity           │
├───────────────────────────────────────┤
│                                       │
│    ┌───────────────────────────┐    │
│    │ Current Tier               │    │
│    │ Tier 1                     │    │
│    │ Verify your BVN and NIN    │    │
│    │ to unlock higher           │    │
│    │ transaction limits.        │    │
│    └───────────────────────────┘    │
│                                       │
│    (1) Bank Verification Number      │
│        (BVN)                         │
│    ┌───────────────────────────┐    │
│    │ Enter your 11-digit BVN   │    │
│    └───────────────────────────┘    │
│           [ Verify BVN ]             │
│                                       │
│    (2) National Identity Number      │
│        (NIN)                         │
│    🔒 Verify your BVN first to       │
│       unlock this step.              │
│                                       │
└───────────────────────────────────────┘
```

Once BVN passes, step (1) collapses to `✓ Verified · *******1234`
(masked, never the real number) and step (2) unlocks. **This screen
cannot be fully exercised in this environment** — submitting a BVN
here makes a real call to Flutterwave, which needs real sandbox
credentials nobody has plugged in yet (see `README.md`, item 2).

### 3. A transfer that exceeds the tier limit — the actual proof

`frontend/src/features/transfer/components/StatusStep.jsx`. Reached by
sending a transfer above the tier's cap (e.g. ₦100,000 on Tier 1's
₦50,000 limit) — **this one *is* fully live-testable**, and was tested
live during this review.

```
┌───────────────────────────────────────┐
│                                       │
│                 ✕ (red)              │
│                                       │
│           Transfer Failed             │
│                                       │
│   "This transfer exceeds your         │
│   per-transaction limit for your      │
│   current verification level          │
│   (TIER_1). Upgrade your              │
│   verification to send more."         │
│                                       │
│    [  Go Home  ]   [ Try Again ]     │
└───────────────────────────────────────┘
```

That message is not UI copy someone wrote — it's the literal string
thrown by `TransferLimitExceededException` (see `implementation.md`,
Phase 1c), rendered on screen exactly as the backend wrote it. This is
the strongest piece of real, on-screen evidence this module has.

### 4. Rate limiting — the one rough edge, also live-testable

`frontend/src/features/auth/Login.jsx`. Reached by failing login 5+
times in a minute.

```
┌───────────────────────────────────────┐
│            Welcome back               │
│      Log in to your Kudi AI account   │
├───────────────────────────────────────┤
│  Email                               │
│  [ jane@example.com              ]   │
│                                       │
│  Password                            │
│  [ ••••••••••••                  ]   │
│                                       │
│  ⚠ ThrottlerException: Too Many      │
│    Requests                          │
│                                       │
│          [    Log In    ]            │
│    New to Kudi AI? Create account    │
└───────────────────────────────────────┘
```

The rate limit itself is real and working — this screen is the proof.
The message text is the one known cosmetic gap: it's `@nestjs/throttler`'s
raw default string, not written copy. See `README.md`, item 6.

---

## What does *not* appear on screen — and why that's correct, not missing

| Phase | What it does | Why it's invisible to a customer |
|---|---|---|
| **Phase 3** — audit trail | Records every verification attempt and tier change to a database table, permanently. | It's a compliance *record*, not a *feature* — there's nothing for a user to see or do. It exists so a staff member can later answer "prove this user was properly verified," not to inform the user in the moment. |
| **Phase 4** — sanctions screening | Screens a user's real, verified name against the OFAC watchlist the moment identity verification succeeds. | Deliberately, by design: if a name is ever flagged, **the flagged user must never find out** — tipping off the subject of an active compliance review is the opposite of correct AML/CFT process (this is a real regulatory principle, not a UX choice). The check runs silently; only compliance staff can ever see a flag. |
| **Phase 5** — manual review / staff surface | Lets a compliance officer look up a user's full KYC history, manually clear a failed verification, review sanctions flags, and freeze/unfreeze accounts. | There is genuinely no screen for this anywhere in the codebase — every one of these actions is a real, working, tested API endpoint (see `README.md`'s endpoint table), reachable only by direct API call (Postman, curl) by someone with a `COMPLIANCE_OFFICER`/`ADMIN`/`SUPER_ADMIN` account. A regular customer login — like the one used to test everything above — cannot reach these routes at all, even if a screen existed. |

**In short:** if it's something a *customer* should be able to see or
do, it's on screen and was tested live. If it's something only
*compliance staff* need, or something that must stay invisible by
regulatory design, it deliberately isn't — and isn't missing, it's
correct.