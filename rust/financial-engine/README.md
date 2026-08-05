# financial-engine

High-level financial orchestration engine coordinating ledger, fee, and settlement engines.

## Status

Phase 1 — Foundation only. Public module layout and error/type
conventions are established; business/domain logic is intentionally
excluded and will be implemented per Phase 2 specifications.

## Structure

- `src/lib.rs` — crate entrypoint and public API surface
- `src/error.rs` — canonical error type
- `src/types.rs` — shared internal types

## Build

```sh
cargo build -p financial-engine
cargo test -p financial-engine
```
