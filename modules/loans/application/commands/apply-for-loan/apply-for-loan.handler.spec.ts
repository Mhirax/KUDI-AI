import { EventBus } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { ApplyForLoanHandler } from './apply-for-loan.handler';
import { ApplyForLoanCommand } from './apply-for-loan.command';
import { ILoanRepository } from '../../../domain/repositories/loan.repository.interface';
import { ILoanEligibilityService } from '../../../domain/services/loan-eligibility.interface';
import { ILoanFeeCalculator } from '../../../domain/services/loan-fee-calculator.interface';
import { LoanStatus } from '../../../domain/enums/loan-status.enum';
import { LoanNotEligibleException } from '../../../domain/exceptions/loan-not-eligible.exception';
import { LoanAmountExceedsLimitException } from '../../../domain/exceptions/loan-amount-exceeds-limit.exception';
import { IAccountRepository } from '../../../../accounts/domain/repositories/account.repository.interface';
import { Account } from '../../../../accounts/domain/entities/account.entity';
import { AccountNumber } from '../../../../accounts/domain/value-objects/account-number.vo';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';

function activeWalletAccount(): Account {
  const account = Account.open({
    userId: 'user-1',
    accountNumber: AccountNumber.create('9990001111'),
    accountType: AccountType.WALLET,
    currency: Currency.NGN,
  });
  account.pullDomainEvents();
  account.activate();
  return account;
}

function command(amount = '50000.00'): ApplyForLoanCommand {
  return new ApplyForLoanCommand('user-1', 'account-1', amount, 30);
}

describe('ApplyForLoanHandler', () => {
  let loanRepository: jest.Mocked<ILoanRepository>;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let eligibilityService: jest.Mocked<ILoanEligibilityService>;
  let feeCalculator: jest.Mocked<ILoanFeeCalculator>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: ApplyForLoanHandler;

  beforeEach(() => {
    loanRepository = {
      findById: jest.fn(),
      findByReference: jest.fn(),
      findPageByUserId: jest.fn(),
      findPageAll: jest.fn(),
      save: jest.fn(),
    };
    accountRepository = {
      findById: jest.fn().mockResolvedValue(activeWalletAccount()),
      findByAccountNumber: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
    };
    eligibilityService = {
      assess: jest.fn().mockResolvedValue({
        isEligible: true,
        reason: null,
        maxPrincipalMinorUnits: 10_000_000n, // ₦100,000.00
      }),
    };
    feeCalculator = {
      calculate: jest.fn().mockResolvedValue(Money.fromDecimalString('5000.00', Currency.NGN)),
    };
    eventBus = { publish: jest.fn() };
    handler = new ApplyForLoanHandler(
      loanRepository,
      accountRepository,
      eligibilityService,
      feeCalculator,
      eventBus as unknown as EventBus,
    );
  });

  it('applies PENDING_REVIEW when eligible and within the principal ceiling', async () => {
    const response = await handler.execute(command());

    expect(response.status).toBe(LoanStatus.PENDING_REVIEW);
    expect(response.principal).toBe('50000.00');
    expect(response.fee).toBe('5000.00');
    expect(loanRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('rejects when the eligibility service says no', async () => {
    eligibilityService.assess.mockResolvedValue({
      isEligible: false,
      reason: 'BVN verification (KYC Tier 2) is required',
      maxPrincipalMinorUnits: 0n,
    });

    await expect(handler.execute(command())).rejects.toThrow(LoanNotEligibleException);
    expect(loanRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a principal above the tier ceiling', async () => {
    await expect(handler.execute(command('500000.00'))).rejects.toThrow(
      LoanAmountExceedsLimitException,
    );
    expect(loanRepository.save).not.toHaveBeenCalled();
  });

  it("refuses to apply against someone else's account", async () => {
    await expect(
      handler.execute(new ApplyForLoanCommand('intruder', 'account-1', '10000.00', 30)),
    ).rejects.toThrow(ForbiddenException);
    expect(eligibilityService.assess).not.toHaveBeenCalled();
  });
});
