import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FreezeAccountCommand } from './freeze-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: freeze an account (e.g. fraud hold, compliance
 * instruction). Restricted to administrative/compliance roles at the
 * presentation layer.
 */
@Injectable()
@CommandHandler(FreezeAccountCommand)
export class FreezeAccountHandler
  implements ICommandHandler<FreezeAccountCommand, AccountResponseDto>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    account.freeze(command.reason);
    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
