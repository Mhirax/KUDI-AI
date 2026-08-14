# Rust Core Banking Engines

High-performance, memory-safe financial engines that back the NestJS
application layer. Rust is used specifically where correctness,
concurrency safety, and performance under load are non-negotiable:
ledger posting, fee computation, settlement batching, and reconciliation.

## Crates

| Crate                    | Responsibility                                        |
|---------------------------|-------------------------------------------------------|
| `ledger-engine`           | Double-entry bookkeeping, balances, immutable postings |
| `fee-engine`              | Fee/levy/VAT computation                               |
| `settlement-engine`       | Batch settlement with payment rails (Flutterwave)      |
| `reconciliation-engine`   | Internal-vs-provider statement matching                 |
| `financial-engine`        | Orchestrates the above engines                          |
| `shared`                  | Shared types/utilities across all engine crates        |

## Interop

NestJS communicates with these engines via a language-agnostic boundary
(gRPC or FFI bindings — decided in Phase 2), keeping the domain core
isolated per Clean Architecture.
