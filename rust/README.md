# Rust Core Banking Engines

High-performance, memory-safe financial engines that back the NestJS
application layer. Rust is used specifically where correctness,
concurrency safety, and performance under load are non-negotiable:
ledger posting, fee computation, settlement batching, and reconciliation.

## Crates

| Crate                    | Status          | Responsibility                                        |
|---------------------------|-----------------|-------------------------------------------------------|
| `ledger-engine`           | ✅ Implemented   | Double-entry bookkeeping, balances, immutable postings |
| `fee-engine`              | Scaffold only   | Fee/levy/VAT computation                               |
| `settlement-engine`       | Scaffold only   | Batch settlement with payment rails (Flutterwave)      |
| `reconciliation-engine`   | Scaffold only   | Internal-vs-provider statement matching                 |
| `financial-engine`        | Scaffold only   | Orchestrates the above engines                          |
| `shared`                  | Scaffold only   | Shared types/utilities across all engine crates        |

## Interop

Decided: **gRPC**, not FFI — each engine runs as an independently
deployable, independently scalable service, consistent with this
platform's microservices framing. The contract lives in `/proto`
(shared, language-agnostic `.proto` files), not inside any one crate.

`ledger-engine` is the first crate to implement this: see
`/proto/ledger.proto` for the contract and `/infrastructure/grpc/ledger`
for the NestJS-side client. The same pattern (proto contract at the
repo root, `tonic`-generated server in Rust, `@nestjs/microservices`
gRPC client in NestJS) is the template for wiring up `fee-engine` and
the other crates in a future phase.

