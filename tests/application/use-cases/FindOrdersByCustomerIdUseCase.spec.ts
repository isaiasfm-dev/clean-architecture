// tests/application/use-cases/FindOrdersByCustomerIdUseCase.spec.ts
import { describe, expect, it } from "vitest";

import { FindOrdersByCustomerId } from "#application/use-cases/FindOrdersByCustomerIdUseCase";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";
import { createFakeAppContext } from "../../support/FakeAppContext.js";
import { FakeOrderRepository } from "../../support/FakeOrderRepository.js";

describe("FindOrdersByCustomerId", () => {
  it("returns all orders for a customer", async () => {
    const repo = new FakeOrderRepository();
    const firstOrder = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    firstOrder.addItem(SKU.create("sku-1"), Price.create(12.35, "EUR"), Quantity.create(2));
    const secondOrder = Order.create(OrderId("order-2"), CustomerId("customer-1"));
    const otherCustomerOrder = Order.create(OrderId("order-3"), CustomerId("customer-2"));

    await repo.save(firstOrder);
    await repo.save(secondOrder);
    await repo.save(otherCustomerOrder);

    const useCase = new FindOrdersByCustomerId(
      createFakeAppContext({ orderRepository: repo }),
    );

    await expect(
      useCase.execute({
        customerId: "customer-1",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        customerId: "customer-1",
        orders: [
          {
            orderId: "order-1",
            totalPrice: {
              amount: 24.7,
              currency: "EUR",
            },
          },
          {
            orderId: "order-2",
            totalPrice: {
              amount: 0,
              currency: "EUR",
            },
          },
        ],
      },
    });
  });

  it("returns an empty list when the customer has no orders", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new FindOrdersByCustomerId(
      createFakeAppContext({ orderRepository: repo }),
    );

    await expect(
      useCase.execute({
        customerId: "customer-1",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        customerId: "customer-1",
        orders: [],
      },
    });
  });

  it("rejects invalid input", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new FindOrdersByCustomerId(
      createFakeAppContext({ orderRepository: repo }),
    );

    await expect(
      useCase.execute({
        customerId: " ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "validation",
        message: "Invalid find orders by customer id input",
        details: {
          customerId: "Customer id is required",
        },
      },
    });
  });
});
