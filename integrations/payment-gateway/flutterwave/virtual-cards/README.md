# Flutterwave — virtual cards

Adapter boundary for Flutterwave's Issuing (virtual cards) operations.

## Status

Implemented. `flutterwave-virtual-cards.adapter.ts` calls Flutterwave's
real v3 Issuing endpoints (create, lookup, fund, block, unblock,
terminate) using the same HTTP/error-handling conventions as
`../bill-payments` and `../transfers`: bearer auth from
`FLUTTERWAVE_SECRET_KEY`, 15s timeout, and normalized
`ServiceUnavailableException` on transport failure.

Consumed by `modules/cards` through its own domain-level `ICardIssuer`
port (`modules/cards/domain/services/card-issuer.interface.ts`), never
directly — same seam as every other Flutterwave capability.

## Convention

- `*.port.ts` — interface consumed by the owning module's
  infrastructure-layer provider implementation
- `*.adapter.ts` — concrete Flutterwave HTTP client implementation
- `*.dto.ts` — request/response mapping types
- `*.mapper.ts` — Flutterwave payload <-> domain model mapping

## Scope note

Physical card issuance (`POST /api/v1/cards/request-physical`) is
deliberately **not** wired to a provider call here — physical card
fulfillment (KYC-gated printing, embossing, courier dispatch) is an
offline/logistics process in every card-issuing program, not a
synchronous API call. `modules/cards` records the request and leaves
it `PENDING` for ops to progress manually. See `modules/cards/README.md`.
