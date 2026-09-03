import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateExternalTransferCommand } from './initiate-external-transfer.command';
import { FEE_CALCULATOR, IFeeCalculator } from '../../../domain/services/fee-calculator.interface';
import {
  EXTERNAL_PAYOUT_PROVIDER,
  IExternalPayoutProvider,
} from '../../../domain/services/external-payout-provider.interface';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { Transfer } from '../../../domain/entities/transfer.entity';
import { ExternalRecipient } from '../../../domain/value-objects/external-recipient.vo';
import { TransferType } from '../../../domain/enums/transfer-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { SystemAccountService } from '../../../../accounts/application/services/system-account.service';
import { DomainEvent } from '../../../../../shared/events/domain-event.base';
import { TransferResponseDto } from '../../dto/transfer-response.dto';

import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';
import { UnauthorizedTransferException } from '../../../domain/exceptions/unauthorized-transfer.exception';

/**
 * Use case: pay out from a Kudi AI Bank account to an external
 * Nigerian bank account via Flutterwave.
 *
 * This is a saga, not a single atomic operation, because it spans our
 * database *and* a call to an external system: the source account is
 * debited first (funds held), then the payout is attempted. If
 * Flutterwave rejects the request synchronously, a compensating credit
 * reverses the debit immediately. If Flutterwave accepts it, the
 * transfer sits in PROCESSING until the async webhook confirms success
 * or failure (see `ConfirmExternalTransferHandler`) — the *same*
 * compensating-credit logic runs there too on a late failure.
 */
@Injectable()
@CommandHandler(InitiateExternalTransferCommand)
export class InitiateExternalTransferHandler implements ICommandHandler<
  InitiateExternalTransferCommand,
  TransferResponseDto
