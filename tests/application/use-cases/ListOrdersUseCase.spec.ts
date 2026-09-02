// tests/application/use-cases/ListOrdersUseCase.spec.ts
import { describe, expect, it } from "vitest";

import { ListOrders } from "#application/use-cases/ListOrdersUseCase";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";
import { createFakeAppContext } from "../../support/FakeAppContext";
import { FakeOrderRepository } from "../../support/FakeOrderRepository";

describe("ListOrders", () => {
  it("returns all orders", async () => {
    const repo = new FakeOrderRepository();
    const firstOrder = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    firstOrder.addItem(SKU.create("sku-1"), Price.create(12.35, "EUR"), Quantity.create(2));
    const secondOrder = Order.create(OrderId("order-2"), CustomerId("customer-2"));

    await repo.save(firstOrder);
    await repo.save(secondOrder);

    const useCase = new ListOrders(createFakeAppContext({ orderRepository: repo }));

    await expect(useCase.execute()).resolves.toEqual({
      ok: true,
      value: {
        orders: [
          {
            orderId: "order-1",
            customerId: "customer-1",
            totalPrice: {
              amount: 24.7,
              currency: "EUR",
            },
          },
          {
            orderId: "order-2",
            customerId: "customer-2",
            totalPrice: {
              amount: 0,
              currency: "EUR",
            },
          },
        ],
      },
    });
  });

  it("returns an empty list when there are no orders", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new ListOrders(createFakeAppContext({ orderRepository: repo }));

    await expect(useCase.execute()).resolves.toEqual({
      ok: true,
      value: {
        orders: [],
      },
    });
  });
});
