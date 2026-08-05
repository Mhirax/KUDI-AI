import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RequestPhysicalCardCommand } from './request-physical-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { Card } from '../../../domain/entities/card.entity';
import { CardNotEligibleException } from '../../../domain/exceptions/card-not-eligible.exception';
import { CardResponseDto } from '../../dto/card-response.dto';

import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';
import { AccountStatus } from '../../../../../shared/enums/account-status.enum';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../../compliance/domain/repositories/kyc-profile.repository.interface';
import { KycTier } from '../../../../compliance/domain/enums/kyc-tier.enum';

/**
 * Use case: request a physical card. Unlike virtual issuance, this
 * does NOT call Flutterwave synchronously — physical card fulfillment
 * (printing, embossing, courier dispatch) is an offline/logistics
 * process in every card-issuing program. The card is recorded PENDING
 * and left for an ops workflow (not built in this phase) to progress;
 * see module README for what a later phase would add.
 */
@Injectable()
@CommandHandler(RequestPhysicalCardCommand)
export class RequestPhysicalCardHandler implements ICommandHandler<
  RequestPhysicalCardCommand,
  CardResponseDto
> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RequestPhysicalCardCommand): Promise<CardResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only request a card against your own account');
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new CardNotEligibleException('linked account is not active');
    }

    const kycProfile = await this.kycProfileRepository.findByUserId(command.userId);
    if (!kycProfile || kycProfile.tier === KycTier.TIER_1) {
      throw new CardNotEligibleException(
        'BVN verification (KYC Tier 2) is required before requesting a card',
      );
    }

    const card = Card.requestPhysical({
      userId: command.userId,
      accountId: command.accountId,
      currency: account.currency,
    });

    await this.cardRepository.save(card);
    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}
