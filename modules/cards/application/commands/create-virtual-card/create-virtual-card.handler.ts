import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateVirtualCardCommand } from './create-virtual-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CARD_ISSUER, ICardIssuer } from '../../../domain/services/card-issuer.interface';
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
import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: issue a virtual card, backed by one of the caller's own
 * active accounts. Virtual issuance is synchronous against
 * Flutterwave's Issuing API — the card is created ACTIVE in the same
 * request, unlike physical cards which stay PENDING for offline
 * fulfillment (see RequestPhysicalCardHandler / module README).
 * Requires KYC Tier 2+, same bar as Loans.
 */
@Injectable()
@CommandHandler(CreateVirtualCardCommand)
export class CreateVirtualCardHandler implements ICommandHandler<
  CreateVirtualCardCommand,
  CardResponseDto
> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(CARD_ISSUER) private readonly cardIssuer: ICardIssuer,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateVirtualCardCommand): Promise<CardResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only issue a card against your own account');
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new CardNotEligibleException('linked account is not active');
    }

    const kycProfile = await this.kycProfileRepository.findByUserId(command.userId);
    if (!kycProfile || kycProfile.tier === KycTier.TIER_1) {
      throw new CardNotEligibleException(
        'BVN verification (KYC Tier 2) is required before issuing a card',
      );
    }

    const user = await this.userRepository.findById(command.userId);
    const billingName = user ? `${user.firstName} ${user.lastName}` : command.userId;

    const card = Card.createVirtual({
      userId: command.userId,
      accountId: command.accountId,
      currency: account.currency,
    });

    const issued = await this.cardIssuer.issueVirtualCard({
      billingName,
      currency: account.currency,
    });
    card.activate(issued);

    await this.cardRepository.save(card);
    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}
