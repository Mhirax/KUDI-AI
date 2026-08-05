import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateSavingsGoalCommand } from './create-savings-goal.command';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoal } from '../../../domain/entities/savings-goal.entity';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';

// Cross-module dependencies on Accounts' and Compliance's *ports* and
// *commands* — the same sanctioned boundary crossings Bills/Transfers
// already use for Accounts, extended here to also reuse Accounts'
// OpenAccountCommand/ActivateAccountCommand instead of duplicating
// account-lifecycle logic inside Savings.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';
import { OpenAccountCommand } from '../../../../accounts/application/commands/open-account/open-account.command';
import { ActivateAccountCommand } from '../../../../accounts/application/commands/activate-account/activate-account.command';
import { AccountResponseDto } from '../../../../accounts/application/dto/account-response.dto';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../../compliance/domain/repositories/kyc-profile.repository.interface';
import { KycTier } from '../../../../compliance/domain/enums/kyc-tier.enum';
import { DomainException } from '../../../../../shared/exceptions/domain.exception';

/**
 * Use case: open a new savings goal. Opens a dedicated SAVINGS-type
 * Account (via Accounts' own OpenAccountCommand) to hold the funds,
 * then immediately activates it (via Accounts' own
 * ActivateAccountCommand) — safe here because reaching this handler at
 * all requires an existing ACTIVE wallet account, which itself implies
 * TIER_2+ KYC (see KycTierUpgradedHandler in the Accounts module); this
 * handler re-checks that tier explicitly rather than assuming it, so
 * the invariant is enforced locally, not just inherited by accident.
 */
@Injectable()
@CommandHandler(CreateSavingsGoalCommand)
export class CreateSavingsGoalHandler implements ICommandHandler<
  CreateSavingsGoalCommand,
  SavingsGoalResponseDto
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateSavingsGoalCommand): Promise<SavingsGoalResponseDto> {
    const sourceAccount = await this.accountRepository.findById(command.sourceAccountId);
    if (!sourceAccount) {
      throw new AccountNotFoundException(command.sourceAccountId);
    }
    if (sourceAccount.userId !== command.userId) {
      throw new ForbiddenException('You may only fund a savings goal from your own account');
    }

    const kycProfile = await this.kycProfileRepository.findByUserId(command.userId);
    if (!kycProfile || kycProfile.tier === KycTier.TIER_1) {
      throw new DomainException('Verify your BVN before opening a savings goal', 'KYC_REQUIRED');
    }

    const opened: AccountResponseDto = await this.commandBus.execute(
      new OpenAccountCommand(command.userId, AccountType.SAVINGS, sourceAccount.currency),
    );
    await this.commandBus.execute(new ActivateAccountCommand(opened.id));

    const targetAmount = command.targetAmount
      ? Money.fromDecimalString(command.targetAmount, sourceAccount.currency)
      : null;

    const goal = SavingsGoal.create({
      userId: command.userId,
      savingsAccountId: opened.id,
      sourceAccountId: command.sourceAccountId,
      name: command.name,
      targetAmount,
      currency: sourceAccount.currency,
    });

    await this.savingsGoalRepository.save(goal);
    goal.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return SavingsGoalResponseDto.fromDomain(goal, '0.00');
  }
}
