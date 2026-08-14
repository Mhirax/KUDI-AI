# Web API

Part of the Kudi AI Bank distributed backend. Runs as an independent
deployable NestJS application following Clean Architecture / DDD boundaries.

## Structure

- `src/main.ts` — application entrypoint
- `src/app.module.ts` — root module
- `src/config` — namespaced configuration
- `src/bootstrap` — startup concerns (logger, security, etc.)
- `src/common` — app-local cross-cutting utilities

## Status

Phase 1 — Foundation only. No business logic, no domain controllers.
