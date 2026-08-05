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

// Cross-module dependency on Accounts' *published event* and *port*,
// not its internals — the same well-scoped boundary crossings already
// used by Compliance (events) and Transfers (ACCOUNT_REPOSITORY).
import { AccountCreditedEvent } from '../../../accounts/domain/events/account-credited.event';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../accounts/domain/repositories/account.repository.interface';

/**
 * Projects every AccountCreditedEvent into an immutable CREDIT ledger
 * entry. Idempotent: the entry's `sourceEventId` (the event's own
 * `eventId`) is unique at the persistence layer, so re-delivery is a
 * logged no-op. Errors are logged, never rethrown — an event handler
 * has no HTTP caller to receive them, and one failed projection must
 * not poison the in-process event pipeline (the missed entry is
 * recoverable later by replaying against the Rust ledger-engine's
 * authoritative record).
 */
@Injectable()
@EventsHandler(AccountCreditedEvent)
export class AccountCreditedLedgerHandler implements IEventHandler<AccountCreditedEvent> {
  private readonly logger = new Logger(AccountCreditedLedgerHandler.name);

  constructor(
    @Inject(LEDGER_ENTRY_REPOSITORY) private readonly ledgerRepository: ILedgerEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: AccountCreditedEvent): Promise<void> {
    try {
      const account = await this.accountRepository.findById(event.aggregateId);
      if (!account) {
        this.logger.error(
          `Cannot project credit ${event.eventId}: account ${event.aggregateId} not found`,
        );
        return;
      }

      const currency = event.currency as Currency;
      const entry = LedgerEntry.record({
        accountId: event.aggregateId,
        userId: account.userId,
        direction: EntryDirection.CREDIT,
        amount: Money.fromMinorUnits(event.amountMinorUnits, currency),
        balanceAfter: Money.fromMinorUnits(event.balanceAfterMinorUnits, currency),
        reference: event.reference,
        sourceEventId: event.eventId,
        occurredAt: event.occurredAt,
      });

      const appended = await this.ledgerRepository.append(entry);
      if (!appended) {
        this.logger.warn(`Credit event ${event.eventId} already projected; skipping`);
        return;
      }

      entry.pullDomainEvents().forEach((domainEvent) => this.eventBus.publish(domainEvent));
    } catch (error) {
      this.logger.error(
        `Failed to project credit event ${event.eventId} for account ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
