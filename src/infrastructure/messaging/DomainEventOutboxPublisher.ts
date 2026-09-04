// src/infrastructure/messaging/DomainEventOutboxPublisher.ts
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { fail, ok, type Result } from "#shared/result";

type QueryExecutor = Pick<Pool | PoolClient, "query">;

export interface OutboxRecord {
  readonly id: string;
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly event_type: string;
  readonly event_data: DomainEvent;
  readonly created_at: Date;
}

export class DomainEventOutboxPublisher implements DomainEventPublisher {
  public constructor(private readonly executor: QueryExecutor) {}

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
