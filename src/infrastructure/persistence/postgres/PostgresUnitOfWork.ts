// src/infrastructure/persistence/postgres/PostgresUnitOfWork.ts
import type { Pool, PoolClient } from "pg";

import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";

/**
 * Crea el publicador que participa en la misma conexion transaccional que el
 * repositorio usado dentro de `run`.
 */
export type TransactionalEventBusFactory = (client: PoolClient) => DomainEventPublisher;

/**
 * Unidad de trabajo que ejecuta casos de uso dentro de una transaccion
 * PostgreSQL.
 *
 * El repositorio y el publicador creados para el trabajo reciben el mismo
 * `PoolClient`, lo que permite coordinar la escritura del agregado con el
 * almacenamiento transaccional de eventos cuando el publicador configurado lo
 * implementa.
 */
export class PostgresUnitOfWork implements UnitOfWork {
  public constructor(
    private readonly pool: Pool,
    private readonly eventBusFactory: TransactionalEventBusFactory,
  ) {}

  /**
   * Ejecuta `work` entre `BEGIN` y `COMMIT` usando dependencias creadas con el
   * cliente reservado.
   *
   * Si `work` resuelve, incluso con un `Result` de error de negocio, la
   * transaccion se confirma y se devuelve ese resultado. Si `work` lanza o
   * rechaza, se ejecuta `ROLLBACK`, se libera el cliente y la excepcion se
   * propaga.
   */
  public async run<T>(work: (context: TransactionalAppContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await work(this.createTransactionalContext(client));

      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private createTransactionalContext(client: PoolClient): TransactionalAppContext {
    return {
      orderRepository: new PostgresOrderRepository(client),
      eventBus: this.eventBusFactory(client),
    };
  }
}
