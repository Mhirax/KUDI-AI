import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CloseAccountCommand } from './close-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: close an account. `Account.close()` enforces the
 * zero-balance invariant, throwing `AccountClosureNotAllowedException`
 * (422) otherwise.
 */
@Injectable()
@CommandHandler(CloseAccountCommand)
export class CloseAccountHandler implements ICommandHandler<
  CloseAccountCommand,
  AccountResponseDto
> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CloseAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    account.close();
    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
