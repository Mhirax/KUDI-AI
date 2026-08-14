# Architecture Documentation

## Principles

Kudi AI Bank's backend is built on:

- **Clean Architecture** — dependency rule flows inward: presentation →
  application → domain, with infrastructure implementing domain-defined
  ports.
- **Domain-Driven Design** — bounded contexts under `/modules`, a shared
  kernel under `/shared`.
- **CQRS** — commands (writes) and queries (reads) are modeled as
  distinct use cases, enabling independent read/write scaling.
- **Event-Driven Architecture** — bounded contexts communicate via
  domain events over RabbitMQ, not direct synchronous coupling.
- **Repository Pattern** — persistence is abstracted behind interfaces
  defined in `/shared/interfaces` and implemented in `/infrastructure`
  and each module's own infrastructure layer.
- **SOLID** — enforced at every layer; see ADRs for specific rulings.

## High-Level Topology

```
                    ┌────────────────┐
                    │  API Gateway   │
                    └───────┬────────┘
            ┌───────────────┼───────────────┐
      ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
      │ mobile-api│   │  web-api  │   │ admin-api │
      └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
            └───────────────┼───────────────┘
                    ┌────────▼────────┐
                    │ Business Modules │  (DDD bounded contexts)
                    └────────┬────────┘
        ┌───────────────────┼────────────────────┐
  ┌──────▼──────┐   ┌────────▼────────┐   ┌───────▼───────┐
  │ PostgreSQL  │   │  Rust Engines    │   │  Flutterwave  │
  │  (Prisma)   │   │ (ledger/fee/...) │   │  Integration  │
  └─────────────┘   └─────────────────┘   └───────────────┘
        RabbitMQ (events) · Redis (cache/locks) throughout
```

## ADRs

Architecture Decision Records will be added here as significant
technical decisions are made (e.g. gRPC vs FFI for Rust interop,
multi-tenancy strategy, event schema versioning).
