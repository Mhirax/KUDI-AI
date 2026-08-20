# Module Build Roadmap

Tracks the order bounded-context modules were built in, why that order,
and — the part that matters most going forward — **what's next.** Each
module here is a self-contained folder under `modules/` (or, for
Identity, the foundation everything else depends on); see each
module's own `README.md`/`implementation.md` for its internal detail.
This file is the map of how they fit together, not a replacement for
any of them.

---

## Built, in order

Each module below carries its own MVP-complete verdict — ✅ done, or
🟡 open gaps still tracked — decided against that module's own
`implementation.md`, not assumed from "it's been built." A module
being *built* and a module being *MVP-complete* are different claims;
this roadmap tracks both per module so neither gets conflated with the
other at a glance.

### 1. Identity — ✅ MVP-complete
Registration, login, JWT auth. The foundation — every other module
depends on knowing *who* is making a request before anything else can
happen. A 2026-08-19 review found two undocumented security trade-offs
(password policy, account lockout); both got a deliberate decision and
a same-day fix — see
[`modules/identity/implementation.md`](../modules/identity/implementation.md).

### 2. Accounts — ✅ MVP-complete
Wallets/balances. A verified identity needs somewhere for money to
live — account opening, crediting, debiting, freeze/unfreeze. The
2026-08-19 review found registration didn't actually provision an
account server-side (a frontend workaround was covering for it) plus a
freeze/unfreeze role asymmetry; both got a deliberate decision and a
same-day fix, verified against the real DB. See
[`modules/accounts/implementation.md`](../modules/accounts/implementation.md).

### 3. Transfers — 🟡 Not yet MVP-complete
Money movement *out* — external transfers (to another bank) and
internal transfers (Kudi-to-Kudi). Built once Accounts existed, since
you can't move money between or out of accounts that don't exist yet.
The internal-transfer ownership-leak bug found this session is fixed,
but the 2026-08-19 review found this module still has no idempotency
protection — a real risk of double-debiting a customer on a retried
request — plus no ledger and no tests on its highest-risk file. See
[`modules/transfers/implementation.md`](../modules/transfers/implementation.md).

### 4. Compliance (KYC) — ✅ MVP-complete
Tier-based transaction limits, rate limiting, a durable audit trail,
sanctions/watchlist screening, and a staff manual-review surface. Built
*after* Accounts/Transfers already existed, specifically to close the
gap they left open: money could move with no control over how much,
based on how verified the sender actually was. Full detail in
[`modules/compliance/implementation.md`](../modules/compliance/implementation.md)
(engineering), [`modules/compliance/README.md`](../modules/compliance/README.md)
(non-engineering: what's still owed), and
[`modules/compliance/screen.md`](../modules/compliance/screen.md) (what
it actually looks like on screen).

**Why this order held up in practice:** each module needed the ones
before it to be real before it meant anything. Compliance's tier
limits are meaningless without Accounts (something to cap) and
Transfers (something to gate). That dependency chain is the actual
reason to keep following it, not just precedent.

---

## Next: Funding / Deposits

**Not built yet — this is the recommended next module, not a started one.**

### Why this one, specifically

Walk the current money lifecycle: a user can register, verify, open an
account, and send money *out* via Transfers. **There is no way for
real money to ever enter an account.** The only path that exists today
is an admin manually crediting a balance via `CreditAccountHandler` —
a support tool, not a product flow. A banking MVP with no deposit path
isn't a banking MVP; it's a closed loop that can never hold anyone's
real money.

Every other unbuilt feature (Savings, Bills, Cards, Loans, Rewards) is
a "spend or grow money" feature — none of them mean anything until
there's a way to *get* money in first. Funding is the one piece that
actually unblocks the rest.

### This isn't a guess — the codebase already anticipates it

`CreditAccountHandler`'s own docstring (written before Compliance work
touched it) says: *"credit funds into an account (e.g. following a
confirmed Flutterwave funding webhook — the Integrations layer will
dispatch this command once wired in the Transfers/Funding module)."*
The seam is already there, unfinished.

### How it connects back to Compliance

Phase 1d's max-balance ceiling (per-tier cap on how much an account can
hold) is fully built and tested — but the only place it's currently
reachable in the real app is internal transfers, which have no
frontend UI yet either. A real Funding module would be the **first
place a customer ever actually hits that ceiling in a live product
flow**, and the first time upgrading a KYC tier matters for something
other than sending money externally. Compliance built the gate;
Funding is the first door that gate actually needs to guard for real.

### What "done" would need to cover (a starting shape, not a spec)

- A real funding provider integration (Flutterwave already has a
  verification integration in this codebase — its payments/funding
  API is the natural next integration to add alongside it).
- `CreditAccountHandler` gets a real caller instead of only being
  reachable via the admin-only HTTP route.
- The Phase 1d max-balance check (already built) needs no changes —
  it's already wired to fire on any credit through that handler.
- A funding screen in the frontend — none exists yet
  (`frontend/src/api/funding.js` has no live backend behind it today).

---

## After Funding — not yet prioritized, listed for completeness

Frontend feature folders already exist for these, with no backend
behind any of them: **Savings, Bills, Cards, Loans, Rewards,
Notifications.** No recommended order among them yet — that's a
product-scope conversation for whenever Funding is close to done, not
an engineering call to make now.
