import { Transfer } from './transfer.entity';
import { ExternalRecipient } from '../value-objects/external-recipient.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { InvalidTransferStateException } from '../exceptions/invalid-transfer-state.exception';

describe('Transfer aggregate', () => {
  it('initiates an internal transfer in PENDING status and emits TransferInitiatedEvent', () => {
    const transfer = Transfer.initiateInternal({
      initiatorUserId: 'user-1',
      sourceAccountId: 'acct-1',
      destinationAccountId: 'acct-2',
      amount: Money.fromDecimalString('100.00', Currency.NGN),
      fee: Money.zero(Currency.NGN),
      narration: 'rent',
    });

    expect(transfer.status).toBe(TransactionStatus.PENDING);
    const events = transfer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('transfers.transfer.initiated');
  });

  it('transitions PENDING -> SUCCESSFUL and emits TransferCompletedEvent', () => {
    const transfer = Transfer.initiateInternal({
      initiatorUserId: 'user-1',
      sourceAccountId: 'acct-1',
      destinationAccountId: 'acct-2',
      amount: Money.fromDecimalString('100.00', Currency.NGN),
      fee: Money.zero(Currency.NGN),
      narration: 'rent',
    });
    transfer.pullDomainEvents();

    transfer.markSuccessful();
    expect(transfer.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(transfer.pullDomainEvents()[0].eventName).toBe('transfers.transfer.completed');
  });

  it('rejects any further transition once in a terminal state', () => {
    const transfer = Transfer.initiateInternal({
      initiatorUserId: 'user-1',
      sourceAccountId: 'acct-1',
      destinationAccountId: 'acct-2',
      amount: Money.fromDecimalString('100.00', Currency.NGN),
      fee: Money.zero(Currency.NGN),
      narration: 'rent',
    });
    transfer.markSuccessful();

    expect(() => transfer.markFailed('too late')).toThrow(InvalidTransferStateException);
    expect(() => transfer.markSuccessful()).toThrow(InvalidTransferStateException);
  });

  it('initiates an external transfer with a recipient and marks it REVERSED on compensation', () => {
    const recipient = ExternalRecipient.create({
      bankCode: '044',
      accountNumber: '0690000031',
      accountName: 'Ada Lovelace',
    });

    const transfer = Transfer.initiateExternal({
      initiatorUserId: 'user-1',
      sourceAccountId: 'acct-1',
      recipient,
      amount: Money.fromDecimalString('5000.00', Currency.NGN),
      fee: Money.fromDecimalString('25.00', Currency.NGN),
      narration: 'invoice payment',
    });
    transfer.pullDomainEvents();

    transfer.markProcessing('flw-txn-123');
    transfer.markReversed('provider declined');

    expect(transfer.status).toBe(TransactionStatus.REVERSED);
    expect(transfer.pullDomainEvents()[0].eventName).toBe('transfers.transfer.reversed');
  });
});
