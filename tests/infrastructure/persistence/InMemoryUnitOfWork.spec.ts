// tests/infrastructure/persistence/InMemoryUnitOfWork.spec.ts
import { describe, expect, it } from "vitest";

import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";
import { InMemoryUnitOfWork } from "#infrastructure/persistence/InMemoryUnitOfWork";
import { ok, type Result } from "#shared/result";

class RecordingEventBus implements DomainEventPublisher {
  public readonly published: DomainEvent[] = [];

  public async publish(events: DomainEvent[]): Promise<Result<void, never>> {
    this.published.push(...events);

    return ok(undefined);
  }
}

describe("InMemoryUnitOfWork", () => {
  it("runs work with the configured order repository", async () => {
    const orderRepository = new InMemoryOrderRepository();
    const unitOfWork = new InMemoryUnitOfWork(orderRepository);

    const result = await unitOfWork.run(async (context) => context.orderRepository);

    expect(result).toBe(orderRepository);
  });

  it("runs work with the configured event bus", async () => {
    const orderRepository = new InMemoryOrderRepository();
    const eventBus = new RecordingEventBus();
    const unitOfWork = new InMemoryUnitOfWork(orderRepository, eventBus);

    await unitOfWork.run(async (context) => {
      await context.eventBus.publish([
        {
          aggregateId: "order-1",
          aggregateType: "Order",
          type: "order.created",
        },
      ]);
    });

    expect(eventBus.published).toEqual([
      {
        aggregateId: "order-1",
        aggregateType: "Order",
        type: "order.created",
      },
    ]);
  });
});
