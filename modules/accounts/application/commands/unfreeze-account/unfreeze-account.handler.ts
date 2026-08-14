import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UnfreezeAccountCommand } from './unfreeze-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

@Injectable()
@CommandHandler(UnfreezeAccountCommand)
export class UnfreezeAccountHandler
  implements ICommandHandler<UnfreezeAccountCommand, AccountResponseDto>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UnfreezeAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    account.unfreeze();
    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
