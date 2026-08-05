import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { EarnRewardPointsCommand } from '../commands/earn-reward-points/earn-reward-points.command';
import { DepositCompletedEvent } from '../../../funding/domain/events/deposit-completed.event';

@Injectable()
@EventsHandler(DepositCompletedEvent)
export class RewardsOnDepositCompletedHandler implements IEventHandler<DepositCompletedEvent> {
  private readonly logger = new Logger(RewardsOnDepositCompletedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: DepositCompletedEvent): Promise<void> {
    try {
      await this.commandBus.execute(
        new EarnRewardPointsCommand(
          event.userId,
          BigInt(event.amountMinorUnits),
          event.reference,
          event.eventId,
          `Reward points for funding deposit ${event.reference}`,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to award points for deposit ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
