// src/application/ports/DomainEventPublisher.ts
import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEvent } from "#domain/events/DomainEvent";
import type { Result } from "#shared/result";

export interface DomainEventPublisher {
  publish(events: DomainEvent[]): Promise<Result<void, ApplicationError>>;
}
