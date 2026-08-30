import { describe, expect, it } from "vitest";

import { GetOrderItems } from "#application/use-cases/GetOrderItemsUseCase";
import { CustomerId, Order, OrderId } from "#domain/entities/Order";
import { Price } from "#domain/value-objects/Price";
import { Quantity } from "#domain/value-objects/Quantity";
import { SKU } from "#domain/value-objects/SKU";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";

describe("GetOrderItems", () => {
  it("returns order items as output DTO", async () => {
    const repo = new InMemoryOrderRepository();
    const order = Order.create(OrderId("order-1"), CustomerId("customer-1"));
    order.addItem(SKU.create("sku-1"), Price.create(12.35, "EUR"), Quantity.create(2));
    await repo.save(order);

    const useCase = new GetOrderItems(repo);

    await expect(
      useCase.execute({
        orderId: "order-1",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        orderId: "order-1",
        items: [
          {
            sku: "sku-1",
            quantity: 2,
            unitPrice: {
              amount: 12.35,
              currency: "EUR",
            },
          },
        ],
      },
    });
  });

  it("fails when order does not exist", async () => {
    const repo = new InMemoryOrderRepository();
    const useCase = new GetOrderItems(repo);

    await expect(
      useCase.execute({
        orderId: "missing-order",
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

  it("rejects invalid input", async () => {
    const repo = new InMemoryOrderRepository();
    const useCase = new GetOrderItems(repo);

    await expect(
      useCase.execute({
        orderId: " ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "validation",
        message: "Invalid get order items input",
        details: {
          orderId: "Order id is required",
        },
      },
    });
  });
});
