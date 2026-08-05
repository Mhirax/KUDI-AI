import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RedeemRewardPointsCommand } from './redeem-reward-points.command';
import {
  REWARD_ACCOUNT_REPOSITORY,
  IRewardAccountRepository,
} from '../../../domain/repositories/reward-account.repository.interface';
import {
  REWARD_TRANSACTION_REPOSITORY,
  IRewardTransactionRepository,
} from '../../../domain/repositories/reward-transaction.repository.interface';
import {
  REWARD_POINTS_CALCULATOR,
  IRewardPointsCalculator,
} from '../../../domain/services/reward-points-calculator.interface';
import { RewardAccountNotFoundException } from '../../../domain/exceptions/reward-account-not-found.exception';
import { RewardTransaction } from '../../../domain/entities/reward-transaction.entity';
import { RewardTransactionType } from '../../../domain/enums/reward-transaction-type.enum';
import { RedemptionType } from '../../../domain/enums/redemption-type.enum';
import { RewardSummaryResponseDto } from '../../dto/reward-summary-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';

// Cross-module dependencies, consumed exclusively through their
// exported commands — redemption reuses real money-movement paths
// (Accounts for cashback, Bills for airtime/data) instead of
// reimplementing them.
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';
import { InitiateBillPaymentCommand } from '../../../../bills/application/commands/initiate-bill-payment/initiate-bill-payment.command';
import { BillCategory } from '../../../../bills/domain/enums/bill-category.enum';

/**
 * Use case: redeem reward points. Every redemption type first credits
 * the Naira-equivalent value into the customer's wallet via Accounts'
 * own CreditAccountCommand (so the Ledger records exactly what a
 * reward redemption is worth, same as any other credit) — CASHBACK
 * stops there; AIRTIME/DATA immediately chains into Bills' own
 * InitiateBillPaymentCommand using that same amount, so the actual
 * airtime/data purchase runs through Bills' real Flutterwave
 * integration rather than a bespoke one built just for Rewards.
 */
@Injectable()
@CommandHandler(RedeemRewardPointsCommand)
export class RedeemRewardPointsHandler implements ICommandHandler<
  RedeemRewardPointsCommand,
  RewardSummaryResponseDto
> {
  constructor(
    @Inject(REWARD_ACCOUNT_REPOSITORY)
    private readonly rewardAccountRepository: IRewardAccountRepository,
    @Inject(REWARD_TRANSACTION_REPOSITORY)
    private readonly rewardTransactionRepository: IRewardTransactionRepository,
    @Inject(REWARD_POINTS_CALCULATOR) private readonly pointsCalculator: IRewardPointsCalculator,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RedeemRewardPointsCommand): Promise<RewardSummaryResponseDto> {
    const account = await this.rewardAccountRepository.findByUserId(command.userId);
    if (!account) {
      throw new RewardAccountNotFoundException(command.userId);
    }
    if (!command.accountId) {
      throw new BadRequestException('accountId is required to receive the redemption value');
    }

    account.redeem(command.points, command.redemptionType);
    await this.rewardAccountRepository.save(account);

    const valueMinorUnits = this.pointsCalculator.calculateRedemptionValueMinorUnits(
      command.points,
    );
    const valueDecimal = Money.fromMinorUnits(valueMinorUnits, Currency.NGN).toMajorUnitsString();
    const reference = `KUDI-REWARD-${account.id}-${Date.now()}`;

    await this.commandBus.execute(
      new CreditAccountCommand(command.accountId, valueDecimal, Currency.NGN, reference),
    );

    if (
      command.redemptionType === RedemptionType.AIRTIME ||
      command.redemptionType === RedemptionType.DATA
    ) {
      if (
        !command.billerCode ||
        !command.itemCode ||
        !command.billerName ||
        !command.customerIdentifier
      ) {
        throw new BadRequestException(
          'billerCode, itemCode, billerName and customerIdentifier are required for AIRTIME/DATA redemption',
        );
      }
      await this.commandBus.execute(
        new InitiateBillPaymentCommand(
          command.userId,
          command.accountId,
          command.redemptionType === RedemptionType.AIRTIME
            ? BillCategory.AIRTIME
            : BillCategory.MOBILE_DATA,
          command.billerCode,
          command.itemCode,
          command.billerName,
          command.customerIdentifier,
          valueDecimal,
        ),
      );
    }

    const transaction = RewardTransaction.record({
      userId: command.userId,
      type: RewardTransactionType.REDEEMED,
      points: -command.points,
      description: `Redeemed ${command.points} points for ${command.redemptionType}`,
      sourceReference: reference,
      redemptionType: command.redemptionType,
    });
    await this.rewardTransactionRepository.save(transaction);

    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return RewardSummaryResponseDto.fromDomain(account);
  }
}
