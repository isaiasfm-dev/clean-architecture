import { describe, expect, it } from "vitest";

import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { fail, ok, type Result } from "#shared/result";
import { createFakeAppContext } from "../../support/FakeAppContext.js";
import { FakeOrderRepository } from "../../support/FakeOrderRepository.js";

class RecordingDomainEventPublisher implements DomainEventPublisher {
  public readonly published: DomainEvent[] = [];

  public async publish(events: DomainEvent[]): Promise<Result<void, ApplicationError>> {
    this.published.push(...events);

    return ok(undefined);
  }
}

class FailingDomainEventPublisher implements DomainEventPublisher {
  public readonly error: ApplicationError = {
    type: "dependency_failure",
    message: "Outbox unavailable",
  };

  public async publish(_events: DomainEvent[]): Promise<Result<void, ApplicationError>> {
    return fail(this.error);
  }
}

describe("CreateOrder", () => {
  it("creates an order using execute and publishes created event", async () => {
    const repo = new FakeOrderRepository();
    const events = new RecordingDomainEventPublisher();
    const useCase = new CreateOrder(
      createFakeAppContext({ orderRepository: repo, eventBus: events }),
    );

    const output = await useCase.execute({
      orderId: "order-1",
      customerId: "customer-1",
    });

    expect(output).toEqual({
      ok: true,
      value: {
        orderId: "order-1",
      },
    });

    const saved = await repo.findById("order-1");

    expect(saved?.id).toBe("order-1");
    expect(saved?.customerId).toBe("customer-1");
    expect(events.published).toEqual([
      {
        aggregateId: "order-1",
        aggregateType: "Order",
        type: "order.created",
      },
    ]);
  });

  it("rejects duplicated orders", async () => {
    const repo = new FakeOrderRepository();
    const events = new RecordingDomainEventPublisher();
    const useCase = new CreateOrder(
      createFakeAppContext({ orderRepository: repo, eventBus: events }),
    );

    await useCase.execute({
      orderId: "order-1",
      customerId: "customer-1",
    });
    events.published.length = 0;

    await expect(
      useCase.execute({
        orderId: "order-1",
        customerId: "customer-2",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "conflict",
        message: "Order already exists",
      },
    });

    expect(events.published).toEqual([]);
  });

  it("rejects invalid input", async () => {
    const repo = new FakeOrderRepository();
    const events = new RecordingDomainEventPublisher();
    const useCase = new CreateOrder(
      createFakeAppContext({ orderRepository: repo, eventBus: events }),
    );

    await expect(
      useCase.execute({
        orderId: "",
        customerId: " ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "validation",
        message: "Invalid create order input",
        details: {
          orderId: "Order id is required",
          customerId: "Customer id is required",
        },
      },
    });

    expect(events.published).toEqual([]);
  });

  it("returns a dependency failure when event publishing fails", async () => {
    const repo = new FakeOrderRepository();
    const events = new FailingDomainEventPublisher();
    const useCase = new CreateOrder(
      createFakeAppContext({ orderRepository: repo, eventBus: events }),
    );

    await expect(
      useCase.execute({
        orderId: "order-1",
        customerId: "customer-1",
      }),
    ).resolves.toEqual({
      ok: false,
      error: events.error,
    });
  });
});
