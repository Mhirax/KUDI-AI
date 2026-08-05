import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { EarnRewardPointsCommand } from '../commands/earn-reward-points/earn-reward-points.command';
import { BillPaymentCompletedEvent } from '../../../bills/domain/events/bill-payment-completed.event';

@Injectable()
@EventsHandler(BillPaymentCompletedEvent)
export class RewardsOnBillPaymentCompletedHandler implements IEventHandler<BillPaymentCompletedEvent> {
  private readonly logger = new Logger(RewardsOnBillPaymentCompletedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: BillPaymentCompletedEvent): Promise<void> {
    try {
      await this.commandBus.execute(
        new EarnRewardPointsCommand(
          event.userId,
          BigInt(event.amountMinorUnits),
          event.reference,
          event.eventId,
          `Reward points for bill payment ${event.reference}`,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to award points for bill payment ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
