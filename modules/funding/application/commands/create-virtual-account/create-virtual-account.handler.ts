import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateVirtualAccountCommand } from './create-virtual-account.command';
import {
  IVirtualAccountRepository,
  VIRTUAL_ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/virtual-account.repository.interface';
import {
  FUNDING_PROVIDER,
  IFundingProvider,
} from '../../../domain/services/funding-provider.interface';
import { VirtualAccount } from '../../../domain/entities/virtual-account.entity';
import { VirtualAccountAlreadyExistsException } from '../../../domain/exceptions/virtual-account-already-exists.exception';
import { VirtualAccountResponseDto } from '../../dto/virtual-account-response.dto';
import { APP_NAME } from '../../../../../shared/constants';
import { randomBytes } from 'crypto';

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
 * Use case: issue a customer a dedicated (permanent) virtual account
 * number for funding one of their wallet accounts by bank transfer.
 *
 * Guards: the wallet must exist, belong to the caller, and be ACTIVE
 * (a frozen/pending wallet cannot accept credits, so issuing an
 * inbound account number for it would strand incoming funds); the
 * caller must exist and be usable. One virtual account per wallet —
 * enforced both here (fast feedback) and by the database unique
 * constraint (the authoritative check).
 */
@Injectable()
@CommandHandler(CreateVirtualAccountCommand)
export class CreateVirtualAccountHandler implements ICommandHandler<
  CreateVirtualAccountCommand,
  VirtualAccountResponseDto
> {
  constructor(
    @Inject(VIRTUAL_ACCOUNT_REPOSITORY)
    private readonly virtualAccountRepository: IVirtualAccountRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(FUNDING_PROVIDER) private readonly fundingProvider: IFundingProvider,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateVirtualAccountCommand): Promise<VirtualAccountResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only create virtual accounts for your own accounts');
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new AccountNotActiveException(account.id, account.status);
    }

    const existing = await this.virtualAccountRepository.findByAccountId(command.accountId);
    if (existing) {
      throw new VirtualAccountAlreadyExistsException(command.accountId);
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      // A valid JWT for a non-existent user is a data-integrity
      // problem, not a client error — surface it loudly.
      throw new ForbiddenException('User account unavailable');
    }
    const userFullName = `${user.firstName} ${user.lastName}`;

    const providerReference = `KUDI-VA-${randomBytes(6).toString('hex').toUpperCase()}`;
    const creationResult = await this.fundingProvider.createVirtualAccount({
      reference: providerReference,
      userEmail: user.email.getValue(),
      userFullName,
      narration: `${APP_NAME} — ${userFullName}`,
    });

    const virtualAccount = VirtualAccount.create({
      userId: command.userId,
      accountId: command.accountId,
      virtualAccountNumber: creationResult.virtualAccountNumber,
      bankName: creationResult.bankName,
      providerReference,
    });

    await this.virtualAccountRepository.save(virtualAccount);
    virtualAccount.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return VirtualAccountResponseDto.fromDomain(virtualAccount);
  }
}
