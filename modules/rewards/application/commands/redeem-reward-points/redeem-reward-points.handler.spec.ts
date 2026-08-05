import { CommandBus, EventBus } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { RedeemRewardPointsHandler } from './redeem-reward-points.handler';
import { RedeemRewardPointsCommand } from './redeem-reward-points.command';
import { IRewardAccountRepository } from '../../../domain/repositories/reward-account.repository.interface';
import { IRewardTransactionRepository } from '../../../domain/repositories/reward-transaction.repository.interface';
import { IRewardPointsCalculator } from '../../../domain/services/reward-points-calculator.interface';
import { RewardAccount } from '../../../domain/entities/reward-account.entity';
import { RewardAccountNotFoundException } from '../../../domain/exceptions/reward-account-not-found.exception';
import { InsufficientRewardPointsException } from '../../../domain/exceptions/insufficient-reward-points.exception';
import { RedemptionType } from '../../../domain/enums/redemption-type.enum';
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';
import { InitiateBillPaymentCommand } from '../../../../bills/application/commands/initiate-bill-payment/initiate-bill-payment.command';

function accountWithPoints(points: number): RewardAccount {
  const account = RewardAccount.open('user-1');
  account.earn(points, null);
  account.pullDomainEvents();
  return account;
}

describe('RedeemRewardPointsHandler', () => {
  let rewardAccountRepository: jest.Mocked<IRewardAccountRepository>;
  let rewardTransactionRepository: jest.Mocked<IRewardTransactionRepository>;
  let pointsCalculator: jest.Mocked<IRewardPointsCalculator>;
  let commandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: RedeemRewardPointsHandler;

  beforeEach(() => {
    rewardAccountRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue(accountWithPoints(500)),
      findByReferralCode: jest.fn(),
      save: jest.fn(),
    };
    rewardTransactionRepository = {
      findPageByUserId: jest.fn(),
      existsBySourceEventId: jest.fn(),
      save: jest.fn(),
    };
    pointsCalculator = {
      calculatePointsForAmount: jest.fn(),
      calculateRedemptionValueMinorUnits: jest.fn().mockReturnValue(10_000n), // 100 points -> ₦100.00
    };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    eventBus = { publish: jest.fn() };
    handler = new RedeemRewardPointsHandler(
      rewardAccountRepository,
      rewardTransactionRepository,
      pointsCalculator,
      commandBus as unknown as CommandBus,
      eventBus as unknown as EventBus,
    );
  });

  it('credits the Naira-equivalent value for a CASHBACK redemption', async () => {
    const response = await handler.execute(
      new RedeemRewardPointsCommand(
        'user-1',
        100,
        RedemptionType.CASHBACK,
        'account-1',
        undefined,
        undefined,
        undefined,
        undefined,
      ),
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const creditCommand = commandBus.execute.mock.calls[0][0] as CreditAccountCommand;
    expect(creditCommand).toBeInstanceOf(CreditAccountCommand);
    expect(creditCommand.amount).toBe('100.00');
    expect(response.pointsBalance).toBe(400);
    expect(rewardTransactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('chains into Bills for an AIRTIME redemption', async () => {
    await handler.execute(
      new RedeemRewardPointsCommand(
        'user-1',
        100,
        RedemptionType.AIRTIME,
        'account-1',
        'BIL099',
        'AT099',
        'MTN Nigeria',
        '08030000000',
      ),
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(2);
    expect(commandBus.execute.mock.calls[1][0]).toBeInstanceOf(InitiateBillPaymentCommand);
  });

  it('rejects AIRTIME/DATA redemption missing biller details', async () => {
    await expect(
      handler.execute(
        new RedeemRewardPointsCommand(
          'user-1',
          100,
          RedemptionType.AIRTIME,
          'account-1',
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires an accountId to receive the redemption value', async () => {
    await expect(
      handler.execute(
        new RedeemRewardPointsCommand(
          'user-1',
          100,
          RedemptionType.CASHBACK,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('throws RewardAccountNotFoundException when the caller has no reward account', async () => {
    rewardAccountRepository.findByUserId.mockResolvedValue(null);

    await expect(
      handler.execute(
        new RedeemRewardPointsCommand(
          'user-1',
          100,
          RedemptionType.CASHBACK,
          'account-1',
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ),
    ).rejects.toThrow(RewardAccountNotFoundException);
  });

  it('propagates InsufficientRewardPointsException from the aggregate without crediting anything', async () => {
    rewardAccountRepository.findByUserId.mockResolvedValue(accountWithPoints(10));

    await expect(
      handler.execute(
        new RedeemRewardPointsCommand(
          'user-1',
          100,
          RedemptionType.CASHBACK,
          'account-1',
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ),
    ).rejects.toThrow(InsufficientRewardPointsException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
