import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmExternalTransferCommand } from './confirm-external-transfer.command';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { TransferNotFoundException } from '../../../domain/exceptions/transfer-not-found.exception';
import { TransactionStatus } from '../../../../../shared/enums/transaction-status.enum';

import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';

const TERMINAL_STATUSES = new Set([
  TransactionStatus.SUCCESSFUL,
  TransactionStatus.FAILED,
  TransactionStatus.REVERSED,
  TransactionStatus.CANCELLED,
]);

/**
 * Use case: apply Flutterwave's asynchronous webhook confirmation to a
 * PROCESSING external transfer. Idempotent by design — Flutterwave may
 * redeliver the same webhook; a transfer already in a terminal state is
 * a silent no-op rather than an error, since re-processing a duplicate
 * delivery must never double-compensate or double-complete a transfer.
 */
@Injectable()
@CommandHandler(ConfirmExternalTransferCommand)
export class ConfirmExternalTransferHandler
  implements ICommandHandler<ConfirmExternalTransferCommand, void>
{
  private readonly logger = new Logger(ConfirmExternalTransferHandler.name);

  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ConfirmExternalTransferCommand): Promise<void> {
    const transfer = await this.transferRepository.findByProviderReference(command.providerReference);
    if (!transfer) {
      throw new TransferNotFoundException(command.providerReference);
    }

    if (TERMINAL_STATUSES.has(transfer.status)) {
      this.logger.log(
        `Ignoring duplicate/late webhook for already-${transfer.status} transfer ${transfer.reference.getValue()}`,
      );
      return;
    }

    if (command.isSuccessful) {
      transfer.markSuccessful();
      await this.transferRepository.save(transfer);
      transfer.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
      return;
    }

    // Late failure: compensate by crediting the source account back.
    const sourceAccount = await this.accountRepository.findById(transfer.sourceAccountId);
    if (sourceAccount) {
      const totalDebit = transfer.amount.add(transfer.fee);
      sourceAccount.credit(totalDebit, `reversal:${transfer.reference.getValue()}`);
      await this.accountRepository.save(sourceAccount);
    } else {
      this.logger.error(
        `Could not load source account ${transfer.sourceAccountId} to compensate late-failed transfer ${transfer.reference.getValue()} — manual reconciliation required.`,
      );
    }

    transfer.markReversed(command.failureReason ?? 'Payout failed at provider');
    await this.transferRepository.save(transfer);

    [...(sourceAccount?.pullDomainEvents() ?? []), ...transfer.pullDomainEvents()].forEach((event) =>
      this.eventBus.publish(event),
    );
  }
}
