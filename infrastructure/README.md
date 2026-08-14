# Infrastructure

Concrete adapters for every external dependency the platform relies on:
PostgreSQL (via Prisma), Redis, RabbitMQ, security/encryption, logging,
monitoring, scheduling, and object storage. This layer implements the
"ports" defined in `/shared/interfaces`, per Clean Architecture's
dependency-inversion rule — domain and application layers never import
directly from here.
