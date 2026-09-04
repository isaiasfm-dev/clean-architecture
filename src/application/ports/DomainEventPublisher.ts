// src/application/ports/DomainEventPublisher.ts
import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEvent } from "#domain/events/DomainEvent";
import type { Result } from "#shared/result";

/**
 * Puerto para entregar eventos de dominio generados por los agregados.
 *
 * Los casos de uso reciben este puerto desde `UnitOfWork` para que una
 * implementacion pueda compartir el mismo limite transaccional que la
 * persistencia del agregado cuando el adaptador lo soporte.
 */
export interface DomainEventPublisher {
  publish(events: DomainEvent[]): Promise<Result<void, ApplicationError>>;
}
