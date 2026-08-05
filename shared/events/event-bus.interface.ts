import { DomainEvent } from './domain-event.base';

/**
 * Abstraction over the underlying message broker (RabbitMQ), allowing
 * application services to publish domain events without depending on
 * transport-level details.
 */
export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  publishAll<T extends DomainEvent>(events: T[]): Promise<void>;
}
