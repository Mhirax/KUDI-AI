import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OpenAccountCommand } from './open-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import {
  ACCOUNT_NUMBER_GENERATOR,
  IAccountNumberGenerator,
} from '../../../domain/services/account-number-generator.interface';
import { Account } from '../../../domain/entities/account.entity';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: open a new account/wallet for a user. Accounts start in
 * PENDING_VERIFICATION and are activated once KYC reaches TIER_2 — see
 * modules/accounts/application/event-handlers/kyc-tier-upgraded.handler.ts,
 * which reacts to Compliance's KycTierUpgradedEvent. This handler only
 * opens the account shell; it has no dependency on Compliance at all.
 */
@Injectable()
@CommandHandler(OpenAccountCommand)
export class OpenAccountHandler implements ICommandHandler<OpenAccountCommand, AccountResponseDto> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(ACCOUNT_NUMBER_GENERATOR)
    private readonly accountNumberGenerator: IAccountNumberGenerator,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: OpenAccountCommand): Promise<AccountResponseDto> {
    const accountNumber = await this.accountNumberGenerator.generate();

    const account = Account.open({
      userId: command.userId,
      accountNumber,
      accountType: command.accountType,
      currency: command.currency,
    });

    await this.accountRepository.save(account);

    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
