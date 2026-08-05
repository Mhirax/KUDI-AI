import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { InitiateBillPaymentCommand } from './initiate-bill-payment.command';
import {
  BILL_PAYMENT_REPOSITORY,
  IBillPaymentRepository,
} from '../../../domain/repositories/bill-payment.repository.interface';
import {
  BILL_PAYMENT_PROVIDER,
  IBillPaymentProvider,
} from '../../../domain/services/bill-payment-provider.interface';
import {
  BILL_FEE_CALCULATOR,
  IBillFeeCalculator,
} from '../../../domain/services/bill-fee-calculator.interface';
import { BillPayment } from '../../../domain/entities/bill-payment.entity';
import { InvalidBillCustomerException } from '../../../domain/exceptions/invalid-bill-customer.exception';
import { BillPaymentResponseDto } from '../../dto/bill-payment-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' *port* — the same sanctioned
// boundary crossing as Transfers' external payout saga.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Use case: pay a bill from a Kudi wallet.
 *
 * A saga, not a single atomic operation — it spans our database and an
 * external provider call, exactly like Transfers' external payout (see
 * InitiateExternalTransferHandler, whose structure this mirrors):
 *
 *   1. validate the customer with the biller (fail fast before any
 *      money moves);
 *   2. debit amount + fee from the wallet (funds held; Account
 *      invariants and optimistic concurrency apply);
 *   3. record the BillPayment as PENDING;
 *   4. call the provider. Synchronous failure → compensating credit +
 *      REVERSED (the customer sees "your money came back", never an
 *      ambiguous FAILED-with-debit).
 *
 * The Ledger records the debit (classified BILL_PAYMENT via the
 * KUDI-BILL- reference) and any compensating credit automatically.
 */
@Injectable()
@CommandHandler(InitiateBillPaymentCommand)
export class InitiateBillPaymentHandler implements ICommandHandler<
  InitiateBillPaymentCommand,
  BillPaymentResponseDto
> {
  private readonly logger = new Logger(InitiateBillPaymentHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(BILL_PAYMENT_REPOSITORY) private readonly billPaymentRepository: IBillPaymentRepository,
    @Inject(BILL_PAYMENT_PROVIDER) private readonly billProvider: IBillPaymentProvider,
    @Inject(BILL_FEE_CALCULATOR) private readonly feeCalculator: IBillFeeCalculator,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InitiateBillPaymentCommand): Promise<BillPaymentResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only pay bills from your own accounts');
    }

    // Step 1: validate the customer with the biller before any money moves.
    const validation = await this.billProvider.validateCustomer({
      billerCode: command.billerCode,
      itemCode: command.itemCode,
      customerIdentifier: command.customerIdentifier,
    });
    if (!validation.isValid) {
      throw new InvalidBillCustomerException(command.customerIdentifier, command.billerCode);
    }

    const amount = Money.fromDecimalString(command.amount, account.currency);
    const fee = await this.feeCalculator.calculate(amount, command.category);

    const billPayment = BillPayment.initiate({
      userId: command.userId,
      accountId: command.accountId,
      category: command.category,
      billerCode: command.billerCode,
      itemCode: command.itemCode,
      billerName: command.billerName,
      customerIdentifier: command.customerIdentifier,
      amount,
      fee,
    });
    const totalDebit = billPayment.totalDebit();

    // Step 2: hold the funds. Account.debit() enforces sufficient
    // funds / active status; the repository enforces optimistic
    // concurrency.
    account.debit(totalDebit, billPayment.reference.getValue());
    await this.accountRepository.save(account);
    const debitEvents = account.pullDomainEvents();

    // Step 3: record the instruction as PENDING.
    await this.billPaymentRepository.save(billPayment);
    const initiatedEvents = billPayment.pullDomainEvents();

    // Step 4: attempt the actual bill payment.
    try {
      const result = await this.billProvider.payBill({
        reference: billPayment.reference.getValue(),
        billerCode: command.billerCode,
        itemCode: command.itemCode,
        customerIdentifier: command.customerIdentifier,
        amount,
      });

      if (result.isImmediatelySettled) {
        billPayment.markSuccessful(result.providerReference, result.valueToken);
      } else {
        billPayment.markProcessing(result.providerReference);
      }
      await this.billPaymentRepository.save(billPayment);

      [...debitEvents, ...initiatedEvents, ...billPayment.pullDomainEvents()].forEach((event) =>
        this.eventBus.publish(event),
      );

      return BillPaymentResponseDto.fromDomain(billPayment);
    } catch (providerError) {
      this.logger.warn(
        `Bill payment ${billPayment.reference.getValue()} failed synchronously; compensating.`,
      );

      // Compensate: return the funds, then mark REVERSED.
      const refreshedAccount = await this.accountRepository.findById(command.accountId);
      if (refreshedAccount) {
        refreshedAccount.credit(totalDebit, `reversal:${billPayment.reference.getValue()}`);
        await this.accountRepository.save(refreshedAccount);
      } else {
        this.logger.error(
          `Could not load account ${command.accountId} to compensate failed bill payment ${billPayment.reference.getValue()} — manual reconciliation required.`,
        );
      }

      const reason = providerError instanceof Error ? providerError.message : 'Bill provider error';
      billPayment.markReversed(reason);
      await this.billPaymentRepository.save(billPayment);

      [
        ...debitEvents,
        ...initiatedEvents,
        ...(refreshedAccount?.pullDomainEvents() ?? []),
        ...billPayment.pullDomainEvents(),
      ].forEach((event) => this.eventBus.publish(event));

      throw providerError;
    }
  }
}
