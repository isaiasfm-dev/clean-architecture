import { describe, expect, it, vi } from "vitest";

import type { Logger, LoggerContext } from "#application/ports/Logger";
import {
  OutboxDispatcher,
  OutboxWorker,
  runOutboxWorker,
  type DomainEventOutboxMessage,
} from "#infrastructure/messaging/OutboxDispatcher";
import { NoopLogger } from "#infrastructure/observability/NoopLogger";

type QueryCall = {
  readonly sql: string;
  readonly values?: readonly unknown[];
};

type LogEntry = {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly obj?: LoggerContext;
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

class FakePoolClient {
  public readonly queries: QueryCall[] = [];
  public released = false;

  public constructor(private readonly rows: unknown[] = []) {}

  public async query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });

    if (sql.includes("FOR UPDATE SKIP LOCKED")) {
      return { rows: this.rows };
    }

    return { rows: [] };
  }

  public release(): void {
    this.released = true;
  }
}

class FakePool {
  public readonly client: FakePoolClient;

  public constructor(rows: unknown[] = []) {
    this.client = new FakePoolClient(rows);
  }

  public async connect(): Promise<FakePoolClient> {
    return this.client;
  }
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("OutboxDispatcher", () => {
  it("locks unpublished events, dispatches them and marks them as published", async () => {
    const pool = new FakePool([
      {
        id: "10",
        aggregate_id: "order-1",
        aggregate_type: "Order",
        event_type: "order.created",
        event_data: {
          aggregateId: "order-1",
          aggregateType: "Order",
          type: "order.created",
        },
        created_at: new Date("2026-08-30T10:00:00.000Z"),
      },
    ]);
    const handled: DomainEventOutboxMessage[] = [];
    const dispatcher = new OutboxDispatcher(
      pool as never,
      async (event) => {
        handled.push(event);
      },
      50,
    );

    await expect(dispatcher.dispatchPending()).resolves.toEqual({
      ok: true,
      value: 1,
    });

    expect(handled).toEqual([
      {
        id: "10",
        aggregateId: "order-1",
        aggregateType: "Order",
        eventType: "order.created",
        payload: {
          aggregateId: "order-1",
          aggregateType: "Order",
          type: "order.created",
        },
        createdAt: new Date("2026-08-30T10:00:00.000Z"),
      },
    ]);
    expect(pool.client.queries.map((query) => normalize(query.sql))).toEqual([
      "BEGIN",
      "SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at FROM outbox WHERE published_at IS NULL ORDER BY id ASC LIMIT $1 FOR UPDATE SKIP LOCKED",
      "UPDATE outbox SET published_at = now() WHERE id = $1",
      "COMMIT",
    ]);
    expect(pool.client.queries[1]?.values).toEqual([50]);
    expect(pool.client.queries[2]?.values).toEqual(["10"]);
    expect(pool.client.released).toBe(true);
  });

  it("rolls back and leaves the event unpublished when handling fails", async () => {
    const pool = new FakePool([
      {
        id: "11",
        aggregate_id: "order-1",
        aggregate_type: "Order",
        event_type: "order.item_added",
        event_data: {
          aggregateId: "order-1",
          aggregateType: "Order",
          type: "order.item_added",
        },
        created_at: new Date("2026-08-30T10:00:00.000Z"),
      },
    ]);
    const dispatcher = new OutboxDispatcher(pool as never, async () => {
      throw new Error("broker down");
    });

    await expect(dispatcher.dispatchPending()).resolves.toEqual({
      ok: false,
      error: {
        type: "dependency_failure",
        message: "Failed to dispatch outbox events.",
      },
    });

    expect(pool.client.queries.map((query) => normalize(query.sql))).toEqual([
      "BEGIN",
      "SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at FROM outbox WHERE published_at IS NULL ORDER BY id ASC LIMIT $1 FOR UPDATE SKIP LOCKED",
      "ROLLBACK",
    ]);
    expect(pool.client.released).toBe(true);
  });

  it("runs once without waiting when worker mode is once", async () => {
    const pool = new FakePool();
    const dispatcher = new OutboxDispatcher(pool as never, async () => undefined);
    const sleep = vi.fn(async () => undefined);

    await runOutboxWorker(dispatcher, "once", 1000, new NoopLogger(), sleep);

    expect(sleep).not.toHaveBeenCalled();
    expect(pool.client.queries.map((query) => normalize(query.sql))).toEqual([
      "BEGIN",
      "SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at FROM outbox WHERE published_at IS NULL ORDER BY id ASC LIMIT $1 FOR UPDATE SKIP LOCKED",
      "COMMIT",
    ]);

  });

  it("waits the configured interval between batches when worker mode is loop", async () => {
    const pool = new FakePool();
    const dispatcher = new OutboxDispatcher(pool as never, async () => undefined);
    const logger = new RecordingLogger();
    const stop = new Error("stop");
    const sleep = vi.fn(async () => {
      throw stop;
    });

    await expect(
      runOutboxWorker(dispatcher, "loop", 2500, logger, sleep),
    ).rejects.toBe(stop);

    expect(sleep).toHaveBeenCalledWith(2500);
    expect(logger.entries).toContainEqual({
      level: "info",
      message: "outbox worker waiting for next batch...",
      obj: {
        operation: "outbox.worker.wait",
        intervalMs: 2500,
      },
    });
    expect(pool.client.released).toBe(true);

  });

  it("stops loop mode without running another batch", async () => {
    const pool = new FakePool();
    const dispatcher = new OutboxDispatcher(pool as never, async () => undefined);
    const worker = new OutboxWorker(dispatcher, "loop", 60_000);

    const running = worker.run();

    await Promise.resolve();
    await Promise.resolve();

    worker.stop();
    await running;

    expect(pool.client.queries.map((query) => normalize(query.sql))).toEqual([
      "BEGIN",
      "SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at FROM outbox WHERE published_at IS NULL ORDER BY id ASC LIMIT $1 FOR UPDATE SKIP LOCKED",
      "COMMIT",
    ]);
  });

  it("does not dispatch in once mode when stopped before run", async () => {
    const pool = new FakePool();
    const dispatcher = new OutboxDispatcher(pool as never, async () => undefined);
    const worker = new OutboxWorker(dispatcher, "once", 1000);

    worker.stop();
    await worker.run();

    expect(pool.client.queries).toEqual([]);
  });
});
