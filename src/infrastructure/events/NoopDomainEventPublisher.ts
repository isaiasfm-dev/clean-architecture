// src/infrastructure/events/NoopDomainEventPublisher.ts
import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { ok, type Result } from "#shared/result";

export class NoopDomainEventPublisher implements DomainEventPublisher {
  public async publish(_events: DomainEvent[]): Promise<Result<void, ApplicationError>> {
    return ok(undefined);
  }
}
