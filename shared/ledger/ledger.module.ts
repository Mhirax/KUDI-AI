import { Module } from '@nestjs/common';
import { PrismaLedgerRecorderService } from './prisma-ledger-recorder.service';
import { LEDGER_RECORDER } from './ledger-recorder.interface';

/**
 * Cross-cutting module, not a bounded context — any module that
 * mutates a balance and wants a durable double-entry record imports
 * this and injects `ILedgerRecorder` via `LEDGER_RECORDER`. First
 * consumer: Transfers (modules/transfers/implementation.md, gap #2).
 */
@Module({
  providers: [{ provide: LEDGER_RECORDER, useClass: PrismaLedgerRecorderService }],
  exports: [LEDGER_RECORDER],
})
export class LedgerModule {}
