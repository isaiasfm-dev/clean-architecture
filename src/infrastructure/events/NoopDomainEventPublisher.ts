// src/infrastructure/events/NoopDomainEventPublisher.ts
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";

export class NoopDomainEventPublisher implements DomainEventPublisher {
  public async publish(_events: DomainEvent[]): Promise<void> {
    return Promise.resolve();
  }
}
