import { Account } from './account.entity';
import { AccountNumber } from '../value-objects/account-number.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { AccountType } from '../enums/account-type.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { Currency } from '../../../../shared/enums/currency.enum';
import { InsufficientFundsException } from '../../../../shared/exceptions/insufficient-funds.exception';
import { AccountNotActiveException } from '../exceptions/account-not-active.exception';
import { AccountClosureNotAllowedException } from '../exceptions/account-closure-not-allowed.exception';
import { CurrencyMismatchException } from '../exceptions/currency-mismatch.exception';

function buildActiveAccount(): Account {
  const account = Account.open({
    userId: 'user-1',
    accountNumber: AccountNumber.create('9990001234'),
    accountType: AccountType.WALLET,
    currency: Currency.NGN,
  });
  account.pullDomainEvents(); // discard AccountOpenedEvent
  account.activate();
  return account;
}

describe('Account aggregate', () => {
  it('opens with zero balance and PENDING_VERIFICATION status', () => {
    const account = Account.open({
      userId: 'user-1',
      accountNumber: AccountNumber.create('9990001234'),
      accountType: AccountType.WALLET,
      currency: Currency.NGN,
    });

    expect(account.status).toBe(AccountStatus.PENDING_VERIFICATION);
    expect(account.balance.isZero()).toBe(true);
    expect(account.pullDomainEvents()[0].eventName).toBe('accounts.account.opened');
  });

  it('credits increase the balance and bump the version', () => {
    const account = buildActiveAccount();
    account.credit(Money.fromDecimalString('500.00', Currency.NGN), 'ref-1');
    expect(account.balance.toMajorUnitsString()).toBe('500.00');
    expect(account.version).toBe(2); // activate() + credit()
  });

  it('debits decrease the balance when funds are sufficient', () => {
    const account = buildActiveAccount();
    account.credit(Money.fromDecimalString('500.00', Currency.NGN), 'ref-1');
    account.debit(Money.fromDecimalString('200.00', Currency.NGN), 'ref-2');
    expect(account.balance.toMajorUnitsString()).toBe('300.00');
  });

  it('rejects a debit that would overdraw the account', () => {
    const account = buildActiveAccount();
    account.credit(Money.fromDecimalString('100.00', Currency.NGN), 'ref-1');
    expect(() => account.debit(Money.fromDecimalString('200.00', Currency.NGN), 'ref-2')).toThrow(
      InsufficientFundsException,
    );
  });

  it('rejects operations against a frozen account', () => {
    const account = buildActiveAccount();
    account.freeze('suspected fraud');
    expect(() => account.credit(Money.fromDecimalString('1.00', Currency.NGN), 'ref-1')).toThrow(
      AccountNotActiveException,
    );
  });

  it('rejects a currency mismatch between account and amount', () => {
    const account = buildActiveAccount(); // NGN account
    expect(() => account.credit(Money.fromDecimalString('1.00', Currency.USD), 'ref-1')).toThrow(
      CurrencyMismatchException,
    );
  });

  it('refuses to close an account with a non-zero balance', () => {
    const account = buildActiveAccount();
    account.credit(Money.fromDecimalString('1.00', Currency.NGN), 'ref-1');
    expect(() => account.close()).toThrow(AccountClosureNotAllowedException);
  });

  it('allows closing a zero-balance account', () => {
    const account = buildActiveAccount();
    account.close();
    expect(account.status).toBe(AccountStatus.CLOSED);
  });
});
