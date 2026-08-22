import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateExternalTransferCommand } from './initiate-external-transfer.command';
import { FEE_CALCULATOR, IFeeCalculator } from '../../../domain/services/fee-calculator.interface';
import {
  EXTERNAL_PAYOUT_PROVIDER,
  IExternalPayoutProvider,
} from '../../../domain/services/external-payout-provider.interface';
import {
  KYC_TRANSFER_LIMIT_CHECKER,
  IKycTransferLimitChecker,
} from '../../../domain/services/kyc-transfer-limit-checker.interface';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { Transfer } from '../../../domain/entities/transfer.entity';
import { ExternalRecipient } from '../../../domain/value-objects/external-recipient.vo';
import { TransferType } from '../../../domain/enums/transfer-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { TransferResponseDto } from '../../dto/transfer-response.dto';
import { IdempotencyGuardService } from '../../../../../shared/idempotency/idempotency-guard.service';
import {
  LEDGER_RECORDER,
  ILedgerRecorder,
  LedgerPostingLeg,
} from '../../../../../shared/ledger/ledger-recorder.interface';
import { LedgerEntryDirection } from '../../../../../shared/ledger/ledger-entry-direction.enum';
import { LedgerEntryType } from '../../../../../shared/ledger/ledger-entry-type.enum';
import { SystemLedgerAccount } from '../../../../../shared/ledger/system-ledger-account';

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
    @Inject(KYC_TRANSFER_LIMIT_CHECKER) private readonly kycLimitChecker: IKycTransferLimitChecker,
    @Inject(EXTERNAL_PAYOUT_PROVIDER) private readonly payoutProvider: IExternalPayoutProvider,
    @Inject(LEDGER_RECORDER) private readonly ledgerRecorder: ILedgerRecorder,
    private readonly eventBus: EventBus,
    private readonly idempotencyGuard: IdempotencyGuardService,
  ) {}

  async execute(command: InitiateExternalTransferCommand): Promise<TransferResponseDto> {
    return this.idempotencyGuard.run(
      {
        userId: command.initiatorUserId,
        scope: 'transfer.external',
        key: command.idempotencyKey,
      },
      () => this.doExecute(command),
      async (resourceId) => {
        const transfer = await this.transferRepository.findById(resourceId);
        if (!transfer) throw new AccountNotFoundException(resourceId);
        return TransferResponseDto.fromDomain(transfer);
      },
    );
  }

  private async doExecute(
    command: InitiateExternalTransferCommand,
  ): Promise<{ resourceId: string; response: TransferResponseDto }> {
    const sourceAccount = await this.accountRepository.findById(command.sourceAccountId);
    if (!sourceAccount) {
      throw new AccountNotFoundException(command.sourceAccountId);
    }
    if (sourceAccount.userId !== command.initiatorUserId) {
      throw new UnauthorizedTransferException();
    }

    const amount = Money.fromDecimalString(command.amount, sourceAccount.currency);

    await this.kycLimitChecker.assertWithinLimits({
      userId: command.initiatorUserId,
      sourceAccountId: command.sourceAccountId,
      amount,
    });

    const fee = await this.feeCalculator.calculate(amount, TransferType.EXTERNAL);
    const totalDebit = amount.add(fee);

    const recipient = ExternalRecipient.create({
      bankCode: command.bankCode,
      accountNumber: command.recipientAccountNumber,
      accountName: command.recipientAccountName,
    });

    // Step 1: hold the funds. Account.debit() enforces sufficient
    // funds / active-status invariants and its own optimistic
    // concurrency via the repository.
    sourceAccount.debit(totalDebit, `pending-external-payout:${command.recipientAccountNumber}`);
    await this.accountRepository.save(sourceAccount);
    const debitEvents = sourceAccount.pullDomainEvents();

    // Step 2: record the transfer instruction as PENDING.
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

    // Double-entry journal for the hold (modules/transfers/implementation.md,
    // gap #2): the debited total sits in a synthetic clearing account
    // until the payout's outcome is known, then Step 3 (below) or
    // ConfirmExternalTransferHandler relieves it one way or the other.
    // Posted outside any DB transaction, same as the debit/save above —
    // this saga spans a call to Flutterwave and can't be made atomic.
    await this.ledgerRecorder.post({
      reference: transfer.reference.getValue(),
      narration: command.narration,
      userId: command.initiatorUserId,
      entryType: LedgerEntryType.TRANSFER,
      legs: [
        {
          accountId: sourceAccount.id,
          direction: LedgerEntryDirection.DEBIT,
          amount: totalDebit,
          balanceAfter: sourceAccount.balance,
        },
        {
          accountId: SystemLedgerAccount.externalPayoutClearing(totalDebit.getCurrency()),
          direction: LedgerEntryDirection.CREDIT,
          amount: totalDebit,
        },
      ],
    });

    // Step 3: attempt the actual payout.
    try {
      const payoutResult = await this.payoutProvider.initiatePayout({
        reference: transfer.reference.getValue(),
        recipient,
        amount,
        narration: command.narration,
      });

      if (payoutResult.isImmediatelySettled) {
        transfer.markSuccessful();
        // Relieve the clearing account now, since the outcome is
        // already known — ConfirmExternalTransferHandler won't run for
        // this transfer. The async (PROCESSING) case leaves the funds
        // in clearing until that handler resolves the later webhook.
        const settlementLegs: LedgerPostingLeg[] = [
          {
            accountId: SystemLedgerAccount.externalPayoutClearing(totalDebit.getCurrency()),
            direction: LedgerEntryDirection.DEBIT,
            amount: totalDebit,
          },
          {
            accountId: SystemLedgerAccount.externalPayoutSettled(amount.getCurrency()),
            direction: LedgerEntryDirection.CREDIT,
            amount,
          },
        ];
        if (!fee.isZero()) {
          settlementLegs.push({
            accountId: SystemLedgerAccount.feeRevenue(fee.getCurrency()),
            direction: LedgerEntryDirection.CREDIT,
            amount: fee,
          });
        }
        await this.ledgerRecorder.post({
          reference: transfer.reference.getValue(),
          narration: command.narration,
          userId: command.initiatorUserId,
          entryType: LedgerEntryType.TRANSFER,
          legs: settlementLegs,
        });
      } else {
        transfer.markProcessing(payoutResult.providerReference);
      }
      await this.transferRepository.save(transfer);

      [...debitEvents, ...initiatedEvents, ...transfer.pullDomainEvents()].forEach((event) =>
        this.eventBus.publish(event),
      );

      return { resourceId: transfer.id, response: TransferResponseDto.fromDomain(transfer) };
    } catch (payoutError) {
      this.logger.warn(
        `External payout failed synchronously for transfer ${transfer.reference.getValue()}; compensating.`,
      );

      // Compensate: credit the source account back, then mark the
      // transfer REVERSED rather than merely FAILED, so it's clear the
      // customer's funds were returned. Deliberately not run through
      // MAX_BALANCE_GUARD — see confirm-external-transfer.handler.ts's
      // matching comment.
      const refreshedSource = await this.accountRepository.findById(command.sourceAccountId);
      if (refreshedSource) {
        refreshedSource.credit(totalDebit, `reversal:${transfer.reference.getValue()}`);
        await this.accountRepository.save(refreshedSource);
        // Relieve the clearing account back to the customer, mirroring
        // the credit above — the clearing leg from Step 2 nets to zero.
        await this.ledgerRecorder.post({
          reference: transfer.reference.getValue(),
          narration: `reversal: ${command.narration}`,
          userId: command.initiatorUserId,
          entryType: LedgerEntryType.TRANSFER,
          legs: [
            {
              accountId: SystemLedgerAccount.externalPayoutClearing(totalDebit.getCurrency()),
              direction: LedgerEntryDirection.DEBIT,
              amount: totalDebit,
            },
            {
              accountId: refreshedSource.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: totalDebit,
              balanceAfter: refreshedSource.balance,
            },
          ],
        });
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
        ...initiatedEvents,
        ...(refreshedSource?.pullDomainEvents() ?? []),
        ...transfer.pullDomainEvents(),
      ].forEach((event) => this.eventBus.publish(event));

      throw payoutError;
    }
  }
}
