import { randomUUID } from 'crypto';

/**
 * Base class for all domain events published across the platform via
 * RabbitMQ. Concrete events extend this to guarantee a consistent
 * envelope for event sourcing / audit trails.
 */
export abstract class DomainEvent {
  readonly eventId: string = randomUUID();
  readonly occurredAt: Date = new Date();
  abstract readonly eventName: string;
  abstract readonly aggregateId: string;
}
