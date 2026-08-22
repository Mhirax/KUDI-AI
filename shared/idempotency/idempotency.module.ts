import { Module } from '@nestjs/common';
import { IdempotencyGuardService } from './idempotency-guard.service';
import { PrismaIdempotencyKeyRepository } from './prisma-idempotency-key.repository';
import { IDEMPOTENCY_KEY_REPOSITORY } from './idempotency-key.repository.interface';

/**
 * Cross-cutting module, not a bounded context — any module that
 * mutates money/state and wants retry-safety imports this and injects
 * `IdempotencyGuardService`. First consumer: Transfers.
 */
@Module({
  providers: [
    IdempotencyGuardService,
    { provide: IDEMPOTENCY_KEY_REPOSITORY, useClass: PrismaIdempotencyKeyRepository },
  ],
  exports: [IdempotencyGuardService],
})
export class IdempotencyModule {}
