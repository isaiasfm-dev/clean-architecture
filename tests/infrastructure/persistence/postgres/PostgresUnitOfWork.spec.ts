// tests/infrastructure/persistence/postgres/PostgresUnitOfWork.spec.ts
import { describe, expect, it } from "vitest";

import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { PostgresOrderRepository } from "#infrastructure/persistence/postgres/PostgresOrderRepository";
import { PostgresUnitOfWork } from "#infrastructure/persistence/postgres/PostgresUnitOfWork";
import { ok, type Result } from "#shared/result";

type QueryCall = {
  readonly sql: string;
  readonly values?: readonly unknown[];
};

class FakePoolClient {
  public readonly queries: QueryCall[] = [];
  public released = false;

  public async query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });

    return { rows: [] };
  }

  public release(): void {
    this.released = true;
  }
}

class FakePool {
  public readonly client = new FakePoolClient();

  public async connect(): Promise<FakePoolClient> {
    return this.client;
  }
}

class RecordingEventBus implements DomainEventPublisher {
  public readonly published: DomainEvent[] = [];

  public async publish(events: DomainEvent[]): Promise<Result<void, never>> {
    this.published.push(...events);

    return ok(undefined);
  }
}

describe("PostgresUnitOfWork", () => {
  it("commits and releases the client when work succeeds", async () => {
    const pool = new FakePool();
    const eventBus = new RecordingEventBus();
    const unitOfWork = new PostgresUnitOfWork(pool as never, () => eventBus);

    const result = await unitOfWork.run(async (context) => {
      expect(context.orderRepository).toBeInstanceOf(PostgresOrderRepository);
      expect(context.eventBus).toBe(eventBus);

      return "done";
    });

    expect(result).toBe("done");
    expect(pool.client.queries.map((query) => query.sql)).toEqual(["BEGIN", "COMMIT"]);
    expect(pool.client.released).toBe(true);
  });

  it("rolls back and releases the client when work fails", async () => {
    const pool = new FakePool();
    const unitOfWork = new PostgresUnitOfWork(pool as never, () => new RecordingEventBus());
    const error = new Error("boom");

    await expect(
      unitOfWork.run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(pool.client.queries.map((query) => query.sql)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(pool.client.released).toBe(true);
  });

  it("uses the transaction client when creating the event bus", async () => {
    const pool = new FakePool();
    let receivedClient: FakePoolClient | null = null;
    const unitOfWork = new PostgresUnitOfWork(pool as never, (client) => {
      receivedClient = client as never;

      return new RecordingEventBus();
    });

    await unitOfWork.run(async () => undefined);

    expect(receivedClient).toBe(pool.client);
  });
});
