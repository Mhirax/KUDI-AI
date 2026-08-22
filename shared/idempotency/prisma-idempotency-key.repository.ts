import { Injectable } from '@nestjs/common';
import { Prisma, IdempotencyKeyStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  IIdempotencyKeyRepository,
  IdempotencyAcquireResult,
} from './idempotency-key.repository.interface';

/**
 * A row stuck at IN_PROGRESS longer than this is treated as orphaned
 * (the process that claimed it crashed before finishing) rather than a
 * genuinely concurrent request, and is reclaimed by the next attempt.
 * Comfortably longer than any real transfer — including an external
 * payout's Flutterwave round-trip — should ever take.
 */
const STALE_CLAIM_MS = 2 * 60 * 1000;

@Injectable()
export class PrismaIdempotencyKeyRepository implements IIdempotencyKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tryAcquire(userId: string, scope: string, key: string): Promise<IdempotencyAcquireResult> {
    try {
      await this.prisma.idempotencyKey.create({
        data: { userId, scope, key, status: IdempotencyKeyStatus.IN_PROGRESS },
      });
      return { outcome: 'ACQUIRED' };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      // Someone already claimed this key — find out what state it's in.
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_scope_key: { userId, scope, key } },
    });

    // Vanishingly unlikely (the row we just failed to insert against
    // was deleted between the write and this read) — treat as if we'd
    // raced a `release()` and retry the whole acquire from scratch.
    if (!existing) {
      return this.tryAcquire(userId, scope, key);
    }

    if (existing.status === IdempotencyKeyStatus.COMPLETED) {
      return { outcome: 'COMPLETED', resourceId: existing.resourceId! };
    }

    const ageMs = Date.now() - existing.createdAt.getTime();
    if (ageMs < STALE_CLAIM_MS) {
      return { outcome: 'IN_PROGRESS' };
    }

    // Stale claim — reclaim it for this attempt. Conditioned on it
    // still being the same stale IN_PROGRESS row (matched by id) so
    // two callers racing to reclaim the same stale row can't both win.
    const reclaimed = await this.prisma.idempotencyKey.updateMany({
      where: { id: existing.id, status: IdempotencyKeyStatus.IN_PROGRESS },
      data: { updatedAt: new Date() },
    });
    if (reclaimed.count === 0) {
      // Someone else reclaimed or completed it first.
      return this.tryAcquire(userId, scope, key);
    }
    return { outcome: 'ACQUIRED' };
  }

  async markCompleted(userId: string, scope: string, key: string, resourceId: string): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { userId_scope_key: { userId, scope, key } },
      data: { status: IdempotencyKeyStatus.COMPLETED, resourceId },
    });
  }

  async release(userId: string, scope: string, key: string): Promise<void> {
    // deleteMany, not delete: tolerant of the row already being gone
    // (e.g. a concurrent reclaim), never itself the thing that throws
    // inside an error-handling path.
    await this.prisma.idempotencyKey.deleteMany({ where: { userId, scope, key } });
  }
}
