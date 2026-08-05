import { Deposit } from './deposit.entity';
import { DepositChannel } from '../enums/deposit-channel.enum';
import { InvalidDepositStateException } from '../exceptions/invalid-deposit-state.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';

function initiateDeposit(): Deposit {
  return Deposit.initiate({
    channel: DepositChannel.CHECKOUT,
    userId: 'user-1',
    accountId: 'account-1',
    amount: Money.fromDecimalString('1500.00', Currency.NGN),
  });
}

describe('Deposit aggregate', () => {
  it('initiates PENDING with a KUDI-DEP reference and emits DepositInitiatedEvent', () => {
    const deposit = initiateDeposit();

    expect(deposit.status).toBe(TransactionStatus.PENDING);
    expect(deposit.reference.getValue()).toMatch(/^KUDI-DEP-[A-Z0-9]{12}$/);
    expect(deposit.pullDomainEvents()[0].eventName).toBe('funding.deposit.initiated');
  });

  it('completes with the provider transaction id and emits DepositCompletedEvent', () => {
    const deposit = initiateDeposit();
    deposit.pullDomainEvents();

    deposit.complete('flw-12345');

    expect(deposit.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(deposit.providerTransactionId).toBe('flw-12345');
    expect(deposit.isTerminal()).toBe(true);
    expect(deposit.pullDomainEvents()[0].eventName).toBe('funding.deposit.completed');
  });

  it('fails with a reason and emits DepositFailedEvent', () => {
    const deposit = initiateDeposit();
    deposit.pullDomainEvents();

    deposit.fail('provider reported failure');

    expect(deposit.status).toBe(TransactionStatus.FAILED);
    expect(deposit.failureReason).toBe('provider reported failure');
    expect(deposit.pullDomainEvents()[0].eventName).toBe('funding.deposit.failed');
  });

  it('rejects completing an already-terminal deposit', () => {
    const deposit = initiateDeposit();
    deposit.complete('flw-1');
    expect(() => deposit.complete('flw-2')).toThrow(InvalidDepositStateException);
  });

  it('rejects failing an already-terminal deposit', () => {
    const deposit = initiateDeposit();
    deposit.fail('first failure');
    expect(() => deposit.fail('second failure')).toThrow(InvalidDepositStateException);
  });

  it('bumps the version on every transition', () => {
    const deposit = initiateDeposit();
    expect(deposit.version).toBe(0);
    deposit.complete('flw-1');
    expect(deposit.version).toBe(1);
  });
});
