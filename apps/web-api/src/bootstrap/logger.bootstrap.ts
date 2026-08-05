import { INestApplication } from '@nestjs/common';

/**
 * Centralized logger bootstrap hook.
 * Real transport (e.g. Winston/Pino + ELK/Loki) wired in infrastructure/logging.
 */
export function bootstrapLogger(_app: INestApplication): void {
  // Intentionally left as a Phase 1 placeholder.
}
