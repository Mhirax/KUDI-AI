import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ActivateAccountCommand } from './activate-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: activate a PENDING_VERIFICATION account. Triggered
 * automatically by `KycTierUpgradedHandler` (see
 * ../../event-handlers/kyc-tier-upgraded.handler.ts) once a user
 * reaches KYC TIER_2 — not exposed as a direct HTTP endpoint, since
 * activation is a consequence of KYC status, not a standalone action a
 * caller should be able to invoke arbitrarily.
 */
@Injectable()
@CommandHandler(ActivateAccountCommand)
export class ActivateAccountHandler
  implements ICommandHandler<ActivateAccountCommand, AccountResponseDto>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ActivateAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    account.activate();
    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
