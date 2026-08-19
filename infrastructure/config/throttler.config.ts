import { ThrottlerOptions } from '@nestjs/throttler';

/**
 * Rate limiting (modules/compliance/implementation.md, Phase 2a).
 * Tracked by IP address (the `@nestjs/throttler` default) using
 * in-memory storage — fine for a single-instance deployment. If these
 * apps ever run multiple instances behind a load balancer, this state
 * won't be shared across instances and Redis-backed storage
 * (infrastructure/redis, currently unused) would be needed instead.
 *
 * `blockDuration` on the two sensitive-route configs below means the
 * cooldown is a hard lockout once tripped, not just a rolling window —
 * e.g. LOGIN_THROTTLE blocks further attempts for 5 minutes the moment
 * the 6th attempt lands within a minute, rather than letting the 6th
 * attempt back in the instant the 1st attempt ages out.
 */

/** Generic baseline for every route not given a stricter override — 100 requests/minute per IP. */
export const defaultThrottlerConfig: ThrottlerOptions[] = [{ name: 'default', ttl: 60_000, limit: 100 }];

/**
 * `POST /auth/login` — 5 attempts/minute per IP, then a 5-minute
 * lockout. Account-level lockout-on-repeated-failure is currently
 * disabled (see User.recordFailedLogin()'s header comment), so this is
 * presently the *only* defense against password brute-forcing.
 */
export const LOGIN_THROTTLE = { default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } };

/**
 * `POST /kyc/verify-bvn` and `/verify-nin` — 3 attempts/10 minutes per
 * IP, then a 30-minute lockout. Tighter than login: each attempt is a
 * billed Flutterwave call and a guess against an 11-digit identity
 * number, and a legitimate user only ever needs to succeed once.
 */
export const KYC_VERIFICATION_THROTTLE = {
  default: { limit: 3, ttl: 10 * 60_000, blockDuration: 30 * 60_000 },
};
