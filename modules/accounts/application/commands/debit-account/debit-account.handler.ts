import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DebitAccountCommand } from './debit-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: debit funds from an account. `Account.debit()` enforces
 * sufficient-funds and active-status invariants; this handler only
 * orchestrates lookup, persistence, and event publication.
 */
@Injectable()
@CommandHandler(DebitAccountCommand)
export class DebitAccountHandler implements ICommandHandler<
  DebitAccountCommand,
  AccountResponseDto
> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DebitAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    const amount = Money.fromDecimalString(command.amount, command.currency);
    account.debit(amount, command.reference);

    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
