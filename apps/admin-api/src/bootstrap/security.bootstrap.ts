import { INestApplication, Logger } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Centralized security bootstrap hook: helmet and CORS.
 *
 * CORS_ORIGIN is a comma-separated allowlist, e.g.
 * `https://app.kudiaibank.com,https://admin.kudiaibank.com`.
 *
 * The previous default was `origin: '*'` together with `credentials: true`.
 * That pair is invalid: the CORS specification forbids a wildcard
 * `Access-Control-Allow-Origin` on a credentialed request, so every browser
 * rejects it. A frontend sending cookies or `withCredentials` got an opaque
 * CORS failure that looks like the API being down. It was also the wrong
 * default for a bank — any origin on the internet could call this API from a
 * victim's browser.
 *
 * Now: an explicit allowlist when one is configured; origin reflection
 * outside production so local development works with no configuration; and
 * cross-origin access switched off in production when nothing is configured,
 * which fails closed and says so loudly rather than failing open.
 */
export function bootstrapSecurity(app: INestApplication): void {
  const logger = new Logger('Security');

  app.use(helmet());

  const configured = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    app.enableCors({ origin: configured, credentials: true });
    logger.log(`CORS allowlist: ${configured.join(', ')}`);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    app.enableCors({ origin: false });
    logger.error(
      'CORS_ORIGIN is not set. Cross-origin requests are disabled. ' +
        'Set CORS_ORIGIN to the frontend origins that must reach this API.',
    );
    return;
  }

  // Development: reflect whatever origin asks. Valid alongside credentials,
  // unlike a wildcard, so a local frontend on any port just works.
  app.enableCors({ origin: true, credentials: true });
  logger.warn('CORS_ORIGIN is not set — reflecting request origin (development only).');
}
