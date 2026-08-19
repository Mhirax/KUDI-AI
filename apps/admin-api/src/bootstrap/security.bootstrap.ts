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

  // ThrottlerGuard (registered in AppModule) keys rate limits by
  // `req.ip`, which Express only trusts from the raw socket unless told
  // to trust upstream X-Forwarded-For hops. Blindly trusting it without
  // a real proxy in front would let any caller spoof their own IP and
  // dodge rate limiting entirely — worse than not trusting it — so this
  // defaults to off (correct today: gateway/api-gateway doesn't route
  // traffic to this app yet). Once it does, set TRUST_PROXY_HOPS to the
  // real number of hops between the internet and this process (usually
  // 1) so requests are bucketed by the real client IP instead of the
  // gateway's. See modules/compliance/implementation.md, post-review
  // finding #3.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? '0');
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }
}
