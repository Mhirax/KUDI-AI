# Flutterwave — funding

Adapter boundary for Flutterwave funding operations.

## Status

Phase 1 — Structure only. Client implementation and business logic are
added in a later phase per the Flutterwave API contract for this
capability.

## Convention

Each capability directory will contain, once implemented:
- `*.port.ts` — interface consumed by application/use-case layer
- `*.adapter.ts` — concrete Flutterwave HTTP client implementation
- `*.dto.ts` — request/response mapping types
- `*.mapper.ts` — Flutterwave payload <-> domain model mapping
