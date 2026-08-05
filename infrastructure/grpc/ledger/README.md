# Ledger Engine gRPC Client

NestJS-side connection to the Rust ledger-engine (`/rust/ledger-engine`),
the platform's authoritative source of truth for account balances and
the immutable double-entry transaction record.

- `ledger-grpc.types.ts` — hand-written TypeScript mirrors of
  `/proto/ledger.proto`'s messages (no codegen step; `@grpc/proto-loader`
  parses the `.proto` file at runtime).
- `ledger-grpc-client.module.ts` — registers the gRPC connection via
  `@nestjs/microservices`' `ClientsModule`, with explicit proto-loader
  options forcing int64 fields to arrive as strings (never a
  precision-losing `number` or ambiguous `Long`).
- `ledger-engine.client.ts` — `LedgerEngineClient`, the Promise-based,
  `bigint`-native wrapper application code actually depends on.
  Nothing outside this module should inject the raw gRPC client.

## Consumers

- `modules/transfers/infrastructure/services/grpc-internal-transfer-executor.service.ts`
  — posts internal transfers through the ledger engine instead of a
  local Prisma transaction (see that module's README for the
  migration/rollout story).
- `modules/accounts/application/event-handlers/register-ledger-account.handler.ts`
  — registers a ledger account whenever a Kudi `Account` is opened.

## Configuration

`LEDGER_ENGINE_ENABLED` (default `false`) and `LEDGER_ENGINE_URL`
(default `localhost:50051`) — see `/infrastructure/config/ledger-engine.config.ts`.
