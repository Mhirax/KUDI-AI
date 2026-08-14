# ledger-engine

Double-entry ledger engine responsible for posting, balancing, and immutable transaction records.

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
cargo build -p ledger-engine
cargo test -p ledger-engine
```
