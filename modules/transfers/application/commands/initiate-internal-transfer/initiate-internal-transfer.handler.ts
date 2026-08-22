import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateInternalTransferCommand } from './initiate-internal-transfer.command';
import {
  INTERNAL_TRANSFER_EXECUTOR,
  IInternalTransferExecutor,
} from '../../../domain/services/internal-transfer-executor.interface';
import { FEE_CALCULATOR, IFeeCalculator } from '../../../domain/services/fee-calculator.interface';
import {
  KYC_TRANSFER_LIMIT_CHECKER,
  IKycTransferLimitChecker,
} from '../../../domain/services/kyc-transfer-limit-checker.interface';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { SelfTransferNotAllowedException } from '../../../domain/exceptions/self-transfer-not-allowed.exception';
import { UnauthorizedTransferException } from '../../../domain/exceptions/unauthorized-transfer.exception';
import { TransferType } from '../../../domain/enums/transfer-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { TransferResponseDto } from '../../dto/transfer-response.dto';
import { IdempotencyGuardService } from '../../../../../shared/idempotency/idempotency-guard.service';

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
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    @Inject(FEE_CALCULATOR) private readonly feeCalculator: IFeeCalculator,
    @Inject(KYC_TRANSFER_LIMIT_CHECKER) private readonly kycLimitChecker: IKycTransferLimitChecker,
    @Inject(INTERNAL_TRANSFER_EXECUTOR) private readonly executor: IInternalTransferExecutor,
    private readonly eventBus: EventBus,
    private readonly idempotencyGuard: IdempotencyGuardService,
  ) {}

  async execute(command: InitiateInternalTransferCommand): Promise<TransferResponseDto> {
    return this.idempotencyGuard.run(
      {
        userId: command.initiatorUserId,
        scope: 'transfer.internal',
        key: command.idempotencyKey,
      },
      () => this.doExecute(command),
      async (resourceId) => {
        const transfer = await this.transferRepository.findById(resourceId);
        // The row that markCompleted() wrote resourceId against cannot
        // legitimately be missing by the time a replay reads it back.
        if (!transfer) throw new AccountNotFoundException(resourceId);
        return TransferResponseDto.fromDomain(transfer);
      },
    );
  }

  private async doExecute(
    command: InitiateInternalTransferCommand,
  ): Promise<{ resourceId: string; response: TransferResponseDto }> {
    if (command.sourceAccountId === command.destinationAccountId) {
      throw new SelfTransferNotAllowedException();
    }

    const sourceAccount = await this.accountRepository.findById(command.sourceAccountId);
    if (!sourceAccount) {
      throw new AccountNotFoundException(command.sourceAccountId);
    }

    // Ownership must be checked before anything that reads sourceAccount's
    // own data (the KYC limit check below reads its real transfer
    // volume) — otherwise a caller who doesn't own this account can use
    // the limit-check's outcome (exceeded vs. not) as an oracle on the
    // real owner's transfer activity before ever being told they're
    // unauthorized. The executor re-checks this again inside its
    // transaction against a freshly-loaded record (see that file's
    // header comment) — this is the earlier, cheaper check, not a
    // replacement for it.
    if (sourceAccount.userId !== command.initiatorUserId) {
      throw new UnauthorizedTransferException();
    }

    const amount = Money.fromDecimalString(command.amount, sourceAccount.currency);

    await this.kycLimitChecker.assertWithinLimits({
      userId: command.initiatorUserId,
      sourceAccountId: command.sourceAccountId,
      amount,
    });

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

    return { resourceId: result.transfer.id, response: TransferResponseDto.fromDomain(result.transfer) };
  }
}
