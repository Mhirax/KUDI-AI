/**
 * Injection token for the raw gRPC client of the Rust ledger-engine.
 *
 * This token lives in its own file — deliberately. It used to be
 * declared in `ledger-grpc-client.module.ts`, which created a circular
 * import: the module imported `LedgerEngineClient`, and the client
 * imported the token back from the module. At runtime that left
 * `LedgerEngineClient` `undefined` inside the module's `providers`
 * array, and NestJS surfaced it as:
 *
 *   "A circular dependency has been detected inside
 *    LedgerGrpcClientModule."
 *
 * A constants file has no imports of its own, so both the module and
 * the client can depend on it without forming a cycle. `forwardRef()`
 * does NOT help here — that addresses circular *provider* resolution,
 * not circular ES module evaluation.
 *
 * Nothing outside `LedgerGrpcClientModule` should inject this token
 * directly; depend on the exported `LedgerEngineClient` wrapper.
 */
export const LEDGER_GRPC_PACKAGE = 'LEDGER_GRPC_PACKAGE';