> {
  private readonly logger = new Logger(InitiateExternalTransferHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    @Inject(FEE_CALCULATOR) private readonly feeCalculator: IFeeCalculator,
    @Inject(EXTERNAL_PAYOUT_PROVIDER) private readonly payoutProvider: IExternalPayoutProvider,
    private readonly systemAccounts: SystemAccountService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InitiateExternalTransferCommand): Promise<TransferResponseDto> {
    const sourceAccount = await this.accountRepository.findById(command.sourceAccountId);
    if (!sourceAccount) {
      throw new AccountNotFoundException(command.sourceAccountId);
    }
    if (sourceAccount.userId !== command.initiatorUserId) {
      throw new UnauthorizedTransferException();
    }

    const amount = Money.fromDecimalString(command.amount, sourceAccount.currency);
    const fee = await this.feeCalculator.calculate(amount, TransferType.EXTERNAL);
    const totalDebit = amount.add(fee);

    const recipient = ExternalRecipient.create({
      bankCode: command.bankCode,
      accountNumber: command.recipientAccountNumber,
      accountName: command.recipientAccountName,
    });

    // Step 1: record the transfer instruction as PENDING. This happens
    // before the debit so that every leg of the movement — the customer
    // debit, the settlement credit and the fee credit — carries the same
    // transfer reference. The ledger groups entries into a journal by that
    // reference, and legs with different references would not group,
    // leaving each side looking like an unrelated balance change.
    const transfer = Transfer.initiateExternal({
      initiatorUserId: command.initiatorUserId,
      sourceAccountId: command.sourceAccountId,
      recipient,
      amount,
      fee,
      narration: command.narration,
    });
    await this.transferRepository.save(transfer);
    const initiatedEvents = transfer.pullDomainEvents();

    const reference = transfer.reference.getValue();

    // Step 2: hold the funds. Account.debit() enforces sufficient funds and
    // active-status invariants, and its own optimistic concurrency via the
    // repository.
    sourceAccount.debit(totalDebit, reference);
    await this.accountRepository.save(sourceAccount);
    const debitEvents = sourceAccount.pullDomainEvents();

    // Step 3: the other side of the debit above. Previously there was
    // none — the customer's balance fell by amount + fee and nothing
    // anywhere rose, so every external transfer left the books short by
    // the whole total and no trial balance could balance.
    //
    // The amount is credited to the settlement float, which is the account
    // the payout is actually made from, and the fee to fee revenue. Both
    // are reversed in the compensation path below if the payout fails.
    const settlement = await this.systemAccounts.settlementAccount(sourceAccount.currency);
    settlement.credit(amount, reference);
    await this.accountRepository.save(settlement);
    const settlementEvents = settlement.pullDomainEvents();

    let feeEvents: DomainEvent[] = [];
    if (!fee.isZero()) {
      const feeAccount = await this.systemAccounts.feeRevenueAccount(sourceAccount.currency);
      feeAccount.credit(fee, reference);
      await this.accountRepository.save(feeAccount);
      feeEvents = feeAccount.pullDomainEvents();
    }

    // Step 4: attempt the actual payout.
    try {
      const payoutResult = await this.payoutProvider.initiatePayout({
        reference: transfer.reference.getValue(),
        recipient,
        amount,
        narration: command.narration,
      });

      if (payoutResult.isImmediatelySettled) {
        transfer.markSuccessful();
      } else {
        transfer.markProcessing(payoutResult.providerReference);
      }
      await this.transferRepository.save(transfer);

      [
        ...debitEvents,
        ...settlementEvents,
        ...feeEvents,
        ...initiatedEvents,
        ...transfer.pullDomainEvents(),
      ].forEach((event) => this.eventBus.publish(event));

      return TransferResponseDto.fromDomain(transfer);
    } catch (payoutError) {
      this.logger.warn(
        `External payout failed synchronously for transfer ${transfer.reference.getValue()}; compensating.`,
      );

      // Compensate: credit the source account back, then mark the
      // transfer REVERSED rather than merely FAILED, so it's clear the
      // customer's funds were returned.
      // Unwind the settlement and fee credits first. Without this the
      // customer gets their money back while Kudi's own accounts keep the
      // credits, so the reversal itself would put the books out by the
      // full total in the opposite direction.
      const compensationEvents: DomainEvent[] = [];

      const settlementToUnwind = await this.accountRepository.findById(settlement.id);
      if (settlementToUnwind) {
        settlementToUnwind.debit(amount, `reversal:${reference}`);
        await this.accountRepository.save(settlementToUnwind);
        compensationEvents.push(...settlementToUnwind.pullDomainEvents());
      } else {
        this.logger.error(
          `Could not unwind the settlement credit for ${reference} — manual reconciliation required.`,
        );
      }

      if (!fee.isZero()) {
        const feeToUnwind = await this.systemAccounts.feeRevenueAccount(sourceAccount.currency);
        feeToUnwind.debit(fee, `reversal:${reference}`);
        await this.accountRepository.save(feeToUnwind);
        compensationEvents.push(...feeToUnwind.pullDomainEvents());
      }

      const refreshedSource = await this.accountRepository.findById(command.sourceAccountId);
      if (refreshedSource) {
        refreshedSource.credit(totalDebit, `reversal:${reference}`);
        await this.accountRepository.save(refreshedSource);
      } else {
        this.logger.error(
          `Could not load source account ${command.sourceAccountId} to compensate failed payout ${transfer.reference.getValue()} — manual reconciliation required.`,
        );
      }

      const reason = payoutError instanceof Error ? payoutError.message : 'Payout provider error';
      transfer.markReversed(reason);
      await this.transferRepository.save(transfer);

      [
        ...debitEvents,
        ...settlementEvents,
        ...feeEvents,
        ...initiatedEvents,
        ...compensationEvents,
        ...(refreshedSource?.pullDomainEvents() ?? []),
        ...transfer.pullDomainEvents(),
      ].forEach((event) => this.eventBus.publish(event));

      throw payoutError;
    }
  }
}
