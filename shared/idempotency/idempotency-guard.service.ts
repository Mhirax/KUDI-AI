import { Inject, Injectable } from '@nestjs/common';
import {
  IDEMPOTENCY_KEY_REPOSITORY,
  IIdempotencyKeyRepository,
} from './idempotency-key.repository.interface';
import { DuplicateRequestInProgressException } from './duplicate-request-in-progress.exception';

/**
 * Reusable request-retry-safety wrapper. Any command handler that
 * creates a resource and wants "retrying with the same key replays the
 * original result instead of doing it again" calls `run()` instead of
 * executing its logic directly.
 *
 * Not scoped to Transfers — this is shared/cross-cutting kernel
 * infrastructure (see shared/idempotency's README-less placement:
 * `shared/` already holds framework-agnostic pieces every module can
 * depend on). Funding, Bills, and Loans are expected to import
 * `IdempotencyModule` and call this same service rather than each
 * re-solving retry-safety on their own table.
 */
@Injectable()
export class IdempotencyGuardService {
  constructor(
    @Inject(IDEMPOTENCY_KEY_REPOSITORY) private readonly repository: IIdempotencyKeyRepository,
  ) {}

  /**
   * @param key `null`/`undefined` means the caller sent no idempotency
   *   header — executes normally, no protection applied. Idempotency is
   *   opt-in per request, not mandatory.
   * @param execute Runs the actual operation. Must return the id of the
   *   resource it created — that id is what a replay is reconstructed
   *   from, not a cached copy of the response itself, so a replay
   *   always reflects the resource's real current state.
   * @param rehydrate Given a previously-created resource's id, returns
   *   the same response shape `execute` would have. Called both on a
   *   genuine replay and is expected to be cheap (a single lookup).
   */
  async run<T>(
    params: { userId: string; scope: string; key: string | null | undefined },
    execute: () => Promise<{ resourceId: string; response: T }>,
    rehydrate: (resourceId: string) => Promise<T>,
  ): Promise<T> {
    if (!params.key) {
      return (await execute()).response;
    }

    const acquisition = await this.repository.tryAcquire(params.userId, params.scope, params.key);

    if (acquisition.outcome === 'COMPLETED') {
      return rehydrate(acquisition.resourceId);
    }

    if (acquisition.outcome === 'IN_PROGRESS') {
      throw new DuplicateRequestInProgressException();
    }

    try {
      const { resourceId, response } = await execute();
      await this.repository.markCompleted(params.userId, params.scope, params.key, resourceId);
      return response;
    } catch (error) {
      // A cleanly-thrown business error (insufficient funds, limit
      // exceeded, validation failure, a payout provider rejecting the
      // request) means nothing was left half-done that a retry could
      // duplicate — release the claim so the same key can be reused.
      // The one gap this doesn't cover: the process crashing outright
      // between execute() succeeding and markCompleted() persisting,
      // which never reaches this catch block at all. That's handled
      // separately by tryAcquire's staleness reclaim, not here.
      await this.repository.release(params.userId, params.scope, params.key);
      throw error;
    }
  }
}
