// src/infrastructure/persistence/postgres/PostgresUnitOfWork.ts
import type { Pool, PoolClient } from "pg";

import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type {
  TransactionalAppContext,
  UnitOfWork,
} from "#application/ports/UnitOfWork";
import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";

export type TransactionalEventBusFactory = (client: PoolClient) => DomainEventPublisher;

export class PostgresUnitOfWork implements UnitOfWork {
  public constructor(
    private readonly pool: Pool,
    private readonly eventBusFactory: TransactionalEventBusFactory,
  ) {}

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
