// src/infrastructure/database/PostgresPoolFactory.ts
import { Pool } from "pg";

import type { Logger } from "#application/ports/Logger";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";

export type PostgresPoolOptions = {
  readonly connectionString: string;
  readonly max: number;
  readonly idleTimeoutMillis: number;
  readonly connectionTimeoutMillis: number;
};

export class PostgresPoolFactory {
  private static pool: Pool | null = null;

  public static createPool(
    options: PostgresPoolOptions,
    logger: Logger = new NoopLogger(),
  ): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: options.connectionString,
        max: options.max,
        idleTimeoutMillis: options.idleTimeoutMillis,
        connectionTimeoutMillis: options.connectionTimeoutMillis,
      });

      this.pool.on("error", (error) => {
        logger.error("Unexpected PostgreSQL pool error", {
          operation: "database.pool",
          error,
        });
        process.exit(-1);
      });
    }

    return this.pool;
  }

  public static async closePool(): Promise<void> {
    if (!this.pool) {
      return;
    }

    const pool = this.pool;

    this.pool = null;
    await pool.end();
  }
}
