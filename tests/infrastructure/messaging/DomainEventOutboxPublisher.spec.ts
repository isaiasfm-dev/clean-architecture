import { describe, expect, it } from "vitest";

import { DomainEventOutboxPublisher } from "#infrastructure/messaging/DomainEventOutboxPublisher";

type QueryCall = {
  readonly sql: string;
  readonly values?: readonly unknown[];
};

class FakeExecutor {
  public readonly queries: QueryCall[] = [];

  public async query(sql: string, values?: readonly unknown[]): Promise<{ rows: unknown[] }> {
    this.queries.push({ sql, values });

    return { rows: [] };
  }
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("DomainEventOutboxPublisher", () => {
  it("persists domain events into the outbox table", async () => {
    const executor = new FakeExecutor();
    const eventBus = new DomainEventOutboxPublisher(executor as never);
    const createdEvent = {
      aggregateId: "order-1",
      aggregateType: "Order",
      type: "order.created",
    };
    const itemAddedEvent = {
      aggregateId: "order-1",
      aggregateType: "Order",
      type: "order.item_added",
    };

    await expect(eventBus.publish([createdEvent, itemAddedEvent])).resolves.toEqual({
      ok: true,
      value: undefined,
    });

    expect(executor.queries).toHaveLength(2);
    expect(normalize(executor.queries[0]?.sql ?? "")).toBe(
      "INSERT INTO outbox ( id, aggregate_id, aggregate_type, event_type, event_data, created_at ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)",
    );
    expect(executor.queries[0]?.values?.[0]).toEqual(expect.any(String));
    expect(executor.queries[0]?.values?.slice(1)).toEqual([
      "order-1",
      "Order",
      "order.created",
      JSON.stringify(createdEvent),
      expect.any(Date),
    ]);
    expect(executor.queries[1]?.values?.[0]).toEqual(expect.any(String));
    expect(executor.queries[1]?.values?.slice(1)).toEqual([
      "order-1",
      "Order",
      "order.item_added",
      JSON.stringify(itemAddedEvent),
      expect.any(Date),
    ]);
  });

  it("does not touch the database when there are no events", async () => {
    const executor = new FakeExecutor();
    const eventBus = new DomainEventOutboxPublisher(executor as never);

    await expect(eventBus.publish([])).resolves.toEqual({
      ok: true,
      value: undefined,
    });

    expect(executor.queries).toEqual([]);
  });

  it("returns a dependency failure when the insert fails", async () => {
    const executor = new FakeExecutor();
    const eventBus = new DomainEventOutboxPublisher({
      query: async () => {
        throw new Error("database down");
      },
    });

    await expect(
      eventBus.publish([
        {
          aggregateId: "order-1",
          aggregateType: "Order",
          type: "order.created",
        },
      ]),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "dependency_failure",
        message: "Failed to persist domain events in the outbox.",
      },
    });
    expect(executor.queries).toEqual([]);
  });
});
