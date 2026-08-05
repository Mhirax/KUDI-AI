# Modules

Home for **bounded-context business modules**, each structured
internally per Clean Architecture layers:

```
modules/<module-name>/
  domain/          # Entities, Value Objects, Domain Events, Domain Services
  application/      # Use Cases (Commands/Queries — CQRS), DTOs, Ports
  infrastructure/     # Repository implementations, external adapters
  presentation/         # Controllers, guards, Passport strategies
```

## Status

| Module      | Status         | Description                                    |
|--------------|-----------------|--------------------------------------------------|
| `identity/`   | ✅ Implemented   | Registration, JWT auth, refresh rotation, RBAC   |
| `accounts/`     | ✅ Implemented | Core banking accounts & wallets, NUBAN numbers   |
| `transfers/`      | ✅ Implemented | Internal transfers (atomic) + Flutterwave payouts (saga) |
| `compliance/`       | ✅ Implemented | BVN/NIN verification, CBN-style KYC tiers, account activation |

## Rule

Modules may depend on `/shared` and declare ports implemented by
`/infrastructure`. Modules must never depend directly on another
module's internals — cross-module communication happens via domain
events (RabbitMQ / `@nestjs/cqrs` EventBus) or explicitly exposed
application-service contracts.
