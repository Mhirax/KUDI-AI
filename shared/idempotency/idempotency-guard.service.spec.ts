import { IdempotencyGuardService } from './idempotency-guard.service';
import { DuplicateRequestInProgressException } from './duplicate-request-in-progress.exception';
import { IIdempotencyKeyRepository } from './idempotency-key.repository.interface';

function buildRepository(): jest.Mocked<IIdempotencyKeyRepository> {
  return {
    tryAcquire: jest.fn(),
    markCompleted: jest.fn(),
    release: jest.fn(),
  };
}

describe('IdempotencyGuardService', () => {
  const params = { userId: 'user-1', scope: 'transfer.internal', key: 'key-1' };

  it('executes normally and skips all idempotency bookkeeping when no key is supplied', async () => {
    const repository = buildRepository();
    const guard = new IdempotencyGuardService(repository);
    const execute = jest.fn().mockResolvedValue({ resourceId: 'r1', response: 'ok' });

    const result = await guard.run({ ...params, key: undefined }, execute, jest.fn());

    expect(result).toBe('ok');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repository.tryAcquire).not.toHaveBeenCalled();
  });

  it('runs execute() and marks the claim completed on first success', async () => {
    const repository = buildRepository();
    repository.tryAcquire.mockResolvedValue({ outcome: 'ACQUIRED' });
    const guard = new IdempotencyGuardService(repository);
    const execute = jest.fn().mockResolvedValue({ resourceId: 'transfer-1', response: 'ok' });

    const result = await guard.run(params, execute, jest.fn());

    expect(result).toBe('ok');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repository.markCompleted).toHaveBeenCalledWith('user-1', 'transfer.internal', 'key-1', 'transfer-1');
    expect(repository.release).not.toHaveBeenCalled();
  });

  it('replays the stored result on a completed key without re-executing', async () => {
    const repository = buildRepository();
    repository.tryAcquire.mockResolvedValue({ outcome: 'COMPLETED', resourceId: 'transfer-1' });
    const guard = new IdempotencyGuardService(repository);
    const execute = jest.fn();
    const rehydrate = jest.fn().mockResolvedValue('replayed');

    const result = await guard.run(params, execute, rehydrate);

    expect(result).toBe('replayed');
    expect(execute).not.toHaveBeenCalled();
    expect(rehydrate).toHaveBeenCalledWith('transfer-1');
  });

  it('rejects a genuinely concurrent duplicate instead of running or waiting', async () => {
    const repository = buildRepository();
    repository.tryAcquire.mockResolvedValue({ outcome: 'IN_PROGRESS' });
    const guard = new IdempotencyGuardService(repository);
    const execute = jest.fn();

    await expect(guard.run(params, execute, jest.fn())).rejects.toBeInstanceOf(
      DuplicateRequestInProgressException,
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('releases the claim and rethrows when execute() fails, allowing a clean retry', async () => {
    const repository = buildRepository();
    repository.tryAcquire.mockResolvedValue({ outcome: 'ACQUIRED' });
    const guard = new IdempotencyGuardService(repository);
    const failure = new Error('insufficient funds');
    const execute = jest.fn().mockRejectedValue(failure);

    await expect(guard.run(params, execute, jest.fn())).rejects.toBe(failure);
    expect(repository.release).toHaveBeenCalledWith('user-1', 'transfer.internal', 'key-1');
    expect(repository.markCompleted).not.toHaveBeenCalled();
  });
});
