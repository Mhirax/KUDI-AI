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
import { AccountLimitExceededException } from '../../../domain/exceptions/account-limit-exceeded.exception';
import { AccountStatus } from '../../../../../shared/enums/account-status.enum';

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
  // Nothing stopped a single user from opening accounts without limit,
  // and each one is a real NUBAN-style account number consumed from a
  // finite generator plus a standing row every downstream query has to
  // scan. Ten open accounts covers every legitimate combination of
  // WALLET/SAVINGS/CURRENT in more than one currency with room to
  // spare; CLOSED accounts don't count against it, so closing old ones
  // frees the slot back up. An engineering safety default, adjustable,
  // not a product policy.
  private static readonly MAX_ACCOUNTS_PER_USER = 10;

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(ACCOUNT_NUMBER_GENERATOR)
    private readonly accountNumberGenerator: IAccountNumberGenerator,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: OpenAccountCommand): Promise<AccountResponseDto> {
    const existingAccounts = await this.accountRepository.findAllByUserId(command.userId);
    const openAccounts = existingAccounts.filter(
      (existing) => existing.status !== AccountStatus.CLOSED,
    );

    if (openAccounts.length >= OpenAccountHandler.MAX_ACCOUNTS_PER_USER) {
      throw new AccountLimitExceededException(
        command.userId,
        OpenAccountHandler.MAX_ACCOUNTS_PER_USER,
      );
    }

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
