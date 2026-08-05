import { LedgerEntry } from './ledger-entry.entity';
import { EntryDirection } from '../enums/entry-direction.enum';
import { LedgerEntryType } from '../enums/ledger-entry-type.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

function recordEntry(overrides: Partial<Parameters<typeof LedgerEntry.record>[0]> = {}) {
  return LedgerEntry.record({
    accountId: 'account-1',
    userId: 'user-1',
    direction: EntryDirection.CREDIT,
    amount: Money.fromDecimalString('500.00', Currency.NGN),
    balanceAfter: Money.fromDecimalString('1500.00', Currency.NGN),
    reference: 'KUDI-ABCDEF0123456789',
    sourceEventId: 'event-1',
    occurredAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  });
}

describe('LedgerEntry aggregate', () => {
  it('records an immutable entry and emits LedgerEntryRecordedEvent', () => {
    const entry = recordEntry();

    expect(entry.accountId).toBe('account-1');
    expect(entry.direction).toBe(EntryDirection.CREDIT);
    expect(entry.amount.toMajorUnitsString()).toBe('500.00');
    expect(entry.balanceAfter.toMajorUnitsString()).toBe('1500.00');

    const events = entry.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('ledger.entry.recorded');
    expect(events[0].aggregateId).toBe(entry.id);
  });

  it('classifies platform transfer references as TRANSFER', () => {
    const entry = recordEntry({ reference: 'KUDI-0123456789ABCDEF' });
    expect(entry.entryType).toBe(LedgerEntryType.TRANSFER);
  });

  it('classifies deposit references as DEPOSIT', () => {
    const entry = recordEntry({ reference: 'KUDI-DEP-0123456789AB' });
    expect(entry.entryType).toBe(LedgerEntryType.DEPOSIT);
  });

  it('classifies bill payment references as BILL_PAYMENT', () => {
    const entry = recordEntry({ reference: 'KUDI-BILL-0123456789AB' });
    expect(entry.entryType).toBe(LedgerEntryType.BILL_PAYMENT);
  });

  it('classifies any other reference as ADJUSTMENT', () => {
    const entry = recordEntry({ reference: 'ops-correction-2026-001' });
    expect(entry.entryType).toBe(LedgerEntryType.ADJUSTMENT);
  });

  it('rejects an entry without a source event id', () => {
    expect(() => recordEntry({ sourceEventId: '' })).toThrow(DomainException);
  });

  it('rejects a zero-amount entry', () => {
    expect(() => recordEntry({ amount: Money.zero(Currency.NGN) })).toThrow(DomainException);
  });

  it('rejects a currency mismatch between amount and resulting balance', () => {
    expect(() =>
      recordEntry({
        amount: Money.fromDecimalString('10.00', Currency.USD),
        balanceAfter: Money.fromDecimalString('100.00', Currency.NGN),
      }),
    ).toThrow(DomainException);
  });

  it('pullDomainEvents drains the buffer', () => {
    const entry = recordEntry();
    expect(entry.pullDomainEvents()).toHaveLength(1);
    expect(entry.pullDomainEvents()).toHaveLength(0);
  });
});
