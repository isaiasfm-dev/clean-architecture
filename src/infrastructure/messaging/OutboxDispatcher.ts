// src/infrastructure/messaging/OutboxDispatcher.ts
import type { Pool, PoolClient } from "pg";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { Logger } from "#application/ports/Logger";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";
import { fail, ok, type Result } from "#shared/result";

/**
 * Mensaje que el dispatcher adapta desde una fila del Outbox para el handler.
 *
 * `payload` conserva el evento de dominio cuando su estructura es valida;
 * si no, se reconstruye con los campos minimos almacenados en la fila.
 */
export type DomainEventOutboxMessage = {
  readonly id: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly payload: DomainEvent;
  readonly createdAt: Date;
};

/**
 * Handler invocado para cada mensaje seleccionado antes de marcarlo como
 * publicado.
 */
export type DomainEventOutboxHandler = (event: DomainEventOutboxMessage) => Promise<void>;
export type OutboxWorkerMode = "once" | "loop";
export type Sleep = (intervalMs: number) => Promise<void>;

type OutboxRow = {
  readonly id: string;
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly event_type: string;
  readonly event_data: unknown;
  readonly created_at: Date;
};

/**
 * Procesa los registros pendientes del Outbox y los marca como publicados
 * despues de invocar el handler.
 *
 * Una fila esta pendiente cuando `published_at IS NULL`; cada iteracion toma
 * como maximo `batchSize` filas y la consulta las ordena por `id` ascendente.
 * La seleccion y el marcado usan el mismo cliente; el handler se invoca
 * dentro de esa transaccion, aunque sus efectos externos no usan ese cliente.
 * Estas operaciones se ejecutan entre `BEGIN` y `COMMIT`. `FOR UPDATE SKIP LOCKED`
 * permite que transacciones concurrentes omitan filas ya bloqueadas por otro dispatcher, sin convertir
 * por si solo el procesamiento en una garantia de entrega unica.
 */
export class OutboxDispatcher {
  public constructor(
    private readonly pool: Pool,
    private readonly handler: DomainEventOutboxHandler,
    private readonly batchSize = 100,
  ) {}

  /**
   * Ejecuta una iteracion de procesamiento y devuelve cuantas filas se
   * seleccionaron para el lote confirmado.
   *
   * Un error antes del commit provoca `ROLLBACK`; por tanto, el marcado de las
   * filas no se confirma. El efecto externo que el handler pudiera producir
   * no forma parte de la transaccion PostgreSQL.
   */
  public async dispatchPending(): Promise<Result<number, ApplicationError>> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const events = await this.lockPendingEvents(client);

      for (const event of events) {
        await this.handler(event);
        await this.markAsPublished(client, event.id);
      }

      await client.query("COMMIT");

      return ok(events.length);
    } catch {
      await client.query("ROLLBACK");

      return fail({
        type: "dependency_failure",
        message: "Failed to dispatch outbox events.",
      });
    } finally {
      client.release();
    }
  }

  private async lockPendingEvents(client: PoolClient): Promise<DomainEventOutboxMessage[]> {
    const result = await client.query<OutboxRow>(
      `
      SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at
      FROM outbox
      WHERE published_at IS NULL
      ORDER BY id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [this.batchSize],
    );

    return result.rows.map((row) => ({
      id: row.id,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      eventType: row.event_type,
      payload: this.toDomainEvent(row),
      createdAt: row.created_at,
    }));
  }

  private async markAsPublished(client: PoolClient, eventId: string): Promise<void> {
    // El marcado se confirma junto con la iteracion para no separar la
    // seleccion bloqueada del estado publicado persistido.
    await client.query(
      `
      UPDATE outbox
      SET published_at = now()
      WHERE id = $1
      `,
      [eventId],
    );
  }

  private toDomainEvent(row: OutboxRow): DomainEvent {
    if (this.isDomainEvent(row.event_data)) {
      return row.event_data;
    }

    // Si el JSON no tiene la forma minima de DomainEvent, se conserva la
    // informacion del registro para que el handler reciba un evento valido
    // segun el contrato minimo del dominio.
    return {
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      type: row.event_type,
    };
  }

  private isDomainEvent(payload: unknown): payload is DomainEvent {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "aggregateId" in payload &&
      typeof payload.aggregateId === "string" &&
      "aggregateType" in payload &&
      typeof payload.aggregateType === "string" &&
      "type" in payload &&
      typeof payload.type === "string"
    );
  }
}

/**
 * Ejecuta iteraciones del dispatcher una vez o hasta que se solicite detener
 * el worker.
 *
 * En modo `loop`, espera el intervalo configurado entre lotes y puede
 * interrumpir la espera mediante `stop`; el worker no implementa una politica
 * adicional de reintentos o de entrega externa.
 */
export class OutboxWorker {
  private stopped = false;
  private stopWaiting: (() => void) | null = null;

  public constructor(
    private readonly dispatcher: OutboxDispatcher,
    private readonly mode: OutboxWorkerMode,
    private readonly intervalMs: number,
    private readonly logger: Logger = new NoopLogger(),
    private readonly sleep?: Sleep,
  ) {}

  /** Solicita detener el worker y despierta una espera activa, si existe. */
  public stop(): void {
    this.stopped = true;
    this.logger.info("outbox worker stopping", { operation: "outbox.worker.stop" });
    this.stopWaiting?.();
  }

  public async run(): Promise<void> {
    if (this.mode === "once") {
      if (!this.stopped) {
        await dispatchAndLog(this.dispatcher, this.logger);
      }

      return;
    }

    while (!this.stopped) {
      await dispatchAndLog(this.dispatcher, this.logger);

      if (!this.stopped) {
        this.logger.info("outbox worker waiting for next batch...", {
          operation: "outbox.worker.wait",
          intervalMs: this.intervalMs,
        });
        await this.wait();
      }
    }
  }

  private async wait(): Promise<void> {
    if (this.sleep) {
      await this.sleep(this.intervalMs);

      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, this.intervalMs);

      this.stopWaiting = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    this.stopWaiting = null;
  }
}

export async function runOutboxWorker(
  dispatcher: OutboxDispatcher,
  mode: OutboxWorkerMode,
  intervalMs: number,
  logger: Logger = new NoopLogger(),
  sleep?: Sleep,
): Promise<void> {
  const worker = new OutboxWorker(dispatcher, mode, intervalMs, logger, sleep);

  await worker.run();
}

async function dispatchAndLog(dispatcher: OutboxDispatcher, logger: Logger): Promise<void> {
  const result = await dispatcher.dispatchPending();

  if (!result.ok) {
    logger.error("Failed to dispatch outbox events.", {
      operation: "outbox.dispatch",
      errorType: result.error.type,
    });

    return;
  }

  logger.info("outbox batch completed", {
    operation: "outbox.dispatch",
    dispatched: result.value,
  });
}
