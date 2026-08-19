import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Centralized security bootstrap hook: helmet and CORS. Rate limiting
 * is not here — it's `ThrottlerModule`/`ThrottlerGuard` registered in
 * `AppModule`, with per-route overrides via `@Throttle()` on the
 * sensitive endpoints (see infrastructure/config/throttler.config.ts).
 */
export function bootstrapSecurity(app: INestApplication): void {
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });
}
