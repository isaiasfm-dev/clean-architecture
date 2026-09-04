// src/infrastructure/messaging/MessagingFactory.ts
import type { Pool, PoolClient } from "pg";

import type { Logger } from "#application/ports/Logger";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import { NoopDomainEventPublisher } from "#infrastructure/events/NoopDomainEventPublisher";
import {
  OutboxDispatcher,
  OutboxWorker,
  type DomainEventOutboxHandler,
  type OutboxWorkerMode,
} from "#infrastructure/messaging/OutboxDispatcher";
import { DomainEventOutboxPublisher } from "#infrastructure/messaging/DomainEventOutboxPublisher";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";

export type MessagingOptions = {
  readonly useOutbox: boolean;
  readonly outboxBatchSize: number;
  readonly outboxWorkerMode: OutboxWorkerMode;
  readonly outboxPollIntervalMs: number;
};

export class MessagingFactory {
  private readonly noopEventBus = new NoopDomainEventPublisher();

  public constructor(
    private readonly options: MessagingOptions,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  public createEventBus(client: PoolClient): DomainEventPublisher {
    if (this.options.useOutbox) {
      return new DomainEventOutboxPublisher(client);
    }

    return this.noopEventBus;
  }

  public createOutboxDispatcher(
    pool: Pool,
    handler: DomainEventOutboxHandler = this.createDefaultOutboxHandler(),
  ): OutboxDispatcher {
    return new OutboxDispatcher(pool, handler, this.options.outboxBatchSize);
  }

  public createOutboxWorker(dispatcher: OutboxDispatcher): OutboxWorker {
    return new OutboxWorker(
      dispatcher,
      this.options.outboxWorkerMode,
      this.options.outboxPollIntervalMs,
      this.logger.child({ operation: "outbox.worker" }),
    );
  }

  private createDefaultOutboxHandler(): DomainEventOutboxHandler {
    return async (event) => {
      this.logger.info("outbox event dispatched", {
        operation: "outbox.dispatch",
        outboxId: event.id,
        eventType: event.eventType,
      });
    };
  }
}
