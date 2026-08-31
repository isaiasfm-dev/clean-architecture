import { describe, expect, it } from "vitest";

import { CreateOrder } from "#application/use-cases/CreateOrderUseCase";
import { FakeOrderRepository } from "../../support/FakeOrderRepository";

describe("CreateOrder", () => {
  it("creates an order using execute", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new CreateOrder(repo);

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
  });

  it("rejects duplicated orders", async () => {
    const repo = new FakeOrderRepository();
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
    ).resolves.toEqual({
      ok: false,
      error: {
        type: "conflict",
        message: "Order already exists",
      },
    });
  });

  it("rejects invalid input", async () => {
    const repo = new FakeOrderRepository();
    const useCase = new CreateOrder(repo);

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
  });
});
