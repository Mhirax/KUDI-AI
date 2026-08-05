import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RefreshBillPaymentStatusCommand } from './refresh-bill-payment-status.command';
import {
  BILL_PAYMENT_REPOSITORY,
  IBillPaymentRepository,
} from '../../../domain/repositories/bill-payment.repository.interface';
import {
  BILL_PAYMENT_PROVIDER,
  IBillPaymentProvider,
} from '../../../domain/services/bill-payment-provider.interface';
import { BillReference } from '../../../domain/value-objects/bill-reference.vo';
import { BillPaymentNotFoundException } from '../../../domain/exceptions/bill-payment-not-found.exception';
import { BillPaymentResponseDto } from '../../dto/bill-payment-response.dto';

// Cross-module dependency on Accounts' *port*, for the compensating
// credit when a PROCESSING payment turns out to have failed.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';

/**
 * Use case: requery a non-terminal (PROCESSING) bill payment against
 * the provider and finalize it — SUCCESSFUL on confirmation, or
 * compensating credit + REVERSED on confirmed failure. Idempotent by
 * construction: terminal payments return unchanged without touching
 * the provider.
 */
@Injectable()
@CommandHandler(RefreshBillPaymentStatusCommand)
export class RefreshBillPaymentStatusHandler implements ICommandHandler<
  RefreshBillPaymentStatusCommand,
  BillPaymentResponseDto
> {
  private readonly logger = new Logger(RefreshBillPaymentStatusHandler.name);

  constructor(
    @Inject(BILL_PAYMENT_REPOSITORY) private readonly billPaymentRepository: IBillPaymentRepository,
    @Inject(BILL_PAYMENT_PROVIDER) private readonly billProvider: IBillPaymentProvider,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RefreshBillPaymentStatusCommand): Promise<BillPaymentResponseDto> {
    const billPayment = await this.billPaymentRepository.findByReference(
      BillReference.create(command.reference),
    );
    if (!billPayment) {
      throw new BillPaymentNotFoundException(command.reference);
    }
    if (billPayment.userId !== command.requestingUserId && !command.isAdmin) {
      throw new ForbiddenException('You may only refresh your own bill payments');
    }

    if (billPayment.isTerminal()) {
      return BillPaymentResponseDto.fromDomain(billPayment);
    }

    const status = await this.billProvider.getStatus(billPayment.reference.getValue());

    if (status.isSuccessful) {
      billPayment.markSuccessful(
        billPayment.providerReference ?? billPayment.reference.getValue(),
        status.valueToken,
      );
      await this.billPaymentRepository.save(billPayment);
      billPayment.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
    } else if (status.isFailed) {
      const account = await this.accountRepository.findById(billPayment.accountId);
      if (account) {
        account.credit(billPayment.totalDebit(), `reversal:${billPayment.reference.getValue()}`);
        await this.accountRepository.save(account);
        account.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
      } else {
        this.logger.error(
          `Could not load account ${billPayment.accountId} to compensate failed bill payment ${billPayment.reference.getValue()} — manual reconciliation required.`,
        );
      }
      billPayment.markReversed(status.failureReason ?? 'Provider reported failure');
      await this.billPaymentRepository.save(billPayment);
      billPayment.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
    }
    // Still processing at the provider: change nothing.

    return BillPaymentResponseDto.fromDomain(billPayment);
  }
}
