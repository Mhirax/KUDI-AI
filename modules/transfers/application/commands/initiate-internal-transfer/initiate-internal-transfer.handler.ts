import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateInternalTransferCommand } from './initiate-internal-transfer.command';
import {
  INTERNAL_TRANSFER_EXECUTOR,
  IInternalTransferExecutor,
} from '../../../domain/services/internal-transfer-executor.interface';
import { FEE_CALCULATOR, IFeeCalculator } from '../../../domain/services/fee-calculator.interface';
import { SelfTransferNotAllowedException } from '../../../domain/exceptions/self-transfer-not-allowed.exception';
import { TransferType } from '../../../domain/enums/transfer-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { TransferResponseDto } from '../../dto/transfer-response.dto';

// Cross-module dependency on Accounts' *port* (interface + DI token),
// not its internals — a standard, well-scoped module boundary crossing
// via Dependency Injection, distinct from the executor's direct
// entity/mapper coupling (see infrastructure/services/prisma-internal-transfer-executor.service.ts).
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Use case: transfer funds between two Kudi AI Bank accounts. The
 * actual atomic balance mutation is delegated to
 * `IInternalTransferExecutor`; this handler's job is validation
 * (self-transfer, account existence, currency-appropriate amount
 * parsing) and fee calculation before dispatching to it.
 */
@Injectable()
@CommandHandler(InitiateInternalTransferCommand)
export class InitiateInternalTransferHandler
  implements ICommandHandler<InitiateInternalTransferCommand, TransferResponseDto>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(FEE_CALCULATOR) private readonly feeCalculator: IFeeCalculator,
    @Inject(INTERNAL_TRANSFER_EXECUTOR) private readonly executor: IInternalTransferExecutor,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InitiateInternalTransferCommand): Promise<TransferResponseDto> {
    if (command.sourceAccountId === command.destinationAccountId) {
      throw new SelfTransferNotAllowedException();
    }

    const sourceAccount = await this.accountRepository.findById(command.sourceAccountId);
    if (!sourceAccount) {
      throw new AccountNotFoundException(command.sourceAccountId);
    }

    const amount = Money.fromDecimalString(command.amount, sourceAccount.currency);
    const fee = await this.feeCalculator.calculate(amount, TransferType.INTERNAL);

    const result = await this.executor.execute({
      initiatorUserId: command.initiatorUserId,
      sourceAccountId: command.sourceAccountId,
      destinationAccountId: command.destinationAccountId,
      amount,
      fee,
      narration: command.narration,
    });

    result.events.forEach((event) => this.eventBus.publish(event));

    return TransferResponseDto.fromDomain(result.transfer);
  }
}
