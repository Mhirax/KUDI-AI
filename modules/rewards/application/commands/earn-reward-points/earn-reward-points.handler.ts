import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EarnRewardPointsCommand } from './earn-reward-points.command';
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
import { RewardAccount } from '../../../domain/entities/reward-account.entity';
import { RewardTransaction } from '../../../domain/entities/reward-transaction.entity';
import { RewardTransactionType } from '../../../domain/enums/reward-transaction-type.enum';

/**
 * Use case: award points for a completed, money-moving activity
 * elsewhere on the platform. Idempotent by construction — `sourceEventId`
 * is unique at the persistence layer, so re-delivery of the same
 * upstream domain event (e.g. an at-least-once RabbitMQ redelivery)
 * is a logged no-op rather than double-crediting points. Mirrors
 * Ledger's AccountCreditedLedgerHandler idempotency discipline.
 */
@Injectable()
@CommandHandler(EarnRewardPointsCommand)
export class EarnRewardPointsHandler implements ICommandHandler<EarnRewardPointsCommand, void> {
  private readonly logger = new Logger(EarnRewardPointsHandler.name);

  constructor(
    @Inject(REWARD_ACCOUNT_REPOSITORY)
    private readonly rewardAccountRepository: IRewardAccountRepository,
    @Inject(REWARD_TRANSACTION_REPOSITORY)
    private readonly rewardTransactionRepository: IRewardTransactionRepository,
    @Inject(REWARD_POINTS_CALCULATOR) private readonly pointsCalculator: IRewardPointsCalculator,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: EarnRewardPointsCommand): Promise<void> {
    const alreadyProcessed = await this.rewardTransactionRepository.existsBySourceEventId(
      command.sourceEventId,
    );
    if (alreadyProcessed) {
      this.logger.warn(`Reward-earning event ${command.sourceEventId} already processed; skipping`);
      return;
    }

    const points = this.pointsCalculator.calculatePointsForAmount(command.amountMinorUnits);
    if (points <= 0) {
      return;
    }

    let account = await this.rewardAccountRepository.findByUserId(command.userId);
    if (!account) {
      // Persist the new account at version 0 before mutating it.
      //
      // The repository decides between insert and update by version:
      // `version - 1 < 0` means insert. earn() calls touch(), which bumps
      // the version to 1, so a freshly opened account went down the update
      // path against a row that did not exist yet — updateMany matched
      // nothing and raised CONCURRENT_MODIFICATION. The effect was that
      // every user's first ever reward-earning event failed, reported as a
      // concurrency conflict that had not happened.
      account = RewardAccount.open(command.userId);
      await this.rewardAccountRepository.save(account);
    }

    account.earn(points, command.sourceReference);
    await this.rewardAccountRepository.save(account);

    const transaction = RewardTransaction.record({
      userId: command.userId,
      type: RewardTransactionType.EARNED,
      points,
      description: command.description,
      sourceEventId: command.sourceEventId,
      sourceReference: command.sourceReference,
    });
    await this.rewardTransactionRepository.save(transaction);

    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
  }
}
