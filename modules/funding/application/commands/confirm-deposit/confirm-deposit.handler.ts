import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmDepositCommand } from './confirm-deposit.command';
import {
  DEPOSIT_REPOSITORY,
  IDepositRepository,
} from '../../../domain/repositories/deposit.repository.interface';
import {
  IVirtualAccountRepository,
  VIRTUAL_ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/virtual-account.repository.interface';
import {
  FUNDING_PROVIDER,
  IFundingProvider,
  VerifiedProviderTransaction,
} from '../../../domain/services/funding-provider.interface';
import {
  DEPOSIT_SETTLEMENT_EXECUTOR,
  IDepositSettlementExecutor,
} from '../../../domain/services/deposit-settlement-executor.interface';
import { Deposit } from '../../../domain/entities/deposit.entity';
import { DepositChannel } from '../../../domain/enums/deposit-channel.enum';
import { DepositReference } from '../../../domain/value-objects/deposit-reference.vo';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';

// Cross-module dependency on Accounts' domain exception: settlement
// legitimately fails when the target account is not ACTIVE, and that
// failure must be classified as permanent (deposit FAILED) rather than
// retried forever.
import { AccountNotActiveException } from '../../../../accounts/domain/exceptions/account-not-active.exception';

const DEPOSIT_REFERENCE_REGEX = /^KUDI-DEP-[A-Z0-9]{12}$/;
const VIRTUAL_ACCOUNT_REFERENCE_REGEX = /^KUDI-VA-[A-Z0-9]{12}$/;

/**
 * Use case: settle a deposit reported by Flutterwave's
 * `charge.completed` webhook.
 *
 * Trust model: the webhook payload only tells us *which* transaction
 * to look at. Amount, currency, status, and tx_ref all come from a
 * server-to-server re-verification against Flutterwave — a forged or
 * tampered webhook body can therefore never move money.
 *
 * Idempotency (three layers):
 *   1. fast path — a deposit already holding this provider transaction
 *      id means settlement completed earlier; return quietly;
 *   2. terminal-state check on the deposit aggregate;
 *   3. the settlement executor's transactional unique-claim on
 *      `providerTransactionId` (authoritative under concurrency).
 *
 * Routing by verified tx_ref:
 *   - `KUDI-DEP-…`  → checkout deposit we created at initiation;
 *   - `KUDI-VA-…`   → credit to a customer's permanent virtual account
 *                     (no prior deposit row exists; one is created and
 *                     settled here in the same transaction).
 *
 * Permanent failures (provider says failed; amount mismatch; target
 * account not ACTIVE) mark the deposit FAILED — auditable, alertable,
 * never silently retried. Transient failures rethrow so the webhook
 * returns non-2xx and Flutterwave retries.
 */
@Injectable()
@CommandHandler(ConfirmDepositCommand)
export class ConfirmDepositHandler implements ICommandHandler<ConfirmDepositCommand, void> {
  private readonly logger = new Logger(ConfirmDepositHandler.name);

  constructor(
    @Inject(DEPOSIT_REPOSITORY) private readonly depositRepository: IDepositRepository,
    @Inject(VIRTUAL_ACCOUNT_REPOSITORY)
    private readonly virtualAccountRepository: IVirtualAccountRepository,
    @Inject(FUNDING_PROVIDER) private readonly fundingProvider: IFundingProvider,
    @Inject(DEPOSIT_SETTLEMENT_EXECUTOR)
    private readonly settlementExecutor: IDepositSettlementExecutor,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ConfirmDepositCommand): Promise<void> {
    const alreadySettled = await this.depositRepository.findByProviderTransactionId(
      command.providerTransactionId,
    );
    if (alreadySettled) {
      this.logger.warn(
        `Provider transaction ${command.providerTransactionId} already settled as deposit ${alreadySettled.id}; skipping`,
      );
      return;
    }

    const verified = await this.fundingProvider.verifyTransaction(command.providerTransactionId);

    if (DEPOSIT_REFERENCE_REGEX.test(verified.reference)) {
      await this.settleCheckoutDeposit(verified);
      return;
    }

    if (VIRTUAL_ACCOUNT_REFERENCE_REGEX.test(verified.reference)) {
      await this.settleVirtualAccountCredit(verified);
      return;
    }

    this.logger.error(
      `Verified transaction ${verified.providerTransactionId} carries unrecognized reference "${verified.reference}"; ignoring`,
    );
  }

  private async settleCheckoutDeposit(verified: VerifiedProviderTransaction): Promise<void> {
    const deposit = await this.depositRepository.findByReference(
      DepositReference.create(verified.reference),
    );
    if (!deposit) {
      // A tx_ref in our own format with no matching row: either a
      // webhook raced ahead of initiation's commit, or data loss.
      // Throw → non-2xx → provider retries; alerting catches repeats.
      throw new Error(`No deposit found for verified reference ${verified.reference}`);
    }

    if (deposit.isTerminal()) {
      this.logger.warn(`Deposit ${deposit.id} already terminal (${deposit.status}); skipping`);
      return;
    }

    if (!verified.isSuccessful) {
      await this.failDeposit(deposit, 'Provider reported the payment as failed');
      return;
    }

    const amountMatches =
      deposit.amount.getMinorUnits() === verified.amountMinorUnits &&
      deposit.amount.getCurrency() === verified.currency;
    if (!amountMatches) {
      // Never credit an amount the customer did not initiate. Ops
      // reconciles these manually against the provider dashboard.
      await this.failDeposit(
        deposit,
        `Verified amount ${verified.amountMinorUnits} ${verified.currency} does not match initiated ${deposit.amount.getMinorUnits()} ${deposit.amount.getCurrency()}`,
      );
      return;
    }

    await this.settle(deposit, verified.providerTransactionId, true);
  }

  private async settleVirtualAccountCredit(verified: VerifiedProviderTransaction): Promise<void> {
    const virtualAccount = await this.virtualAccountRepository.findByProviderReference(
      verified.reference,
    );
    if (!virtualAccount) {
      throw new Error(`No virtual account found for verified reference ${verified.reference}`);
    }

    if (!verified.isSuccessful) {
      // No deposit row exists yet and no money moved — nothing to record.
      this.logger.warn(
        `Unsuccessful virtual-account transaction ${verified.providerTransactionId}; ignoring`,
      );
      return;
    }

    const deposit = Deposit.initiate({
      channel: DepositChannel.VIRTUAL_ACCOUNT,
      userId: virtualAccount.userId,
      accountId: virtualAccount.accountId,
      amount: Money.fromMinorUnits(verified.amountMinorUnits, verified.currency as Currency),
      providerTransactionId: verified.providerTransactionId,
    });
    // Initiation events publish together with settlement events below —
    // the aggregate buffers them until settle() succeeds.

    await this.settle(deposit, verified.providerTransactionId, false);
  }

  private async settle(
    deposit: Deposit,
    providerTransactionId: string,
    alreadyPersisted: boolean,
  ): Promise<void> {
    try {
      const result = await this.settlementExecutor.settle({
        deposit,
        providerTransactionId,
        alreadyPersisted,
      });
      result.events.forEach((event) => this.eventBus.publish(event));
      this.logger.log(`Deposit ${deposit.id} settled (${providerTransactionId})`);
    } catch (error) {
      if (error instanceof AccountNotActiveException) {
        // Permanent: the wallet cannot accept credits. Record an
        // auditable FAILED row; funds remain with the provider for ops
        // to reconcile. NOTE: the in-memory `deposit` was mutated by
        // the executor before the transaction rolled back, so it must
        // not be reused — reload (checkout) or rebuild (virtual
        // account) a clean aggregate instead.
        const reason = `Target account not active: ${error.message}`;
        if (alreadyPersisted) {
          const fresh = await this.depositRepository.findById(deposit.id);
          if (fresh && !fresh.isTerminal()) {
            await this.failDeposit(fresh, reason);
          }
        } else {
          const failed = Deposit.initiate({
            channel: deposit.channel,
            userId: deposit.userId,
            accountId: deposit.accountId,
            amount: deposit.amount,
            providerTransactionId,
          });
          await this.depositRepository.save(failed); // create (v0)
          failed.fail(reason); // v1
          await this.depositRepository.save(failed); // conditional update
          failed.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
        }
        return;
      }
      throw error;
    }
  }

  private async failDeposit(deposit: Deposit, reason: string): Promise<void> {
    deposit.fail(reason);
    await this.depositRepository.save(deposit);
    deposit.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
  }
}
