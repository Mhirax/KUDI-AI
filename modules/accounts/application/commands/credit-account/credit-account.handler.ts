import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreditAccountCommand } from './credit-account.command';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Use case: credit funds into an account (e.g. following a confirmed
 * Flutterwave funding webhook — the Integrations layer will dispatch
 * this command once wired in the Transfers/Funding module).
 */
@Injectable()
@CommandHandler(CreditAccountCommand)
export class CreditAccountHandler implements ICommandHandler<
  CreditAccountCommand,
  AccountResponseDto
> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreditAccountCommand): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }

    const amount = Money.fromDecimalString(command.amount, command.currency);
    account.credit(amount, command.reference);

    await this.accountRepository.save(account);
    account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return AccountResponseDto.fromDomain(account);
  }
}
