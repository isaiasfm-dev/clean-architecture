import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Logger, LoggerContext } from "#application/ports/Logger";
import { loadConfig } from "#composition/config";
import { toPostgresPoolOptions } from "#composition/adapterOptions";
import { PostgresPoolFactory } from "#infrastructure/database/PostgresPoolFactory";

type PoolWithOptions = Pool & {
  readonly options: {
    readonly connectionString: string;
    readonly max: number;
    readonly idleTimeoutMillis: number;
    readonly connectionTimeoutMillis: number;
  };
};

type LogEntry = {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly obj?: LoggerContext | undefined;
};

class RecordingLogger implements Logger {
  public readonly entries: LogEntry[] = [];

  public debug(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "debug", message, obj });
  }

  public info(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "info", message, obj });
  }

  public warn(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "warn", message, obj });
  }

  public error(message: string, obj?: LoggerContext): void {
    this.entries.push({ level: "error", message, obj });
  }

  public child(context: LoggerContext): Logger {
    const parent = this;

    return {
      debug(message, obj) {
        parent.debug(message, { ...context, ...obj });
      },
      info(message, obj) {
        parent.info(message, { ...context, ...obj });
      },
      warn(message, obj) {
        parent.warn(message, { ...context, ...obj });
      },
      error(message, obj) {
        parent.error(message, { ...context, ...obj });
      },
      child(childContext) {
        return parent.child({ ...context, ...childContext });
      },
    };
  }
}

describe("PostgresPoolFactory", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await PostgresPoolFactory.closePool();
  });

  it("creates a pool with configured database options", async () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
      DATABASE_POOL_MAX: "15",
      DATABASE_IDLE_TIMEOUT_MS: "40000",
      DATABASE_CONNECTION_TIMEOUT_MS: "2500",
    });
    const pool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config)) as PoolWithOptions;

    expect(pool.options.connectionString).toBe(
      "postgres://user:password@localhost:5432/orders",
    );
    expect(pool.options.max).toBe(15);
    expect(pool.options.idleTimeoutMillis).toBe(40000);
    expect(pool.options.connectionTimeoutMillis).toBe(2500);
  });

  it("reuses the same pool while it remains open", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    });

    const firstPool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config));
    const secondPool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config));

    expect(secondPool).toBe(firstPool);
  });

  it("creates a new pool after closing the current one", async () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    });

    const firstPool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config));

    await PostgresPoolFactory.closePool();

    const secondPool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config));

    expect(secondPool).not.toBe(firstPool);
  });

  it("logs pool errors and exits the process", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:password@localhost:5432/orders",
    });
    const error = new Error("connection lost");
    const logger = new RecordingLogger();
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process exit");
    }) as never);
    const pool = PostgresPoolFactory.createPool(toPostgresPoolOptions(config), logger);

    expect(() => pool.emit("error", error)).toThrow("process exit");
    expect(logger.entries).toEqual([
      {
        level: "error",
        message: "Unexpected PostgreSQL pool error",
        obj: {
          operation: "database.pool",
          error,
        },
      },
    ]);
    expect(exit).toHaveBeenCalledWith(-1);
  });
});
