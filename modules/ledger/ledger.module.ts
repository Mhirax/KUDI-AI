import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { LEDGER_ENTRY_REPOSITORY } from './domain/repositories/ledger-entry.repository.interface';

// Infrastructure adapters
import { PrismaLedgerEntryRepository } from './infrastructure/persistence/prisma-ledger-entry.repository';

// Application query/event handlers
import { GetAccountLedgerHandler } from './application/queries/get-account-ledger/get-account-ledger.handler';
import { GetAccountStatementHandler } from './application/queries/get-account-statement/get-account-statement.handler';
import { GetLedgerEntryByIdHandler } from './application/queries/get-ledger-entry-by-id/get-ledger-entry-by-id.handler';
import { AccountCreditedLedgerHandler } from './application/event-handlers/account-credited.handler';
import { AccountDebitedLedgerHandler } from './application/event-handlers/account-debited.handler';

// Presentation
import { LedgerController } from './presentation/controllers/ledger.controller';

// Cross-module *module* import: LedgerModule consumes Accounts' exported
// ACCOUNT_REPOSITORY port (ownership checks + userId denormalization).
import { AccountsModule } from '../accounts/accounts.module';

const queryHandlers = [
  GetAccountLedgerHandler,
  GetAccountStatementHandler,
  GetLedgerEntryByIdHandler,
];
const eventHandlers = [AccountCreditedLedgerHandler, AccountDebitedLedgerHandler];

/**
 * Ledger bounded-context module — the platform's immutable transaction
 * history.
 *
 * Pure CQRS split: the write side is exclusively event-driven (the two
 * event handlers projecting Accounts' credited/debited events into
 * append-only rows); the read side is exclusively queries (history,
 * statements, single-entry lookup). There are no commands and no
 * mutating HTTP endpoints at all.
 *
 * `DatabaseModule` (global) already provides `PrismaService`; not
 * re-imported here.
 */
@Module({
  imports: [CqrsModule, forwardRef(() => AccountsModule)],
  controllers: [LedgerController],
  providers: [
    ...queryHandlers,
    ...eventHandlers,
    { provide: LEDGER_ENTRY_REPOSITORY, useClass: PrismaLedgerEntryRepository },
  ],
  exports: [LEDGER_ENTRY_REPOSITORY],
})
export class LedgerModule {}
