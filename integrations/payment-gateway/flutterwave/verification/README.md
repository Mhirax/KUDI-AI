# Flutterwave — Verification

Adapter boundary for Flutterwave identity-verification (BVN/NIN
resolution) operations, consumed by `modules/compliance`'s
`IIdentityVerificationProvider` port.

## Status

Implemented — real HTTP client against Flutterwave's v3 KYC endpoints.

- `flutterwave-verification.port.ts` — `IFlutterwaveVerificationClient`
- `flutterwave-verification.adapter.ts` — concrete client using
  `@nestjs/axios` against `/v3/kyc/bvns/{bvn}` (long-standing, stable
  Flutterwave endpoint) and `/v3/kyc/nin/{nin}` (modeled analogously —
  verify against current docs, as NIN resolution's exact contract is
  less certain than BVN's)
- `flutterwave-verification.dto.ts` — response shapes matching
  Flutterwave's real (snake_case) JSON contract
- `flutterwave-verification.mapper.ts` — conservative exact-match name
  comparison against the user's registered identity; see its header
  comment for why fuzzy matching was deliberately deferred rather than
  guessed at

Verify field names and endpoint paths against Flutterwave's current API
documentation before connecting to production credentials.
