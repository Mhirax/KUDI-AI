# Module Documentation

Per-module documentation (domain glossary, use cases, event contracts)
is added here as each bounded context under `/modules` is implemented.

## identity

Registration, authentication (JWT access + rotating opaque refresh
tokens), account lockout after repeated failed logins, password
change, and role-based access control. See `/modules/identity/README.md`
for the full design write-up (endpoints, security model, domain events).

## accounts

Account/wallet lifecycle (open, credit, debit, freeze, unfreeze,
close) with NUBAN-format account numbers, `bigint`-exact monetary
arithmetic, and optimistic concurrency control on balance mutations.
See `/modules/accounts/README.md` for the full design write-up.

## transfers

Internal (wallet-to-wallet, atomic) and external (Flutterwave payout,
saga-with-compensation) money movement, plus the webhook endpoint that
settles external transfers asynchronously. See
`/modules/transfers/README.md` for the full design write-up, including
the documented cross-module coupling required for atomic internal
transfers.

## compliance

BVN/NIN identity verification against a CBN-style tiered KYC model
(TIER_1 → TIER_2 → TIER_3), with raw identity numbers never persisted
— only a SHA-256 hash and masked display form. Closes an
Event-Driven chain spanning three modules: Identity's
`UserRegisteredEvent` creates a default profile here; this module's own
`KycTierUpgradedEvent` is consumed by Accounts to activate pending
accounts. See `/modules/compliance/README.md` for the full design
write-up.
