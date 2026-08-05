import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateCheckoutDepositCommand } from './initiate-checkout-deposit.command';
import {
  DEPOSIT_REPOSITORY,
  IDepositRepository,
} from '../../../domain/repositories/deposit.repository.interface';
import {
  FUNDING_PROVIDER,
  IFundingProvider,
} from '../../../domain/services/funding-provider.interface';
import { Deposit } from '../../../domain/entities/deposit.entity';
import { DepositChannel } from '../../../domain/enums/deposit-channel.enum';
import { CheckoutSessionResponseDto } from '../../dto/checkout-session-response.dto';
import { DepositResponseDto } from '../../dto/deposit-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependencies on published ports only.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';
import { AccountNotActiveException } from '../../../../accounts/domain/exceptions/account-not-active.exception';
import { AccountStatus } from '../../../../../shared/enums/account-status.enum';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: start a hosted-checkout wallet funding. Creates the
 * Deposit (PENDING) *before* contacting the provider — our reference
 * is the provider's tx_ref, so the deposit row must exist for the
 * settlement webhook to find no matter how the checkout ends. The
 * customer completes payment on Flutterwave's hosted page; settlement
 * arrives asynchronously via ConfirmDepositCommand.
 */
@Injectable()
@CommandHandler(InitiateCheckoutDepositCommand)
export class InitiateCheckoutDepositHandler implements ICommandHandler<
  InitiateCheckoutDepositCommand,
  CheckoutSessionResponseDto
> {
  constructor(
    @Inject(DEPOSIT_REPOSITORY) private readonly depositRepository: IDepositRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(FUNDING_PROVIDER) private readonly fundingProvider: IFundingProvider,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InitiateCheckoutDepositCommand): Promise<CheckoutSessionResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only fund your own accounts');
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new AccountNotActiveException(account.id, account.status);
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new ForbiddenException('User account unavailable');
    }

    const amount = Money.fromDecimalString(command.amount, account.currency);

    const deposit = Deposit.initiate({
      channel: DepositChannel.CHECKOUT,
      userId: command.userId,
      accountId: command.accountId,
      amount,
    });

    // Persist first: the webhook must be able to find this deposit even
    // if our process dies between provider call and response handling.
    await this.depositRepository.save(deposit);
    deposit.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    const checkout = await this.fundingProvider.initiateCheckout({
      reference: deposit.reference.getValue(),
      amount,
      userEmail: user.email.getValue(),
      userFullName: `${user.firstName} ${user.lastName}`,
    });

    return {
      deposit: DepositResponseDto.fromDomain(deposit),
      paymentLink: checkout.paymentLink,
    };
  }
}
