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

/**
 * Construye los componentes de mensajeria a partir de las opciones de
 * composicion.
 *
 * Puede seleccionar un publicador no-op o uno que persiste en Outbox. El
 * dispatcher y el worker se crean por separado para que el punto de entrada
 * decida si procesa una iteracion o mantiene el sondeo configurado.
 */
export class MessagingFactory {
  private readonly noopEventBus = new NoopDomainEventPublisher();

  public constructor(
    private readonly options: MessagingOptions,
    private readonly logger: Logger = new NoopLogger(),
  ) {}

  /**
   * Crea el publicador que usara una unidad de trabajo con el cliente
   * PostgreSQL reservado para ella.
   */
  public createEventBus(client: PoolClient): DomainEventPublisher {
    if (this.options.useOutbox) {
      return new DomainEventOutboxPublisher(client);
    }

    return this.noopEventBus;
  }

  /**
   * Crea el dispatcher con el tamano de lote configurado.
   *
   * Cuando no se proporciona un handler, usa uno que registra los metadatos
   * del mensaje; la factory no construye aqui un consumidor externo.
   */
  public createOutboxDispatcher(
    pool: Pool,
    handler: DomainEventOutboxHandler = this.createDefaultOutboxHandler(),
  ): OutboxDispatcher {
    return new OutboxDispatcher(pool, handler, this.options.outboxBatchSize);
  }

  /**
   * Crea un worker con el modo y el intervalo definidos en la composicion.
   */
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
