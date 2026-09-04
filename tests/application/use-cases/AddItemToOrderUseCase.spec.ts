import { describe, expect, it } from "vitest";

import { AddItemToOrder } from "#application/use-cases/AddItemToOrderUseCase";
import type { ApplicationError } from "#application/errors/ApplicationErrors";
import type { Clock } from "#application/ports/Clock";
import type { DomainEventPublisher } from "#application/ports/DomainEventPublisher";
import type { PriceProvider } from "#application/ports/PriceProvider";
import type { DomainEvent } from "#domain/events/DomainEvent";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import type { SKU } from "#domain/value-objects/SKU";
import { ok, type Result } from "#shared/result";
import { createFakeAppContext } from "../../support/FakeAppContext.js";
import { FakeOrderRepository } from "../../support/FakeOrderRepository.js";

class FixedClock implements Clock {
  public readonly instant = new Date("2026-08-30T10:00:00.000Z");

  public now(): Date {
    return this.instant;
  }
}

class FakePriceProvider implements PriceProvider {
  public requestedSku: string | null = null;
  public requestedAt: Date | null = null;

  public constructor(private readonly price: Price | null) {}

  public async getCurrentPrice(sku: SKU, requestedAt: Date): Promise<Price | null> {
    this.requestedSku = sku.value;
    this.requestedAt = requestedAt;

    return this.price;
  }
}

class RecordingDomainEventPublisher implements DomainEventPublisher {
  public readonly published: DomainEvent[] = [];

  public async publish(events: DomainEvent[]): Promise<Result<void, ApplicationError>> {
    this.published.push(...events);

    return ok(undefined);
  }
}

describe("AddItemToOrder", () => {
  it("adds an item using current price, persists and publishes events", async () => {
    const repo = new FakeOrderRepository();
    const order = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    order.pullDomainEvents();
    await repo.save(order);

    const priceProvider = new FakePriceProvider(Price.create(12.35, "EUR"));
    const events = new RecordingDomainEventPublisher();
    const clock = new FixedClock();
    const useCase = new AddItemToOrder(
      createFakeAppContext({
        orderRepository: repo,
        priceProvider,
        eventBus: events,
        clock,
      }),
    );

    const output = await useCase.execute({
      orderId: "order-1",
      sku: "sku-1",
      quantity: 2,
    });

    expect(output).toEqual({
      ok: true,
      value: {
        orderId: "order-1",
        sku: "sku-1",
        quantity: 2,
        unitPrice: {
          amount: 12.35,
          currency: "EUR",
        },
        totalPrice: {
          amount: 24.7,
          currency: "EUR",
        },
        addedAt: "2026-08-30T10:00:00.000Z",
      },
    });

    expect(priceProvider.requestedSku).toBe("sku-1");
    expect(priceProvider.requestedAt).toBe(clock.instant);
    expect(events.published).toEqual([
      {
        aggregateId: "order-1",
        aggregateType: "Order",
        type: "order.item_added",
      },
    ]);

    const saved = await repo.findById("order-1");
    expect(saved?.total().amount).toBe(24.7);
  });

  it("fails when order does not exist", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new AddItemToOrder(
      createFakeAppContext({
        orderRepository: repo,
        priceProvider: new FakePriceProvider(Price.create(12.35, "EUR")),
        eventBus: new RecordingDomainEventPublisher(),
        clock: new FixedClock(),
      }),
    );

    await expect(
      useCase.execute({
        orderId: "missing-order",
        sku: "sku-1",
        quantity: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "not_found",
        resource: "Order",
        id: "missing-order",
      },
    });
  });

  it("fails when there is no current price for the sku", async () => {
    const repo = new FakeOrderRepository();
    const order = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    order.pullDomainEvents();
    await repo.save(order);

    const useCase = new AddItemToOrder(
      createFakeAppContext({
        orderRepository: repo,
        priceProvider: new FakePriceProvider(null),
        eventBus: new RecordingDomainEventPublisher(),
        clock: new FixedClock(),
      }),
    );

    await expect(
      useCase.execute({
        orderId: "order-1",
        sku: "sku-unknown",
        quantity: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "not_found",
        resource: "Price",
        id: "sku-unknown",
      },
    });
  });

  it("rejects invalid input", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new AddItemToOrder(
      createFakeAppContext({
        orderRepository: repo,
        priceProvider: new FakePriceProvider(Price.create(12.35, "EUR")),
        eventBus: new RecordingDomainEventPublisher(),
        clock: new FixedClock(),
      }),
    );

    await expect(
      useCase.execute({
        orderId: "",
        sku: " ",
        quantity: 0,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "validation",
        message: "Invalid add item to order input",
        details: {
          orderId: "Order id is required",
          sku: "SKU is required",
          quantity: "Quantity must be a positive integer",
        },
      },
    });
  });
});
