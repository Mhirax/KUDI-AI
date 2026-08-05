import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  ILedgerEntryRepository,
  LEDGER_ENTRY_REPOSITORY,
} from '../../domain/repositories/ledger-entry.repository.interface';
import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { EntryDirection } from '../../domain/enums/entry-direction.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

// Cross-module dependency on Accounts' *published event* and *port* —
// see account-credited.handler.ts for the boundary-crossing rationale.
import { AccountDebitedEvent } from '../../../accounts/domain/events/account-debited.event';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../accounts/domain/repositories/account.repository.interface';

/**
 * Projects every AccountDebitedEvent into an immutable DEBIT ledger
 * entry. Same idempotency and never-rethrow semantics as
 * AccountCreditedLedgerHandler — see that class's header.
 */
@Injectable()
@EventsHandler(AccountDebitedEvent)
export class AccountDebitedLedgerHandler implements IEventHandler<AccountDebitedEvent> {
  private readonly logger = new Logger(AccountDebitedLedgerHandler.name);

  constructor(
    @Inject(LEDGER_ENTRY_REPOSITORY) private readonly ledgerRepository: ILedgerEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: AccountDebitedEvent): Promise<void> {
    try {
      const account = await this.accountRepository.findById(event.aggregateId);
      if (!account) {
        this.logger.error(
          `Cannot project debit ${event.eventId}: account ${event.aggregateId} not found`,
        );
        return;
      }

      const currency = event.currency as Currency;
      const entry = LedgerEntry.record({
        accountId: event.aggregateId,
        userId: account.userId,
        direction: EntryDirection.DEBIT,
        amount: Money.fromMinorUnits(event.amountMinorUnits, currency),
        balanceAfter: Money.fromMinorUnits(event.balanceAfterMinorUnits, currency),
        reference: event.reference,
        sourceEventId: event.eventId,
        occurredAt: event.occurredAt,
      });

      const appended = await this.ledgerRepository.append(entry);
      if (!appended) {
        this.logger.warn(`Debit event ${event.eventId} already projected; skipping`);
        return;
      }

      entry.pullDomainEvents().forEach((domainEvent) => this.eventBus.publish(domainEvent));
    } catch (error) {
      this.logger.error(
        `Failed to project debit event ${event.eventId} for account ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
