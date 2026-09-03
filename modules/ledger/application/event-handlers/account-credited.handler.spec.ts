import { EventBus } from '@nestjs/cqrs';
import { AccountCreditedLedgerHandler } from './account-credited.handler';
import { AccountDebitedLedgerHandler } from './account-debited.handler';
import { ILedgerEntryRepository } from '../../domain/repositories/ledger-entry.repository.interface';
import { EntryDirection } from '../../domain/enums/entry-direction.enum';
import { AccountCreditedEvent } from '../../../accounts/domain/events/account-credited.event';
import { AccountDebitedEvent } from '../../../accounts/domain/events/account-debited.event';
import { IAccountRepository } from '../../../accounts/domain/repositories/account.repository.interface';

describe('Ledger projection event handlers', () => {
  let ledgerRepository: jest.Mocked<ILedgerEntryRepository>;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;

  beforeEach(() => {
    ledgerRepository = {
      append: jest.fn().mockResolvedValue(true),
      findById: jest.fn(),
      findPageByAccountId: jest.fn(),
      findLastEntryBefore: jest.fn(),
      findLastEntryAtOrBefore: jest.fn(),
      sumForPeriod: jest.fn(),
    };
    accountRepository = {
      findById: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      findByAccountNumber: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
    };
    eventBus = { publish: jest.fn() };
  });

  function creditHandler() {
    return new AccountCreditedLedgerHandler(
      ledgerRepository,
      accountRepository,
      eventBus as unknown as EventBus,
    );
  }

  function debitHandler() {
    return new AccountDebitedLedgerHandler(
      ledgerRepository,
      accountRepository,
      eventBus as unknown as EventBus,
    );
  }

  it('projects a credited event into a CREDIT entry with the event id as idempotency key', async () => {
    const event = new AccountCreditedEvent(
      'account-1',
      '50000',
      'NGN',
      'KUDI-ABCDEF0123456789',
      '150000',
    );

    await creditHandler().handle(event);

    expect(ledgerRepository.append).toHaveBeenCalledTimes(1);
    const entry = ledgerRepository.append.mock.calls[0][0];
    expect(entry.direction).toBe(EntryDirection.CREDIT);
    expect(entry.userId).toBe('user-1');
    expect(entry.sourceEventId).toBe(event.eventId);
    expect(entry.amount.getMinorUnits()).toBe(50000n);
    expect(entry.balanceAfter.getMinorUnits()).toBe(150000n);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('projects a debited event into a DEBIT entry', async () => {
    const event = new AccountDebitedEvent(
      'account-1',
      '20000',
      'NGN',
      'KUDI-ABCDEF0123456789',
      '130000',
    );

    await debitHandler().handle(event);

    const entry = ledgerRepository.append.mock.calls[0][0];
    expect(entry.direction).toBe(EntryDirection.DEBIT);
  });

  it('skips (and does not publish) when the event was already projected', async () => {
    ledgerRepository.append.mockResolvedValue(false);
    const event = new AccountCreditedEvent('account-1', '50000', 'NGN', 'ref', '150000');

    await creditHandler().handle(event);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not throw when the account cannot be found', async () => {
    accountRepository.findById.mockResolvedValue(null);
    const event = new AccountCreditedEvent('missing', '50000', 'NGN', 'ref', '150000');

    await expect(creditHandler().handle(event)).resolves.toBeUndefined();
    expect(ledgerRepository.append).not.toHaveBeenCalled();
  });

  it('does not throw when persistence fails', async () => {
    ledgerRepository.append.mockRejectedValue(new Error('db down'));
    const event = new AccountCreditedEvent('account-1', '50000', 'NGN', 'ref', '150000');

    await expect(creditHandler().handle(event)).resolves.toBeUndefined();
  });
});
