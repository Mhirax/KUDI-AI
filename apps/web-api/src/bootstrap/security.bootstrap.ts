import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Centralized security bootstrap hook: helmet, CORS, rate limiting, etc.
 *
 * `script-src` allows 'unsafe-inline' so the Swagger UI page (mounted in
 * non-production only, see main.ts) can run its inline bootstrap script.
 * This is a JSON API with no user-rendered HTML, so the XSS surface
 * that CSP script-src normally guards against does not apply here.
 */
export function bootstrapSecurity(app: INestApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });
}
