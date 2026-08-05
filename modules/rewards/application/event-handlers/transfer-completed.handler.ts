import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EarnRewardPointsCommand } from '../commands/earn-reward-points/earn-reward-points.command';

// Cross-module dependency on Transfers' *published event* and *port* —
// TransferCompletedEvent itself only carries aggregateId/reference, so
// the transfer is re-fetched by id for its userId/amount, the same
// pattern Ledger's event handlers use to fetch an Account for its userId.
import { TransferCompletedEvent } from '../../../transfers/domain/events/transfer-completed.event';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../transfers/domain/repositories/transfer.repository.interface';

@Injectable()
@EventsHandler(TransferCompletedEvent)
export class RewardsOnTransferCompletedHandler implements IEventHandler<TransferCompletedEvent> {
  private readonly logger = new Logger(RewardsOnTransferCompletedHandler.name);

  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async handle(event: TransferCompletedEvent): Promise<void> {
    try {
      const transfer = await this.transferRepository.findById(event.aggregateId);
      if (!transfer) {
        this.logger.error(`Cannot award points for transfer ${event.aggregateId}: not found`);
        return;
      }
      await this.commandBus.execute(
        new EarnRewardPointsCommand(
          transfer.initiatorUserId,
          transfer.amount.getMinorUnits(),
          event.reference,
          event.eventId,
          `Reward points for transfer ${event.reference}`,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to award points for transfer ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
