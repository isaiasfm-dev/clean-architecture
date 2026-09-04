// src/infrastructure/messaging/DomainEventOutboxPublisher.ts
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { fail, ok, type Result } from "#shared/result";

type QueryExecutor = Pick<Pool | PoolClient, "query">;

/**
 * Representacion persistida de un evento de dominio en la tabla Outbox.
 *
 * `event_data` conserva el evento completo para que el dispatcher pueda
 * reconstruir el mensaje sin perder datos propios de eventos concretos.
 */
export interface OutboxRecord {
  readonly id: string;
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly event_type: string;
  readonly event_data: DomainEvent;
  readonly created_at: Date;
}

/**
 * Implementacion de `DomainEventPublisher` que registra los eventos en
 * PostgreSQL para su procesamiento posterior por un dispatcher.
 *
 * Recibe un `PoolClient` cuando se usa dentro de `PostgresUnitOfWork`, por lo
 * que las inserciones del Outbox participan en la misma transaccion que la
 * persistencia del agregado. Esto solo deja el evento almacenado; no implica
 * que ya haya sido entregado a un consumidor externo.
 */
export class DomainEventOutboxPublisher implements DomainEventPublisher {
  public constructor(private readonly executor: QueryExecutor) {}

  /**
   * Persiste cada evento con sus identificadores de agregado, tipo y payload.
   *
   * Una coleccion vacia se resuelve sin consultar la base de datos. Los
   * errores del ejecutor se convierten en un `Result` de fallo de dependencia.
   */
  public async publish(events: DomainEvent[]): Promise<Result<void, ApplicationError>> {
    if (events.length === 0) {
      return ok(undefined);
    }

    try {
      for (const event of events) {
        const outboxRecord: OutboxRecord = {
          id: randomUUID(),
          aggregate_id: event.aggregateId,
          aggregate_type: event.aggregateType,
          event_type: event.type,
          event_data: event,
          created_at: new Date(),
        };

        await this.executor.query(
          `
          INSERT INTO outbox (
            id,
            aggregate_id,
            aggregate_type,
            event_type,
            event_data,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6)
          `,
          [
            outboxRecord.id,
            outboxRecord.aggregate_id,
            outboxRecord.aggregate_type,
            outboxRecord.event_type,
            JSON.stringify(outboxRecord.event_data),
            outboxRecord.created_at,
          ],
        );
      }

      return ok(undefined);
    } catch {
      return fail({
        type: "dependency_failure",
        message: "Failed to persist domain events in the outbox.",
      });
    }
  }
}
