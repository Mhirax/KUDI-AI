import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RedeemReferralCodeCommand } from './redeem-referral-code.command';
import {
  REWARD_ACCOUNT_REPOSITORY,
  IRewardAccountRepository,
} from '../../../domain/repositories/reward-account.repository.interface';
import {
  REFERRAL_REDEMPTION_REPOSITORY,
  IReferralRedemptionRepository,
} from '../../../domain/repositories/referral-redemption.repository.interface';
import { RewardAccount } from '../../../domain/entities/reward-account.entity';
import { InvalidReferralCodeException } from '../../../domain/exceptions/invalid-referral-code.exception';
import { ReferralAlreadyUsedException } from '../../../domain/exceptions/referral-already-used.exception';
import { RewardSummaryResponseDto } from '../../dto/reward-summary-response.dto';

/** Flat bonus, illustrative — not final pricing (mirrors Bills' fee-schedule comment style). */
const REFERRER_BONUS_POINTS = 500;
const REFEREE_BONUS_POINTS = 200;

/**
 * Use case: redeem a referral code. A referee may redeem exactly one
 * code, ever (enforced by ReferralRedemption's unique refereeUserId).
 * Both parties are credited in the same use case so the bonus is
 * atomic from the caller's point of view — there is no window where
 * only one side has been paid.
 */
@Injectable()
@CommandHandler(RedeemReferralCodeCommand)
export class RedeemReferralCodeHandler implements ICommandHandler<
  RedeemReferralCodeCommand,
  RewardSummaryResponseDto
> {
  constructor(
    @Inject(REWARD_ACCOUNT_REPOSITORY)
    private readonly rewardAccountRepository: IRewardAccountRepository,
    @Inject(REFERRAL_REDEMPTION_REPOSITORY)
    private readonly referralRedemptionRepository: IReferralRedemptionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RedeemReferralCodeCommand): Promise<RewardSummaryResponseDto> {
    const alreadyRedeemed = await this.referralRedemptionRepository.hasRefereeRedeemed(
      command.userId,
    );
    if (alreadyRedeemed) {
      throw new ReferralAlreadyUsedException(command.userId);
    }

    const referrerAccount = await this.rewardAccountRepository.findByReferralCode(
      command.referralCode,
    );
    if (!referrerAccount || referrerAccount.userId === command.userId) {
      throw new InvalidReferralCodeException(command.referralCode);
    }

    let refereeAccount = await this.rewardAccountRepository.findByUserId(command.userId);
    if (!refereeAccount) {
      // Persist at version 0 before the bonus mutates it: the repository
      // routes on version, and awardReferralBonus() bumps it, which would
      // send a brand-new account down the update path against a row that
      // does not exist. See EarnRewardPointsHandler for the same fix.
      refereeAccount = RewardAccount.open(command.userId);
      await this.rewardAccountRepository.save(refereeAccount);
    }

    referrerAccount.awardReferralBonus(REFERRER_BONUS_POINTS, 'REFERRER');
    refereeAccount.awardReferralBonus(REFEREE_BONUS_POINTS, 'REFEREE');

    await this.rewardAccountRepository.save(referrerAccount);
    await this.rewardAccountRepository.save(refereeAccount);
    await this.referralRedemptionRepository.save({
      id: randomUUID(),
      referralCode: command.referralCode,
      referrerUserId: referrerAccount.userId,
      refereeUserId: command.userId,
      createdAt: new Date(),
    });

    [...referrerAccount.pullDomainEvents(), ...refereeAccount.pullDomainEvents()].forEach((event) =>
      this.eventBus.publish(event),
    );

    return RewardSummaryResponseDto.fromDomain(refereeAccount);
  }
}
