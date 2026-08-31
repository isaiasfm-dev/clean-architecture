import type { DomainEvent } from "#domain/events/DomainEvent";

export interface DomainEventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}
