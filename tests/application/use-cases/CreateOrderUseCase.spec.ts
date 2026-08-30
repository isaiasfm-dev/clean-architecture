import { describe, expect, it } from "vitest";

import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { InMemoryOrderRepository } from "#infrastructure/persistence/InMemoryOrderRepository";

describe("CreateOrder", () => {
  it("creates an order using execute", async () => {
    const repo = new InMemoryOrderRepository();
    const useCase = new CreateOrder(repo);

    const output = await useCase.execute({
      orderId: "order-1",
      customerId: "customer-1",
    });

    expect(output).toEqual({
      orderId: "order-1",
    });

    const saved = await repo.findById("order-1");

    expect(saved?.id).toBe("order-1");
    expect(saved?.customerId).toBe("customer-1");
  });

  it("rejects duplicated orders", async () => {
    const repo = new InMemoryOrderRepository();
    const useCase = new CreateOrder(repo);

    await useCase.execute({
      orderId: "order-1",
      customerId: "customer-1",
    });

    await expect(
      useCase.execute({
        orderId: "order-1",
        customerId: "customer-2",
      }),
    ).rejects.toThrow("Order already exists");
  });
});
