import { registerAs } from '@nestjs/config';

/**
 * Connection settings for the Rust ledger-engine gRPC service.
 *
 * `enabled` is a deliberate migration/rollout switch: when `false`
 * (or unset in an environment without the Rust service running —
 * e.g. local development without the full stack), Transfers falls
 * back to `PrismaInternalTransferExecutor`, which keeps the previous
 * NestJS-only atomic-transaction behavior. Set to `true` once the
 * ledger-engine is deployed and reachable to make it the authoritative
 * ledger of record — see modules/transfers/transfers.module.ts.
 */
export default registerAs('ledgerEngine', () => ({
  enabled: process.env.LEDGER_ENGINE_ENABLED === 'true',
  url: process.env.LEDGER_ENGINE_URL || 'localhost:50051',
}));
