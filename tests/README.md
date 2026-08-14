# Tests

Test suites organized by scope, mirroring the testing pyramid:

- `unit/` — isolated unit tests for domain logic, use cases, helpers (Jest)
- `integration/` — tests against real infrastructure (Postgres, Redis,
  RabbitMQ) via Testcontainers/Docker Compose
- `e2e/` — end-to-end HTTP tests against a running app instance (Supertest)
- `performance/` — load/stress tests (k6) validating SLAs under scale

Rust engine tests live alongside their crates under `/rust/*/src` and
`/rust/*/tests` per Cargo convention, and are run via `cargo test`.
