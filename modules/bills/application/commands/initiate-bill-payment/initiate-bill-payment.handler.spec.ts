import { EventBus } from '@nestjs/cqrs';
import { InitiateBillPaymentHandler } from './initiate-bill-payment.handler';
import { InitiateBillPaymentCommand } from './initiate-bill-payment.command';
import { IBillPaymentRepository } from '../../../domain/repositories/bill-payment.repository.interface';
import { IBillPaymentProvider } from '../../../domain/services/bill-payment-provider.interface';
import { IBillFeeCalculator } from '../../../domain/services/bill-fee-calculator.interface';
import { BillCategory } from '../../../domain/enums/bill-category.enum';
import { InvalidBillCustomerException } from '../../../domain/exceptions/invalid-bill-customer.exception';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../../shared/enums/transaction-status.enum';
import { Account } from '../../../../accounts/domain/entities/account.entity';
import { AccountNumber } from '../../../../accounts/domain/value-objects/account-number.vo';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import { IAccountRepository } from '../../../../accounts/domain/repositories/account.repository.interface';

function activeAccountWithBalance(balance: string): Account {
  const account = Account.open({
    userId: 'user-1',
    accountNumber: AccountNumber.create('9990001234'),
    accountType: AccountType.WALLET,
    currency: Currency.NGN,
  });
  account.pullDomainEvents();
  account.activate();
  account.credit(Money.fromDecimalString(balance, Currency.NGN), 'seed');
  account.pullDomainEvents();
  return account;
}

function command(): InitiateBillPaymentCommand {
  return new InitiateBillPaymentCommand(
    'user-1',
    'account-1',
    BillCategory.AIRTIME,
    'BIL099',
    'AT099',
    'MTN Nigeria',
    '08030000000',
    '1000.00',
  );
}

describe('InitiateBillPaymentHandler (saga)', () => {
  let accountRepository: jest.Mocked<IAccountRepository>;
  let billPaymentRepository: jest.Mocked<IBillPaymentRepository>;
  let billProvider: jest.Mocked<IBillPaymentProvider>;
  let feeCalculator: jest.Mocked<IBillFeeCalculator>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: InitiateBillPaymentHandler;
  let account: Account;

  beforeEach(() => {
    account = activeAccountWithBalance('5000.00');
    accountRepository = {
      findById: jest.fn().mockResolvedValue(account),
      findByAccountNumber: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
    };
    billPaymentRepository = {
      findById: jest.fn(),
      findByReference: jest.fn(),
      findPageByUserId: jest.fn(),
      save: jest.fn(),
    };
    billProvider = {
      getBillers: jest.fn(),
      validateCustomer: jest.fn().mockResolvedValue({ isValid: true, customerName: 'LESI O' }),
      payBill: jest.fn().mockResolvedValue({
        providerReference: 'flw-bill-1',
        isImmediatelySettled: true,
        valueToken: null,
      }),
      getStatus: jest.fn(),
    };
    feeCalculator = {
      calculate: jest.fn().mockResolvedValue(Money.zero(Currency.NGN)),
    };
    eventBus = { publish: jest.fn() };
    handler = new InitiateBillPaymentHandler(
      accountRepository,
      billPaymentRepository,
      billProvider,
      feeCalculator,
      eventBus as unknown as EventBus,
    );
  });

  it('debits the wallet and settles the bill on the happy path', async () => {
    const response = await handler.execute(command());

    expect(account.balance.toMajorUnitsString()).toBe('4000.00');
    expect(response.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(billPaymentRepository.save).toHaveBeenCalledTimes(2); // PENDING, then SUCCESSFUL
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('rejects an invalid bill customer before any money moves', async () => {
    billProvider.validateCustomer.mockResolvedValue({ isValid: false, customerName: null });

    await expect(handler.execute(command())).rejects.toThrow(InvalidBillCustomerException);

    expect(account.balance.toMajorUnitsString()).toBe('5000.00');
    expect(accountRepository.save).not.toHaveBeenCalled();
    expect(billProvider.payBill).not.toHaveBeenCalled();
  });

  it('compensates the debit and marks REVERSED when the provider fails synchronously', async () => {
    billProvider.payBill.mockRejectedValue(new Error('provider exploded'));

    await expect(handler.execute(command())).rejects.toThrow('provider exploded');

    // Same aggregate instance is re-fetched for compensation in this mock setup.
    expect(account.balance.toMajorUnitsString()).toBe('5000.00');

    // Asserted explicitly, rather than indexing .at(-1)[0] straight away:
    // .at() returns `T | undefined` under strictNullChecks, and asserting
    // the call actually happened turns "no calls" into a clear test
    // failure instead of a TypeError pointing at the wrong line.
    expect(billPaymentRepository.save).toHaveBeenCalled();
    const calls = billPaymentRepository.save.mock.calls;
    const lastSaved = calls[calls.length - 1][0];
    expect(lastSaved.status).toBe(TransactionStatus.REVERSED);
  });

  it("refuses to pay from someone else's account", async () => {
    const foreign = new InitiateBillPaymentCommand(
      'intruder',
      'account-1',
      BillCategory.AIRTIME,
      'BIL099',
      'AT099',
      'MTN Nigeria',
      '08030000000',
      '1000.00',
    );

    await expect(handler.execute(foreign)).rejects.toThrow('your own accounts');
  });

  it('marks PROCESSING when the provider does not settle synchronously', async () => {
    billProvider.payBill.mockResolvedValue({
      providerReference: 'flw-bill-2',
      isImmediatelySettled: false,
      valueToken: null,
    });

    const response = await handler.execute(command());

    expect(response.status).toBe(TransactionStatus.PROCESSING);
  });
});
