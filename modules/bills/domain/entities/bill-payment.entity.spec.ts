import { BillPayment } from './bill-payment.entity';
import { BillCategory } from '../enums/bill-category.enum';
import { InvalidBillPaymentStateException } from '../exceptions/invalid-bill-payment-state.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';

function initiateBillPayment(): BillPayment {
  return BillPayment.initiate({
    userId: 'user-1',
    accountId: 'account-1',
    category: BillCategory.ELECTRICITY,
    billerCode: 'BIL119',
    itemCode: 'AT099',
    billerName: 'Ikeja Electric',
    customerIdentifier: '45028837621',
    amount: Money.fromDecimalString('5000.00', Currency.NGN),
    fee: Money.fromDecimalString('50.00', Currency.NGN),
  });
}

describe('BillPayment aggregate', () => {
  it('initiates PENDING with a KUDI-BILL reference and emits BillPaymentInitiatedEvent', () => {
    const billPayment = initiateBillPayment();

    expect(billPayment.status).toBe(TransactionStatus.PENDING);
    expect(billPayment.reference.getValue()).toMatch(/^KUDI-BILL-[A-Z0-9]{12}$/);
    expect(billPayment.pullDomainEvents()[0].eventName).toBe('bills.payment.initiated');
  });

  it('computes the total debit as amount + fee', () => {
    const billPayment = initiateBillPayment();
    expect(billPayment.totalDebit().toMajorUnitsString()).toBe('5050.00');
  });

  it('marks successful from PENDING with a value token', () => {
    const billPayment = initiateBillPayment();
    billPayment.pullDomainEvents();

    billPayment.markSuccessful('flw-ref-1', '1234-5678-9012');

    expect(billPayment.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(billPayment.valueToken).toBe('1234-5678-9012');
    expect(billPayment.pullDomainEvents()[0].eventName).toBe('bills.payment.completed');
  });

  it('marks successful from PROCESSING (requery finalization)', () => {
    const billPayment = initiateBillPayment();
    billPayment.markProcessing('flw-ref-1');

    billPayment.markSuccessful('flw-ref-1', null);

    expect(billPayment.status).toBe(TransactionStatus.SUCCESSFUL);
  });

  it('marks reversed with a reason and emits BillPaymentReversedEvent', () => {
    const billPayment = initiateBillPayment();
    billPayment.pullDomainEvents();

    billPayment.markReversed('provider rejected the payment');

    expect(billPayment.status).toBe(TransactionStatus.REVERSED);
    expect(billPayment.failureReason).toBe('provider rejected the payment');
    expect(billPayment.pullDomainEvents()[0].eventName).toBe('bills.payment.reversed');
  });

  it('rejects transitions out of a terminal state', () => {
    const billPayment = initiateBillPayment();
    billPayment.markSuccessful('flw-ref-1', null);

    expect(() => billPayment.markFailed('late failure')).toThrow(InvalidBillPaymentStateException);
    expect(() => billPayment.markReversed('late reversal')).toThrow(
      InvalidBillPaymentStateException,
    );
  });

  it('rejects marking PROCESSING twice', () => {
    const billPayment = initiateBillPayment();
    billPayment.markProcessing('flw-ref-1');
    expect(() => billPayment.markProcessing('flw-ref-2')).toThrow(InvalidBillPaymentStateException);
  });
});
