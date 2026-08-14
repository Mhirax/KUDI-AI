import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../domain/repositories/account.repository.interface';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { ActivateAccountCommand } from '../commands/activate-account/activate-account.command';

// Cross-module dependency on Compliance's *published event*, not its
// internals — this is exactly what Event-Driven Architecture is for:
// Accounts reacts to something Compliance announced, without
// Compliance needing to know Accounts exists at all.
import { KycTierUpgradedEvent } from '../../../compliance/domain/events/kyc-tier-upgraded.event';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';

/**
 * Activates every PENDING_VERIFICATION account belonging to a user
 * once their KYC reaches TIER_2 (BVN verified) or above. This is the
 * event handler that closes the loop described in this module's
 * README ("Accounts start in PENDING_VERIFICATION and are activated
 * once onboarding/KYC checks pass").
 */
@Injectable()
@EventsHandler(KycTierUpgradedEvent)
export class KycTierUpgradedHandler implements IEventHandler<KycTierUpgradedEvent> {
  private readonly logger = new Logger(KycTierUpgradedHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async handle(event: KycTierUpgradedEvent): Promise<void> {
    if (event.newTier !== KycTier.TIER_2 && event.newTier !== KycTier.TIER_3) {
      return;
    }

    const accounts = await this.accountRepository.findAllByUserId(event.userId);
    const pendingAccounts = accounts.filter(
      (account) => account.status === AccountStatus.PENDING_VERIFICATION,
    );

    for (const account of pendingAccounts) {
      try {
        await this.commandBus.execute(new ActivateAccountCommand(account.id));
      } catch (error) {
        // A single account failing to activate must not block the
        // others, and must not throw back into the event bus (there is
        // no HTTP caller here to receive an error response) — log for
        // operational visibility and continue.
        this.logger.error(
          `Failed to activate account ${account.id} after KYC tier upgrade for user ${event.userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
