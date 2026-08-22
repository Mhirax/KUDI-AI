export type IdempotencyAcquireResult =
  | { outcome: 'ACQUIRED' }
  | { outcome: 'COMPLETED'; resourceId: string }
  | { outcome: 'IN_PROGRESS' };

export interface IIdempotencyKeyRepository {
  /**
   * Atomically claims (userId, scope, key) for a fresh attempt, or
   * reports the state of an existing claim. Must be safe under two
   * genuinely concurrent callers racing on the same key — only one may
   * ever receive `ACQUIRED` for a given key at a time.
   */
  tryAcquire(userId: string, scope: string, key: string): Promise<IdempotencyAcquireResult>;

  /** Marks a claimed key as done; `resourceId` is what a replay returns. */
  markCompleted(userId: string, scope: string, key: string, resourceId: string): Promise<void>;

  /** Releases a claimed key after a clean failure, allowing retry. */
  release(userId: string, scope: string, key: string): Promise<void>;
}

export const IDEMPOTENCY_KEY_REPOSITORY = Symbol('IDEMPOTENCY_KEY_REPOSITORY');
