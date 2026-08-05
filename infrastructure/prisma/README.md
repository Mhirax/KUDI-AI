# Prisma

Prisma schema and migration home for PostgreSQL. Each bounded context
owns its own models within the single schema file (or via multi-schema
in a later phase), migrated through `prisma migrate`.
