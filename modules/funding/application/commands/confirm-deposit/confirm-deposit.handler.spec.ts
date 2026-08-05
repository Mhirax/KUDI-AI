import { EventBus } from '@nestjs/cqrs';
import { ConfirmDepositHandler } from './confirm-deposit.handler';
import { ConfirmDepositCommand } from './confirm-deposit.command';
import { Deposit } from '../../../domain/entities/deposit.entity';
import { DepositChannel } from '../../../domain/enums/deposit-channel.enum';
import { VirtualAccount } from '../../../domain/entities/virtual-account.entity';
import { IDepositRepository } from '../../../domain/repositories/deposit.repository.interface';
import { IVirtualAccountRepository } from '../../../domain/repositories/virtual-account.repository.interface';
import {
  IFundingProvider,
  VerifiedProviderTransaction,
} from '../../../domain/services/funding-provider.interface';
import { IDepositSettlementExecutor } from '../../../domain/services/deposit-settlement-executor.interface';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../../shared/enums/transaction-status.enum';

describe('ConfirmDepositHandler', () => {
  let depositRepository: jest.Mocked<IDepositRepository>;
  let virtualAccountRepository: jest.Mocked<IVirtualAccountRepository>;
  let fundingProvider: jest.Mocked<IFundingProvider>;
  let settlementExecutor: jest.Mocked<IDepositSettlementExecutor>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: ConfirmDepositHandler;

  function pendingCheckoutDeposit(): Deposit {
    const deposit = Deposit.initiate({
      channel: DepositChannel.CHECKOUT,
      userId: 'user-1',
      accountId: 'account-1',
      amount: Money.fromDecimalString('1500.00', Currency.NGN),
    });
    deposit.pullDomainEvents();
    return deposit;
  }

  function verified(
    overrides: Partial<VerifiedProviderTransaction> = {},
  ): VerifiedProviderTransaction {
    return {
      providerTransactionId: 'flw-100',
      reference: 'KUDI-DEP-0123456789AB',
      amountMinorUnits: 150000n,
      currency: 'NGN',
      isSuccessful: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    depositRepository = {
      findById: jest.fn(),
      findByReference: jest.fn(),
      findByProviderTransactionId: jest.fn().mockResolvedValue(null),
      findPageByUserId: jest.fn(),
      save: jest.fn(),
    };
    virtualAccountRepository = {
      findByAccountId: jest.fn(),
      findByProviderReference: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
    };
    fundingProvider = {
      createVirtualAccount: jest.fn(),
      initiateCheckout: jest.fn(),
      verifyTransaction: jest.fn(),
    };
    settlementExecutor = {
      settle: jest.fn().mockImplementation(async ({ deposit }) => ({ deposit, events: [] })),
    };
    eventBus = { publish: jest.fn() };
    handler = new ConfirmDepositHandler(
      depositRepository,
      virtualAccountRepository,
      fundingProvider,
      settlementExecutor,
      eventBus as unknown as EventBus,
    );
  });

  it('skips settlement when the provider transaction was already settled', async () => {
    depositRepository.findByProviderTransactionId.mockResolvedValue(pendingCheckoutDeposit());

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(fundingProvider.verifyTransaction).not.toHaveBeenCalled();
    expect(settlementExecutor.settle).not.toHaveBeenCalled();
  });

  it('settles a verified successful checkout deposit', async () => {
    const deposit = pendingCheckoutDeposit();
    fundingProvider.verifyTransaction.mockResolvedValue(verified());
    depositRepository.findByReference.mockResolvedValue(deposit);

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).toHaveBeenCalledWith({
      deposit,
      providerTransactionId: 'flw-100',
      alreadyPersisted: true,
    });
  });

  it('fails a checkout deposit whose verified amount does not match', async () => {
    const deposit = pendingCheckoutDeposit();
    fundingProvider.verifyTransaction.mockResolvedValue(verified({ amountMinorUnits: 999n }));
    depositRepository.findByReference.mockResolvedValue(deposit);

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).not.toHaveBeenCalled();
    expect(deposit.status).toBe(TransactionStatus.FAILED);
    expect(depositRepository.save).toHaveBeenCalled();
  });

  it('fails a checkout deposit the provider reports as unsuccessful', async () => {
    const deposit = pendingCheckoutDeposit();
    fundingProvider.verifyTransaction.mockResolvedValue(verified({ isSuccessful: false }));
    depositRepository.findByReference.mockResolvedValue(deposit);

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).not.toHaveBeenCalled();
    expect(deposit.status).toBe(TransactionStatus.FAILED);
  });

  it('creates and settles a deposit for a virtual-account credit', async () => {
    fundingProvider.verifyTransaction.mockResolvedValue(
      verified({ reference: 'KUDI-VA-0123456789AB' }),
    );
    virtualAccountRepository.findByProviderReference.mockResolvedValue(
      VirtualAccount.create({
        userId: 'user-1',
        accountId: 'account-1',
        virtualAccountNumber: '9977001234',
        bankName: 'Wema Bank',
        providerReference: 'KUDI-VA-0123456789AB',
      }),
    );

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).toHaveBeenCalledTimes(1);
    const settleArgs = settlementExecutor.settle.mock.calls[0][0];
    expect(settleArgs.alreadyPersisted).toBe(false);
    expect(settleArgs.deposit.channel).toBe(DepositChannel.VIRTUAL_ACCOUNT);
    expect(settleArgs.deposit.amount.getMinorUnits()).toBe(150000n);
    expect(settleArgs.deposit.userId).toBe('user-1');
  });

  it('ignores unsuccessful virtual-account transactions without creating rows', async () => {
    fundingProvider.verifyTransaction.mockResolvedValue(
      verified({ reference: 'KUDI-VA-0123456789AB', isSuccessful: false }),
    );
    virtualAccountRepository.findByProviderReference.mockResolvedValue(
      VirtualAccount.create({
        userId: 'user-1',
        accountId: 'account-1',
        virtualAccountNumber: '9977001234',
        bankName: 'Wema Bank',
        providerReference: 'KUDI-VA-0123456789AB',
      }),
    );

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).not.toHaveBeenCalled();
    expect(depositRepository.save).not.toHaveBeenCalled();
  });

  it('throws (so the webhook retries) when a checkout reference has no deposit row', async () => {
    fundingProvider.verifyTransaction.mockResolvedValue(verified());
    depositRepository.findByReference.mockResolvedValue(null);

    await expect(handler.execute(new ConfirmDepositCommand('flw-100'))).rejects.toThrow();
  });

  it('ignores transactions with unrecognized references', async () => {
    fundingProvider.verifyTransaction.mockResolvedValue(verified({ reference: 'something-else' }));

    await handler.execute(new ConfirmDepositCommand('flw-100'));

    expect(settlementExecutor.settle).not.toHaveBeenCalled();
  });
});
