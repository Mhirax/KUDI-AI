# Flutterwave — Transfers

Adapter boundary for Flutterwave outbound payout operations, consumed
by `modules/transfers`'s `IExternalPayoutProvider` port.

## Status

Implemented — real HTTP client against Flutterwave's v3 Transfers API.

- `flutterwave-transfer.port.ts` — `IFlutterwaveTransferClient`, the
  interface `modules/transfers` depends on (indirectly, via its own
  domain-level port)
- `flutterwave-transfer.adapter.ts` — concrete client using
  `@nestjs/axios`, Flutterwave's actual `/transfers` endpoint and auth
  header scheme
- `flutterwave-transfer.dto.ts` — request/response shapes matching
  Flutterwave's real (snake_case) JSON contract
- `flutterwave-transfer.mapper.ts` — translates Kudi's internal payout
  request/response shapes to/from Flutterwave's wire format

Verify field names and behavior against Flutterwave's current API
documentation before connecting to production credentials — third-party
API contracts can change independently of this codebase.
