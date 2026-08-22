import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrismaIdempotencyKeyRepository } from './prisma-idempotency-key.repository';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`).
 * The one guarantee this feature exists for — "two concurrent requests
 * with the same key, only one actually runs" — cannot be proven
 * against a mock; it depends on the database's own unique-constraint
 * enforcement, not application-level logic. See
 * modules/transfers/implementation.md.
 */
describe('PrismaIdempotencyKeyRepository (integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaIdempotencyKeyRepository(prisma);

  const scope = 'test.scope';
  const createdKeys: { userId: string; key: string }[] = [];

  afterAll(async () => {
    await prisma.idempotencyKey.deleteMany({
      where: { OR: createdKeys.map(({ userId, key }) => ({ userId, scope, key })) },
    });
    await prisma.$disconnect();
  });

  function freshKey(): { userId: string; key: string } {
    const entry = { userId: randomUUID(), key: randomUUID() };
    createdKeys.push(entry);
    return entry;
  }

  it('acquires a brand-new key', async () => {
    const { userId, key } = freshKey();
    const result = await repository.tryAcquire(userId, scope, key);
    expect(result).toEqual({ outcome: 'ACQUIRED' });
  });

  it('reports IN_PROGRESS for a second attempt on a still-claimed key', async () => {
    const { userId, key } = freshKey();
    await repository.tryAcquire(userId, scope, key);
    const second = await repository.tryAcquire(userId, scope, key);
    expect(second).toEqual({ outcome: 'IN_PROGRESS' });
  });

  it('replays the stored resourceId once a key is marked completed', async () => {
    const { userId, key } = freshKey();
    await repository.tryAcquire(userId, scope, key);
    await repository.markCompleted(userId, scope, key, 'resource-123');

    const result = await repository.tryAcquire(userId, scope, key);
    expect(result).toEqual({ outcome: 'COMPLETED', resourceId: 'resource-123' });
  });

  it('allows a clean retry after release', async () => {
    const { userId, key } = freshKey();
    await repository.tryAcquire(userId, scope, key);
    await repository.release(userId, scope, key);

    const result = await repository.tryAcquire(userId, scope, key);
    expect(result).toEqual({ outcome: 'ACQUIRED' });
  });

  it('lets exactly one of two genuinely concurrent requests acquire the same brand-new key', async () => {
    const { userId, key } = freshKey();

    const [first, second] = await Promise.all([
      repository.tryAcquire(userId, scope, key),
      repository.tryAcquire(userId, scope, key),
    ]);

    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['ACQUIRED', 'IN_PROGRESS']);
  });

  it('reclaims a stale IN_PROGRESS claim instead of blocking forever', async () => {
    const { userId, key } = freshKey();
    await repository.tryAcquire(userId, scope, key);

    // Simulate a process that crashed mid-request, three minutes ago —
    // past the 2-minute staleness window.
    await prisma.idempotencyKey.updateMany({
      where: { userId, scope, key },
      data: { createdAt: new Date(Date.now() - 3 * 60 * 1000) },
    });

    const result = await repository.tryAcquire(userId, scope, key);
    expect(result).toEqual({ outcome: 'ACQUIRED' });
  });
});
